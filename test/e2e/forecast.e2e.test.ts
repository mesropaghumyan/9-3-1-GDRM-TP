import { faker } from "@faker-js/faker";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import { createApp } from "../../src/app";

const BAN_URL = "https://api-adresse.data.gouv.fr/search/";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const MET_NORWAY_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const RATE_LIMIT_MAX_FOR_TEST = 2;

// Fournisseurs par défaut (cf. .env.example) : BAN pour le géocodage, Open-Meteo pour la météo.
function mockGeocodingSuccess(lat = 44.13, lon = 4.08) {
  return http.get(BAN_URL, () =>
    HttpResponse.json({ features: [{ geometry: { coordinates: [lon, lat] } }] }),
  );
}

function mockWeatherSuccess(temperatures: number[] = [12.4, 13.1, 15.6]) {
  return http.get(OPEN_METEO_URL, () =>
    HttpResponse.json({ hourly: { temperature_2m: temperatures } }),
  );
}

// `process.env.X = undefined` coercerait en la chaîne "undefined" (Node stocke
// uniquement des strings dans process.env) — il faut explicitement supprimer
// la clé pour restaurer un état "non défini".
function restoreEnvVar(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

const server = setupServer(mockGeocodingSuccess(), mockWeatherSuccess());

// "bypass" (et non "error") : le trafic Supertest vers l'app locale transite
// aussi par les intercepteurs Node de MSW et doit pouvoir passer sans mock.
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers(mockGeocodingSuccess(), mockWeatherSuccess()));
afterAll(() => server.close());

describe("GET /forecast", () => {
  it("renvoie 200 avec le schéma attendu pour une adresse valide", async () => {
    const address = "Alès";
    const temperatures = [10.5, 20.1, 30.9];
    server.use(mockGeocodingSuccess(44.13, 4.08), mockWeatherSuccess(temperatures));
    const app = createApp();

    const response = await request(app).get("/forecast").query({ address });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      address,
      latitude: 44.13,
      longitude: 4.08,
      hourly: { temperature: temperatures },
    });
  });

  it("get_parametreAddressAbsentRenvoie400ProblemDetails", async () => {
    const app = createApp();

    const response = await request(app).get("/forecast");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      type: "https://api.tp-meteo.local/errors/invalid-address",
      status: 400,
    });
  });

  it("get_parametreAddressVideRenvoie400ProblemDetails", async () => {
    const app = createApp();

    const response = await request(app).get("/forecast").query({ address: "   " });

    expect(response.status).toBe(400);
    expect(response.body.type).toBe("https://api.tp-meteo.local/errors/invalid-address");
  });

  it("get_adresseIntrouvableRenvoie404", async () => {
    server.use(http.get(BAN_URL, () => HttpResponse.json({ features: [] })));
    const app = createApp();

    const response = await request(app)
      .get("/forecast")
      .query({ address: faker.string.alphanumeric(20) });

    expect(response.status).toBe(404);
    expect(response.body.type).toBe("https://api.tp-meteo.local/errors/address-not-found");
  });

  it("get_geocodageEnPanneRenvoie502SansDetailTechnique", async () => {
    server.use(http.get(BAN_URL, () => new HttpResponse(null, { status: 500 })));
    const app = createApp();

    const response = await request(app).get("/forecast").query({ address: faker.location.city() });

    expect(response.status).toBe(502);
    expect(response.body.type).toBe("https://api.tp-meteo.local/errors/upstream-service-error");
    expect(response.body.detail).not.toMatch(/api-adresse|http|500|stack/i);
  });

  it("get_meteoEnPanneRenvoie502SansDetailTechnique", async () => {
    server.use(http.get(OPEN_METEO_URL, () => new HttpResponse(null, { status: 500 })));
    const app = createApp();

    const response = await request(app).get("/forecast").query({ address: faker.location.city() });

    expect(response.status).toBe(502);
    expect(response.body.type).toBe("https://api.tp-meteo.local/errors/upstream-service-error");
    expect(response.body.detail).not.toMatch(/open-meteo|http|500|stack/i);
  });

  it("get_quotaDeRequetesDepasseRenvoie429", async () => {
    const originalMax = process.env.RATE_LIMIT_MAX;
    process.env.RATE_LIMIT_MAX = String(RATE_LIMIT_MAX_FOR_TEST);
    try {
      const app = createApp();
      for (let i = 0; i < RATE_LIMIT_MAX_FOR_TEST; i++) {
        await request(app).get("/forecast").query({ address: faker.location.city() });
      }

      const response = await request(app)
        .get("/forecast")
        .query({ address: faker.location.city() });

      expect(response.status).toBe(429);
      expect(response.body.type).toBe("https://api.tp-meteo.local/errors/rate-limit-exceeded");
    } finally {
      restoreEnvVar("RATE_LIMIT_MAX", originalMax);
    }
  });

  it("get_fournisseursAlternatifsConfiguresParEnvRenvoient200SansChangementDeCode", async () => {
    // Démontre le "coût du changement" du TP2 : permuter de fournisseur ne
    // demande qu'une variable d'environnement, aucune modification de code.
    const originalGeocodingProvider = process.env.GEOCODING_PROVIDER;
    const originalWeatherProvider = process.env.WEATHER_PROVIDER;
    process.env.GEOCODING_PROVIDER = "nominatim";
    process.env.WEATHER_PROVIDER = "met-norway";
    try {
      const address = "Alès";
      const temperatures = [5.5, 6.6, 7.7];
      server.use(
        http.get(NOMINATIM_URL, () => HttpResponse.json([{ lat: "44.13", lon: "4.08" }])),
        http.get(MET_NORWAY_URL, () =>
          HttpResponse.json({
            properties: {
              timeseries: temperatures.map((air_temperature) => ({
                data: { instant: { details: { air_temperature } } },
              })),
            },
          }),
        ),
      );
      const app = createApp();

      const response = await request(app).get("/forecast").query({ address });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        address,
        latitude: 44.13,
        longitude: 4.08,
        hourly: { temperature: temperatures },
      });
    } finally {
      restoreEnvVar("GEOCODING_PROVIDER", originalGeocodingProvider);
      restoreEnvVar("WEATHER_PROVIDER", originalWeatherProvider);
    }
  });
});

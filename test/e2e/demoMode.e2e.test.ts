import { faker } from "@faker-js/faker";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import { createApp } from "../../src/app";

const BAN_URL = "https://api-adresse.data.gouv.fr/search/";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const MET_NORWAY_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const UNEXPECTED_CALL_STATUS = 599;

function restoreEnvVar(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

// Handlers dédiés (et non `onUnhandledRequest: "error"`, qui interfère avec le
// trafic Supertest local — cf. test/e2e/forecast.e2e.test.ts) : chaque service
// externe connu répond avec un statut distinctif et incrémente un compteur,
// pour prouver explicitement qu'aucun appel réseau réel n'a eu lieu (TP3).
let externalCallCount = 0;

function trackedFailure(url: string) {
  return http.get(url, () => {
    externalCallCount += 1;
    return new HttpResponse(null, { status: UNEXPECTED_CALL_STATUS });
  });
}

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => {
  externalCallCount = 0;
  server.resetHandlers(
    trackedFailure(BAN_URL),
    trackedFailure(NOMINATIM_URL),
    trackedFailure(OPEN_METEO_URL),
    trackedFailure(MET_NORWAY_URL),
  );
});
afterAll(() => server.close());

describe("GET /forecast?demo=true", () => {
  it("get_modeDemoRenvoie200SansAucunAppelReseauReel", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/forecast")
      .query({ address: faker.location.city(), demo: "true" });

    expect(response.status).toBe(200);
    expect(externalCallCount).toBe(0);
  });

  it("get_modeDemoRenvoieUnHourlyConformeAuContratUnifie", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/forecast")
      .query({ address: faker.location.city(), demo: "true" });

    expect(response.body).toMatchObject({
      address: expect.any(String),
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    });
    expect(Array.isArray(response.body.hourly)).toBe(true);
    expect(response.body.hourly.length).toBeGreaterThan(0);
    response.body.hourly.forEach((entry: unknown) => {
      expect(entry).toEqual({
        time: expect.any(String),
        temperatureCelsius: expect.any(Number),
      });
    });
  });

  it("get_modeDemoIgnoreLeFournisseurConfigureSansAppelerLeReseau", async () => {
    const originalGeocodingProvider = process.env.GEOCODING_PROVIDER;
    const originalWeatherProvider = process.env.WEATHER_PROVIDER;
    process.env.GEOCODING_PROVIDER = "nominatim";
    process.env.WEATHER_PROVIDER = "met-norway";
    try {
      const app = createApp();

      const response = await request(app)
        .get("/forecast")
        .query({ address: faker.location.city(), demo: "true" });

      expect(response.status).toBe(200);
      expect(externalCallCount).toBe(0);
    } finally {
      restoreEnvVar("GEOCODING_PROVIDER", originalGeocodingProvider);
      restoreEnvVar("WEATHER_PROVIDER", originalWeatherProvider);
    }
  });

  it("get_demoFalseNActivePasLeModeDemo", async () => {
    server.use(
      http.get(BAN_URL, () =>
        HttpResponse.json({ features: [{ geometry: { coordinates: [4.08, 44.13] } }] }),
      ),
      http.get(OPEN_METEO_URL, () =>
        HttpResponse.json({ hourly: { time: ["2026-01-01T00:00:00.000Z"], temperature_2m: [10] } }),
      ),
    );
    const app = createApp();

    const response = await request(app).get("/forecast").query({ address: "Alès", demo: "false" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      address: "Alès",
      latitude: 44.13,
      longitude: 4.08,
      hourly: [{ time: "2026-01-01T00:00:00.000Z", temperatureCelsius: 10 }],
    });
  });
});

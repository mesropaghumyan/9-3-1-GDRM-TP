import { faker } from "@faker-js/faker";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import { createApp } from "../../src/app";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const RATE_LIMIT_MAX_FOR_TEST = 2;

function mockGeocodingSuccess(lat = 44.13, lon = 4.08) {
  return http.get(NOMINATIM_URL, () => HttpResponse.json([{ lat: String(lat), lon: String(lon) }]));
}

function mockWeatherSuccess(shortwaveRadiation: number[] = [120, 340, 560]) {
  return http.get(OPEN_METEO_URL, () =>
    HttpResponse.json({ hourly: { shortwave_radiation: shortwaveRadiation } }),
  );
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
    const shortwaveRadiation = [100, 200, 300];
    server.use(mockGeocodingSuccess(44.13, 4.08), mockWeatherSuccess(shortwaveRadiation));
    const app = createApp();

    const response = await request(app).get("/forecast").query({ address });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      address,
      latitude: 44.13,
      longitude: 4.08,
      hourly: { shortwave_radiation: shortwaveRadiation },
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
    server.use(http.get(NOMINATIM_URL, () => HttpResponse.json([])));
    const app = createApp();

    const response = await request(app)
      .get("/forecast")
      .query({ address: faker.string.alphanumeric(20) });

    expect(response.status).toBe(404);
    expect(response.body.type).toBe("https://api.tp-meteo.local/errors/address-not-found");
  });

  it("get_geocodageEnPanneRenvoie502SansDetailTechnique", async () => {
    server.use(http.get(NOMINATIM_URL, () => new HttpResponse(null, { status: 500 })));
    const app = createApp();

    const response = await request(app).get("/forecast").query({ address: faker.location.city() });

    expect(response.status).toBe(502);
    expect(response.body.type).toBe("https://api.tp-meteo.local/errors/upstream-service-error");
    expect(response.body.detail).not.toMatch(/nominatim|http|500|stack/i);
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
      process.env.RATE_LIMIT_MAX = originalMax;
    }
  });
});

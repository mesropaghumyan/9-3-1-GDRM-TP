import { faker } from "@faker-js/faker";
import { HttpResponse, delay, http } from "msw";
import { setupServer } from "msw/node";
import { UpstreamServiceError } from "../../src/domain/errors/UpstreamServiceError";
import { UpstreamTimeoutError } from "../../src/domain/errors/UpstreamTimeoutError";
import { Coordinates } from "../../src/domain/model/Coordinates";
import { FetchHttpClient } from "../../src/infrastructure/outbound/http/FetchHttpClient";
import { OpenMeteoWeatherAdapter } from "../../src/infrastructure/outbound/OpenMeteoWeatherAdapter";
import { fakeLogger } from "../support/fakeLogger";

const BASE_URL = "https://api.open-meteo.com/v1";
const NOMINAL_TIMEOUT_MS = 2_000;
const SHORT_TIMEOUT_MS = 20;
const SLOW_RESPONSE_DELAY_MS = 200;

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function randomCoordinates(): Coordinates {
  return Coordinates.create(faker.location.latitude(), faker.location.longitude());
}

function buildAdapter(timeoutMs: number = NOMINAL_TIMEOUT_MS): OpenMeteoWeatherAdapter {
  const httpClient = new FetchHttpClient({ timeoutMs });
  return new OpenMeteoWeatherAdapter(httpClient, BASE_URL, fakeLogger());
}

describe("OpenMeteoWeatherAdapter", () => {
  it("getHourlyForecast", async () => {
    const coordinates = randomCoordinates();
    const shortwaveRadiation = faker.helpers.multiple(
      () => faker.number.float({ min: 0, max: 1000 }),
      {
        count: 3,
      },
    );
    server.use(
      http.get(`${BASE_URL}/forecast`, () =>
        HttpResponse.json({ hourly: { shortwave_radiation: shortwaveRadiation } }),
      ),
    );
    const adapter = buildAdapter();

    const forecast = await adapter.getHourlyForecast(coordinates);

    expect(forecast.shortwave_radiation).toEqual(shortwaveRadiation);
  });

  it("getHourlyForecast_erreurServeurLeveUpstreamServiceError", async () => {
    const coordinates = randomCoordinates();
    server.use(http.get(`${BASE_URL}/forecast`, () => new HttpResponse(null, { status: 503 })));
    const adapter = buildAdapter();

    const act = () => adapter.getHourlyForecast(coordinates);

    await expect(act).rejects.toThrow(UpstreamServiceError);
  });

  it("getHourlyForecast_delaiDepasseLeveUpstreamTimeoutError", async () => {
    const coordinates = randomCoordinates();
    server.use(
      http.get(`${BASE_URL}/forecast`, async () => {
        await delay(SLOW_RESPONSE_DELAY_MS);
        return HttpResponse.json({ hourly: { shortwave_radiation: [] } });
      }),
    );
    const adapter = buildAdapter(SHORT_TIMEOUT_MS);

    const act = () => adapter.getHourlyForecast(coordinates);

    await expect(act).rejects.toThrow(UpstreamTimeoutError);
  });
});

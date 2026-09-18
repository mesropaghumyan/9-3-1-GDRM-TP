import { HttpResponse, delay, http } from "msw";
import { setupServer } from "msw/node";
import { describeWeatherPortContract } from "../contract/weatherPort.contract";
import { MetNorwayWeatherAdapter } from "../../src/infrastructure/outbound/MetNorwayWeatherAdapter";
import { OpenMeteoWeatherAdapter } from "../../src/infrastructure/outbound/OpenMeteoWeatherAdapter";
import { FetchHttpClient } from "../../src/infrastructure/outbound/http/FetchHttpClient";
import { fakeLogger } from "../support/fakeLogger";

const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1";
const OPEN_METEO_FORECAST_URL = `${OPEN_METEO_BASE_URL}/forecast`;
const MET_NORWAY_BASE_URL = "https://api.met.no/weatherapi/locationforecast/2.0";
const MET_NORWAY_COMPACT_URL = `${MET_NORWAY_BASE_URL}/compact`;
const DEFAULT_TIMEOUT_MS = 2_000;

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function metNorwayTimeseries(temperatures: number[]) {
  return temperatures.map((air_temperature) => ({
    data: { instant: { details: { air_temperature } } },
  }));
}

describeWeatherPortContract({
  name: "OpenMeteoWeatherAdapter",
  buildAdapter: (timeoutMs = DEFAULT_TIMEOUT_MS) =>
    new OpenMeteoWeatherAdapter(
      new FetchHttpClient({ timeoutMs }),
      OPEN_METEO_BASE_URL,
      fakeLogger(),
    ),
  registerSuccess: (temperatures) =>
    server.use(
      http.get(OPEN_METEO_FORECAST_URL, () =>
        HttpResponse.json({ hourly: { temperature_2m: temperatures } }),
      ),
    ),
  registerMalformedResponse: () =>
    server.use(http.get(OPEN_METEO_FORECAST_URL, () => new HttpResponse(null, { status: 500 }))),
  registerSlowResponse: (delayMs) =>
    server.use(
      http.get(OPEN_METEO_FORECAST_URL, async () => {
        await delay(delayMs);
        return HttpResponse.json({ hourly: { temperature_2m: [] } });
      }),
    ),
});

describeWeatherPortContract({
  name: "MetNorwayWeatherAdapter",
  buildAdapter: (timeoutMs = DEFAULT_TIMEOUT_MS) =>
    new MetNorwayWeatherAdapter(
      new FetchHttpClient({ timeoutMs }),
      MET_NORWAY_BASE_URL,
      fakeLogger(),
    ),
  registerSuccess: (temperatures) =>
    server.use(
      http.get(MET_NORWAY_COMPACT_URL, () =>
        HttpResponse.json({ properties: { timeseries: metNorwayTimeseries(temperatures) } }),
      ),
    ),
  registerMalformedResponse: () =>
    server.use(http.get(MET_NORWAY_COMPACT_URL, () => new HttpResponse(null, { status: 500 }))),
  registerSlowResponse: (delayMs) =>
    server.use(
      http.get(MET_NORWAY_COMPACT_URL, async () => {
        await delay(delayMs);
        return HttpResponse.json({ properties: { timeseries: metNorwayTimeseries([]) } });
      }),
    ),
});

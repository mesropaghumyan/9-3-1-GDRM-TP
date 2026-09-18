import { HttpResponse, delay, http } from "msw";
import { setupServer } from "msw/node";
import { describeGeocodingPortContract } from "../contract/geocodingPort.contract";
import { BanGeocodingAdapter } from "../../src/infrastructure/outbound/BanGeocodingAdapter";
import { NominatimGeocodingAdapter } from "../../src/infrastructure/outbound/NominatimGeocodingAdapter";
import { FetchHttpClient } from "../../src/infrastructure/outbound/http/FetchHttpClient";
import { fakeLogger } from "../support/fakeLogger";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const NOMINATIM_SEARCH_URL = `${NOMINATIM_BASE_URL}/search`;
const BAN_BASE_URL = "https://api-adresse.data.gouv.fr";
const BAN_SEARCH_URL = `${BAN_BASE_URL}/search/`;
const DEFAULT_TIMEOUT_MS = 2_000;

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describeGeocodingPortContract({
  name: "NominatimGeocodingAdapter",
  buildAdapter: (timeoutMs = DEFAULT_TIMEOUT_MS) =>
    new NominatimGeocodingAdapter(
      new FetchHttpClient({ timeoutMs }),
      NOMINATIM_BASE_URL,
      fakeLogger(),
    ),
  registerSuccess: ({ latitude, longitude }) =>
    server.use(
      http.get(NOMINATIM_SEARCH_URL, () =>
        HttpResponse.json([{ lat: String(latitude), lon: String(longitude) }]),
      ),
    ),
  registerNotFound: () => server.use(http.get(NOMINATIM_SEARCH_URL, () => HttpResponse.json([]))),
  registerMalformedResponse: () =>
    server.use(http.get(NOMINATIM_SEARCH_URL, () => new HttpResponse(null, { status: 500 }))),
  registerSlowResponse: (delayMs) =>
    server.use(
      http.get(NOMINATIM_SEARCH_URL, async () => {
        await delay(delayMs);
        return HttpResponse.json([{ lat: "0", lon: "0" }]);
      }),
    ),
});

describeGeocodingPortContract({
  name: "BanGeocodingAdapter",
  buildAdapter: (timeoutMs = DEFAULT_TIMEOUT_MS) =>
    new BanGeocodingAdapter(new FetchHttpClient({ timeoutMs }), BAN_BASE_URL, fakeLogger()),
  registerSuccess: ({ latitude, longitude }) =>
    server.use(
      http.get(BAN_SEARCH_URL, () =>
        HttpResponse.json({ features: [{ geometry: { coordinates: [longitude, latitude] } }] }),
      ),
    ),
  registerNotFound: () =>
    server.use(http.get(BAN_SEARCH_URL, () => HttpResponse.json({ features: [] }))),
  registerMalformedResponse: () =>
    server.use(http.get(BAN_SEARCH_URL, () => new HttpResponse(null, { status: 500 }))),
  registerSlowResponse: (delayMs) =>
    server.use(
      http.get(BAN_SEARCH_URL, async () => {
        await delay(delayMs);
        return HttpResponse.json({ features: [{ geometry: { coordinates: [0, 0] } }] });
      }),
    ),
});

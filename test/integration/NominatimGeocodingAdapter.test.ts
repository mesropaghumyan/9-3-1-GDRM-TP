import { faker } from "@faker-js/faker";
import { HttpResponse, delay, http } from "msw";
import { setupServer } from "msw/node";
import { AddressNotFoundError } from "../../src/domain/errors/AddressNotFoundError";
import { UpstreamServiceError } from "../../src/domain/errors/UpstreamServiceError";
import { UpstreamTimeoutError } from "../../src/domain/errors/UpstreamTimeoutError";
import { Address } from "../../src/domain/model/Address";
import { FetchHttpClient } from "../../src/infrastructure/outbound/http/FetchHttpClient";
import { NominatimGeocodingAdapter } from "../../src/infrastructure/outbound/NominatimGeocodingAdapter";
import { fakeLogger } from "../support/fakeLogger";

const BASE_URL = "https://nominatim.openstreetmap.org";
const NOMINAL_TIMEOUT_MS = 2_000;
const SHORT_TIMEOUT_MS = 20;
const SLOW_RESPONSE_DELAY_MS = 200;

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function buildAdapter(timeoutMs: number = NOMINAL_TIMEOUT_MS): NominatimGeocodingAdapter {
  const httpClient = new FetchHttpClient({ timeoutMs });
  return new NominatimGeocodingAdapter(httpClient, BASE_URL, fakeLogger());
}

describe("NominatimGeocodingAdapter", () => {
  it("locate", async () => {
    const address = Address.create(faker.location.city());
    const lat = faker.location.latitude();
    const lon = faker.location.longitude();
    server.use(
      http.get(`${BASE_URL}/search`, () =>
        HttpResponse.json([{ lat: String(lat), lon: String(lon) }]),
      ),
    );
    const adapter = buildAdapter();

    const coordinates = await adapter.locate(address);

    expect(coordinates.latitude).toBeCloseTo(lat);
    expect(coordinates.longitude).toBeCloseTo(lon);
  });

  it("locate_aucunResultatLeveAddressNotFoundError", async () => {
    const address = Address.create(faker.location.city());
    server.use(http.get(`${BASE_URL}/search`, () => HttpResponse.json([])));
    const adapter = buildAdapter();

    const act = () => adapter.locate(address);

    await expect(act).rejects.toThrow(AddressNotFoundError);
  });

  it("locate_coordonneesHorsBornesLeveUpstreamServiceError", async () => {
    const address = Address.create(faker.location.city());
    server.use(
      http.get(`${BASE_URL}/search`, () => HttpResponse.json([{ lat: "999", lon: "999" }])),
    );
    const adapter = buildAdapter();

    const act = () => adapter.locate(address);

    await expect(act).rejects.toThrow(UpstreamServiceError);
  });

  it("locate_erreurServeurLeveUpstreamServiceError", async () => {
    const address = Address.create(faker.location.city());
    server.use(http.get(`${BASE_URL}/search`, () => new HttpResponse(null, { status: 500 })));
    const adapter = buildAdapter();

    const act = () => adapter.locate(address);

    await expect(act).rejects.toThrow(UpstreamServiceError);
  });

  it("locate_delaiDepasseLeveUpstreamTimeoutError", async () => {
    const address = Address.create(faker.location.city());
    server.use(
      http.get(`${BASE_URL}/search`, async () => {
        await delay(SLOW_RESPONSE_DELAY_MS);
        return HttpResponse.json([{ lat: "0", lon: "0" }]);
      }),
    );
    const adapter = buildAdapter(SHORT_TIMEOUT_MS);

    const act = () => adapter.locate(address);

    await expect(act).rejects.toThrow(UpstreamTimeoutError);
  });
});

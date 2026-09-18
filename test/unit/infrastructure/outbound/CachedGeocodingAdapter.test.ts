import { faker } from "@faker-js/faker";
import { CachedGeocodingAdapter } from "../../../../src/infrastructure/outbound/CachedGeocodingAdapter";
import { Address } from "../../../../src/domain/model/Address";
import { Coordinates } from "../../../../src/domain/model/Coordinates";
import type { GeocodingPort } from "../../../../src/domain/ports/GeocodingPort";

const TTL_MS = 1_000;
const SHORT_TTL_MS = 10;

function randomCoordinates(): Coordinates {
  return Coordinates.create(
    faker.number.float({ min: -90, max: 90 }),
    faker.number.float({ min: -180, max: 180 }),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("CachedGeocodingAdapter", () => {
  it("locate", async () => {
    const address = Address.create(faker.location.city());
    const coordinates = randomCoordinates();
    const delegate: GeocodingPort = { locate: jest.fn().mockResolvedValue(coordinates) };
    const adapter = new CachedGeocodingAdapter(delegate, { ttlMs: TTL_MS });

    const result = await adapter.locate(address);

    expect(result).toBe(coordinates);
    expect(delegate.locate).toHaveBeenCalledTimes(1);
  });

  it("locate_deuxiemeAppelMemeAdresseNAppellePasLeDelegate", async () => {
    const rawAddress = faker.location.city();
    const coordinates = randomCoordinates();
    const delegate: GeocodingPort = { locate: jest.fn().mockResolvedValue(coordinates) };
    const adapter = new CachedGeocodingAdapter(delegate, { ttlMs: TTL_MS });
    await adapter.locate(Address.create(rawAddress));

    const result = await adapter.locate(Address.create(rawAddress));

    expect(result).toBe(coordinates);
    expect(delegate.locate).toHaveBeenCalledTimes(1);
  });

  it("locate_memeAdresseCasseDifferenteNAppellePasLeDelegate", async () => {
    const rawAddress = faker.location.city();
    const coordinates = randomCoordinates();
    const delegate: GeocodingPort = { locate: jest.fn().mockResolvedValue(coordinates) };
    const adapter = new CachedGeocodingAdapter(delegate, { ttlMs: TTL_MS });
    await adapter.locate(Address.create(rawAddress));

    const result = await adapter.locate(Address.create(rawAddress.toUpperCase()));

    expect(result).toBe(coordinates);
    expect(delegate.locate).toHaveBeenCalledTimes(1);
  });

  it("locate_apresExpirationTtlRappelleLeDelegate", async () => {
    const rawAddress = faker.location.city();
    const firstCoordinates = randomCoordinates();
    const secondCoordinates = randomCoordinates();
    const delegate: GeocodingPort = {
      locate: jest
        .fn()
        .mockResolvedValueOnce(firstCoordinates)
        .mockResolvedValueOnce(secondCoordinates),
    };
    const adapter = new CachedGeocodingAdapter(delegate, { ttlMs: SHORT_TTL_MS });
    await adapter.locate(Address.create(rawAddress));
    await sleep(SHORT_TTL_MS * 3);

    const result = await adapter.locate(Address.create(rawAddress));

    expect(result).toBe(secondCoordinates);
    expect(delegate.locate).toHaveBeenCalledTimes(2);
  });
});

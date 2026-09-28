import { faker } from "@faker-js/faker";
import { InMemoryCachePort } from "../../../../../src/infrastructure/outbound/cache/InMemoryCachePort";

const TTL_MS = 1_000;
const SHORT_TTL_MS = 10;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("InMemoryCachePort", () => {
  it("get_cleAbsenteRenvoieUndefined", () => {
    const cache = new InMemoryCachePort<string>();

    const value = cache.get(faker.string.uuid());

    expect(value).toBeUndefined();
  });

  it("set_puisGetRenvoieLaValeurStockee", () => {
    const cache = new InMemoryCachePort<string>();
    const key = faker.string.uuid();
    const value = faker.lorem.word();

    cache.set(key, value, TTL_MS);

    expect(cache.get(key)).toBe(value);
  });

  it("get_apresExpirationDuTtlRenvoieUndefined", async () => {
    const cache = new InMemoryCachePort<string>();
    const key = faker.string.uuid();
    cache.set(key, faker.lorem.word(), SHORT_TTL_MS);

    await sleep(SHORT_TTL_MS * 3);

    expect(cache.get(key)).toBeUndefined();
  });
});

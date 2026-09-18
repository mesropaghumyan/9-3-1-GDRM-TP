import { faker } from "@faker-js/faker";
import { RetryHttpClient } from "../../../../src/infrastructure/outbound/http/RetryHttpClient";
import type { HttpClient } from "../../../../src/infrastructure/outbound/http/HttpClient";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1;
const SOME_URL = "https://example.test/resource";

describe("RetryHttpClient", () => {
  it("getJson", async () => {
    const expected = { value: faker.string.uuid() };
    const delegate: HttpClient = { getJson: jest.fn().mockResolvedValue(expected) };
    const client = new RetryHttpClient(delegate, {
      maxAttempts: MAX_ATTEMPTS,
      baseDelayMs: BASE_DELAY_MS,
    });

    const result = await client.getJson(SOME_URL, {});

    expect(result).toBe(expected);
    expect(delegate.getJson).toHaveBeenCalledTimes(1);
  });

  it("getJson_deuxEchecsPuisSuccesRenvoieLeResultat", async () => {
    const expected = { value: faker.string.uuid() };
    const delegate: HttpClient = {
      getJson: jest
        .fn()
        .mockRejectedValueOnce(new Error("panne réseau ponctuelle"))
        .mockRejectedValueOnce(new Error("503 transitoire"))
        .mockResolvedValueOnce(expected),
    };
    const client = new RetryHttpClient(delegate, {
      maxAttempts: MAX_ATTEMPTS,
      baseDelayMs: BASE_DELAY_MS,
    });

    const result = await client.getJson(SOME_URL, {});

    expect(result).toBe(expected);
    expect(delegate.getJson).toHaveBeenCalledTimes(3);
  });

  it("getJson_echecsRepetesRejetteApresMaxAttempts", async () => {
    const persistentError = new Error("service définitivement en panne");
    const delegate: HttpClient = { getJson: jest.fn().mockRejectedValue(persistentError) };
    const client = new RetryHttpClient(delegate, {
      maxAttempts: MAX_ATTEMPTS,
      baseDelayMs: BASE_DELAY_MS,
    });

    const act = () => client.getJson(SOME_URL, {});

    await expect(act).rejects.toThrow(persistentError);
    expect(delegate.getJson).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });
});

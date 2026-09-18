import { faker } from "@faker-js/faker";
import { CircuitBreakerHttpClient } from "../../../../src/infrastructure/outbound/http/CircuitBreakerHttpClient";
import { UpstreamServiceError } from "../../../../src/domain/errors/UpstreamServiceError";
import type { HttpClient } from "../../../../src/infrastructure/outbound/http/HttpClient";
import type { Logger } from "../../../../src/logger";

const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT_MS = 20;
const SOME_URL = "https://example.test/resource";

function fakeLogger(): Logger {
  return { warn: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("CircuitBreakerHttpClient", () => {
  it("getJson", async () => {
    const expected = { value: faker.string.uuid() };
    const delegate: HttpClient = { getJson: jest.fn().mockResolvedValue(expected) };
    const client = new CircuitBreakerHttpClient(
      delegate,
      { failureThreshold: FAILURE_THRESHOLD, resetTimeoutMs: RESET_TIMEOUT_MS },
      fakeLogger(),
    );

    const result = await client.getJson(SOME_URL, {});

    expect(result).toBe(expected);
  });

  it("getJson_seuilAtteintOuvreLeCircuitEtRejetteSansAppelerLeDelegate", async () => {
    const delegate: HttpClient = { getJson: jest.fn().mockRejectedValue(new Error("panne amont")) };
    const client = new CircuitBreakerHttpClient(
      delegate,
      { failureThreshold: FAILURE_THRESHOLD, resetTimeoutMs: RESET_TIMEOUT_MS },
      fakeLogger(),
    );
    for (let i = 0; i < FAILURE_THRESHOLD; i++) {
      await expect(client.getJson(SOME_URL, {})).rejects.toThrow();
    }

    const act = () => client.getJson(SOME_URL, {});

    await expect(act).rejects.toThrow(UpstreamServiceError);
    expect(delegate.getJson).toHaveBeenCalledTimes(FAILURE_THRESHOLD);
  });

  it("getJson_apresResetTimeoutRepasseEnHalfOpenEtRappelleLeDelegate", async () => {
    const expected = { value: faker.string.uuid() };
    const delegate: HttpClient = {
      getJson: jest
        .fn()
        .mockRejectedValueOnce(new Error("panne 1"))
        .mockRejectedValueOnce(new Error("panne 2"))
        .mockRejectedValueOnce(new Error("panne 3"))
        .mockResolvedValueOnce(expected),
    };
    const client = new CircuitBreakerHttpClient(
      delegate,
      { failureThreshold: FAILURE_THRESHOLD, resetTimeoutMs: RESET_TIMEOUT_MS },
      fakeLogger(),
    );
    for (let i = 0; i < FAILURE_THRESHOLD; i++) {
      await expect(client.getJson(SOME_URL, {})).rejects.toThrow();
    }
    await sleep(RESET_TIMEOUT_MS * 2);

    const result = await client.getJson(SOME_URL, {});

    expect(result).toBe(expected);
    expect(delegate.getJson).toHaveBeenCalledTimes(FAILURE_THRESHOLD + 1);
  });
});

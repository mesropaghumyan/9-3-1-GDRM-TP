import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../../config/tokens";
import { FetchHttpClient } from "./FetchHttpClient";
import type { HttpClient, RequestOptions } from "./HttpClient";
import { sleep } from "./sleep";

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
}

const JITTER_MAX_MS = 100;

/**
 * Decorator absorbant les erreurs transitoires (coupure réseau ponctuelle,
 * `503` isolé) sans solliciter inutilement le circuit breaker. Limité aux
 * appels `GET` (idempotents) — le seul type d'appel de ce TP (cf. §3.7).
 *
 * Le délégué est injecté via le jeton de classe `FetchHttpClient` : tsyringe
 * ne peut pas résoudre un paramètre typé par l'interface `HttpClient` (les
 * interfaces sont effacées à la compilation), il faut donc pointer
 * explicitement la couche concrète à décorer (cf. docs/STD.md §3.6).
 */
@injectable()
export class RetryHttpClient implements HttpClient {
  constructor(
    @inject(FetchHttpClient) private readonly delegate: HttpClient,
    @inject(TOKENS.RetryOptions) private readonly options: RetryOptions,
  ) {}

  async getJson<T>(url: string, params: Record<string, string>, opts?: RequestOptions): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await this.delegate.getJson<T>(url, params, opts);
      } catch (err) {
        lastError = err;
        if (attempt === this.options.maxAttempts) break;
        const backoff = this.options.baseDelayMs * 2 ** (attempt - 1);
        await sleep(backoff + Math.random() * JITTER_MAX_MS);
      }
    }
    throw lastError;
  }
}

import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../../config/tokens";
import type { HttpClient, RequestOptions } from "./HttpClient";
import { HttpRequestError, HttpTimeoutError } from "./HttpClientError";

export interface FetchHttpClientOptions {
  timeoutMs: number;
}

/**
 * Implémentation de base du port `HttpClient`, avec `fetch` natif (Node ≥ 18)
 * et un timeout explicite sur chaque appel — évite les requêtes bloquantes
 * indéfiniment (cf. docs/STD.md §4, §10).
 */
@injectable()
export class FetchHttpClient implements HttpClient {
  constructor(
    @inject(TOKENS.FetchHttpClientOptions) private readonly options: FetchHttpClientOptions,
  ) {}

  async getJson<T>(url: string, params: Record<string, string>, opts?: RequestOptions): Promise<T> {
    const target = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      target.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(target, {
        headers: opts?.headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new HttpRequestError(target.toString(), `HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof HttpRequestError) throw err;
      if (controller.signal.aborted) {
        throw new HttpTimeoutError(target.toString());
      }
      throw new HttpRequestError(target.toString(), err);
    } finally {
      clearTimeout(timeout);
    }
  }
}

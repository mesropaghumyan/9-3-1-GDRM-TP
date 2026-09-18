import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../../config/tokens";
import { UpstreamServiceError } from "../../../domain/errors/UpstreamServiceError";
import type { Logger } from "../../../logger";
import type { HttpClient, RequestOptions } from "./HttpClient";
import { RetryHttpClient } from "./RetryHttpClient";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
}

type CircuitState = "closed" | "open" | "half-open";

/**
 * Évite de continuer à taper sur un service déjà en panne : chaque tentative
 * pendant une panne prolongée coûterait un timeout complet à chaque
 * utilisateur (cf. docs/STD.md §3.7). Couche la plus externe de la chaîne de
 * résilience : enregistrée en singleton par la composition root pour être
 * partagée entre les deux adaptateurs sortants (cf. §3.6).
 */
@injectable()
export class CircuitBreakerHttpClient implements HttpClient {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private openedAt = 0;

  constructor(
    @inject(RetryHttpClient) private readonly delegate: HttpClient,
    @inject(TOKENS.CircuitBreakerOptions) private readonly options: CircuitBreakerOptions,
    @inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  async getJson<T>(url: string, params: Record<string, string>, opts?: RequestOptions): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.openedAt < this.options.resetTimeoutMs) {
        throw new UpstreamServiceError("Service temporairement écarté (circuit ouvert).");
      }
      this.state = "half-open";
    }
    try {
      const result = await this.delegate.getJson<T>(url, params, opts);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.options.failureThreshold && this.state !== "open") {
      this.state = "open";
      this.openedAt = Date.now();
      this.logger.warn(
        { failureCount: this.failureCount },
        "Circuit ouvert suite à des échecs répétés",
      );
    }
  }

  private onSuccess(): void {
    if (this.state !== "closed") {
      this.logger.info("Circuit refermé après un appel réussi");
    }
    this.state = "closed";
    this.failureCount = 0;
  }
}

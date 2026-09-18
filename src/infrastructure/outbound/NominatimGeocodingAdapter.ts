import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../config/tokens";
import { AddressNotFoundError } from "../../domain/errors/AddressNotFoundError";
import { InvalidCoordinatesError } from "../../domain/errors/InvalidCoordinatesError";
import { UpstreamServiceError } from "../../domain/errors/UpstreamServiceError";
import { UpstreamTimeoutError } from "../../domain/errors/UpstreamTimeoutError";
import { Coordinates } from "../../domain/model/Coordinates";
import type { Address } from "../../domain/model/Address";
import type { GeocodingPort } from "../../domain/ports/GeocodingPort";
import type { Logger } from "../../logger";
import type { HttpClient } from "./http/HttpClient";
import { CircuitBreakerHttpClient } from "./http/CircuitBreakerHttpClient";
import { HttpTimeoutError } from "./http/HttpClientError";

const NOMINATIM_USER_AGENT = "tp-meteo-app/1.0 (contact: mesropaghumyan@outlook.fr)";

interface NominatimResult {
  lat: string;
  lon: string;
}

/**
 * Adaptateur du port `GeocodingPort` vers Nominatim (OpenStreetMap).
 * cf. docs/STD.md §3.4.
 */
@injectable()
export class NominatimGeocodingAdapter implements GeocodingPort {
  constructor(
    @inject(CircuitBreakerHttpClient) private readonly httpClient: HttpClient,
    @inject(TOKENS.NominatimBaseUrl) private readonly baseUrl: string,
    @inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  async locate(address: Address): Promise<Coordinates> {
    try {
      const results = await this.httpClient.getJson<NominatimResult[]>(
        `${this.baseUrl}/search`,
        { q: address.toString(), format: "jsonv2", limit: "1" },
        { headers: { "User-Agent": NOMINATIM_USER_AGENT } },
      );
      if (results.length === 0) {
        throw new AddressNotFoundError(`Aucune correspondance pour "${address.toString()}".`);
      }
      return Coordinates.create(Number(results[0]?.lat), Number(results[0]?.lon));
    } catch (err) {
      if (err instanceof AddressNotFoundError) throw err;
      if (err instanceof InvalidCoordinatesError) {
        this.logger.error({ err }, "Le géocodage a renvoyé des coordonnées invalides");
        throw new UpstreamServiceError("Réponse invalide du service de géocodage.", err);
      }
      if (err instanceof HttpTimeoutError) {
        this.logger.error({ err }, "Délai dépassé pour l'appel au service de géocodage");
        throw new UpstreamTimeoutError("Le service de géocodage n'a pas répondu à temps.", err);
      }
      this.logger.error({ err }, "Échec d'appel au service de géocodage");
      throw new UpstreamServiceError("Service de géocodage indisponible.", err);
    }
  }
}

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

const BAN_USER_AGENT = "tp-meteo-app/1.0 (contact: mesropaghumyan@outlook.fr)";

interface BanFeature {
  geometry: { coordinates: [number, number] }; // GeoJSON : [longitude, latitude]
}

interface BanResponse {
  features: BanFeature[];
}

/**
 * Adaptateur du port `GeocodingPort` vers l'API Adresse de la Base Adresse
 * Nationale (géocodeur souverain, cf. docs/TP_2.md).
 *
 * Point d'attention : contrairement à Nominatim (`lat`/`lon` séparés), la BAN
 * renvoie des coordonnées au format GeoJSON `[longitude, latitude]` —
 * l'ordre inverse. Une confusion ici passerait les tests avec des adresses
 * proches de l'équateur/méridien mais produirait des coordonnées absurdes
 * ailleurs, d'où le test de contrat commun (cf. docs/STD.md §9).
 */
@injectable()
export class BanGeocodingAdapter implements GeocodingPort {
  constructor(
    @inject(CircuitBreakerHttpClient) private readonly httpClient: HttpClient,
    @inject(TOKENS.BanBaseUrl) private readonly baseUrl: string,
    @inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  async locate(address: Address): Promise<Coordinates> {
    try {
      const response = await this.httpClient.getJson<BanResponse>(
        `${this.baseUrl}/search/`,
        { q: address.toString(), limit: "1" },
        { headers: { "User-Agent": BAN_USER_AGENT } },
      );
      const feature = response.features[0];
      if (!feature) {
        throw new AddressNotFoundError(`Aucune correspondance pour "${address.toString()}".`);
      }
      const [longitude, latitude] = feature.geometry.coordinates;
      return Coordinates.create(Number(latitude), Number(longitude));
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

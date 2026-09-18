import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../config/tokens";
import { UpstreamServiceError } from "../../domain/errors/UpstreamServiceError";
import { UpstreamTimeoutError } from "../../domain/errors/UpstreamTimeoutError";
import type { Coordinates } from "../../domain/model/Coordinates";
import type { HourlyForecast } from "../../domain/model/WeatherForecast";
import type { WeatherPort } from "../../domain/ports/WeatherPort";
import type { Logger } from "../../logger";
import type { HttpClient } from "./http/HttpClient";
import { CircuitBreakerHttpClient } from "./http/CircuitBreakerHttpClient";
import { HttpTimeoutError } from "./http/HttpClientError";

/**
 * `User-Agent` identifiable obligatoire : une requête sans en-tête explicite
 * (ou avec celui par défaut d'une librairie HTTP) est rejetée en `403` par
 * MET Norway (cf. docs/TP_2.md).
 */
const MET_NORWAY_USER_AGENT = "tp-meteo-app/1.0 (contact: mesropaghumyan@outlook.fr)";

interface MetNorwayResponse {
  properties: {
    timeseries: Array<{
      data: {
        instant: {
          details: { air_temperature?: number } & Record<string, unknown>;
        };
      };
    }>;
  };
}

/**
 * Adaptateur du port `WeatherPort` vers MET Norway Locationforecast
 * (cf. docs/TP_2.md). Contrairement à Open-Meteo, ce fournisseur n'expose
 * aucun champ de rayonnement solaire — d'où le contrat de domaine basé sur
 * la température (`HourlyForecast.temperature`), disponible chez les deux
 * fournisseurs (cf. docs/domain/model/WeatherForecast.ts, RG4).
 */
@injectable()
export class MetNorwayWeatherAdapter implements WeatherPort {
  constructor(
    @inject(CircuitBreakerHttpClient) private readonly httpClient: HttpClient,
    @inject(TOKENS.MetNorwayBaseUrl) private readonly baseUrl: string,
    @inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  async getHourlyForecast(coordinates: Coordinates): Promise<HourlyForecast> {
    try {
      const response = await this.httpClient.getJson<MetNorwayResponse>(
        `${this.baseUrl}/compact`,
        { lat: String(coordinates.latitude), lon: String(coordinates.longitude) },
        { headers: { "User-Agent": MET_NORWAY_USER_AGENT } },
      );
      const temperature = response.properties.timeseries.map(
        (entry) => entry.data.instant.details.air_temperature,
      );
      if (temperature.some((value) => typeof value !== "number")) {
        throw new Error("Réponse MET Norway incomplète : température horaire manquante.");
      }
      return { temperature: temperature as number[] };
    } catch (err) {
      if (err instanceof HttpTimeoutError) {
        this.logger.error({ err }, "Délai dépassé pour l'appel au service météo");
        throw new UpstreamTimeoutError("Le service météo n'a pas répondu à temps.", err);
      }
      this.logger.error({ err }, "Échec d'appel au service météo");
      throw new UpstreamServiceError("Service météo indisponible.", err);
    }
  }
}

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

interface OpenMeteoResponse {
  hourly: { time: string[]; temperature_2m: number[] } & Record<string, unknown>;
}

/**
 * Adaptateur du port `WeatherPort` vers Open-Meteo. Suit le même schéma
 * d'encapsulation d'erreurs que `NominatimGeocodingAdapter`, sans contrainte
 * `User-Agent` spécifique (cf. docs/STD.md §3.4).
 */
@injectable()
export class OpenMeteoWeatherAdapter implements WeatherPort {
  constructor(
    @inject(CircuitBreakerHttpClient) private readonly httpClient: HttpClient,
    @inject(TOKENS.OpenMeteoBaseUrl) private readonly baseUrl: string,
    @inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  async getHourlyForecast(coordinates: Coordinates): Promise<HourlyForecast> {
    try {
      const response = await this.httpClient.getJson<OpenMeteoResponse>(
        `${this.baseUrl}/forecast`,
        {
          latitude: String(coordinates.latitude),
          longitude: String(coordinates.longitude),
          hourly: "temperature_2m",
        },
      );
      // Ne restitue que les champs contractuels (RG4, cf. docs/SFD.md §5), avec un
      // horodatage normalisé (TP3, format de sortie unifié) : Open-Meteo peut
      // renvoyer d'autres champs non documentés dans le contrat.
      return response.hourly.time.map((time, index) => ({
        time: new Date(time).toISOString(),
        temperatureCelsius: response.hourly.temperature_2m[index] as number,
      }));
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

import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../config/tokens";
import type { Coordinates } from "../../domain/model/Coordinates";
import type { HourlyForecast } from "../../domain/model/WeatherForecast";
import type { WeatherPort } from "../../domain/ports/WeatherPort";
import type { Logger } from "../../logger";

const DEMO_HOUR_COUNT = 6;
const DEMO_BASE_TEMPERATURE_CELSIUS = 18;
const DEMO_TEMPERATURE_STEP_CELSIUS = 1.5;
const MS_PER_HOUR = 3_600_000;

/**
 * Implémentation « Strategy » de `WeatherPort` pour le mode démo
 * (cf. docs/TP_3.md) : aucune I/O, jamais d'appel réseau. Génère des
 * horaires plausibles à partir de l'heure courante plutôt que des valeurs
 * totalement statiques, tout en respectant exactement le même contrat de
 * sortie (`HourlyForecastEntry[]`) que les fournisseurs réels.
 */
@injectable()
export class DemoWeatherAdapter implements WeatherPort {
  constructor(@inject(TOKENS.Logger) private readonly logger: Logger) {}

  async getHourlyForecast(coordinates: Coordinates): Promise<HourlyForecast> {
    this.logger.info({ coordinates }, "Mode démo : prévisions météo simulées");
    const now = Date.now();
    return Array.from({ length: DEMO_HOUR_COUNT }, (_, index) => ({
      time: new Date(now + index * MS_PER_HOUR).toISOString(),
      temperatureCelsius: DEMO_BASE_TEMPERATURE_CELSIUS + index * DEMO_TEMPERATURE_STEP_CELSIUS,
    }));
  }
}

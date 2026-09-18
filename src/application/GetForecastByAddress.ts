import { inject, injectable } from "tsyringe";
import { TOKENS } from "../config/tokens";
import { Address } from "../domain/model/Address";
import type { ForecastResult } from "../domain/model/WeatherForecast";
import type { GeocodingPort } from "../domain/ports/GeocodingPort";
import type { WeatherPort } from "../domain/ports/WeatherPort";

/**
 * Cas d'usage unique du TP : orchestration pure, aucune dépendance à un
 * détail technique — cache, retry et circuit breaker des adaptateurs sont
 * invisibles ici (cf. docs/STD.md §3.3). Les décorateurs `@injectable`/
 * `@inject` couplent cette classe à tsyringe (composition root uniquement) ;
 * la signature du constructeur reste des ports du domaine, donc le cas
 * d'usage s'exécute et se teste identiquement sans le conteneur (cf. §9.3).
 */
@injectable()
export class GetForecastByAddress {
  constructor(
    @inject(TOKENS.GeocodingPort) private readonly geocoding: GeocodingPort,
    @inject(TOKENS.WeatherPort) private readonly weather: WeatherPort,
  ) {}

  async execute(rawAddress: string): Promise<ForecastResult> {
    const address = Address.create(rawAddress); // fail-fast (RG1)
    const coordinates = await this.geocoding.locate(address); // RG2, RG3
    const forecast = await this.weather.getHourlyForecast(coordinates);

    return { address, coordinates, forecast };
  }
}

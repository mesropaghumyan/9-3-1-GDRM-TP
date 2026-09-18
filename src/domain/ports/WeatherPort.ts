import type { Coordinates } from "../model/Coordinates";
import type { HourlyForecast } from "../model/WeatherForecast";

/** Port sortant (inversion de dépendance) : le domaine ignore le fournisseur concret. */
export interface WeatherPort {
  getHourlyForecast(coordinates: Coordinates): Promise<HourlyForecast>;
}

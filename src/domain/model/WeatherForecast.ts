import type { Address } from "./Address";
import type { Coordinates } from "./Coordinates";

/**
 * Donnée horaire restituée telle que fournie par le fournisseur météo, sans
 * transformation métier supplémentaire (RG4, cf. docs/SFD.md §5).
 */
export interface HourlyForecast {
  shortwave_radiation: number[];
}

/** Résultat agrégé du cas d'usage `GetForecastByAddress` (cf. docs/STD.md §3.3). */
export interface ForecastResult {
  address: Address;
  coordinates: Coordinates;
  forecast: HourlyForecast;
}

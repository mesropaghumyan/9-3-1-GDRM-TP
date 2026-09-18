import type { Address } from "./Address";
import type { Coordinates } from "./Coordinates";

/**
 * Donnée horaire du domaine : température, choisie car c'est la seule
 * grandeur que tous les fournisseurs météo pris en charge (Open-Meteo,
 * MET Norway) exposent nativement et de façon comparable — contrairement au
 * rayonnement solaire d'origine (`shortwave_radiation`), propre à Open-Meteo
 * et absent de MET Norway (RG4, cf. docs/SFD.md §5). Chaque adaptateur
 * traduit son format propriétaire vers ce champ, sans fuite de DTO externe.
 */
export interface HourlyForecast {
  temperature: number[];
}

/** Résultat agrégé du cas d'usage `GetForecastByAddress` (cf. docs/STD.md §3.3). */
export interface ForecastResult {
  address: Address;
  coordinates: Coordinates;
  forecast: HourlyForecast;
}

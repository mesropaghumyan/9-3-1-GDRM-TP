import type { Address } from "./Address";
import type { Coordinates } from "./Coordinates";

/**
 * Une entrée horaire : un horodatage ISO 8601 et une température en degrés
 * Celsius — la seule grandeur que tous les fournisseurs météo pris en charge
 * (Open-Meteo, MET Norway) exposent nativement et de façon comparable,
 * contrairement au rayonnement solaire d'origine (`shortwave_radiation`),
 * propre à Open-Meteo (RG4, cf. docs/SFD.md §5). Chaque adaptateur traduit
 * son format propriétaire (y compris le format d'horodatage) vers cette
 * forme unique, sans fuite de DTO externe (TP3 : format de sortie unifié).
 */
export interface HourlyForecastEntry {
  time: string;
  temperatureCelsius: number;
}

/**
 * Prévision horaire du domaine : un tableau, identique en structure quel
 * que soit le fournisseur actif ou le mode (réel/démo) — cf. docs/TP_3.md.
 */
export type HourlyForecast = HourlyForecastEntry[];

/** Résultat agrégé du cas d'usage `GetForecastByAddress` (cf. docs/STD.md §3.3). */
export interface ForecastResult {
  address: Address;
  coordinates: Coordinates;
  forecast: HourlyForecast;
}

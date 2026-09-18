/**
 * Jetons d'injection tsyringe. Un jeton `Symbol` est nécessaire pour tout ce
 * qui n'est pas une classe concrète résolvable par réflexion de type
 * (interfaces du domaine effacées à la compilation, primitives, objets de
 * configuration) — cf. docs/STD.md §3.6.
 */
export const TOKENS = {
  Logger: Symbol("Logger"),
  GeocodingPort: Symbol("GeocodingPort"),
  WeatherPort: Symbol("WeatherPort"),
  // Jeton intermédiaire : le géocodeur "brut" choisi par la config (Nominatim
  // ou BAN), avant décoration par le cache. `TOKENS.GeocodingPort` pointe
  // toujours vers `CachedGeocodingAdapter`, qui délègue à celui-ci
  // (cf. docs/STD.md §3.6, TP2).
  RawGeocodingPort: Symbol("RawGeocodingPort"),
  FetchHttpClientOptions: Symbol("FetchHttpClientOptions"),
  RetryOptions: Symbol("RetryOptions"),
  CircuitBreakerOptions: Symbol("CircuitBreakerOptions"),
  CachedGeocodingAdapterOptions: Symbol("CachedGeocodingAdapterOptions"),
  NominatimBaseUrl: Symbol("NominatimBaseUrl"),
  BanBaseUrl: Symbol("BanBaseUrl"),
  OpenMeteoBaseUrl: Symbol("OpenMeteoBaseUrl"),
  MetNorwayBaseUrl: Symbol("MetNorwayBaseUrl"),
} as const;

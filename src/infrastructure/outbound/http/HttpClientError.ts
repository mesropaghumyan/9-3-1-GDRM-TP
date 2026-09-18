/**
 * Erreurs techniques internes à la couche HTTP sortante — jamais exposées
 * telles quelles au domaine ni au client de l'API. Les adaptateurs
 * (`NominatimGeocodingAdapter`, `OpenMeteoWeatherAdapter`) les capturent et
 * les traduisent en erreurs métier (`UpstreamServiceError`,
 * `UpstreamTimeoutError`), conformément à CLAUDE.md — Gestion des erreurs.
 */
export class HttpTimeoutError extends Error {
  constructor(url: string) {
    super(`Délai dépassé pour l'appel à ${url}.`);
  }
}

export class HttpRequestError extends Error {
  constructor(
    url: string,
    public override readonly cause?: unknown,
  ) {
    super(`Échec de l'appel à ${url}.`);
  }
}

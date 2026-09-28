/**
 * Port technique interne à l'infrastructure (pas un port du domaine, à
 * l'image de `HttpClient`) : abstrait le mécanisme de stockage du cache pour
 * que `CachedGeocodingAdapter` ne dépende d'aucune implémentation concrète
 * (`Map` en mémoire aujourd'hui, Redis demain si le besoin apparaît) —
 * cf. docs/TP_3.md, docs/STD.md §3.7.
 */
export interface CachePort<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlMs: number): void;
}

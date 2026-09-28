import { injectable } from "tsyringe";
import type { CachePort } from "./CachePort";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Implémentation en mémoire de `CachePort` (pas de champ `static` : l'état
 * vit dans l'instance, scopée par le composition root — cf. docs/TP_3.md).
 * Suffisante pour ce TP (une seule instance backend, donnée non critique si
 * perdue au redémarrage) ; remplaçable par une implémentation Redis sans
 * changer `CachedGeocodingAdapter`, qui ne connaît que `CachePort`.
 */
@injectable()
export class InMemoryCachePort<T> implements CachePort<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

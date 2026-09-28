import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../config/tokens";
import type { Address } from "../../domain/model/Address";
import type { Coordinates } from "../../domain/model/Coordinates";
import type { GeocodingPort } from "../../domain/ports/GeocodingPort";
import type { CachePort } from "./cache/CachePort";
import { InMemoryCachePort } from "./cache/InMemoryCachePort";

export interface CachedGeocodingAdapterOptions {
  ttlMs: number;
}

/**
 * Decorator du port `GeocodingPort` : une adresse pointe toujours vers les
 * mêmes coordonnées (donnée stable), contrairement à la météo — mettre le
 * géocodage en cache est donc sans risque de donnée périmée pour ce TP
 * (cf. docs/STD.md §3.7). C'est cette classe (et non l'adaptateur brut) qui
 * est liée au jeton `TOKENS.GeocodingPort` par la composition root ; son
 * délégué est résolu via `TOKENS.RawGeocodingPort`, dont la liaison dépend
 * du fournisseur choisi en configuration (Nominatim ou BAN — TP2).
 *
 * Le mécanisme de stockage est injecté via `CachePort` plutôt qu'un `Map`
 * codé en dur : le decorator ignore tout de l'implémentation concrète du
 * cache, qui peut évoluer (ex. Redis) sans le modifier (TP3).
 */
@injectable()
export class CachedGeocodingAdapter implements GeocodingPort {
  constructor(
    @inject(TOKENS.RawGeocodingPort) private readonly delegate: GeocodingPort,
    @inject(InMemoryCachePort) private readonly cache: CachePort<Coordinates>,
    @inject(TOKENS.CachedGeocodingAdapterOptions)
    private readonly options: CachedGeocodingAdapterOptions,
  ) {}

  async locate(address: Address): Promise<Coordinates> {
    const key = address.toString().trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }
    const value = await this.delegate.locate(address);
    this.cache.set(key, value, this.options.ttlMs);
    return value;
  }
}

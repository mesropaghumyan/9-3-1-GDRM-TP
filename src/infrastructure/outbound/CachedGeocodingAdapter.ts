import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../config/tokens";
import type { Address } from "../../domain/model/Address";
import type { Coordinates } from "../../domain/model/Coordinates";
import type { GeocodingPort } from "../../domain/ports/GeocodingPort";

export interface CachedGeocodingAdapterOptions {
  ttlMs: number;
}

interface CacheEntry {
  value: Coordinates;
  expiresAt: number;
}

/**
 * Decorator du port `GeocodingPort` : une adresse pointe toujours vers les
 * mêmes coordonnées (donnée stable), contrairement à la météo — mettre le
 * géocodage en cache est donc sans risque de donnée périmée pour ce TP
 * (cf. docs/STD.md §3.7). C'est cette classe (et non l'adaptateur brut) qui
 * est liée au jeton `TOKENS.GeocodingPort` par la composition root ; son
 * délégué est résolu via `TOKENS.RawGeocodingPort`, dont la liaison dépend
 * du fournisseur choisi en configuration (Nominatim ou BAN — TP2).
 */
@injectable()
export class CachedGeocodingAdapter implements GeocodingPort {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @inject(TOKENS.RawGeocodingPort) private readonly delegate: GeocodingPort,
    @inject(TOKENS.CachedGeocodingAdapterOptions)
    private readonly options: CachedGeocodingAdapterOptions,
  ) {}

  async locate(address: Address): Promise<Coordinates> {
    const key = address.toString().trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    const value = await this.delegate.locate(address);
    this.cache.set(key, { value, expiresAt: Date.now() + this.options.ttlMs });
    return value;
  }
}

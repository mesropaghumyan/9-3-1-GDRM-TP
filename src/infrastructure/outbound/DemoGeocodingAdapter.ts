import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../config/tokens";
import type { Address } from "../../domain/model/Address";
import { Coordinates } from "../../domain/model/Coordinates";
import type { GeocodingPort } from "../../domain/ports/GeocodingPort";
import type { Logger } from "../../logger";

// Coordonnées fixes (Paris) : le mode démo ne géocode jamais réellement
// l'adresse fournie, il ne fait que satisfaire le contrat de `GeocodingPort`.
const DEMO_LATITUDE = 48.8566;
const DEMO_LONGITUDE = 2.3522;

/**
 * Implémentation « Strategy » de `GeocodingPort` pour le mode démo
 * (cf. docs/TP_3.md) : aucune I/O, jamais d'appel réseau. Résolue par la
 * composition root à la place de l'adaptateur réel lorsque `?demo=true`,
 * exactement comme le cours l'illustre (SUPPORT_J2.md, Partie 6, Strategy).
 */
@injectable()
export class DemoGeocodingAdapter implements GeocodingPort {
  constructor(@inject(TOKENS.Logger) private readonly logger: Logger) {}

  async locate(address: Address): Promise<Coordinates> {
    this.logger.info({ address: address.toString() }, "Mode démo : géocodage simulé");
    return Coordinates.create(DEMO_LATITUDE, DEMO_LONGITUDE);
  }
}

import type { Address } from "../model/Address";
import type { Coordinates } from "../model/Coordinates";

/** Port sortant (inversion de dépendance) : le domaine ignore le fournisseur concret. */
export interface GeocodingPort {
  locate(address: Address): Promise<Coordinates>;
}

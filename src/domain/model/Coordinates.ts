import { InvalidCoordinatesError } from "../errors/InvalidCoordinatesError";

const LATITUDE_RANGE = { min: -90, max: 90 } as const;
const LONGITUDE_RANGE = { min: -180, max: 180 } as const;

/**
 * Value Object immuable et auto-validé. Une réponse malformée du géocodage
 * (NaN, valeur hors bornes) ne doit jamais atteindre l'appel au service
 * météo : `Coordinates` est responsable de son propre invariant (fail-fast,
 * cf. docs/STD.md §3.2).
 */
export class Coordinates {
  private constructor(
    public readonly latitude: number,
    public readonly longitude: number,
  ) {
    Object.freeze(this);
  }

  static create(latitude: number, longitude: number): Coordinates {
    const isValid =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= LATITUDE_RANGE.min &&
      latitude <= LATITUDE_RANGE.max &&
      longitude >= LONGITUDE_RANGE.min &&
      longitude <= LONGITUDE_RANGE.max;

    if (!isValid) {
      throw new InvalidCoordinatesError(`Coordonnées hors bornes : (${latitude}, ${longitude}).`);
    }
    return new Coordinates(latitude, longitude);
  }
}

import { DomainError } from "./DomainError";

/**
 * Toujours produite à partir d'une donnée amont invalide (réponse du
 * géocodage hors bornes) : traitée côté client comme une panne du service
 * externe, jamais comme une erreur de saisie de l'utilisateur (cf. §7.1).
 */
export class InvalidCoordinatesError extends DomainError {
  readonly code = "invalid-coordinates";
  readonly httpStatus = 502;

  constructor(message: string) {
    super(message);
  }
}

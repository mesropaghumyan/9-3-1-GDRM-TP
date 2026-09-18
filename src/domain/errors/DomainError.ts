/**
 * Racine de la hiérarchie des erreurs métier. Chaque sous-classe porte son
 * propre `code` et `httpStatus` : une seule classe à écrire pour ajouter un
 * nouveau cas d'erreur, sans table de correspondance séparée à maintenir
 * (cf. docs/STD.md §7.1).
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  protected constructor(message: string) {
    super(message);
    // Garantit que `instanceof DomainError` reste fiable même downlevelé par tsc.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

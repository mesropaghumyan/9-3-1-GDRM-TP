import { InvalidAddressError } from "../errors/InvalidAddressError";

/**
 * Value Object immuable : une adresse ne peut exister qu'à l'état valide
 * (RG1, cf. docs/SFD.md §5) — fail-fast dès la construction.
 */
export class Address {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }

  static create(raw: string): Address {
    const trimmed = raw?.trim();
    if (!trimmed) {
      throw new InvalidAddressError("L'adresse ne peut pas être vide.");
    }
    return new Address(trimmed);
  }

  toString(): string {
    return this.value;
  }
}

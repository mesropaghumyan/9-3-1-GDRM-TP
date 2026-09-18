import { DomainError } from "./DomainError";

export class InvalidAddressError extends DomainError {
  readonly code = "invalid-address";
  readonly httpStatus = 400;

  constructor(message: string) {
    super(message);
  }
}

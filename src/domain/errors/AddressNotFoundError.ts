import { DomainError } from "./DomainError";

export class AddressNotFoundError extends DomainError {
  readonly code = "address-not-found";
  readonly httpStatus = 404;

  constructor(message: string) {
    super(message);
  }
}

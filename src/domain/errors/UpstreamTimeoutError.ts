import { DomainError } from "./DomainError";

/**
 * Distincte de `UpstreamServiceError` (502) : un dépassement de délai (RG A5,
 * cf. docs/SFD.md §4) doit être restitué en `504`, pas en `502`.
 */
export class UpstreamTimeoutError extends DomainError {
  readonly code = "upstream-timeout";
  readonly httpStatus = 504;

  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
  }
}

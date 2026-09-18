import { DomainError } from "./DomainError";

export class UpstreamServiceError extends DomainError {
  readonly code = "upstream-service-error";
  readonly httpStatus = 502;

  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
  }
}

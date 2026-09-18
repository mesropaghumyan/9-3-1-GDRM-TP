import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger, type Logger } from "../../../logger";

declare module "express-serve-static-core" {
  interface Request {
    correlationId: string;
    log: Logger;
  }
}

const CORRELATION_ID_HEADER = "X-Correlation-Id";

/**
 * Attache un identifiant de corrélation à chaque requête (propagé depuis
 * l'appelant si fourni) et enrichit le logger de ce contexte, afin de pouvoir
 * suivre une transaction de bout en bout (cf. CLAUDE.md — Observabilité).
 */
export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(CORRELATION_ID_HEADER);
  req.correlationId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();
  req.log = logger.child({ correlationId: req.correlationId });
  res.setHeader(CORRELATION_ID_HEADER, req.correlationId);
  next();
}

import type { NextFunction, Request, Response } from "express";
import { DomainError } from "../../../domain/errors/DomainError";

const ERROR_TITLES: Record<string, string> = {
  "invalid-address": "Adresse invalide",
  "address-not-found": "Adresse introuvable",
  "invalid-coordinates": "Coordonnées invalides",
  "rate-limit-exceeded": "Trop de requêtes",
  "upstream-service-error": "Service externe indisponible",
  "upstream-timeout": "Délai dépassé sur un service externe",
  "internal-error": "Erreur interne",
};

function titleFor(code: string): string {
  return ERROR_TITLES[code] ?? "Erreur";
}

/**
 * Gestionnaire d'erreurs global — uniformise toute l'API au format RFC 7807
 * (Problem Details), avec le code HTTP porté par la classe `DomainError`
 * elle-même comme seule source de vérité (cf. docs/STD.md §7.2, CLAUDE.md).
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const isDomainError = err instanceof DomainError;
  const status = isDomainError ? err.httpStatus : 500;
  const code = isDomainError ? err.code : "internal-error";

  // ERROR pour les défaillances nécessitant une action (5xx, inattendu) ;
  // WARN pour les erreurs client attendues (4xx) — cf. CLAUDE.md, Observabilité.
  if (status >= 500) {
    req.log.error({ err }, "Requête en erreur");
  } else {
    req.log.warn({ err: { code, message: (err as Error)?.message } }, "Requête rejetée");
  }

  res.status(status).json({
    type: `https://api.tp-meteo.local/errors/${code}`,
    title: titleFor(code),
    status,
    detail: isDomainError ? err.message : "Une erreur inattendue est survenue.",
    instance: req.originalUrl,
  });
}

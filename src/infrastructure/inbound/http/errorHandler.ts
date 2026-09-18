import type { NextFunction, Request, Response } from "express";

/**
 * Gestionnaire d'erreurs global, au format RFC 7807 (Problem Details).
 *
 * Placeholder pour l'initial commit : la hiérarchie `DomainError` (cf.
 * docs/STD.md §7) n'existe pas encore, donc toute erreur non gérée retombe en
 * `500`. Ce middleware sera étendu pour distinguer les erreurs métier des
 * erreurs techniques une fois le cas d'usage implémenté.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  req.log?.error({ err }, "Requête en erreur");

  res.status(500).json({
    type: "https://api.tp-meteo.local/errors/internal-error",
    title: "Erreur interne",
    status: 500,
    detail: "Une erreur inattendue est survenue.",
    instance: req.originalUrl,
  });
}

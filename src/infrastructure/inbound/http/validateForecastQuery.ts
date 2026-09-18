import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { InvalidAddressError } from "../../../domain/errors/InvalidAddressError";

const forecastQuerySchema = z.object({
  address: z
    .string({ message: "Le paramètre 'address' est requis." })
    .trim()
    .min(1, "L'adresse ne peut pas être vide."),
});

/**
 * Validation dès la couche externe (fail-fast, RG1 — cf. docs/SFD.md §5) :
 * une adresse absente ou vide ne doit déclencher aucun appel aux services
 * externes (A1, cf. docs/SFD.md §4).
 */
export function validateForecastQuery(req: Request, _res: Response, next: NextFunction): void {
  const result = forecastQuerySchema.safeParse(req.query);
  if (!result.success) {
    next(new InvalidAddressError("Le paramètre 'address' est requis et ne peut pas être vide."));
    return;
  }
  next();
}

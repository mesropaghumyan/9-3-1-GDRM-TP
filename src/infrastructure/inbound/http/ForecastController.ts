import { Router } from "express";
import type { GetForecastByAddress } from "../../../application/GetForecastByAddress";
import type { ForecastResult, HourlyForecastEntry } from "../../../domain/model/WeatherForecast";
import { validateForecastQuery } from "./validateForecastQuery";

interface ForecastResponseBody {
  address: string;
  latitude: number;
  longitude: number;
  hourly: HourlyForecastEntry[];
}

function toForecastResponse(result: ForecastResult): ForecastResponseBody {
  return {
    address: result.address.toString(),
    latitude: result.coordinates.latitude,
    longitude: result.coordinates.longitude,
    hourly: result.forecast,
  };
}

/** Les deux cas d'usage pré-construits par la composition root (TP3, mode démo). */
export interface ForecastUseCases {
  real: GetForecastByAddress;
  demo: GetForecastByAddress;
}

/**
 * Adaptateur entrant HTTP : traduit HTTP ↔ domaine, sans aucune logique
 * métier (Single Responsibility, cf. docs/STD.md §3.5). Le choix entre le
 * cas d'usage réel et le cas d'usage démo (TP3) se limite à une lecture du
 * paramètre `demo` — la bascule Strategy elle-même a déjà eu lieu dans la
 * composition root (§3.6), pas ici.
 */
export function createForecastRouter(useCases: ForecastUseCases): Router {
  const router = Router();

  router.get("/forecast", validateForecastQuery, async (req, res, next) => {
    try {
      const isDemo = req.query.demo === "true";
      const useCase = isDemo ? useCases.demo : useCases.real;
      const result = await useCase.execute(req.query.address as string);
      res.status(200).json(toForecastResponse(result));
    } catch (err) {
      next(err); // délégué au gestionnaire d'erreurs global
    }
  });

  return router;
}

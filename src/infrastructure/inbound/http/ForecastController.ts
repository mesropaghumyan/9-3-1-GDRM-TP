import { Router } from "express";
import type { GetForecastByAddress } from "../../../application/GetForecastByAddress";
import type { ForecastResult } from "../../../domain/model/WeatherForecast";
import { validateForecastQuery } from "./validateForecastQuery";

interface ForecastResponseBody {
  address: string;
  latitude: number;
  longitude: number;
  hourly: { temperature: number[] };
}

function toForecastResponse(result: ForecastResult): ForecastResponseBody {
  return {
    address: result.address.toString(),
    latitude: result.coordinates.latitude,
    longitude: result.coordinates.longitude,
    hourly: result.forecast,
  };
}

/**
 * Adaptateur entrant HTTP : traduit HTTP ↔ domaine, sans aucune logique
 * métier (Single Responsibility, cf. docs/STD.md §3.5).
 */
export function createForecastRouter(useCase: GetForecastByAddress): Router {
  const router = Router();

  router.get("/forecast", validateForecastQuery, async (req, res, next) => {
    try {
      const result = await useCase.execute(req.query.address as string);
      res.status(200).json(toForecastResponse(result));
    } catch (err) {
      next(err); // délégué au gestionnaire d'erreurs global
    }
  });

  return router;
}

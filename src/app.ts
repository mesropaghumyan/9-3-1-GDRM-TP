import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { buildContainer } from "./config/container";
import { loadEnv } from "./config/env";
import { correlationId } from "./infrastructure/inbound/http/correlationId";
import { createForecastRouter } from "./infrastructure/inbound/http/ForecastController";
import { openApiDocument } from "./infrastructure/inbound/http/openapi";
import { createRateLimiter } from "./infrastructure/inbound/http/rateLimiter";
import { errorHandler } from "./infrastructure/inbound/http/errorHandler";
import { logger } from "./logger";

/**
 * Construit l'application Express, sans démarrer d'écoute réseau — ce qui la
 * rend directement testable via Supertest (cf. docs/STD.md §9.7).
 */
export function createApp(): Express {
  const env = loadEnv();
  const container = buildContainer(env, logger);
  const app = express();

  // Montée avant `helmet()` : Swagger UI s'appuie sur un script inline que la
  // Content-Security-Policy par défaut bloquerait, sans affaiblir les
  // en-têtes de sécurité des routes métier ci-dessous.
  app.get("/openapi.json", (_req, res) => res.status(200).json(openApiDocument));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(helmet());
  app.use(correlationId);
  app.use(createRateLimiter(env));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(createForecastRouter(container.getForecastByAddress));

  app.use((req, res) => {
    res.status(404).json({
      type: "https://api.tp-meteo.local/errors/not-found",
      title: "Ressource introuvable",
      status: 404,
      instance: req.originalUrl,
    });
  });

  app.use(errorHandler);

  return app;
}

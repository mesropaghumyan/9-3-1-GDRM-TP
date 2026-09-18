import express, { type Express } from "express";
import helmet from "helmet";
import { loadEnv } from "./config/env";
import { correlationId } from "./infrastructure/inbound/http/correlationId";
import { createRateLimiter } from "./infrastructure/inbound/http/rateLimiter";
import { errorHandler } from "./infrastructure/inbound/http/errorHandler";

/**
 * Construit l'application Express, sans démarrer d'écoute réseau — ce qui la
 * rend directement testable via Supertest (cf. docs/STD.md §9.7).
 */
export function createApp(): Express {
  const env = loadEnv();
  const app = express();

  app.use(helmet());
  app.use(correlationId);
  app.use(createRateLimiter(env));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

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

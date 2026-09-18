import rateLimit from "express-rate-limit";
import type { Env } from "../../../config/env";

/**
 * Protège l'API contre les abus (et, par ricochet, contre l'amplification de
 * trafic vers les services externes en aval) — cf. docs/STD.md §3.7 et §10.
 */
export function createRateLimiter(env: Env) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      type: "https://api.tp-meteo.local/errors/rate-limit-exceeded",
      title: "Trop de requêtes",
      status: 429,
      detail: "Quota de requêtes dépassé, réessayez plus tard.",
    },
  });
}

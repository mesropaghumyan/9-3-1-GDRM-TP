import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Sélection du fournisseur, sans recompilation (TP2) — cf. docs/STD.md §3.6.
  GEOCODING_PROVIDER: z.enum(["nominatim", "ban"]).default("ban"),
  WEATHER_PROVIDER: z.enum(["open-meteo", "met-norway"]).default("open-meteo"),

  NOMINATIM_BASE_URL: z.string().url().default("https://nominatim.openstreetmap.org"),
  BAN_BASE_URL: z.string().url().default("https://api-adresse.data.gouv.fr"),
  OPEN_METEO_BASE_URL: z.string().url().default("https://api.open-meteo.com/v1"),
  MET_NORWAY_BASE_URL: z
    .string()
    .url()
    .default("https://api.met.no/weatherapi/locationforecast/2.0"),

  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  GEOCODING_CACHE_TTL_MS: z.coerce.number().int().positive().default(3_600_000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valide les variables d'environnement dès le démarrage (fail-fast) plutôt que
 * de laisser une variable manquante ou mal formée provoquer une erreur diffuse
 * au premier appel externe (cf. docs/STD.md §6).
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Configuration invalide : ${result.error.message}`);
  }
  return result.data;
}

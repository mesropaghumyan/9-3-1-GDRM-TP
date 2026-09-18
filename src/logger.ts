import pino from "pino";
import { loadEnv } from "./config/env";

const env = loadEnv();

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
});

export type Logger = typeof logger;

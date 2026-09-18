import "reflect-metadata";
import "dotenv/config";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { logger } from "./logger";

const env = loadEnv();
const app = createApp();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Serveur démarré");
});

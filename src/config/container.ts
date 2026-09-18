import { container as rootContainer } from "tsyringe";
import { GetForecastByAddress } from "../application/GetForecastByAddress";
import { BanGeocodingAdapter } from "../infrastructure/outbound/BanGeocodingAdapter";
import { CachedGeocodingAdapter } from "../infrastructure/outbound/CachedGeocodingAdapter";
import { CircuitBreakerHttpClient } from "../infrastructure/outbound/http/CircuitBreakerHttpClient";
import { MetNorwayWeatherAdapter } from "../infrastructure/outbound/MetNorwayWeatherAdapter";
import { NominatimGeocodingAdapter } from "../infrastructure/outbound/NominatimGeocodingAdapter";
import { OpenMeteoWeatherAdapter } from "../infrastructure/outbound/OpenMeteoWeatherAdapter";
import type { Logger } from "../logger";
import type { Env } from "./env";
import { TOKENS } from "./tokens";

const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 200;
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIMEOUT_MS = 30_000;

export interface Container {
  getForecastByAddress: GetForecastByAddress;
}

/**
 * Composition root (cf. docs/STD.md §3.6) : IoC/DI via tsyringe. Les jetons
 * (`TOKENS`) et les classes `@injectable` portent la déclaration des
 * dépendances ; ici on se contente d'enregistrer la configuration et les
 * liaisons interface → implémentation, puis de résoudre la racine du graphe
 * — aucun `new` d'objet métier ou d'adaptateur dans ce fichier.
 *
 * Un *child container* isole chaque appel : deux `buildContainer(...)`
 * (deux instances de l'application, ex. dans les tests) ne partagent ni
 * cache de géocodage ni état de circuit breaker.
 */
export function buildContainer(env: Env, logger: Logger): Container {
  const container = rootContainer.createChildContainer();

  container.registerInstance(TOKENS.Logger, logger);
  container.registerInstance(TOKENS.NominatimBaseUrl, env.NOMINATIM_BASE_URL);
  container.registerInstance(TOKENS.BanBaseUrl, env.BAN_BASE_URL);
  container.registerInstance(TOKENS.OpenMeteoBaseUrl, env.OPEN_METEO_BASE_URL);
  container.registerInstance(TOKENS.MetNorwayBaseUrl, env.MET_NORWAY_BASE_URL);
  container.registerInstance(TOKENS.FetchHttpClientOptions, { timeoutMs: env.HTTP_TIMEOUT_MS });
  container.registerInstance(TOKENS.RetryOptions, {
    maxAttempts: RETRY_MAX_ATTEMPTS,
    baseDelayMs: RETRY_BASE_DELAY_MS,
  });
  container.registerInstance(TOKENS.CircuitBreakerOptions, {
    failureThreshold: CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    resetTimeoutMs: CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
  });
  container.registerInstance(TOKENS.CachedGeocodingAdapterOptions, {
    ttlMs: env.GEOCODING_CACHE_TTL_MS,
  });

  // Singleton scopé à ce container : les deux adaptateurs sortants (quel que
  // soit le fournisseur choisi ci-dessous) partagent la même chaîne retry +
  // circuit breaker, comme dans le câblage manuel d'origine (cf. §3.6, §3.7).
  container.registerSingleton(CircuitBreakerHttpClient);

  // Choix du fournisseur sans recompilation (TP2) : seule cette liaison
  // change selon la configuration, le reste du graphe (cache, résilience,
  // domaine, application) est identique quel que soit le fournisseur.
  if (env.GEOCODING_PROVIDER === "ban") {
    container.register(TOKENS.RawGeocodingPort, { useClass: BanGeocodingAdapter });
  } else {
    container.register(TOKENS.RawGeocodingPort, { useClass: NominatimGeocodingAdapter });
  }
  container.register(TOKENS.GeocodingPort, { useClass: CachedGeocodingAdapter });

  if (env.WEATHER_PROVIDER === "met-norway") {
    container.register(TOKENS.WeatherPort, { useClass: MetNorwayWeatherAdapter });
  } else {
    container.register(TOKENS.WeatherPort, { useClass: OpenMeteoWeatherAdapter });
  }

  const getForecastByAddress = container.resolve(GetForecastByAddress);

  return { getForecastByAddress };
}

import { loadEnv } from "../../../src/config/env";

const VALID_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  PORT: "4000",
  LOG_LEVEL: "warn",
  NOMINATIM_BASE_URL: "https://nominatim.example.test",
  OPEN_METEO_BASE_URL: "https://open-meteo.example.test",
  HTTP_TIMEOUT_MS: "3000",
  GEOCODING_CACHE_TTL_MS: "60000",
  RATE_LIMIT_WINDOW_MS: "60000",
  RATE_LIMIT_MAX: "10",
};

describe("loadEnv", () => {
  it("loadEnv", () => {
    const source = VALID_ENV;

    const env = loadEnv(source);

    expect(env.PORT).toBe(4000);
    expect(env.NOMINATIM_BASE_URL).toBe(VALID_ENV.NOMINATIM_BASE_URL);
  });

  it("loadEnv_sansVariablesUtiliseLesValeursParDefaut", () => {
    const source: NodeJS.ProcessEnv = {};

    const env = loadEnv(source);

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe("development");
  });

  it("loadEnv_portNonNumeriqueLeveUneErreur", () => {
    const source: NodeJS.ProcessEnv = { ...VALID_ENV, PORT: "not-a-number" };

    const act = () => loadEnv(source);

    expect(act).toThrow();
  });

  it("loadEnv_urlGeocodageInvalideLeveUneErreur", () => {
    const source: NodeJS.ProcessEnv = { ...VALID_ENV, NOMINATIM_BASE_URL: "pas-une-url" };

    const act = () => loadEnv(source);

    expect(act).toThrow();
  });
});

import { faker } from "@faker-js/faker";
import { UpstreamServiceError } from "../../src/domain/errors/UpstreamServiceError";
import { UpstreamTimeoutError } from "../../src/domain/errors/UpstreamTimeoutError";
import { Coordinates } from "../../src/domain/model/Coordinates";
import type { WeatherPort } from "../../src/domain/ports/WeatherPort";

/**
 * Contrat commun à toute implémentation de `WeatherPort` (cf. docs/TP_2.md,
 * point 3) : chaque fournisseur (Open-Meteo, MET Norway, ...) doit satisfaire
 * les mêmes assertions côté domaine. Garantit qu'aucun DTO ou format propre
 * à un fournisseur ne fuit hors de son adaptateur (point 4).
 */
export interface WeatherContractFixture {
  name: string;
  buildAdapter: (timeoutMs?: number) => WeatherPort;
  registerSuccess: (temperatures: number[]) => void;
  registerMalformedResponse: () => void;
  registerSlowResponse: (delayMs: number) => void;
}

const NOMINAL_TIMEOUT_MS = 2_000;
const SHORT_TIMEOUT_MS = 20;
const SLOW_RESPONSE_DELAY_MS = 200;
const TEMPERATURE_SAMPLE_COUNT = 4;
const TEMPERATURE_RANGE = { min: -10, max: 40 } as const;

export function describeWeatherPortContract(fixture: WeatherContractFixture): void {
  describe(`Contrat WeatherPort — ${fixture.name}`, () => {
    it("getHourlyForecast", async () => {
      const temperatures = faker.helpers.multiple(
        () => faker.number.float({ min: TEMPERATURE_RANGE.min, max: TEMPERATURE_RANGE.max }),
        { count: TEMPERATURE_SAMPLE_COUNT },
      );
      fixture.registerSuccess(temperatures);
      const adapter = fixture.buildAdapter(NOMINAL_TIMEOUT_MS);
      const coordinates = Coordinates.create(faker.location.latitude(), faker.location.longitude());

      const forecast = await adapter.getHourlyForecast(coordinates);

      expect(forecast.map((entry) => entry.temperatureCelsius)).toEqual(temperatures);
      forecast.forEach((entry) => {
        // Horodatage normalisé ISO 8601, identique quel que soit le fournisseur (TP3).
        expect(new Date(entry.time).toISOString()).toBe(entry.time);
        // Aucun DTO propre au fournisseur ne fuit hors de l'adaptateur (TP2 point 4, TP3).
        expect(Object.keys(entry)).toEqual(["time", "temperatureCelsius"]);
      });
    });

    it("getHourlyForecast_reponseMalformeeLeveUpstreamServiceError", async () => {
      fixture.registerMalformedResponse();
      const adapter = fixture.buildAdapter(NOMINAL_TIMEOUT_MS);
      const coordinates = Coordinates.create(faker.location.latitude(), faker.location.longitude());

      const act = () => adapter.getHourlyForecast(coordinates);

      await expect(act).rejects.toThrow(UpstreamServiceError);
    });

    it("getHourlyForecast_delaiDepasseLeveUpstreamTimeoutError", async () => {
      fixture.registerSlowResponse(SLOW_RESPONSE_DELAY_MS);
      const adapter = fixture.buildAdapter(SHORT_TIMEOUT_MS);
      const coordinates = Coordinates.create(faker.location.latitude(), faker.location.longitude());

      const act = () => adapter.getHourlyForecast(coordinates);

      await expect(act).rejects.toThrow(UpstreamTimeoutError);
    });
  });
}

import { faker } from "@faker-js/faker";
import { DemoWeatherAdapter } from "../../../../src/infrastructure/outbound/DemoWeatherAdapter";
import { Coordinates } from "../../../../src/domain/model/Coordinates";
import { fakeLogger } from "../../../support/fakeLogger";

function randomCoordinates(): Coordinates {
  return Coordinates.create(
    faker.number.float({ min: -90, max: 90 }),
    faker.number.float({ min: -180, max: 180 }),
  );
}

describe("DemoWeatherAdapter", () => {
  it("getHourlyForecast", async () => {
    const adapter = new DemoWeatherAdapter(fakeLogger());

    const forecast = await adapter.getHourlyForecast(randomCoordinates());

    expect(forecast.length).toBeGreaterThan(0);
    forecast.forEach((entry) => {
      expect(Object.keys(entry)).toEqual(["time", "temperatureCelsius"]);
      expect(new Date(entry.time).toISOString()).toBe(entry.time);
      expect(Number.isFinite(entry.temperatureCelsius)).toBe(true);
    });
  });

  it("getHourlyForecast_horodatagesStrictementCroissants", async () => {
    const adapter = new DemoWeatherAdapter(fakeLogger());

    const forecast = await adapter.getHourlyForecast(randomCoordinates());

    const times = forecast.map((entry) => new Date(entry.time).getTime());
    const sortedTimes = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sortedTimes);
    expect(new Set(times).size).toBe(times.length);
  });
});

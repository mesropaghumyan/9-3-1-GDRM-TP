import { faker } from "@faker-js/faker";
import { GetForecastByAddress } from "../../../src/application/GetForecastByAddress";
import { AddressNotFoundError } from "../../../src/domain/errors/AddressNotFoundError";
import { InvalidAddressError } from "../../../src/domain/errors/InvalidAddressError";
import { UpstreamServiceError } from "../../../src/domain/errors/UpstreamServiceError";
import { Coordinates } from "../../../src/domain/model/Coordinates";
import type { HourlyForecast } from "../../../src/domain/model/WeatherForecast";
import type { GeocodingPort } from "../../../src/domain/ports/GeocodingPort";
import type { WeatherPort } from "../../../src/domain/ports/WeatherPort";

const EMPTY_ADDRESS = "   ";

function randomCoordinates(): Coordinates {
  return Coordinates.create(
    faker.number.float({ min: -90, max: 90 }),
    faker.number.float({ min: -180, max: 180 }),
  );
}

function randomHourlyForecast(): HourlyForecast {
  return {
    shortwave_radiation: faker.helpers.multiple(() => faker.number.float({ min: 0, max: 1000 }), {
      count: 3,
    }),
  };
}

describe("GetForecastByAddress", () => {
  it("execute", async () => {
    const rawAddress = faker.location.city();
    const coordinates = randomCoordinates();
    const forecast = randomHourlyForecast();
    const geocoding: GeocodingPort = { locate: jest.fn().mockResolvedValue(coordinates) };
    const weather: WeatherPort = { getHourlyForecast: jest.fn().mockResolvedValue(forecast) };
    const useCase = new GetForecastByAddress(geocoding, weather);

    const result = await useCase.execute(rawAddress);

    expect(result.address.toString()).toBe(rawAddress);
    expect(result.coordinates).toBe(coordinates);
    expect(result.forecast).toBe(forecast);
    expect(geocoding.locate).toHaveBeenCalledWith(result.address);
    expect(weather.getHourlyForecast).toHaveBeenCalledWith(coordinates);
  });

  it("execute_appelsSequentielsGeocodingPuisWeather", async () => {
    const callOrder: string[] = [];
    const geocoding: GeocodingPort = {
      locate: jest.fn().mockImplementation(async () => {
        callOrder.push("geocoding");
        return randomCoordinates();
      }),
    };
    const weather: WeatherPort = {
      getHourlyForecast: jest.fn().mockImplementation(async () => {
        callOrder.push("weather");
        return randomHourlyForecast();
      }),
    };
    const useCase = new GetForecastByAddress(geocoding, weather);

    await useCase.execute(faker.location.city());

    expect(callOrder).toEqual(["geocoding", "weather"]);
  });

  it("execute_adresseVideLeveInvalidAddressErrorSansAppelerLesServices", async () => {
    const geocoding: GeocodingPort = { locate: jest.fn() };
    const weather: WeatherPort = { getHourlyForecast: jest.fn() };
    const useCase = new GetForecastByAddress(geocoding, weather);

    const act = () => useCase.execute(EMPTY_ADDRESS);

    await expect(act).rejects.toThrow(InvalidAddressError);
    expect(geocoding.locate).not.toHaveBeenCalled();
    expect(weather.getHourlyForecast).not.toHaveBeenCalled();
  });

  it("execute_adresseIntrouvableLeveAddressNotFoundErrorSansAppelerWeather", async () => {
    const rawAddress = faker.location.city();
    const geocoding: GeocodingPort = {
      locate: jest
        .fn()
        .mockRejectedValue(new AddressNotFoundError(`Aucune correspondance pour "${rawAddress}".`)),
    };
    const weather: WeatherPort = { getHourlyForecast: jest.fn() };
    const useCase = new GetForecastByAddress(geocoding, weather);

    const act = () => useCase.execute(rawAddress);

    await expect(act).rejects.toThrow(AddressNotFoundError);
    expect(weather.getHourlyForecast).not.toHaveBeenCalled();
  });

  it("execute_geocodingIndisponibleLeveUpstreamServiceError", async () => {
    const rawAddress = faker.location.city();
    const geocoding: GeocodingPort = {
      locate: jest
        .fn()
        .mockRejectedValue(new UpstreamServiceError("Service de géocodage indisponible.")),
    };
    const weather: WeatherPort = { getHourlyForecast: jest.fn() };
    const useCase = new GetForecastByAddress(geocoding, weather);

    const act = () => useCase.execute(rawAddress);

    await expect(act).rejects.toThrow(UpstreamServiceError);
    expect(weather.getHourlyForecast).not.toHaveBeenCalled(); // RG3 : appel séquentiel
  });

  it("execute_weatherIndisponibleLeveUpstreamServiceError", async () => {
    const rawAddress = faker.location.city();
    const geocoding: GeocodingPort = { locate: jest.fn().mockResolvedValue(randomCoordinates()) };
    const weather: WeatherPort = {
      getHourlyForecast: jest
        .fn()
        .mockRejectedValue(new UpstreamServiceError("Service météo indisponible.")),
    };
    const useCase = new GetForecastByAddress(geocoding, weather);

    const act = () => useCase.execute(rawAddress);

    await expect(act).rejects.toThrow(UpstreamServiceError);
  });
});

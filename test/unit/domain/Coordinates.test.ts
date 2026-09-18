import { faker } from "@faker-js/faker";
import { InvalidCoordinatesError } from "../../../src/domain/errors/InvalidCoordinatesError";
import { Coordinates } from "../../../src/domain/model/Coordinates";

const LATITUDE_RANGE = { min: -90, max: 90 } as const;
const LONGITUDE_RANGE = { min: -180, max: 180 } as const;
const OUT_OF_RANGE_MARGIN = 1;
const OUT_OF_RANGE_MAX = 1000;

describe("Coordinates", () => {
  it("create", () => {
    const latitude = faker.number.float({ min: LATITUDE_RANGE.min, max: LATITUDE_RANGE.max });
    const longitude = faker.number.float({ min: LONGITUDE_RANGE.min, max: LONGITUDE_RANGE.max });

    const coordinates = Coordinates.create(latitude, longitude);

    expect(coordinates.latitude).toBe(latitude);
    expect(coordinates.longitude).toBe(longitude);
  });

  it("create_latitudeHorsBornesLeveInvalidCoordinatesError", () => {
    const latitude = faker.number.float({
      min: LATITUDE_RANGE.max + OUT_OF_RANGE_MARGIN,
      max: OUT_OF_RANGE_MAX,
    });
    const longitude = faker.number.float({ min: LONGITUDE_RANGE.min, max: LONGITUDE_RANGE.max });

    const act = () => Coordinates.create(latitude, longitude);

    expect(act).toThrow(InvalidCoordinatesError);
  });

  it("create_longitudeHorsBornesLeveInvalidCoordinatesError", () => {
    const latitude = faker.number.float({ min: LATITUDE_RANGE.min, max: LATITUDE_RANGE.max });
    const longitude = faker.number.float({
      min: LONGITUDE_RANGE.max + OUT_OF_RANGE_MARGIN,
      max: OUT_OF_RANGE_MAX,
    });

    const act = () => Coordinates.create(latitude, longitude);

    expect(act).toThrow(InvalidCoordinatesError);
  });

  it("create_valeurNonFinieLeveInvalidCoordinatesError", () => {
    const latitude = Number.NaN;
    const longitude = faker.number.float({ min: LONGITUDE_RANGE.min, max: LONGITUDE_RANGE.max });

    const act = () => Coordinates.create(latitude, longitude);

    expect(act).toThrow(InvalidCoordinatesError);
  });

  it("create_objetEstImmuable", () => {
    const latitude = faker.number.float({ min: LATITUDE_RANGE.min, max: LATITUDE_RANGE.max });
    const longitude = faker.number.float({ min: LONGITUDE_RANGE.min, max: LONGITUDE_RANGE.max });

    const coordinates = Coordinates.create(latitude, longitude);
    const act = () => {
      // @ts-expect-error : violation volontaire de l'immuabilité pour le test.
      coordinates.latitude = 0;
    };

    expect(act).toThrow(TypeError);
  });
});

import { faker } from "@faker-js/faker";
import { InvalidAddressError } from "../../../src/domain/errors/InvalidAddressError";
import { Address } from "../../../src/domain/model/Address";

const BLANK_ADDRESS = "   ";
const EMPTY_ADDRESS = "";

describe("Address", () => {
  it("create", () => {
    const rawAddress = faker.location.city();

    const address = Address.create(rawAddress);

    expect(address.toString()).toBe(rawAddress);
  });

  it("create_espacesEnBordureSontRetires", () => {
    const city = faker.location.city();
    const rawAddress = `  ${city}  `;

    const address = Address.create(rawAddress);

    expect(address.toString()).toBe(city);
  });

  it("create_adresseVideLeveInvalidAddressError", () => {
    const rawAddress = EMPTY_ADDRESS;

    const act = () => Address.create(rawAddress);

    expect(act).toThrow(InvalidAddressError);
  });

  it("create_adresseEspacesUniquementLeveInvalidAddressError", () => {
    const rawAddress = BLANK_ADDRESS;

    const act = () => Address.create(rawAddress);

    expect(act).toThrow(InvalidAddressError);
  });
});

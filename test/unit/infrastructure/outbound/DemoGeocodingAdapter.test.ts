import { faker } from "@faker-js/faker";
import { DemoGeocodingAdapter } from "../../../../src/infrastructure/outbound/DemoGeocodingAdapter";
import { Address } from "../../../../src/domain/model/Address";
import { Coordinates } from "../../../../src/domain/model/Coordinates";
import { fakeLogger } from "../../../support/fakeLogger";

describe("DemoGeocodingAdapter", () => {
  it("locate", async () => {
    const adapter = new DemoGeocodingAdapter(fakeLogger());
    const address = Address.create(faker.location.city());

    const coordinates = await adapter.locate(address);

    expect(coordinates).toBeInstanceOf(Coordinates);
  });

  it("locate_renvoieToujoursLesMemesCoordonneesQuelleQueSoitLAdresse", async () => {
    const adapter = new DemoGeocodingAdapter(fakeLogger());

    const first = await adapter.locate(Address.create(faker.location.city()));
    const second = await adapter.locate(Address.create(faker.location.city()));

    expect(first.latitude).toBe(second.latitude);
    expect(first.longitude).toBe(second.longitude);
  });
});

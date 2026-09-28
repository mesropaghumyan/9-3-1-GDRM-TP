import { faker } from "@faker-js/faker";
import { AddressNotFoundError } from "../../src/domain/errors/AddressNotFoundError";
import { UpstreamServiceError } from "../../src/domain/errors/UpstreamServiceError";
import { UpstreamTimeoutError } from "../../src/domain/errors/UpstreamTimeoutError";
import { Address } from "../../src/domain/model/Address";
import { Coordinates } from "../../src/domain/model/Coordinates";
import type { GeocodingPort } from "../../src/domain/ports/GeocodingPort";

export interface GeocodingContractCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Contrat commun à toute implémentation de `GeocodingPort` (cf. docs/TP_2.md,
 * point 3) : chaque fournisseur (Nominatim, BAN, ...) doit satisfaire les
 * mêmes assertions côté domaine, seuls les bouchons HTTP diffèrent. Garantit
 * qu'aucun DTO ou format propre à un fournisseur ne fuit hors de son
 * adaptateur (point 4).
 */
export interface GeocodingContractFixture {
  name: string;
  buildAdapter: (timeoutMs?: number) => GeocodingPort;
  registerSuccess: (coordinates: GeocodingContractCoordinates) => void;
  registerNotFound: () => void;
  registerMalformedResponse: () => void;
  registerSlowResponse: (delayMs: number) => void;
}

const NOMINAL_TIMEOUT_MS = 2_000;
const SHORT_TIMEOUT_MS = 20;
const SLOW_RESPONSE_DELAY_MS = 200;

export function describeGeocodingPortContract(fixture: GeocodingContractFixture): void {
  describe(`Contrat GeocodingPort — ${fixture.name}`, () => {
    it("locate", async () => {
      const latitude = faker.location.latitude();
      const longitude = faker.location.longitude();
      fixture.registerSuccess({ latitude, longitude });
      const adapter = fixture.buildAdapter(NOMINAL_TIMEOUT_MS);

      const coordinates = await adapter.locate(Address.create(faker.location.city()));

      expect(coordinates).toBeInstanceOf(Coordinates);
      expect(coordinates.latitude).toBeCloseTo(latitude, 3);
      expect(coordinates.longitude).toBeCloseTo(longitude, 3);
      // Aucun DTO propre au fournisseur ne fuit hors de l'adaptateur (TP2, point 4).
      expect(Object.keys(coordinates)).toEqual(["latitude", "longitude"]);
    });

    it("locate_adresseAvecCaracteresAccentuesEstAcceptee", async () => {
      fixture.registerSuccess({
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
      });
      const adapter = fixture.buildAdapter(NOMINAL_TIMEOUT_MS);

      const coordinates = await adapter.locate(
        Address.create("Évian-les-Bains — à côté de l'Isère"),
      );

      expect(coordinates).toBeInstanceOf(Coordinates);
    });

    it("locate_adresseIntrouvableLeveAddressNotFoundError", async () => {
      fixture.registerNotFound();
      const adapter = fixture.buildAdapter(NOMINAL_TIMEOUT_MS);

      const act = () => adapter.locate(Address.create(faker.string.alphanumeric(20)));

      await expect(act).rejects.toThrow(AddressNotFoundError);
    });

    it("locate_reponseMalformeeLeveUpstreamServiceError", async () => {
      fixture.registerMalformedResponse();
      const adapter = fixture.buildAdapter(NOMINAL_TIMEOUT_MS);

      const act = () => adapter.locate(Address.create(faker.location.city()));

      await expect(act).rejects.toThrow(UpstreamServiceError);
    });

    it("locate_delaiDepasseLeveUpstreamTimeoutError", async () => {
      fixture.registerSlowResponse(SLOW_RESPONSE_DELAY_MS);
      const adapter = fixture.buildAdapter(SHORT_TIMEOUT_MS);

      const act = () => adapter.locate(Address.create(faker.location.city()));

      await expect(act).rejects.toThrow(UpstreamTimeoutError);
    });
  });
}

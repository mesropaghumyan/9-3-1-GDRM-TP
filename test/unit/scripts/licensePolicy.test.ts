import { faker } from "@faker-js/faker";
import {
  findLicenseViolations,
  InvalidLicenseExpressionError,
  parseLicenseExpression,
  type LicenseScan,
} from "../../../scripts/licenses/licensePolicy";

const PERMISSIVE_LICENSES = ["MIT", "ISC", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause"] as const;
const COPYLEFT_LICENSES = [
  "GPL-2.0-only",
  "GPL-3.0-or-later",
  "AGPL-3.0-only",
  "LGPL-2.1-only",
] as const;
const LICENSE_EXCEPTION = "Classpath-exception-2.0";
const GUESSED_SUFFIX = "*";
const MIN_PACKAGES = 2;
const MAX_PACKAGES = 20;

const randomPackageId = () =>
  `${faker.string.alphanumeric({ length: 10, casing: "lower" })}@${faker.system.semver()}`;
const randomPermissive = () => faker.helpers.arrayElement(PERMISSIVE_LICENSES);
const randomCopyleft = () => faker.helpers.arrayElement(COPYLEFT_LICENSES);

const scanOf = (
  licenses: string | readonly string[] | undefined,
): { scan: LicenseScan; packageId: string } => {
  const packageId = randomPackageId();
  return { scan: { [packageId]: { licenses } }, packageId };
};

describe("licensePolicy", () => {
  it("findLicenseViolations", () => {
    const packageCount = faker.number.int({ min: MIN_PACKAGES, max: MAX_PACKAGES });
    const scan: LicenseScan = Object.fromEntries(
      Array.from({ length: packageCount }, () => [
        randomPackageId(),
        { licenses: randomPermissive() },
      ]),
    );

    const violations = findLicenseViolations(scan, PERMISSIVE_LICENSES);

    expect(violations).toEqual([]);
  });

  it("findLicenseViolations_licenceHorsListeBlancheSignalee", () => {
    const copyleft = randomCopyleft();
    const { scan, packageId } = scanOf(copyleft);

    const violations = findLicenseViolations(scan, PERMISSIVE_LICENSES);

    expect(violations).toEqual([{ packageId, license: copyleft, reason: "NOT_ALLOWED" }]);
  });

  it("findLicenseViolations_orAvecUneBrancheAutoriseeEstConforme", () => {
    const { scan } = scanOf(`(${randomCopyleft()} OR ${randomPermissive()})`);

    const violations = findLicenseViolations(scan, PERMISSIVE_LICENSES);

    expect(violations).toEqual([]);
  });

  it("findLicenseViolations_andAvecUneBrancheInterditeEstRefuse", () => {
    const expression = `(${randomPermissive()} AND ${randomCopyleft()})`;
    const { scan } = scanOf(expression);

    const violations = findLicenseViolations(scan, PERMISSIVE_LICENSES);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.reason).toBe("NOT_ALLOWED");
  });

  it("findLicenseViolations_withEvalueUniquementLaLicenceDeBase", () => {
    const { scan } = scanOf(`${randomPermissive()} WITH ${LICENSE_EXCEPTION}`);

    const violations = findLicenseViolations(scan, PERMISSIVE_LICENSES);

    expect(violations).toEqual([]);
  });

  it("findLicenseViolations_operateursInsensiblesALaCasse", () => {
    const { scan } = scanOf(`${randomCopyleft()} or ${randomPermissive()}`);

    const violations = findLicenseViolations(scan, PERMISSIVE_LICENSES);

    expect(violations).toEqual([]);
  });

  it("findLicenseViolations_licenceDevineeEstNonIdentifiee", () => {
    const { scan } = scanOf(`${randomPermissive()}${GUESSED_SUFFIX}`);

    const violations = findLicenseViolations(scan, PERMISSIVE_LICENSES);

    expect(violations[0]?.reason).toBe("UNIDENTIFIED");
  });

  it.each(["UNKNOWN", `Custom: ${faker.internet.url()}`, undefined])(
    "findLicenseViolations_licenceInconnueOuAbsenteEstNonIdentifiee (%s)",
    (license) => {
      const { scan } = scanOf(license);

      const violations = findLicenseViolations(scan, PERMISSIVE_LICENSES);

      expect(violations[0]?.reason).toBe("UNIDENTIFIED");
    },
  );

  it("findLicenseViolations_expressionMalformeeEstNonIdentifiee", () => {
    const { scan } = scanOf(`(${randomPermissive()} OR`);

    const violations = findLicenseViolations(scan, PERMISSIVE_LICENSES);

    expect(violations[0]?.reason).toBe("UNIDENTIFIED");
  });

  it("findLicenseViolations_tableauDeLicencesTraiteCommeCumul", () => {
    const copyleft = randomCopyleft();
    const { scan, packageId } = scanOf([randomPermissive(), copyleft]);

    const violations = findLicenseViolations(scan, PERMISSIVE_LICENSES);

    expect(violations).toEqual([{ packageId, license: copyleft, reason: "NOT_ALLOWED" }]);
  });

  it("parseLicenseExpression", () => {
    const [first, second, third] = faker.helpers.arrayElements(PERMISSIVE_LICENSES, 3);

    const tree = parseLicenseExpression(`${first} OR ${second} AND ${third}`);

    expect(tree).toEqual({
      kind: "or",
      left: { kind: "license", id: first },
      right: {
        kind: "and",
        left: { kind: "license", id: second },
        right: { kind: "license", id: third },
      },
    });
  });

  it.each(["", "(", "MIT OR", "AND MIT", "(MIT", "MIT)", "MIT WITH"])(
    "parseLicenseExpression_expressionMalformeeLeveInvalidLicenseExpressionError (%s)",
    (expression) => {
      const act = () => parseLicenseExpression(expression);

      expect(act).toThrow(InvalidLicenseExpressionError);
    },
  );
});

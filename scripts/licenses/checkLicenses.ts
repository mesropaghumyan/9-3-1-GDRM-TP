/**
 * Point d'entrée CLI de la barrière de licences (TP4), exécuté en CI.
 *
 * Usage : tsx scripts/licenses/checkLicenses.ts <scan.json> <license-policy.json>
 * Codes de sortie : 0 = conforme, 1 = violation de la politique, 2 = erreur technique.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { z } from "zod";
import { findLicenseViolations, type LicenseScan, type LicenseViolation } from "./licensePolicy";

const EXIT_COMPLIANT = 0;
const EXIT_VIOLATION = 1;
const EXIT_TECHNICAL_ERROR = 2;

const licensePolicySchema = z.object({
  allowedLicenses: z.array(z.string().min(1)).nonempty(),
});

const licenseScanSchema = z.record(
  z.object({ licenses: z.union([z.string(), z.array(z.string())]).optional() }).passthrough(),
);

const REASON_LABELS: Readonly<Record<LicenseViolation["reason"], string>> = {
  NOT_ALLOWED: "licence hors liste blanche",
  UNIDENTIFIED: "licence non identifiée",
};

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function packageName(packageId: string): string {
  return packageId.slice(0, packageId.lastIndexOf("@"));
}

function reportForGitHub(violations: readonly LicenseViolation[]): void {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  violations.forEach((violation) =>
    process.stdout.write(
      `::error title=Licence refusée::${violation.packageId} est sous "${violation.license}" (${REASON_LABELS[violation.reason]})\n`,
    ),
  );
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const rows = violations.map(
    (violation) =>
      `| \`${violation.packageId}\` | \`${violation.license}\` | ${REASON_LABELS[violation.reason]} |`,
  );
  const summary =
    violations.length === 0
      ? "### Licences : conforme ✅\n"
      : [
          "### Licences : non conforme ❌",
          "",
          "| Package | Licence | Motif |",
          "| --- | --- | --- |",
          ...rows,
          "",
        ].join("\n");
  appendFileSync(summaryPath, summary);
}

function main(argv: readonly string[]): number {
  const [scanPath, policyPath] = argv;
  if (!scanPath || !policyPath) {
    process.stderr.write("Usage : checkLicenses <scan.json> <license-policy.json>\n");
    return EXIT_TECHNICAL_ERROR;
  }

  let scan: LicenseScan;
  let allowedLicenses: readonly string[];
  try {
    scan = licenseScanSchema.parse(readJson(scanPath));
    allowedLicenses = licensePolicySchema.parse(readJson(policyPath)).allowedLicenses;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Lecture du scan ou de la politique impossible : ${detail}\n`);
    return EXIT_TECHNICAL_ERROR;
  }

  const violations = findLicenseViolations(scan, allowedLicenses);
  const scannedCount = Object.keys(scan).length;
  reportForGitHub(violations);

  if (violations.length === 0) {
    process.stdout.write(
      `Licences conformes : ${scannedCount} packages analysés, liste blanche = ${allowedLicenses.join(", ")}.\n`,
    );
    return EXIT_COMPLIANT;
  }

  process.stderr.write(
    `${violations.length} violation(s) de la politique de licences sur ${scannedCount} packages :\n`,
  );
  violations.forEach((violation) =>
    process.stderr.write(
      `  - ${violation.packageId} : "${violation.license}" (${REASON_LABELS[violation.reason]})` +
        ` -> position dans l'arbre : npm explain ${packageName(violation.packageId)}\n`,
    ),
  );
  process.stderr.write(
    "Décision attendue : réécrire, substituer, isoler ou négocier (cf. docs/tp4/RAPPORT_TP4.md).\n",
  );
  return EXIT_VIOLATION;
}

process.exitCode = main(process.argv.slice(2));

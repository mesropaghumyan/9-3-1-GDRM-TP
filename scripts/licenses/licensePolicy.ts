/**
 * Politique de licences (TP4) : évalue le résultat brut de `license-checker`
 * contre une liste blanche d'identifiants SPDX.
 *
 * Pourquoi ne pas se contenter de `license-checker --onlyAllow` ? Son test est
 * une recherche de sous-chaîne : "(MIT AND GPL-3.0)" y est accepté dès que "MIT"
 * est whitelisté. Ici, l'expression SPDX est réellement interprétée :
 *   - `A OR B`   : conforme si au moins une branche est autorisée (on choisit) ;
 *   - `A AND B`  : conforme seulement si toutes les branches sont autorisées ;
 *   - `A WITH E` : l'exception ajoute des droits, seule la licence A est évaluée.
 * Toute licence non identifiée (UNKNOWN, "Custom: ...", licence devinée "MIT*",
 * expression malformée) est refusée : la politique échoue en mode fermé.
 */

export type LicenseFieldValue = string | readonly string[];

export interface ScannedPackage {
  readonly licenses?: LicenseFieldValue;
  readonly repository?: string;
}

/** Format JSON produit par `license-checker --json` : clé = "nom@version". */
export type LicenseScan = Readonly<Record<string, ScannedPackage>>;

export type ViolationReason = "NOT_ALLOWED" | "UNIDENTIFIED";

export interface LicenseViolation {
  readonly packageId: string;
  readonly license: string;
  readonly reason: ViolationReason;
}

export class InvalidLicenseExpressionError extends Error {
  constructor(expression: string) {
    super(`Expression de licence SPDX invalide : "${expression}"`);
    this.name = "InvalidLicenseExpressionError";
  }
}

type LicenseNode =
  | { readonly kind: "license"; readonly id: string }
  | { readonly kind: "and" | "or"; readonly left: LicenseNode; readonly right: LicenseNode };

const GUESSED_LICENSE_SUFFIX = "*";
const UNIDENTIFIED_MARKERS: readonly string[] = ["UNKNOWN", "UNLICENSED", "CUSTOM:"];
const TOKEN_PATTERN = /\(|\)|[^\s()]+/g;

function tokenize(expression: string): string[] {
  return expression.match(TOKEN_PATTERN) ?? [];
}

/** Descente récursive, précédence SPDX : WITH > AND > OR. */
export function parseLicenseExpression(expression: string): LicenseNode {
  const tokens = tokenize(expression);
  let position = 0;

  const peekOperator = () => tokens[position]?.toUpperCase();
  const fail = (): never => {
    throw new InvalidLicenseExpressionError(expression);
  };

  const parsePrimary = (): LicenseNode => {
    const token = tokens[position++];
    if (token === undefined || token === ")") return fail();
    if (token === "(") {
      const inner = parseOr();
      if (tokens[position++] !== ")") fail();
      return inner;
    }
    if (["AND", "OR", "WITH"].includes(token.toUpperCase())) fail();
    if (peekOperator() === "WITH") {
      position++;
      const exception = tokens[position++];
      if (exception === undefined || exception === "(" || exception === ")") fail();
    }
    return { kind: "license", id: token };
  };

  const parseBinary = (operator: "AND" | "OR", parseOperand: () => LicenseNode) => {
    let node = parseOperand();
    while (peekOperator() === operator) {
      position++;
      node = { kind: operator === "AND" ? "and" : "or", left: node, right: parseOperand() };
    }
    return node;
  };

  const parseAnd = (): LicenseNode => parseBinary("AND", parsePrimary);
  const parseOr = (): LicenseNode => parseBinary("OR", parseAnd);

  const root = parseOr();
  if (position !== tokens.length) fail();
  return root;
}

function isUnidentified(license: string): boolean {
  const normalized = license.trim().toUpperCase();
  return (
    normalized.length === 0 ||
    normalized.endsWith(GUESSED_LICENSE_SUFFIX) ||
    UNIDENTIFIED_MARKERS.some((marker) => normalized.startsWith(marker))
  );
}

function isNodeAllowed(node: LicenseNode, allowed: ReadonlySet<string>): boolean {
  switch (node.kind) {
    case "license":
      return allowed.has(node.id);
    case "and":
      return isNodeAllowed(node.left, allowed) && isNodeAllowed(node.right, allowed);
    case "or":
      return isNodeAllowed(node.left, allowed) || isNodeAllowed(node.right, allowed);
  }
}

function evaluateExpression(license: string, allowed: ReadonlySet<string>): ViolationReason | null {
  if (isUnidentified(license)) return "UNIDENTIFIED";
  try {
    return isNodeAllowed(parseLicenseExpression(license), allowed) ? null : "NOT_ALLOWED";
  } catch (error) {
    if (error instanceof InvalidLicenseExpressionError) return "UNIDENTIFIED";
    throw error;
  }
}

/**
 * Le champ historique `licenses: [...]` de npm est ambigu (choix ou cumul ?) :
 * on le traite comme un cumul (AND), l'hypothèse la plus prudente.
 */
function toLicenseList(value: LicenseFieldValue | undefined): readonly string[] {
  if (value === undefined) return [""];
  return typeof value === "string" ? [value] : value.length > 0 ? value : [""];
}

export function findLicenseViolations(
  scan: LicenseScan,
  allowedLicenses: readonly string[],
): readonly LicenseViolation[] {
  const allowed = new Set(allowedLicenses);
  return Object.entries(scan).flatMap(([packageId, scanned]) =>
    toLicenseList(scanned.licenses).flatMap((license) => {
      const reason = evaluateExpression(license, allowed);
      return reason === null ? [] : [{ packageId, license: license || "(absente)", reason }];
    }),
  );
}

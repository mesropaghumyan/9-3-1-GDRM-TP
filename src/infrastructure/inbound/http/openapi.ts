const PROBLEM_DETAILS_SCHEMA = {
  type: "object",
  description: "Réponse d'erreur au format RFC 7807 (Problem Details), cf. docs/SFD.md §6.3.",
  properties: {
    type: {
      type: "string",
      format: "uri",
      example: "https://api.tp-meteo.local/errors/invalid-address",
    },
    title: { type: "string", example: "Adresse invalide" },
    status: { type: "integer", example: 400 },
    detail: {
      type: "string",
      example: "Le paramètre 'address' est requis et ne peut pas être vide.",
    },
    instance: { type: "string", example: "/forecast" },
  },
  required: ["type", "title", "status"],
} as const;

const FORECAST_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    address: { type: "string", example: "Alès" },
    latitude: { type: "number", example: 44.13 },
    longitude: { type: "number", example: 4.08 },
    hourly: {
      type: "object",
      properties: {
        temperature: {
          type: "array",
          items: { type: "number" },
          description: "Température horaire (°C), quel que soit le fournisseur météo actif.",
          example: [12.4, 11.8, 11.1, 10.6, 12.9, 16.2],
        },
      },
      required: ["temperature"],
    },
  },
  required: ["address", "latitude", "longitude", "hourly"],
} as const;

function problemResponse(description: string, example: Record<string, unknown>) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ProblemDetails" },
        example,
      },
    },
  };
}

/**
 * Document OpenAPI 3.0 décrivant le contrat HTTP du SFD (§6) — sert
 * uniquement à documenter/tester l'API via Swagger UI (`/docs`) ; n'est ni
 * lu ni utilisé par le domaine ou l'application (aucune fuite d'infra vers
 * le métier, cf. CLAUDE.md).
 */
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "API Météo par adresse",
    version: "1.0.0",
    description:
      "API HTTP qui reçoit une adresse postale et renvoie les prévisions météo du lieu, en enchaînant " +
      "géocodage puis météo. Le fournisseur de chaque service (Nominatim/BAN, Open-Meteo/MET Norway) " +
      "est configurable côté serveur sans changer ce contrat. Cf. docs/SFD.md pour la spécification complète.",
  },
  servers: [{ url: "/", description: "Serveur courant" }],
  paths: {
    "/health": {
      get: {
        summary: "Vérifie la disponibilité du service",
        responses: {
          "200": {
            description: "Le service est disponible.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                  required: ["status"],
                },
              },
            },
          },
        },
      },
    },
    "/forecast": {
      get: {
        summary: "Prévisions météo horaires pour une adresse",
        description: "cf. docs/SFD.md §4 (UC1) et §6.",
        parameters: [
          {
            name: "address",
            in: "query",
            required: true,
            description: "Adresse ou nom de lieu en texte libre (ex. « Alès »).",
            schema: { type: "string", minLength: 1 },
            example: "Alès",
          },
        ],
        responses: {
          "200": {
            description: "Prévisions obtenues avec succès (RG1-RG4).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ForecastResponse" },
              },
            },
          },
          "400": problemResponse("Adresse absente ou vide (A1).", {
            type: "https://api.tp-meteo.local/errors/invalid-address",
            title: "Adresse invalide",
            status: 400,
            detail: "Le paramètre 'address' est requis et ne peut pas être vide.",
            instance: "/forecast",
          }),
          "404": problemResponse("Adresse sans correspondance géographique (A2).", {
            type: "https://api.tp-meteo.local/errors/address-not-found",
            title: "Adresse introuvable",
            status: 404,
            detail: "Aucune correspondance géographique pour l'adresse fournie.",
            instance: "/forecast?address=xxxxx",
          }),
          "429": problemResponse("Quota de requêtes dépassé (§10).", {
            type: "https://api.tp-meteo.local/errors/rate-limit-exceeded",
            title: "Trop de requêtes",
            status: 429,
            detail: "Quota de requêtes dépassé, réessayez plus tard.",
          }),
          "502": problemResponse("Service de géocodage ou météo en erreur (A3, A4).", {
            type: "https://api.tp-meteo.local/errors/upstream-service-error",
            title: "Service externe indisponible",
            status: 502,
            detail: "Service de géocodage indisponible.",
            instance: "/forecast?address=Alès",
          }),
          "504": problemResponse("Délai dépassé sur un service externe (A5).", {
            type: "https://api.tp-meteo.local/errors/upstream-timeout",
            title: "Délai dépassé sur un service externe",
            status: 504,
            detail: "Le service de géocodage n'a pas répondu à temps.",
            instance: "/forecast?address=Alès",
          }),
        },
      },
    },
  },
  components: {
    schemas: {
      ForecastResponse: FORECAST_RESPONSE_SCHEMA,
      ProblemDetails: PROBLEM_DETAILS_SCHEMA,
    },
  },
};

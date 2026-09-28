# TP1→TP4 — API Météo par adresse, multi-fournisseurs, mode démo, licences auditées

API HTTP qui reçoit une adresse postale et renvoie les prévisions météo du lieu, en enchaînant deux services externes (géocodage puis météo). Le fournisseur de chaque service est configurable sans recompilation (TP2), un mode démo permet de répondre sans jamais les appeler (TP3), et le format de réponse est strictement identique dans tous les cas. Les licences de toutes ses dépendances sont auditées et contrôlées en CI (TP4). Réalisée dans le cadre du module _Gestion des dépendances, risques et maintenabilité_.

## Documentation

Toute la spécification du projet vit dans [`docs/`](./docs) :

| Document                                               | Contenu                                                                                                                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/TP_1.md`](./docs/TP_1.md)                       | Énoncé officiel du TP1 (API météo).                                                                                                                             |
| [`docs/TP_2.md`](./docs/TP_2.md)                       | Énoncé officiel du TP2 (changement de fournisseurs).                                                                                                            |
| [`docs/TP_3.md`](./docs/TP_3.md)                       | Énoncé officiel du TP3 (mode démo, cache, format de sortie unifié).                                                                                             |
| [`docs/TP_4.md`](./docs/TP_4.md)                       | Énoncé officiel du TP4 (audit de conformité des licences).                                                                                                      |
| [`docs/tp4/RAPPORT_TP4.md`](./docs/tp4/RAPPORT_TP4.md) | **Rapport TP4** : scan brut, classification des licences, fiches de décision, configuration CI.                                                                 |
| [`docs/SUPPORT_J1.md`](./docs/SUPPORT_J1.md)           | Support de cours, jour 1 (dépendances, couplage, IoC/DI).                                                                                                       |
| [`docs/SUPPORT_J2.md`](./docs/SUPPORT_J2.md)           | Support de cours, jour 2 (boundary/seam, Adapter/Facade/Strategy/Factory, licences).                                                                            |
| [`docs/SFD.md`](./docs/SFD.md)                         | **Spécifications Fonctionnelles Détaillées** : cas d'utilisation, règles de gestion, contrat d'API, critères d'acceptation.                                     |
| [`docs/STD.md`](./docs/STD.md)                         | **Spécifications Techniques Détaillées** : architecture hexagonale, choix technologiques, design patterns, gestion des erreurs, résilience, stratégie de tests. |

Les règles de développement (architecture, qualité, tests, gestion des erreurs, observabilité) sont définies dans [`CLAUDE.md`](./CLAUDE.md).

**En cas de doute sur le comportement attendu ou l'architecture à respecter, le SFD et le STD font foi.**

## État du projet

Le cas d'usage métier (adresse → géocodage → météo, cf. SFD §4) est implémenté selon l'architecture hexagonale décrite dans le STD : domaine pur, ports/adaptateurs, résilience (cache, retry, circuit breaker), gestion d'erreurs RFC 7807, tests unitaires/intégration/e2e.

Chaque port (`GeocodingPort`, `WeatherPort`) a deux implémentations réelles sélectionnables par variable d'environnement, sans recompilation (TP2) : Nominatim ou BAN pour le géocodage, Open-Meteo ou MET Norway pour la météo — cf. [« Fournisseurs configurables »](#fournisseurs-configurables-tp2) ci-dessous. Un mode démo (TP3, cf. [« Mode démo »](#mode-démo-tp3)) fournit une troisième implémentation par port, sans aucune I/O, et le format de la réponse (`hourly`) est strictement identique quel que soit le fournisseur ou le mode actif.

## Structure du dépôt

```
.
├── docs/                        # SFD, STD, TP1→TP4, support de cours, tp4/ (rapport + scan brut)
├── src/
│   ├── domain/                  # Cœur métier : Value Objects, ports, erreurs, HourlyForecastEntry[]
│   ├── application/             # Cas d'usage GetForecastByAddress (réutilisé tel quel réel/démo)
│   ├── infrastructure/
│   │   ├── inbound/http/        # Contrôleur, validation, middlewares
│   │   └── outbound/            # Adaptateurs (réels, alternatifs, démo), cache/, résilience HTTP
│   ├── config/                  # Env, jetons DI (tokens.ts) et composition root (tsyringe)
│   ├── logger.ts
│   ├── app.ts                   # Construction de l'application Express (testable)
│   └── server.ts                # Point d'entrée (bootstrap + écoute HTTP)
├── test/
│   ├── unit/                    # Domaine, application, décorateurs de résilience, cache, adaptateurs démo
│   ├── contract/                # Suites de tests de contrat partagées par port (GeocodingPort, WeatherPort)
│   ├── integration/             # Chaque adaptateur passé au contrat de son port, HTTP mocké (MSW)
│   └── e2e/                     # Supertest sur l'app complète, y compris le mode démo
├── scripts/licenses/            # Politique de licences SPDX (TP4), exécutée en CI
├── .github/                     # Workflow CI + Dependabot
├── license-policy.json          # Liste blanche des licences autorisées
├── Dockerfile
├── docker-compose.yml
└── CLAUDE.md                    # Règles de développement du projet
```

## Démarrage rapide

### Avec Docker (recommandé)

```bash
cp .env.example .env
docker compose up --build
```

L'API est alors disponible sur `http://localhost:3000` :

```bash
curl http://localhost:3000/health
# {"status":"ok"}

curl "http://localhost:3000/forecast?address=Al%C3%A8s"
# {"address":"Alès","latitude":44.13,"longitude":4.08,"hourly":[{"time":"...","temperatureCelsius":24.3}]}
```

### Fournisseurs configurables (TP2)

Chaque service externe a deux implémentations interchangeables, choisies par variable d'environnement — aucune recompilation ni changement de code (cf. [STD §3.6](./docs/STD.md)) :

| Variable             | Valeurs possibles            | Défaut       | Fournisseur                                                         |
| -------------------- | ---------------------------- | ------------ | ------------------------------------------------------------------- |
| `GEOCODING_PROVIDER` | `nominatim` \| `ban`         | `ban`        | Nominatim (OpenStreetMap) ou API Adresse (BAN, géocodeur souverain) |
| `WEATHER_PROVIDER`   | `open-meteo` \| `met-norway` | `open-meteo` | Open-Meteo ou MET Norway Locationforecast                           |

Dans `.env` :

```bash
GEOCODING_PROVIDER=nominatim
WEATHER_PROVIDER=met-norway
```

Ou pour un essai ponctuel, sans éditer `.env` :

```bash
GEOCODING_PROVIDER=nominatim WEATHER_PROVIDER=met-norway npm run dev
```

Les deux variables sont indépendantes : chacune peut être changée seule (ex. garder `open-meteo` pour la météo tout en passant à `ban` pour le géocodage). Le contrat de l'API (`GET /forecast`, cf. [SFD §6](./docs/SFD.md)) est strictement identique quel que soit le fournisseur actif — seule la couche infrastructure change.

### Mode démo (TP3)

Le paramètre de requête `demo=true` renvoie des données simulées **sans appeler aucun service externe**, quel que soit le fournisseur configuré :

```bash
curl "http://localhost:3000/forecast?address=Al%C3%A8s&demo=true"
# {"address":"Alès","latitude":48.8566,"longitude":2.3522,"hourly":[{"time":"...","temperatureCelsius":18}, ...]}
```

Seule la valeur exacte `"true"` active le mode démo ; toute autre valeur (absente, `"false"`, etc.) laisse le comportement normal inchangé. La forme de la réponse (`hourly: [{ time, temperatureCelsius }]`) est la même qu'en mode réel — cf. [STD §3.2](./docs/STD.md).

### Documentation interactive (OpenAPI / Swagger UI)

Une fois le serveur démarré, la spécification OpenAPI 3.0 du contrat HTTP (§6 du SFD) est explorable et testable directement depuis le navigateur :

- **Swagger UI** : http://localhost:3000/docs
- **Document brut** : http://localhost:3000/openapi.json

### En local (sans Docker)

Prérequis : Node.js (version fixée dans [`.nvmrc`](./.nvmrc), `nvm use` recommandé).

```bash
cp .env.example .env
npm ci
npm run dev
```

## Qualité et vérifications

```bash
npm run lint         # ESLint
npm run format:check # Prettier
npm run typecheck    # tsc --noEmit
npm test             # Jest (unitaires + e2e)
npm run licenses:check # Barrière de licences (TP4) : échoue hors liste blanche
```

## Conformité des licences et CI (TP4)

Toutes les dépendances (directes et transitives, prod et dev) sont scannées par `license-checker`, puis évaluées contre la liste blanche SPDX unique [`license-policy.json`](./license-policy.json) par un évaluateur testé ([`scripts/licenses/`](./scripts/licenses)) qui interprète réellement `OR` / `AND` / `WITH`.

```bash
npm run licenses:check   # 0 = conforme, 1 = licence refusée (copyleft, propriétaire ou non identifiée)
npm run licenses:report  # régénère le scan brut dans docs/tp4/
npm run sbom             # SBOM CycloneDX des dépendances de production (reports/sbom.cdx.json)
```

La CI GitHub Actions ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) exécute sur chaque PR vers `master` les jobs `quality`, `licenses`, `audit` et `docker`, tous requis par la protection de branche. Ajouter une licence à la liste blanche exige une fiche de décision dans le [rapport TP4](./docs/tp4/RAPPORT_TP4.md).

## Stack technique

- **Langage :** TypeScript (Node.js ≥ 22)
- **Framework HTTP :** Express
- **IoC / DI :** tsyringe + reflect-metadata
- **Documentation API :** OpenAPI 3.0 + Swagger UI (`/docs`)
- **Tests :** Jest + Supertest
- **Lint / Format :** ESLint + Prettier
- **Conteneurisation :** Docker
- **CI :** GitHub Actions, Dependabot, audit de licences (`license-checker` + politique SPDX)

Le détail des choix et leur justification se trouve dans le [STD](./docs/STD.md).

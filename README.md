# TP1 — API Météo par adresse

API HTTP qui reçoit une adresse postale et renvoie les prévisions météo du lieu, en enchaînant deux services externes (géocodage puis météo). Réalisée dans le cadre du module _Gestion des dépendances, risques et maintenabilité_.

## Documentation

Toute la spécification du projet vit dans [`docs/`](./docs) :

| Document                                     | Contenu                                                                                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/TP.md`](./docs/TP.md)                 | Énoncé officiel du TP.                                                                                                                                          |
| [`docs/SUPPORT_J1.md`](./docs/SUPPORT_J1.md) | Support de cours (dépendances, couplage, IoC/DI).                                                                                                               |
| [`docs/SFD.md`](./docs/SFD.md)               | **Spécifications Fonctionnelles Détaillées** : cas d'utilisation, règles de gestion, contrat d'API, critères d'acceptation.                                     |
| [`docs/STD.md`](./docs/STD.md)               | **Spécifications Techniques Détaillées** : architecture hexagonale, choix technologiques, design patterns, gestion des erreurs, résilience, stratégie de tests. |

Les règles de développement (architecture, qualité, tests, gestion des erreurs, observabilité) sont définies dans [`CLAUDE.md`](./CLAUDE.md).

**En cas de doute sur le comportement attendu ou l'architecture à respecter, le SFD et le STD font foi.**

## État du projet

Le cas d'usage métier (adresse → géocodage → météo, cf. SFD §4) est implémenté selon l'architecture hexagonale décrite dans le STD : domaine pur, ports/adaptateurs, résilience (cache, retry, circuit breaker), gestion d'erreurs RFC 7807, et tests unitaires/intégration/e2e.

## Structure du dépôt

```
.
├── docs/                        # SFD, STD, TP, support de cours
├── src/
│   ├── domain/                  # Cœur métier : Value Objects, ports, erreurs
│   ├── application/             # Cas d'usage GetForecastByAddress
│   ├── infrastructure/
│   │   ├── inbound/http/        # Contrôleur, validation, middlewares
│   │   └── outbound/            # Adaptateurs Nominatim/Open-Meteo, résilience HTTP
│   ├── config/                  # Env, jetons DI (tokens.ts) et composition root (tsyringe)
│   ├── logger.ts
│   ├── app.ts                   # Construction de l'application Express (testable)
│   └── server.ts                # Point d'entrée (bootstrap + écoute HTTP)
├── test/
│   ├── unit/                    # Domaine, application, décorateurs de résilience
│   ├── integration/             # Adaptateurs sortants, HTTP mocké (MSW)
│   └── e2e/                     # Supertest sur l'app complète
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
# {"address":"Alès","latitude":44.13,"longitude":4.08,"hourly":{"shortwave_radiation":[...]}}
```

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
```

## Stack technique

- **Langage :** TypeScript (Node.js ≥ 22)
- **Framework HTTP :** Express
- **IoC / DI :** tsyringe + reflect-metadata
- **Documentation API :** OpenAPI 3.0 + Swagger UI (`/docs`)
- **Tests :** Jest + Supertest
- **Lint / Format :** ESLint + Prettier
- **Conteneurisation :** Docker

Le détail des choix et leur justification se trouve dans le [STD](./docs/STD.md).

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

Ce commit initialise le projet : structure, outillage (lint/format/tests/Docker) et un serveur de base exposant un endpoint `/health`. L'implémentation du cas d'usage métier (géocodage → météo, cf. SFD §4) suit l'architecture hexagonale décrite dans le STD.

## Structure du dépôt

```
.
├── docs/                        # SFD, STD, TP, support de cours
├── src/
│   ├── domain/                  # Cœur métier (à venir)
│   ├── application/             # Cas d'usage (à venir)
│   ├── infrastructure/          # Adaptateurs entrants/sortants
│   ├── config/                  # Validation des variables d'environnement
│   ├── logger.ts
│   ├── app.ts                   # Construction de l'application Express (testable)
│   └── server.ts                # Point d'entrée (bootstrap + écoute HTTP)
├── test/                        # Tests Jest (unitaires, intégration, e2e)
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

L'API est alors disponible sur `http://localhost:3000`, avec un endpoint de santé :

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

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
- **Tests :** Jest + Supertest
- **Lint / Format :** ESLint + Prettier
- **Conteneurisation :** Docker

Le détail des choix et leur justification se trouve dans le [STD](./docs/STD.md).

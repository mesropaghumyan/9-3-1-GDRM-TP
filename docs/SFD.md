# Spécifications Fonctionnelles Détaillées (SFD)
## TP1/TP2 — API Météo par adresse, multi-fournisseurs

| | |
|---|---|
| **Projet** | TP1/TP2 - Gestion des dépendances, risques et maintenabilité |
| **Version** | 2.0 — étend le TP1 avec la sélection de fournisseur configurable (TP2) |
| **Date** | 2026-09-18 |
| **Auteur** | Mesrop Aghumyan |
| **Document lié** | [STD.md](./STD.md) |

---

## 1. Contexte et objectifs

Dans le cadre du module *Gestion des dépendances, risques et maintenabilité* (Jour 1 : couplage, cohésion, IoC/DI, identification des dépendances), le TP demande de construire une application qui :

- reçoit une **adresse postale** en entrée ;
- interroge un service de **géocodage** pour obtenir des coordonnées (latitude/longitude) ;
- interroge un service de **météo** avec ces coordonnées pour obtenir des prévisions ;
- restitue le résultat agrégé à l'appelant.

L'objectif fonctionnel est simple, mais le TP est avant tout un exercice d'**architecture** : les deux services externes enchaînés (géocodage puis météo) sont volontairement choisis pour matérialiser une chaîne de dépendances externes, à isoler derrière des abstractions (couplage faible, IoC, DI — cf. [SUPPORT_J1.md](./SUPPORT_J1.md), Partie 3 et 4).

Le TP2 ([TP_2.md](./TP_2.md)) met cette architecture à l'épreuve : le client exige un géocodeur souverain (API Adresse / BAN) et veut pouvoir changer de fournisseur météo (MET Norway) sans redéploiement. Si le couplage faible et l'IoC/DI ont été correctement appliqués, ce changement s'ajoute derrière les abstractions existantes sans modifier le domaine ni l'application — c'est le « coût du changement » que ce document intègre désormais comme exigence à part entière (RG7).

Ce document décrit **ce que fait le système** (comportement, règles de gestion, contrat d'interface HTTP). La façon dont il est construit (architecture, patterns, stack technique) est détaillée dans le [STD](./STD.md).

## 2. Périmètre fonctionnel

### 2.1 Dans le périmètre

- Recherche de prévisions météo à partir d'une adresse en texte libre, via une API HTTP.
- API HTTP (Node.js) exposant l'endpoint de prévision.
- Gestion des cas d'erreur (adresse invalide, adresse introuvable, service externe indisponible).
- Tests unitaires et de bout en bout (E2E) démontrant le comportement.
- Sélection du fournisseur de géocodage et de météo par configuration serveur (variable d'environnement), sans recompilation (RG7, TP2).

### 2.2 Hors périmètre

- **Interface utilisateur** (web, mobile ou autre) : le TP officiel ne demande qu'une API ; aucun client n'est fourni.
- Authentification / gestion des utilisateurs.
- Historique des recherches ou persistance en base de données.
- Sélection du fournisseur météo ou géocodage **par l'appelant de l'API** (paramètre de requête, en-tête, etc.) : le choix est fait côté serveur, via configuration (RG7) — cf. « Dans le périmètre » ci-dessous.
- Prévisions météo autres que la température horaire (RG4) : pas de multi-grandeurs (vent, humidité, etc.) dans ce périmètre.

## 3. Acteurs

| Acteur | Description |
|---|---|
| **Client API** | Tout consommateur de l'API HTTP (script, Postman, curl, un futur client à intégrer…). |
| **Service de géocodage** | Service externe tiers convertissant un nom de lieu en coordonnées. Fournisseur actif configurable côté serveur : Nominatim (OpenStreetMap) ou API Adresse (BAN, géocodeur souverain) — cf. STD §3.6. |
| **Service météo** | Service externe tiers fournissant des prévisions à partir de coordonnées. Fournisseur actif configurable côté serveur : Open-Meteo ou MET Norway Locationforecast — cf. STD §3.6. |

## 4. Cas d'utilisation

### UC1 — Consulter les prévisions météo d'une adresse

**Acteur principal :** Client API (tout consommateur de l'API HTTP).

**Objectif :** Obtenir les prévisions météo horaires (température) pour une adresse donnée.

**Préconditions :** Le client dispose d'une adresse (nom de lieu, ville…) à transmettre.

**Déclencheur :** Le client envoie une requête `GET /forecast?address=...`.

**Scénario nominal :**
1. Le client envoie une requête avec une adresse (ex. `Alès`).
2. Le système valide que l'adresse est non vide.
3. Le système transmet l'adresse au service de géocodage et obtient une latitude/longitude.
4. Le système transmet la latitude/longitude au service météo et obtient les prévisions horaires.
5. Le système renvoie une réponse agrégée contenant l'adresse d'origine, les coordonnées et les prévisions.

**Scénarios alternatifs / erreurs :**

| # | Cas | Comportement attendu |
|---|---|---|
| A1 | Paramètre `address` absent ou vide | Réponse `400 Bad Request`, message explicite, aucun appel aux services externes (fail-fast). |
| A2 | Adresse ne correspondant à aucun lieu connu du géocodage | Réponse `404 Not Found` avec un message métier (« Adresse introuvable »). |
| A3 | Service de géocodage indisponible ou en erreur | Réponse `502 Bad Gateway`, message générique ne fuitant pas les détails techniques internes. |
| A4 | Service météo indisponible ou en erreur | Réponse `502 Bad Gateway`, message générique. |
| A5 | Délai de réponse excessif d'un service externe | Timeout appliqué, réponse `504 Gateway Timeout`. |
| A6 | Adresse ambiguë (plusieurs résultats de géocodage) | Le système retient le premier résultat renvoyé par le géocodage (résultat le plus pertinent selon le fournisseur). |

## 5. Règles de gestion

| ID | Règle |
|---|---|
| **RG1** | L'adresse est obligatoire et ne peut pas être une chaîne vide ou composée uniquement d'espaces. |
| **RG2** | Une adresse sans correspondance géographique constitue une erreur métier « adresse introuvable », distincte d'une erreur technique. |
| **RG3** | La prévision météo n'est demandée qu'après obtention réussie des coordonnées (les deux appels externes sont **séquentiels et dépendants**, pas parallèles). |
| **RG4** | La donnée météo retournée est la **température horaire** (`temperature`) : c'est la seule grandeur disponible de façon comparable chez tous les fournisseurs météo pris en charge (contrairement au rayonnement solaire d'origine, propre à Open-Meteo et absent de MET Norway — cf. STD §3.2). Chaque adaptateur traduit son format propriétaire vers ce champ, sans transformation métier au-delà de cette traduction. |
| **RG5** | Toute erreur provenant d'un service externe est traduite en une erreur applicative normalisée (voir §6.3) : aucun détail d'implémentation externe (URL, stack technique) n'est exposé au client. |
| **RG6** | Le format de réponse en cas de succès est stable et versionné implicitement par le contrat d'API (§6.2) ; toute évolution de schéma doit rester rétrocompatible ou être versionnée. |
| **RG7** | Le fournisseur de géocodage et le fournisseur météo sont chacun sélectionnés par une variable d'environnement (cf. STD §3.6), sans recompilation ni modification de code. Le contrat d'API (§6) et le comportement observable (RG1-RG6) sont strictement identiques quel que soit le fournisseur actif — seule la couche infrastructure change (TP2). |

## 6. Spécification des interfaces

### 6.1 Endpoint

```
GET /forecast?address={adresse}
```

| Paramètre | Type | Obligatoire | Description |
|---|---|---|---|
| `address` | string (query) | Oui | Adresse ou nom de lieu en texte libre. |

### 6.2 Réponse — succès (`200 OK`)

```json
{
  "address": "Alès",
  "latitude": 44.13,
  "longitude": 4.08,
  "hourly": {
    "temperature": []
  }
}
```

### 6.3 Réponse — erreur

Les erreurs suivent le format normalisé **RFC 7807 (Problem Details)** (cf. STD §7) :

```json
{
  "type": "https://api.tp-meteo.local/errors/address-not-found",
  "title": "Adresse introuvable",
  "status": 404,
  "detail": "Aucune correspondance géographique pour l'adresse fournie.",
  "instance": "/forecast?address=xxxxx"
}
```

| Code HTTP | Cas | `type` (slug) |
|---|---|---|
| 400 | Adresse absente/invalide | `invalid-address` |
| 404 | Adresse introuvable | `address-not-found` |
| 429 | Quota de requêtes dépassé | `rate-limit-exceeded` |
| 502 | Service externe en erreur | `upstream-service-error` |
| 504 | Timeout service externe | `upstream-timeout` |
| 500 | Erreur inattendue | `internal-error` |

## 7. Exigences non fonctionnelles

| Catégorie | Exigence |
|---|---|
| **Testabilité** | Le code métier doit être testable sans appel réseau réel (mocks stricts des ports). |
| **Maintenabilité** | Le remplacement d'un fournisseur externe (géocodage ou météo) ne doit impacter que la couche infrastructure, jamais le domaine — démontré par une suite de tests de contrat unique exécutée contre chaque implémentation (RG7, cf. STD §9). |
| **Robustesse** | Une panne d'un service externe ne doit jamais provoquer un crash de l'API ; elle doit produire une réponse d'erreur maîtrisée. |
| **Performance** | Timeout explicite sur chaque appel externe (valeur configurable, cf. STD) pour éviter les requêtes bloquantes indéfiniment. |
| **Disponibilité** | L'API reste utilisable en cas de panne transitoire d'un service externe (retry) et ne doit pas aggraver une panne prolongée (circuit breaker). |
| **Sécurité / RGPD** | Aucune donnée personnelle n'est collectée ; les logs ne contiennent aucune donnée sensible. |
| **Observabilité** | Chaque requête est traçable de bout en bout via un identifiant de corrélation. |

## 8. Critères d'acceptation

- [ ] `GET /forecast?address=Alès` renvoie un `200` avec un corps conforme au schéma §6.2.
- [ ] `GET /forecast` (sans paramètre) renvoie un `400` avec un corps conforme au format Problem Details.
- [ ] `GET /forecast?address=xxxxxxxxxxx` (adresse fantaisiste) renvoie un `404`.
- [ ] Une panne simulée du service de géocodage ou météo renvoie un `502`, sans exposer de détail technique.
- [ ] Un dépassement du quota de requêtes renvoie un `429`.
- [ ] Les tests unitaires du domaine s'exécutent sans aucun accès réseau, fichier ou base de données.
- [ ] Un test E2E valide le scénario nominal complet (adresse → géocodage → météo → réponse).
- [ ] Chaque implémentation de `GeocodingPort` (Nominatim, BAN) et `WeatherPort` (Open-Meteo, MET Norway) satisfait la même suite de tests de contrat (RG7, TP2).
- [ ] Changer `GEOCODING_PROVIDER`/`WEATHER_PROVIDER` (variables d'environnement) fait basculer le fournisseur actif sans modification de code ni recompilation (RG7, TP2).

## 9. Glossaire

| Terme | Définition |
|---|---|
| **Géocodage** | Conversion d'un nom de lieu en coordonnées géographiques (latitude/longitude). |
| **Prévision météo** | Données horaires produites par le fournisseur météo pour des coordonnées données. |
| **Port** | Interface définie par le domaine métier pour accéder à une ressource externe (cf. STD). |
| **Adaptateur** | Implémentation technique d'un port, reliant le domaine à un service concret. |
| **Problem Details (RFC 7807)** | Standard de structuration des réponses d'erreur HTTP. |
| **BAN** | Base Adresse Nationale — géocodeur souverain français (`api-adresse.data.gouv.fr`), fournisseur de géocodage alternatif introduit au TP2. |
| **MET Norway** | Service météorologique norvégien (`api.met.no`), fournisseur météo alternatif introduit au TP2 ; exige un en-tête `User-Agent` identifiable. |
| **Fournisseur** | Service externe concret (Nominatim, BAN, Open-Meteo, MET Norway) implémentant un port du domaine ; sélectionné par configuration serveur (RG7). |

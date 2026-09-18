# Spécifications Fonctionnelles Détaillées (SFD)
## TP1 — API Météo par adresse

| | |
|---|---|
| **Projet** | TP1 - Gestion des dépendances, risques et maintenabilité |
| **Version** | 1.0 |
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

Ce document décrit **ce que fait le système** (comportement, règles de gestion, contrat d'interface HTTP). La façon dont il est construit (architecture, patterns, stack technique) est détaillée dans le [STD](./STD.md).

## 2. Périmètre fonctionnel

### 2.1 Dans le périmètre

- Recherche de prévisions météo à partir d'une adresse en texte libre, via une API HTTP.
- API HTTP (Node.js) exposant l'endpoint de prévision.
- Gestion des cas d'erreur (adresse invalide, adresse introuvable, service externe indisponible).
- Tests unitaires et de bout en bout (E2E) démontrant le comportement.

### 2.2 Hors périmètre

- **Interface utilisateur** (web, mobile ou autre) : le TP officiel ne demande qu'une API ; aucun client n'est fourni.
- Authentification / gestion des utilisateurs.
- Historique des recherches ou persistance en base de données.
- Sélection manuelle du fournisseur météo ou géocodage par l'appelant.
- Prévisions météo autres que celles fournies par défaut par Open-Meteo (`shortwave_radiation`).

## 3. Acteurs

| Acteur | Description |
|---|---|
| **Client API** | Tout consommateur de l'API HTTP (script, Postman, curl, un futur client à intégrer…). |
| **Service de géocodage (Nominatim)** | Service externe tiers convertissant un nom de lieu en coordonnées. |
| **Service météo (Open-Meteo)** | Service externe tiers fournissant des prévisions à partir de coordonnées. |

## 4. Cas d'utilisation

### UC1 — Consulter les prévisions météo d'une adresse

**Acteur principal :** Client API (tout consommateur de l'API HTTP).

**Objectif :** Obtenir les prévisions météo horaires (rayonnement solaire à ondes courtes) pour une adresse donnée.

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
| **RG4** | La donnée météo retournée est celle du champ horaire `shortwave_radiation`, telle que fournie par Open-Meteo, sans transformation métier supplémentaire. |
| **RG5** | Toute erreur provenant d'un service externe est traduite en une erreur applicative normalisée (voir §6.3) : aucun détail d'implémentation externe (URL, stack technique) n'est exposé au client. |
| **RG6** | Le format de réponse en cas de succès est stable et versionné implicitement par le contrat d'API (§6.2) ; toute évolution de schéma doit rester rétrocompatible ou être versionnée. |

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
    "shortwave_radiation": []
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
| **Maintenabilité** | Le remplacement d'un fournisseur externe (géocodage ou météo) ne doit impacter que la couche infrastructure, jamais le domaine. |
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

## 9. Glossaire

| Terme | Définition |
|---|---|
| **Géocodage** | Conversion d'un nom de lieu en coordonnées géographiques (latitude/longitude). |
| **Prévision météo** | Données horaires produites par le fournisseur météo pour des coordonnées données. |
| **Port** | Interface définie par le domaine métier pour accéder à une ressource externe (cf. STD). |
| **Adaptateur** | Implémentation technique d'un port, reliant le domaine à un service concret. |
| **Problem Details (RFC 7807)** | Standard de structuration des réponses d'erreur HTTP. |

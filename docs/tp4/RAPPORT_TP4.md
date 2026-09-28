# TP4 — Audit de conformité des licences

> Projet audité : **API Météo par adresse** (TP1 → TP3), écosystème **Node.js / npm**.
> Énoncé : [`docs/TP_4.md`](../TP_4.md). Date de l'audit : 28/09/2026.

## Sommaire

1. [Méthode et périmètre](#1-méthode-et-périmètre)
2. [Scan brut](#2-scan-brut)
3. [Classification des licences](#3-classification-des-licences)
4. [Fiches de décision](#4-fiches-de-décision)
5. [Intégration CI](#5-intégration-ci)
6. [Preuve du critère de réussite](#6-preuve-du-critère-de-réussite)
7. [Limites et risques résiduels](#7-limites-et-risques-résiduels)

---

## 1. Méthode et périmètre

| Élément          | Valeur                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Outil            | `license-checker@25.0.1` (outil imposé pour JavaScript), exécuté via `npx` : **aucune dépendance ajoutée** |
| Version          | Centralisée une seule fois dans `package.json` → `config.licenseChecker`                                    |
| Périmètre        | Tout `node_modules` : dépendances **directes et transitives**, **production et développement**              |
| Exclusion        | Le package racine `tp-meteo-api` (privé, `UNLICENSED`) via `--excludePrivatePackages` : c'est notre code    |
| Packages audités | **530** au total, dont **91** en production (livrés dans l'image Docker) et **439** de développement        |
| Dépendances      | **9** directes de production, **18** directes de développement                                              |

Commandes (définies dans `package.json`) :

```bash
npm run licenses:report   # régénère les fichiers bruts de ce dossier (Markdown + synthèse)
npm run licenses:check    # scan JSON + évaluation de la politique : c'est la barrière de la CI
npm run sbom              # SBOM CycloneDX des dépendances de production (npm natif)
```

## 2. Scan brut

| Fichier                                                  | Contenu                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| [`licenses.md`](./licenses.md)                           | Scan brut exhaustif (530 packages, prod + dev), sortie `--markdown`  |
| [`licenses-production.md`](./licenses-production.md)     | Scan brut restreint au code livré (`--production`, 91 packages)      |
| [`licenses-summary.txt`](./licenses-summary.txt)         | Synthèse par licence (`--summary`)                                   |
| Artefact CI `licenses-scan` → `licenses.json`, `sbom.cdx.json` | Scan JSON complet (texte des licences inclus) et SBOM, à chaque build |

> Le JSON n'est pas versionné : `license-checker` y écrit les chemins absolus de la machine qui
> exécute le scan (fuite d'informations locales, bruit dans les diffs). Il est publié comme artefact
> de la CI, où il est régénéré à chaque exécution et donc toujours à jour.

## 3. Classification des licences

### 3.1 Par licence

| Licence              | Famille        | Prod | Dev | Total | Liste blanche | Remarque                                                               |
| -------------------- | -------------- | ---: | --: | ----: | :-----------: | ---------------------------------------------------------------------- |
| MIT                  | Permissive     |   80 | 354 |   434 |      ✅       |                                                                        |
| ISC                  | Permissive     |    5 |  35 |    40 |      ✅       | Équivalent fonctionnel de MIT                                          |
| Apache-2.0           | Permissive     |    3 |  18 |    21 |      ✅       | Clause de brevet explicite, fichier `NOTICE` à conserver               |
| BSD-3-Clause         | Permissive     |    1 |  13 |    14 |      ✅       |                                                                        |
| BSD-2-Clause         | Permissive     |    1 |   8 |     9 |      ✅       | Dont `dotenv` (dépendance directe de production)                       |
| 0BSD                 | Permissive     |    1 |   0 |     1 |      ✅       | Aucune obligation, même pas d'attribution                              |
| BlueOak-1.0.0        | Permissive     |    0 |   8 |     8 |   ✅ (ajout)  | ⚠️ Hors liste « classique » → [fiche D4](#fiche-d4--blueoak-100-accepté) |
| CC-BY-4.0            | Permissive\*   |    0 |   1 |     1 |   ✅ (ajout)  | ⚠️ Licence de contenu → [fiche D3](#fiche-d3--caniuse-lite-cc-by-40-accepté) |
| (MIT OR CC0-1.0)     | Permissive     |    0 |   2 |     2 |      ✅       | Double licence au choix : **MIT retenue**                              |
| **Copyleft**         | **Copyleft**   |    0 |   0 | **0** |      ❌       | **Aucune GPL / AGPL / LGPL détectée**                                  |
| **Propriétaire**     | **Propriétaire** | 0 |   0 | **0** |      ❌       | Aucune                                                                 |
| **Non identifiée**   | —              |    0 |   0 | **0** |      ❌       | Aucune `UNKNOWN`, `Custom:` ni licence devinée (`*`)                   |

\* CC-BY-4.0 n'est pas une licence logicielle mais une licence de contenu Creative Commons. Elle est
permissive (usage commercial et modification libres, **attribution obligatoire**) et n'a **aucun effet
copyleft**, à la différence de CC-BY-**SA**.

**Signalement explicite (étape 2) :** le projet ne contient **aucune licence copyleft** ni **aucune
licence non identifiée**. La totalité des 91 packages livrés en production est sous MIT, ISC,
Apache-2.0, BSD ou 0BSD. Les seules licences hors du trio MIT/Apache/BSD (BlueOak, CC-BY-4.0) sont
**exclusivement en développement** et **transitives**.

### 3.2 Cas notables et position dans l'arbre

Profondeur 1 = dépendance directe. Chemin le plus court calculé depuis `npm ls --all --json`.

| Package                         | Licence          | Scope | Profondeur | Chemin le plus court                                                                                   |
| ------------------------------- | ---------------- | ----- | :--------: | ------------------------------------------------------------------------------------------------------ |
| `caniuse-lite@1.0.30001810`     | CC-BY-4.0        | dev   |     5      | `ts-jest` › `@babel/core` › `@babel/helper-compilation-targets` › `browserslist` › `caniuse-lite`      |
| `minimatch@10.2.6`              | BlueOak-1.0.0    | dev   |     2      | `eslint` › `minimatch`                                                                                 |
| `glob@13.0.6`                   | BlueOak-1.0.0    | dev   |     4      | `jest` › `@jest/core` › `@jest/reporters` › `glob`                                                     |
| `minipass@7.1.3`                | BlueOak-1.0.0    | dev   |     5      | `jest` › `@jest/core` › `@jest/reporters` › `glob` › `minipass`                                        |
| `path-scurry@2.0.2`             | BlueOak-1.0.0    | dev   |     5      | `jest` › `@jest/core` › `@jest/reporters` › `glob` › `path-scurry`                                     |
| `lru-cache@11.5.2`              | BlueOak-1.0.0    | dev   |     6      | `jest` › … › `glob` › `path-scurry` › `lru-cache`                                                      |
| `jackspeak@3.4.3`               | BlueOak-1.0.0    | dev   |     6      | `ts-jest` › `@jest/transform` › `babel-plugin-istanbul` › `test-exclude` › `glob@10` › `jackspeak`     |
| `path-scurry@1.11.1`            | BlueOak-1.0.0    | dev   |     6      | `ts-jest` › … › `test-exclude` › `glob@10` › `path-scurry`                                             |
| `package-json-from-dist@1.0.1`  | BlueOak-1.0.0    | dev   |     6      | `ts-jest` › … › `test-exclude` › `glob@10` › `package-json-from-dist`                                  |
| `type-fest@4.41.0`              | (MIT OR CC0-1.0) | dev   |     2      | `msw` › `type-fest`                                                                                    |
| `type-fest@0.21.3`              | (MIT OR CC0-1.0) | dev   |     4      | `jest` › `@jest/core` › `ansi-escapes` › `type-fest`                                                   |

### 3.3 Dépendances directes

| Production           | Licence      | Développement                                                   | Licence    |
| -------------------- | ------------ | --------------------------------------------------------------- | ---------- |
| `dotenv`             | BSD-2-Clause | `typescript`                                                    | Apache-2.0 |
| `reflect-metadata`   | Apache-2.0   | `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `prettier` | MIT |
| `express`, `express-rate-limit`, `helmet`, `pino`, `swagger-ui-express`, `tsyringe`, `zod` | MIT | `jest`, `ts-jest`, `@faker-js/faker`, `msw`, `supertest`, `tsx`, `pino-pretty`, `@types/*` | MIT |

## 4. Fiches de décision

Le projet ne contenant aucun copyleft, l'étape 3 est traitée sur **deux cas copyleft** : le package
GPL réellement introduit pour la vérification de la CI (D1), et un cas réaliste d'évolution du projet
(D2). Les deux licences ajoutées à la liste blanche font l'objet d'une fiche d'acceptation (D3, D4).

### Fiche D1 — `@wordpress/is-shallow-equal` (GPL-2.0-or-later)

| Rubrique       | Décision                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Package        | `@wordpress/is-shallow-equal@5.56.0` — comparaison superficielle de deux objets/tableaux                   |
| Licence        | **GPL-2.0-or-later** (copyleft fort)                                                                       |
| Position       | **Directe**, **profondeur 1**, `devDependencies`, 0 dépendance transitive (`npm explain` : « from the root project ») |
| Détection      | Bloqué par la CI (job `licenses`) — cf. [§6](#6-preuve-du-critère-de-réussite)                             |
| **Stratégie**  | **Réécrire**                                                                                               |

**Justification.**

- La fonctionnalité est triviale (une dizaine de lignes), **pure** et sans I/O. L'écrire nous-mêmes
  respecte la règle « n'introduire une librairie tierce que si elle apporte une valeur ajoutée
  significative impossible à obtenir avec la bibliothèque standard ».
- La réécriture se fait **en salle blanche** : à partir de la spécification (« mêmes clés, valeurs
  strictement égales »), sans lire ni copier le code GPL, sinon le résultat serait une œuvre dérivée.
- **Substituer** (`shallowequal`, MIT) serait acceptable, mais ajouterait une dépendance pour 10 lignes.
- **Isoler** n'a pas de sens : ce n'est pas un service d'infrastructure mais une fonction utilitaire.
  Aucun port ne la délimite, et une interface n'enlève rien aux obligations GPL d'un code lié dans le
  même processus Node.js.
- **Négocier** est hors de proportion avec la valeur apportée.
- Le fait qu'il s'agisse d'une dépendance de **développement** ne change pas la décision : la politique
  est volontairement fermée par défaut, car un utilitaire de dev peut glisser vers `dependencies` ou
  se retrouver dans un bundle sans que personne ne le remarque.

### Fiche D2 — Cache persistant MariaDB avec le connecteur `mariadb` (LGPL-2.1-or-later)

Cas réaliste d'évolution : le TP3 a introduit `CachePort` avec une seule implémentation,
`InMemoryCachePort`. Rendre le cache persistant et partagé entre instances est l'étape suivante
naturelle. Le connecteur officiel `mariadb@3.5.4` est sous **LGPL-2.1-or-later**.

| Rubrique       | Décision                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Package        | `mariadb@3.5.4` — connecteur Node.js officiel MariaDB                                                      |
| Licence        | **LGPL-2.1-or-later** (copyleft faible)                                                                    |
| Position       | Serait **directe**, **profondeur 1**, `dependencies` (**livrée** dans l'image Docker)                      |
| Détection      | Bloqué par la CI dès l'ouverture de la PR (licence absente de `license-policy.json`)                       |
| **Stratégie**  | **Substituer par un équivalent permissif** : `mysql2` (MIT), compatible avec le protocole MariaDB           |

**Justification au regard de l'architecture.**

- **La boundary existe déjà :** le domaine et le cas d'usage ne connaissent que `CachePort`
  (`src/infrastructure/outbound/cache/CachePort.ts`). Le connecteur SQL n'apparaîtrait que dans **un
  seul adaptateur** (`MariaDbCachePort`), branché dans le composition root (`src/config/container.ts`).
  Substituer le connecteur ne touche donc qu'un fichier : **0 modification du domaine, 0 test du
  domaine cassé**. C'est la même mesure du coût de sortie que le changement de fournisseur du TP2.
- **Pourquoi pas « isoler derrière l'interface existante » ?** L'isolation limite la propagation
  *technique*, pas les obligations *juridiques*. La LGPL impose de fournir le texte de la licence, le
  code source de la bibliothèque (et de ses modifications) et de permettre à l'utilisateur de la
  remplacer. Pour du JavaScript embarqué dans une image Docker distribuée, « l'édition de liens »
  n'a pas de définition claire : c'est un risque juridique à porter en continu. Isoler serait la bonne
  réponse si **aucun** équivalent permissif n'existait (on garderait alors le connecteur non modifié,
  confiné à l'adaptateur, avec les notices LGPL dans l'image).
- **Pourquoi pas « réécrire » ?** Un connecteur de protocole réseau est un composant complexe et
  sensible (sécurité, pooling, TLS) : le réécrire coûterait plus cher et serait plus risqué.
- **Pourquoi pas « négocier » ?** Négocier une licence alternative (coût, délai, dépendance à un
  fournisseur) ne se justifie qu'en l'absence d'alternative : ici, une alternative MIT mature existe.

**Mise en œuvre :** `npm i mysql2`, adaptateur `SqlCachePort implements CachePort`, qui passe la même
suite de tests de contrat que `InMemoryCachePort`. La barrière de licences reste verte.

### Fiche D3 — `caniuse-lite` (CC-BY-4.0) : accepté

| Rubrique      | Décision                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Position      | Transitive, **profondeur 5**, dev uniquement (`ts-jest` › `@babel/core` › … › `browserslist` › `caniuse-lite`)   |
| Nature        | Base de données (support navigateurs), pas du code exécuté par notre API                                         |
| Obligation    | Attribution de la source (« Can I use »)                                                                         |
| **Décision**  | **Accepter** : ajout de `CC-BY-4.0` à la liste blanche                                                           |

**Justification :** aucun effet copyleft. Le package n'est jamais livré : l'image Docker installe
les dépendances avec `npm ci --omit=dev`. L'obligation d'attribution est satisfaite par le scan
versionné. Le substituer imposerait de remplacer toute la chaîne Babel de `ts-jest`, pour un risque nul.

### Fiche D4 — BlueOak-1.0.0 : accepté

| Rubrique      | Décision                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Packages      | `glob`, `minimatch`, `minipass`, `path-scurry`, `lru-cache`, `jackspeak`, `package-json-from-dist` |
| Position      | Transitive, profondeur **2 à 6**, dev uniquement (via `eslint`, `jest`, `ts-jest`)                 |
| **Décision**  | **Accepter** : ajout de `BlueOak-1.0.0` à la liste blanche                                         |

**Justification :** licence permissive moderne approuvée par l'OSI, rédigée en langage clair. Elle
couvre explicitement les brevets, comme Apache-2.0, et n'a aucun effet copyleft. Ces packages sont
des briques de base de l'outillage Node.js (leur auteur, également créateur de `npm`, a publié ses
projets sous cette licence) : les refuser reviendrait à refuser ESLint et Jest.

### Synthèse : quelle stratégie pour quel composant de notre architecture ?

| Où arrive la dépendance copyleft ?                            | Stratégie privilégiée                            | Pourquoi                                                  |
| ------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| Utilitaire pur (domaine, application)                         | Réécrire                                         | Petit périmètre, garder le domaine sans dépendance        |
| Adaptateur sortant (géocodage, météo, cache, HTTP)            | Substituer, sinon isoler dans l'adaptateur       | Le port (`GeocodingPort`, `WeatherPort`, `CachePort`, `HttpClient`) rend l'échange local |
| Service externe appelé par le réseau (Nominatim, BAN…)        | Aucune contamination du code, vérifier les CGU   | La licence du *serveur* ne s'applique pas au client HTTP  |
| Composant cœur sans alternative (SDK propriétaire, AGPL…)     | Négocier une licence commerciale                 | Dernier recours, coût récurrent, dépendance fournisseur   |

## 5. Intégration CI

### 5.1 Politique centralisée

La liste blanche est définie **une seule fois** dans [`license-policy.json`](../../license-policy.json) :

```json
["MIT", "ISC", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "0BSD", "BlueOak-1.0.0", "CC-BY-4.0", "CC0-1.0"]
```

`CC0-1.0` ne sert aujourd'hui qu'à rendre explicite la branche alternative de `type-fest`. Toute
modification de cette liste doit être justifiée par une fiche de décision dans ce rapport.

### 5.2 Pourquoi un évaluateur dédié plutôt que `license-checker --onlyAllow` ?

En lisant le code source de `license-checker@25.0.1` (`lib/index.js`), on constate que `--onlyAllow`
fait une **recherche de sous-chaîne** (`licenses.indexOf(allowed)`). Conséquences :

| Licence déclarée          | `--onlyAllow "MIT;…"` | Attendu   | Évaluateur du projet |
| ------------------------- | :-------------------: | :-------: | :------------------: |
| `(MIT AND GPL-3.0-only)`  | ✅ accepté             | ❌ refus   | ❌ refus              |
| `["MIT", "GPL-2.0"]`      | ✅ accepté             | ❌ refus   | ❌ refus              |
| `MIT*` (licence devinée)  | ✅ accepté             | ⚠️ à vérifier | ❌ refus (non identifiée) |

L'outil reste le **scanner** : c'est lui qui produit le JSON exhaustif. La **décision** revient à
[`scripts/licenses/licensePolicy.ts`](../../scripts/licenses/licensePolicy.ts), une fonction pure
testée unitairement (`test/unit/scripts/licensePolicy.test.ts`, 20 tests), qui interprète réellement
les expressions SPDX :

- `A OR B` : conforme si l'une des branches est autorisée ;
- `A AND B` : conforme si toutes les branches le sont ;
- `A WITH exception` : seule `A` est évaluée ;
- `UNKNOWN`, `Custom: …`, licence devinée `*`, licence absente ou expression malformée : **refus**
  (licence non identifiée, fonctionnement fermé par défaut) ;
- tableau historique `licenses: [...]` : traité comme un cumul (hypothèse la plus prudente).

Le point d'entrée [`scripts/licenses/checkLicenses.ts`](../../scripts/licenses/checkLicenses.ts)
renvoie `0` si le projet est conforme, `1` en cas de violation (le build échoue) et `2` en cas
d'erreur technique (scan illisible). Sur GitHub Actions, il ajoute une annotation `::error` par
package fautif et un tableau dans le résumé du job.

### 5.3 Pipeline — [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

| Job         | Rôle                                                                                          | Bloquant |
| ----------- | --------------------------------------------------------------------------------------------- | :------: |
| `quality`   | `format:check`, `lint`, `typecheck`, `test`, `build`                                          |    ✅    |
| `licenses`  | `npm ci --ignore-scripts` puis `licenses:check` ; publie `licenses.json` et `sbom.cdx.json`   |    ✅    |
| `audit`     | `npm audit --omit=dev --audit-level=high` (bloquant) et audit complet (informatif)            |    ✅    |
| `docker`    | Construction de l'image de production                                                         |    ✅    |

Déclencheurs : PR et push vers `master`, exécution **hebdomadaire** (nouveaux avis de sécurité) et
manuelle.

Mesures de sécurité de la chaîne CI/CD :

- jeton `GITHUB_TOKEN` en **lecture seule** (`permissions: contents: read`), `persist-credentials: false` ;
- actions tierces **épinglées par SHA de commit** (et non par tag, qui peut être déplacé) ;
- `npm ci` sur le lockfile (intégrité vérifiée par hash) et `--ignore-scripts` pour le job de scan ;
- **Dependabot** ([`.github/dependabot.yml`](../../.github/dependabot.yml)) pour npm et les actions :
  chaque PR de mise à jour passe elle aussi par la barrière de licences ;
- **protection de `master`** : PR obligatoire, les 4 jobs sont des status checks requis, branche à
  jour avant fusion, historique linéaire, force-push et suppression interdits.

## 6. Preuve du critère de réussite

> « Le build échoue si un package sous licence copyleft non whitelistée est ajouté au projet. »

### 6.1 En local

```text
$ npm install --save-dev @wordpress/is-shallow-equal@5.56.0
$ npm explain @wordpress/is-shallow-equal
@wordpress/is-shallow-equal@5.56.0 dev
node_modules/@wordpress/is-shallow-equal
  dev @wordpress/is-shallow-equal@"^5.56.0" from the root project

$ npm run licenses:check
1 violation(s) de la politique de licences sur 531 packages :
  - @wordpress/is-shallow-equal@5.56.0 : "GPL-2.0-or-later" (licence hors liste blanche) -> position dans l'arbre : npm explain @wordpress/is-shallow-equal
Décision attendue : réécrire, substituer, isoler ou négocier (cf. docs/tp4/RAPPORT_TP4.md).
exit=1

$ npm uninstall @wordpress/is-shallow-equal
$ npm run licenses:check
Licences conformes : 530 packages analysés, liste blanche = MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, BlueOak-1.0.0, CC-BY-4.0, CC0-1.0.
exit=0
```

`package.json` et `package-lock.json` sont revenus à l'identique après le retrait (vérifié par `diff`).

### 6.2 En CI

Vérification sur une PR dédiée, [#3](https://github.com/mesropaghumyan/9-3-1-GDRM-TP/pull/3) (branche `test/tp4-gpl-canary`, fermée sans fusion) :

| Étape | Commit    | Run CI                                                        | `quality` | `licenses` | `audit` | `docker` | Résultat |
| ----- | --------- | ------------------------------------------------------------- | :-------: | :--------: | :-----: | :------: | :------: |
| Ajout de `@wordpress/is-shallow-equal` (GPL) | `ede32e1` | [36422949879](https://github.com/mesropaghumyan/9-3-1-GDRM-TP/actions/runs/36422949879) | ✅ | ❌ | ✅ | ✅ | **Build en échec** |
| Retrait du package                            | `b1bbe3f` | [36423095189](https://github.com/mesropaghumyan/9-3-1-GDRM-TP/actions/runs/36423095189) | ✅ | ✅ | ✅ | ✅ | **Build vert**     |

Extrait du log du job `licenses` en échec :

```text
##[error]@wordpress/is-shallow-equal@5.56.0 est sous "GPL-2.0-or-later" (licence hors liste blanche)
1 violation(s) de la politique de licences sur 532 packages :
  - @wordpress/is-shallow-equal@5.56.0 : "GPL-2.0-or-later" (licence hors liste blanche) -> position dans l'arbre : npm explain @wordpress/is-shallow-equal
Décision attendue : réécrire, substituer, isoler ou négocier (cf. docs/tp4/RAPPORT_TP4.md).
##[error]Process completed with exit code 1.
```

L'erreur remonte aussi sous forme d'annotation « Licence refusée » sur la PR. Seul le job `licenses` échoue,
les autres restent verts : la barrière est bien le mécanisme qui bloque. Comme les 4 jobs sont des
status checks requis sur `master`, la PR ne peut pas être fusionnée.

> 532 packages sur le runner Linux contre 531 sur macOS : les dépendances optionnelles propres à la
> plateforme diffèrent (binaires natifs). C'est pour cette raison que le scan de référence est celui
> de la CI.

## 7. Limites et risques résiduels

- **L'outil lui-même est un risque de dépendance :** `license-checker` n'est plus publié depuis
  juin 2022. C'est un *bus factor* faible, et il installe des sous-dépendances dépréciées
  (`glob@7`, `read-installed`). Il n'est **pas** ajouté au projet (exécution éphémère via `npx`,
  version épinglée). Pour le remplacer, il suffit de changer `config.licenseChecker`, par exemple
  pour le fork maintenu `license-checker-rseidelsohn`, dont le format JSON est compatible :
  l'évaluateur n'en dépend que par le champ `licenses`.
- **Licence déclarée ≠ licence réelle :** le scan lit le champ `license` de chaque `package.json`.
  Un fichier `LICENSE` contradictoire ou du code vendorisé sous une autre licence ne seraient pas
  détectés : c'est la limite de tout scanner fondé sur les manifestes.
- **Vulnérabilité hors périmètre licences :** `npm audit` signale une faille *high* dans
  `@faker-js/faker@9.9.0` (GHSA-qxc2-j82w-r537, `helpers.fake`). Elle ne concerne que les tests : le
  package n'est pas livré et nous n'appelons pas `helpers.fake` avec une entrée non maîtrisée. La
  correction impose une montée de version majeure (v10), laissée à une PR Dependabot dédiée. L'audit
  bloquant porte donc sur les dépendances de production.
- **Prochaine étape : le SBOM.** Un SBOM CycloneDX est déjà produit à chaque build (artefact CI). Il
  peut alimenter un outil de suivi continu (Dependency-Track, GitHub dependency graph).

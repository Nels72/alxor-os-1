# CLAUDE.md — Alxor OS (Easy Courtage Assurance)

> Contexte projet chargé à chaque session Claude Code. Mise à jour : 2026-06-16.
> Aucun secret ici — toutes les clés/tokens sont dans `.env` (gitignoré) ou `.mcp.json` (gitignoré). Voir `docs/SETUP.md`.
> **Ce dépôt (`Nels72/alxor-os-1`) est désormais l'unique dépôt vivant du projet.**

## Objectif

**Alxor OS** est la plateforme digitale d'un cabinet de courtage en assurance français (« Easy Courtage Assurance », ECA). Cœur du produit : un **outil de matching assurance pour courtiers** — après extraction des données du Relevé d'Information (RI) d'un prospect, un moteur classe les compagnies partenaires par appétence/éligibilité pour orienter le courtier vers le bon extranet, avec **3 propositions tracées** (obligation DDA, auditable ACPR).

⚠️ **Doctrine matching (actée 2026-06-16)** : il n'existe pas de « fiche d'appétence » dédiée chez les compagnies partenaires — seulement des **fiches produits** (segment_cible, formules, garanties, sans seuils de souscription chiffrés). Le moteur (`lib/matchingEngine.ts`) se base donc sur le **profil du prospect** (données RI) rapproché de la fiche produit + de seuils **saisis manuellement par le métier** dans `Produits_CIE` (pas extraits automatiquement). Le moteur ne produit **aucune tarification** : il ne fait que le **rapprochement et le Top 3 des compagnies susceptibles d'accepter le risque** ; le tarif réel n'arrive que plus tard, via l'extraction du devis effectivement émis par la compagnie.

- **Marché** : France. **Périmètre produit : Auto/Moto d'abord, puis MRH.**
- **3 canaux d'entrée des leads** : Alex Web (chatbot public easycourtage.fr), Alex Apporteur (PWA Netlify avec auth token), et le parcours **Cabinet** (face-à-face, front React).
- Multi-tenant : champ `Cabinet_Tenant` partout (ECA = premier cabinet).

## Stack

| Brique | Rôle |
|---|---|
| **Airtable** (base `apprtejZaap5ouqGm`) | Base de vérité : Contacts, Dossiers, Documents, Apporteurs, Collaborateurs, Compagnies_et_Partenariats, REF_Produits… |
| **Dropbox** (app `alxor-ged`) | GED : `/ged_alxor/{Cabinet}/{Contact}/{Dossier}/` + documents partenaires (fiches appétence) |
| **n8n** (`https://n8n2.reaktimo.com`, projet `zwr2ku2Be5k6HNPX`) | Workflows IA : Distribution Lead, Extraction RI (×2), Extraction Devis, Renommage GED, Relance Docs, Création Prospect Cabinet, Auth Apporteur, Lookup Client, Yousign |
| **Make.com** | Scénarios chatbots (4 Apporteur, 6 Web) : création Contact+Dossier+Documents puis appels webhooks n8n |
| **Gemini 2.5 Flash** | Extraction RI (direct), extraction devis (via OpenRouter), classification documents (multimodal) |
| **OpenRouter** | Proxy LLM — utilisé pour l'extraction devis (`google/gemini-2.5-flash`) |
| **Claude API** | Extraction des fiches **produits** compagnies — segment/formules/garanties, pas de seuils de souscription (prompts dans `ops/.basedeconnaissance/`) |
| **Netlify** | Hébergement chatbot apporteur (`alex-apporteur-eca.netlify.app`) ; déploiement Cabinet prévu |
| **Front Cabinet** | React 19 + Vite + TS + Zustand + Tailwind — racine de ce repo |
| **Presidio** (`ops/presidio/`) | API locale d'anonymisation PII (port 5080), reconnaissance FR |

## Structure du projet

```
alxor-os-1/  ← unique dépôt vivant
├── CLAUDE.md                     # Ce fichier — contexte projet
├── .env / .env.example           # Secrets (gitignoré) / modèle
├── .mcp.json                     # Config MCP locale (gitignoré)
├── netlify.toml                  # Config déploiement Netlify
│
├── [Front React — Application Cabinet]
│   ├── App.tsx, index.tsx, index.html, vite.config.ts, tsconfig.json
│   ├── Pages/                    # Dashboard, ProspectDetail, ProspectForm, ClientPortal, Login, LoginAdmin, Conformite
│   ├── components/               # Layout, Logo, FicFormModal, FicheTarification, DocumentChecklist
│   ├── lib/                      # matchingEngine, gesCalculator, ficPdfGenerator, ficTemplates, productCatalog, compagnieRules…
│   ├── services/                 # airtable, airtableService, dossiersAirtable, extractionRI, devisExtraction, yousignService…
│   ├── styles/globals.css
│   └── store.ts, types.ts, mockData.ts, documentRequirements.ts
│
├── docs/                         # Documentation projet
│   ├── SETUP.md                  # Installation nouvelle machine + sécurité
│   ├── DOCUMENTATION_GED_RENOMMAGE.md
│   └── DIAGNOSTIC_CREDENTIAL_AIRTABLE.md
│
└── ops/                          # Infrastructure opérationnelle
    ├── package.json              # Dépendance dotenv pour les scripts
    ├── .basedeconnaissance/      # Prompts extraction fiches appétence compagnies (Auto/Moto/MRH)
    ├── alex/
    │   ├── chatbot/              # Sources HTML chatbots (Web v11, Apporteur v1), blueprints, briefs n8n, emails
    │   ├── deploy-apporteur/     # PWA Netlify déployée (index, manifest, sw.js, icons)
    │   └── documentation/        # Fiches techniques, plans (Yousign v3, agent vocal, courriers types)
    ├── presidio/                 # API Python anonymisation (venv local, port 5080)
    ├── blueprints/               # Exports Make.com (*.blueprint.json) — NE PAS modifier en JSON
    └── scripts/                  # Scripts Node.js utilitaires (n8n, Dropbox, Airtable) — lisent .env via dotenv
```

## Convention de nommage des documents

**Documents clients (GED Dropbox)** — appliquée par le workflow n8n Renommage GED :
```
{CODE_TYPE}_{NOM}_{Prénom}_{ID_DOSSIER}_{YYYYMMDD}.{ext}
```
Codes types : `RI, PI, PC, JD, CGB, CGD, CPI, CONTRAT, DEVIS, FIC, QUEST, AUTRE`. Dropbox `autorename: true` (gère recto/verso).

**Documents partenaires (fiches compagnies)** — le préfixe du fichier Dropbox détermine le prompt d'extraction :
| Préfixe | Prompt |
|---|---|
| `fiche-appetence-auto-*` / `fiche-appetence-moto-*` / `fiche-appetence-mrh-*` | Auto / Moto / MRH |
| `fiche-produit-auto-*` | Auto |
| `contrat-ref-auto-*` | Auto (extraction light) |
| `DG_*` / `CG_*` | Dispositions/Conditions Générales — document contractuel complet, **source des vraies fourchettes de franchise** (lié via `Dropbox_DG_URL`, ajouté au workflow le 2026-06-16) |

## Schéma Airtable — base de connaissance « one row per product »

Principe adopté pour la base de connaissance compagnies : **une ligne = un produit compagnie** (ex. « AXA Auto Confort »), pas une ligne par compagnie. Chaque ligne porte le segment cible + scoring marché extraits de la **fiche produit** (il n'existe pas de fiche d'appétence dédiée — cf. doctrine matching ci-dessus), complétés par des **seuils d'éligibilité saisis manuellement par le métier** (schéma JSON complet dans `ops/.basedeconnaissance/prompts_extraction_appetence.md`, à relire à la lumière de cette doctrine) :
- `meta` : compagnie, produit, **segment_cible** (`standard | aggrave | premium | jeune_conducteur | senior`), version fiche
- `eligibilite` (saisie manuelle métier, pas extraite) : plancher aggravé, bonus/malus (max accepté, à l'étude), sinistres (36m/24m, types exclusifs), résiliation (motifs exclus, carence), conducteur (âge, permis), véhicule (énergies/catégories/usages exclus), géographie (départements exclus), ancienneté assurance
- `scoring_marche` (extrait de la fiche produit) : qualité/prix, gestion sinistres, garanties, réactivité, points forts/faibles
- `Franchise_Min_EUR` / `Franchise_Max_EUR` (ajoutés 2026-06-16) : fourchette globale de franchise, calculée par le workflow à partir des `franchise_*_eur` par formule — alimentée en priorité par le DG/CG (`Dropbox_DG_URL`), la fiche produit seule ne contenant généralement pas ces montants
- Règle d'or extraction : **null si absent, jamais de valeur inventée** ; ambiguïtés dans `notes[]`

Cette table doit remplacer les règles hardcodées de `lib/compagnieRules.ts` (front Cabinet, 4 vraies compagnies depuis 2026-06-16) pour que le métier puisse éditer sans dev. Le moteur (`lib/matchingEngine.ts`) garde ses 3 phases : éligibilité (gate, donnée manquante = bénéfice du doute) → appétence technique (0–100) → score composite → Top 3 — **sans tarification** (champ `tarif_estime` optionnel, non calculé par le moteur) ; la franchise affichée est une vraie fourchette (`Franchise_Min/Max_EUR`) ou, si absente, un message explicite plutôt qu'un montant inventé.

**Chargement instantané (doctrine 2026-06-16)** : `services/produitsAirtable.ts` charge toute ligne `Produits_CIE` réellement liée à une compagnie dès qu'elle existe, même partiellement remplie (chaque champ manquant reçoit un défaut permissif) — plus de seuil arbitraire (« au moins N compagnies complètes ») avant d'utiliser les données réelles. Le filet de secours statique (`compagnieRules.ts`) n'intervient que si Airtable est inaccessible ou si aucune ligne n'est liée à une compagnie.

Tables existantes clés : Dossiers `tblh45gV9PZcN1fkz`, Documents `tblfxKmkeklx4FyGY`, Contacts `tbl9sFkklVymVBKNN`, Compagnies_et_Partenariats `tbl6nxHBezqId2O5R` — **4 partenaires actifs vérifiés 2026-06-16 : ALLIANZ FRANCE, THELEM ASSURANCES, AXA FRANCE IARD, MAXANCE** (commissions + URL extranet ; ⚠️ typo `hhtps://` dans l'URL Maxance, à corriger dans Airtable), REF_Produits (codes : AUT, MOT, MRH, MRP, RCPRO…).

## Conventions de travail

- **Secrets** : jamais en dur dans un fichier — toujours `.env` (`AIRTABLE_PAT`, `DROPBOX_*`, `GEMINI_API_KEY*`, `GITHUB_PERSONAL_ACCESS_TOKEN`) + `process.env` via dotenv dans les scripts. Les tokens MCP (JWT n8n, PAT GitHub) sont dans `.mcp.json` et `~/.claude.json` (gitignoré).
- **n8n** : toujours nœuds natifs plutôt que HTTP Request quand disponibles ; modifications via MCP n8n ou API REST (`X-N8N-API-KEY`, expire 2026-07-12) ; consulter les skills n8n avant. MCP : `czlonkowski/n8n-mcp` v2.57.4 en **stdio** avec REST API key (accès **tous** les workflows) — remplace le transport HTTP natif (`/mcp-server/http`) qui était limité à 2 workflows. v2.52 : Code nodes sandboxés (pas de `fetch`/`require`/`this.helpers`) → ExtractFromFile pour binary→base64.
- **Gemini** : `gemini-2.5-flash` est un modèle à *thinking* → ne PAS mettre `maxOutputTokens` (JSON tronqué) ; utiliser `generationConfig: { response_mime_type: "application/json" }`.
- **Make.com** : ne PAS modifier les blueprints JSON dans `ops/blueprints/` — uniquement via l'interface Make. Attachments optionnels : `{{ifempty(XX.field_url; emptyarray)}}`.
- **Airtable** : accès direct API autorisé sans confirmation. Attention : un champ inexistant dans un PATCH → 422 qui annule tout. Plan gratuit : quota reset le 1er du mois (429 = attendre). Création de nouveaux champs via l'API meta (`POST .../fields`) : **OK**. PATCH des *choices* d'un champ select existant (`PATCH .../fields/{id}`) : **toujours 422** sur ce plan (confirmé 2026-06-16, plusieurs variantes testées) — passer par l'UI.
- **n8n via API REST publique** : `N8N_API_URL` (`~/.claude.json`, config `n8n-mcp`) est juste l'host (`https://n8n2.reaktimo.com`), préfixer `/api/v1/...` ; header `X-N8N-API-KEY`. **PATCH `/workflows/{id}` → 405** (non supporté) ; utiliser **PUT** avec `{ name, nodes, connections, settings }` uniquement (les autres champs du GET, ex. `id`/`active`/`tags`/`shared`, font échouer la requête).
- **Workflow « 2- Extraction RI »** (`823xFRdz4SJSfv0R`) : référence fonctionnelle du pipeline chatbot — **ne pas toucher**.
- **Front Cabinet** : développé dans la racine de ce repo (React 19 + Vite + Tailwind).
- Gmail v2.2 (n8n) : `sendTo` (pas `toList`), `emailType`.

## État d'avancement (2026-06-15)

**Fait et en production :**
- Flux lead chatbot end-to-end (Web + Apporteur) : création Airtable → distribution lead → extraction RI → renommage GED → email courtier enrichi
- Chatbot Apporteur v1 (PWA Netlify, 2 apporteurs onboardés : Martins, Mssihid) ; Alex Web v11
- Parcours Cabinet : création prospect (SIRET lookup), upload + qualification docs, extraction RI synchrone, extraction devis, génération FIC PDF (8 produits), relance auto docs provisoires (J-7/J-1/post-échéance — ⚠️ **en panne**, cf. ci-dessous), matching local 7 compagnies (règles TS), fiche tarification Auto/Moto
- Workflow Yousign double signature (devis+FIC puis contrat) ACTIF — en attente test e2e sandbox
- Audit cybersécurité (3 étapes) + **API Presidio locale opérationnelle** (voir ci-dessous) ; secrets du repo nettoyés vers `.env` (rotation à faire, cf. `docs/SETUP.md` §6)
- Prompts d'extraction fiches appétence rédigés (`ops/.basedeconnaissance/`)
- Fusion des dépôts `alxor-os` et `alxor-os-1` en repo unique (`alxor-os-1`) — 2026-06-11
- **Presidio RGPD — FAIT 2026-06-12** : API d'anonymisation PII française opérationnelle localement :
  - `venv` installé (`ops/presidio/venv/`), modèles `fr_core_news_lg` + `fr_core_news_md` téléchargés
  - 6 recognizers FR personnalisés : immatriculation (conservée), permis, SIRET, CNI, téléphone, date de naissance
  - Filtres faux-positifs : noms de compagnie protégés, labels de formulaire filtrés, dates contrat ≠ dates naissance, second passage de remplacement pour occurrences multiples
  - Tests PASS : 8/8 vérifications sur données RI réelles (DUPONT anonymisé, FG-456-HJ conservé, bonus/malus conservé)
  - Démarrage local : `cd ops/presidio && ./start_local.sh` → port 5080
  - **Intégration n8n** : voir `ops/presidio/N8N_INTEGRATION.md` — nœuds HTTP Request à ajouter dans les 3 workflows (Extraction RI, Extraction Devis, Extraction RI Cabinet)
  - **Déploiement serveur** : `install.sh` prêt pour `n8n2.reaktimo.com` — À faire (SSH requis)

- **Dashboard refondu — file de production par étapes (2026-06-12)** :
  - `lib/pipeline.ts` : étapes dérivées de `Statut_Dossier` + `Statut_Signature` + GES (À traiter / En étude / Signature / À régulariser / Sans suite ; converti GES 100 → sort vers Portefeuille Client) ; priorité calculée (SLA premier contact **24h**, relance devis **24h**, relance contrat **J+1**, contrat à émettre **48h**) ; alertes critiques (bandeau overview)
  - Distinction « signature active » vs « **attente retour client** » (projet à échéance) : `Date_Rappel_Client` (nouveau champ Dossiers) prioritaire, fallback `Devis_Date_Effet` > 15 j → relance à J-7 avant date d'effet
  - Sélecteur de profil collaborateur (V1, Layout) sur table `Collaborateurs_Cabinet_Client` ; visibilité : Admin = tout, sinon « Mes dossiers » par défaut + bascule « Tous » ; bouton **Reprendre** sur dossier à titulaire `Absent` → réassignation Airtable + trace dans `Historique_Assignation` (nouveau champ)
  - Top 3 DDA : indicateur « Fait » en liste (détail dans la fiche prospect) ; mocks supprimés (bouton FIC/DDC, immatriculations aléatoires) ; recherche réelle ; docs manquants nominatifs en liste
  - Logique testée sur 17 cas synthétiques (esbuild + node) — toutes les branches OK

- **Fiche prospect — Saisie courtier (2026-06-13)** :
  - Nouveau champ `immatriculation_a_assurer` (type `AutoProductData`) — véhicule **à assurer**, distinct de l'immatriculation extraite du RI (véhicule précédent)
  - Saisie courtier : champ monospace/uppercase dans la section « Saisie courtier » de `ProspectDetail.tsx`, rappel discret de l'immat RI si différente
  - Fiche tarification : `immatriculation_a_assurer` en priorité, fallback RI ; titre bloc → « Véhicule à assurer »

- **Fixes Dashboard (2026-06-13)** :
  - Colonne Produit toujours vide sur les vrais dossiers : `getInsuranceTypeLabel` ne cherchait pas `'Type_Contrat'` (nom réel du champ Airtable) — corrigé (`services/dossiersAirtable.ts`)

- **Dashboard — auth réelle + onglets Docs/Admin + suivi Apporteurs (2026-06-14)** :
  - `LoginAdmin.tsx` : auth via `Collaborateurs_Cabinet_Client` (Email_Pro + MDP_Prov + Statut=Actif), suppression credentials hardcodés
  - `store.ts` : `login(collab?)` hydrate `currentCollaborateur` + persiste en localStorage
  - Dashboard overview : suppression données fictives (14 500 €, +12%, CHART_DATA, widget 65%/140h, « Jean-Marc Dupont »)
  - Onglet **Documents Cabinet** : CRUD depuis table `Documents_Cabinet` (graceful 404/422 si absente) — `services/documentsCabinetAirtable.ts`
  - Onglet **Administration** : sous-onglets Collaborateurs (inline edit, création, rôle Admin) + Apporteurs (carte expandable, dossiers liés lazy-load, totaux commissions)
  - `services/apporteursAirtable.ts` : `fetchDossiersApporteur()`, `parseRollup()` (gère `number | string[]`), champ `Dossiers_Apportes` (sans accent)

- **Schéma Airtable Apporteurs ↔ Dossiers — nettoyé (2026-06-14)** :
  - Paire unique : `Apporteur_Dossier` (`fldvWVTKM6ajxmK8h`) dans Dossiers ↔ `Dossiers_Apportes` (`fldVWNItsuSI1nuAN`) dans Apporteurs
  - Rollups valides : `Total_Reverse_Apporteur` + `Total_Global_En_Attente` sur `Dossiers_Apportes`
  - Lookup `Taux_Apporteur` reconfiguré → `Commission_Defaut` via `Apporteur_Dossier`
  - Champs redondants/orphelins supprimés (ancienne paire, texte `Dossiers_old_texte`)
  - ⚠️ L'API Airtable ne supporte pas le PATCH de `recordLinkFieldId` sur rollup/lookup existants — toujours passer par l'UI

- **Make "Alex Apporteur" — liaison Apporteur corrigée (2026-06-14)** :
  - Module 29 "Cherche Apporteur" : ajout `filterByFormula={ID_Apporteur}="{{51.id_apporteur}}"` (sans ce filtre il retournait le 1er apporteur de la table)
  - Module 47 "Créer un Nouveau Dossier" : ajout champ `Apporteur_Dossier=[{{29.id}}]` (record ID Airtable)
  - Vérifié : `Dossiers_Apportes` côté Apporteur auto-peuplé via liaison inverse ✅
  - ⚠️ **Workflows n8n non déclenchés** sur les dossiers Alex Apporteur créés lors du test — à investiguer (Distribution Lead, Extraction RI non partis) — priorité prochaine session

- **GED Documents + CTA Matching + permis recto/verso (2026-06-14 soir)** :
  - `services/airtable.ts` — `getDocumentsByDossier` : filtre corrigé `{Dossier}="DOS_XXXXXX"` (le champ lié retourne le champ primaire, pas le recId) → documents GED remontent correctement dans l'onglet Documents
  - `Pages/ProspectDetail.tsx` — preview docs : iframe Dropbox remplacée par modal info + bouton "Ouvrir" (X-Frame-Options bloque l'embed) ; bouton "Rafraîchir" ajouté sur l'onglet Documents
  - `Pages/ProspectDetail.tsx` — CTA Matching : `bloquantsMissing` exclut le RI si `RI_Traité = true` dans Airtable ; le bouton s'active même sans upload manuel du RI
  - `lib/preDevisDocuments.ts` — `DocumentConfig` : nouveau champ optionnel `max_files?: number` ; `permis_conduire` passe à `max_files: 2`
  - `Pages/ProspectDetail.tsx` — bouton "Verso" compact affiché quand `max_files > 1` et doc déjà reçu, pour joindre le recto séparé
  - `ops/blueprints/` — blueprint Make module 57 `http:MakeRequest` (remplace `http:ActionSendData` inexistant), `stopOnHttpError: false`
  - commit `8386abe` pushé ✅

- **MCP n8n full-scope — FAIT 2026-06-15** :
  - `czlonkowski/n8n-mcp` v2.57.4 installé globalement (`npm install -g n8n-mcp`), configuré en **stdio** dans `~/.claude.json` avec la REST API key n8n (`X-N8N-API-KEY`, générée le 2026-06-14, expire 2026-07-12)
  - Remplace le transport HTTP natif (`/mcp-server/http`) dont le JWT MCP (`aud: "mcp-server-api"`) ne donnait accès qu'à 2 workflows explicitement activés pour MCP (`cQMFVPZDiWsYZEyJ` et `bXsnWBqHFlCNJUTM`)
  - La REST API key (`aud: "public-api"`) donne accès à **tous** les workflows
  - Config dans `~/.claude.json` : `env: { N8N_API_URL, N8N_API_KEY, MCP_MODE: "stdio", LOG_LEVEL: "error" }`

- **Workflow « Extraction Devis Compagnie » migré Groq → Gemini via OpenRouter — FAIT 2026-06-15** :
  - Workflow `b2J65p6kFx2uVyzP` — 3 nœuds modifiés :
    - « Prépare Payload Gemini » : modèle `google/gemini-2.5-flash` (était `meta-llama/llama-4-maverick-17b-128e-instruct`)
    - « Extrait Devis via Gemini » : URL `https://openrouter.ai/api/v1/chat/completions` + clé OpenRouter (était `api.groq.com` + clé Groq)
    - « Parse Données Devis » : références internes mises à jour
  - Headers OpenRouter ajoutés : `HTTP-Referer: https://alxor-os.fr`, `X-Title: Alxor OS - Extraction Devis`
  - Pipeline testé OK sur les 6 nœuds (webhook → payload → Gemini → parse → Presidio → Airtable) — erreur Airtable uniquement sur image test vide (date template non parsable), pas un problème d'intégration

**Chantiers en cours / prochaines étapes :**
0. ~~Corriger le credential n8n « Header Auth account »~~ — **FAIT 2026-06-12 via API** :
   - `PATCH /rest/credentials/vsMFMN5O6M4G7eMB` avec cookie de session (`POST /rest/login`) — l'API REST interne accepte bien le PATCH credentials avec un cookie navigateur
   - Name : `Airtable_HTTP` → `Authorization` (vérifié en relecture) ; Value : `Bearer <PAT n8n>` (PAT testé 200 sur l'URL exacte du nœud `Query Docs Provisoires`)
   - Reste à confirmer au prochain run planifié (8h quotidien) du workflow « Relance Docs Provisoires » (`BDEwnCPsP8aWgIkd`) — l'endpoint `/rest/workflows/{id}/run` de cette version n8n refuse l'exécution partielle par API
   - Diagnostic d'origine : `docs/DIAGNOSTIC_CREDENTIAL_AIRTABLE.md`
1. **Base de connaissance compagnies** — état 2026-06-11 :
   - **Schéma Airtable : FAIT** — 15 champs créés dans `Produits_CIE` via PAT n8n (`patlSsT4mcDVMulhv`). Seul `Motifs_Resilie_Exclus` à compléter : ajouter les 4 choices manquants dans l'UI (`fausse_declaration`, `sinistralite`, `vol`, `resil_mutuelle`).
   - **Front React : FAIT** — `services/produitsAirtable.ts` charge `Produits_CIE` → `CompagnieVehiculeRule[]` ; `matchingEngine.ts` accepte les règles en paramètre ; `store.ts` appelle `loadVehiculeRules()` au démarrage avec fallback sur `compagnieRules.ts` ; `FicheTarification.tsx` lit les règles depuis le store. Zéro erreur TS.
   - **Workflow n8n « Extraction Fiche Appétence » : CONSTRUIT 2026-06-12** (`pGtykoJc9ZILR8YU`, actif) — webhook `POST /webhook/extraction-fiche-appetence` body `{"record_id": "recXXX"}` → GET record Airtable → téléchargement PDF Dropbox (`dl=0`→`dl=1`) → base64 (ExtractFromFile) → Claude API `claude-opus-4-6` (PDF natif en document block, prompt auto/moto/mrh selon `Type_Produit`, max_tokens 8000) → validation JSON (champs critiques + gestion refusal/max_tokens) → PATCH `Produits_CIE` (selects filtrés sur les choices existants pour éviter le 422) + `JSON_Extraction`.
   - **Basculé sur Gemini 2026-06-12 (décision Nelson : « pour les tests »)** : nœud « Appel Gemini API » → `gemini-2.5-flash` multimodal (PDF inline_data + system_instruction, `response_mime_type: application/json`, sans maxOutputTokens). Le plan Claude Pro ne donne PAS accès à l'API Anthropic — retour possible vers `claude-opus-4-6` plus tard : credential « Anthropic API » `Dopd4Kc6zgDhWooQ` prêt (header `x-api-key`, valeur placeholder).
   - **Test end-to-end VALIDÉ avec Gemini** sur le record AXA « Mon Auto » (`rec0zItJNXQSPX4mB`) : `Segment_Cible=Standard`, `Formules_Disponibles=[RC, Tiers_Etendu, Tous_Risques]` (mapping par NOM de formule — les codes varient selon le LLM), `JSON_Extraction` stocké dans une code fence ``` (sinon le richText Airtable échappe les underscores et casse le parsing). ⚠️ Variance Gemini observée : « AYA » au lieu de « AXA » sur une exécution (logo stylisé mal lu) — le champ compagnie de l'extraction est informatif, le lien `Compagnie` d'Airtable fait foi.
   - ⚠️ Le PDF AXA est une **fiche produit POG**, pas une fiche d'appétence : aucun critère BM/sinistres/résiliation → champs critères null (règle d'or). **Confirmé 2026-06-16 : il n'existe pas de fiche d'appétence chez les partenaires** — les seuils d'éligibilité (`bonus_max`, `sinistres_max`...) resteront une saisie manuelle métier dans `Produits_CIE`, jamais une extraction automatique.
   - **Franchise réelle — FAIT 2026-06-16** : champs `Dropbox_DG_URL`, `Franchise_Min_EUR`, `Franchise_Max_EUR` créés dans `Produits_CIE` (API meta). Workflow étendu : nœud IF « DG Présent ? » (gate sur `Dropbox_DG_URL`) → si présent, télécharge le DG/CG en plus de la fiche produit et l'inclut en 2ᵉ pièce jointe PDF dans l'appel Gemini multimodal ; le prompt demande la franchise **standard** de chaque garantie/formule (pas un rachat d'option à 0€) ; `Valide et Mappe Airtable` calcule `Franchise_Min/Max_EUR` = min/max des `franchise_*_eur` non nuls sur toutes les formules. Testé OK : sans DG (non-régression) et avec DG (stand-in DIPa, range correctement calculée — 0€ confirmé légitime via `notes`, pas une fabrication). ⚠️ Piège rencontré : dans le code `Prépare Payload Claude`, référencer le PDF "fiche produit" par `$('PDF vers Base64')` et non `$input` — `$input` pointe vers le prédécesseur immédiat, qui diffère selon la branche IF (direct vs via les nœuds DG).
2. **Matching révisé (doctrine 2026-06-16)** : retrait de toute tarification du moteur (`tarif_estime` optionnel, plus calculé) — **FAIT**. Reste à faire : classification du profil (standard/aggravé/jeune_conducteur/...) par heuristique simple sur les données RI ; séparation appétence vs compétitivité marché ; boucle de feedback sur la compagnie retenue.
   - **Compagnies réelles + franchise — FAIT 2026-06-16** : `lib/compagnieRules.ts` remplacé par les 4 vrais partenaires (ALLIANZ FRANCE, THELEM ASSURANCES, AXA FRANCE IARD, MAXANCE) en filet de secours statique uniquement, valeurs d'éligibilité/scoring neutres (pas de fausse expertise) ; `services/produitsAirtable.ts` charge désormais toute ligne `Produits_CIE` liée à une compagnie dès qu'elle existe (plus de seuil « ≥ 2 compagnies complètes ») et mappe `Franchise_Min/Max_EUR` ; `matchingEngine.ts` affiche la vraie fourchette ou, si absente, « Franchise — à confirmer sur l'extranet » (jamais de montant inventé).
3. **Bugs FIC corrigés — FAIT 2026-06-16** :
   - Bouton « Générer & Archiver » tournait indéfiniment (`lib/ficPdfGenerator.ts`) : `pdfmake` ≥ 0.3.0 retourne des **Promises** sur toutes ses méthodes (breaking change, callbacks supprimés) — le code utilisait encore l'ancienne API à callback (`getBlob((blob) => resolve(blob))`), jamais appelée → blocage infini sans erreur. Corrigé en `await pdfDoc.getBlob()` / `await pdfDoc.download(...)`.
   - Date de naissance absente de la FIC : `lib/ficTemplates.ts` lisait `dossier.Date_Naissance` (champ qui n'existe que sur `Contacts`, pas sur `Dossiers`) → corrigé pour lire `prospect.date_naissance`.
   - `services/dossiersAirtable.ts` (`extractContactIdentity`, chemin de chargement en masse type Dashboard) n'extrayait pas `adresse`/`date_naissance` du Contact — corrigé par cohérence avec le mapper utilisé par `ProspectDetail.tsx` (`services/airtable.ts`) qui les extrayait déjà correctement.
   - `mockData.ts` : prospects de démo complétés avec `adresse`/`date_naissance` (manquaient, source de confusion en test manuel).
4. **Pipeline Devis/FIC → Yousign débloqué — FAIT 2026-06-16** : vérification de bout en bout du chemin documents → signature, plusieurs bugs trouvés et corrigés (API Yousign elle-même toujours non connectée, hors scope) :
   - **Devis jamais archivé** : le workflow n8n `Extraction Devis Compagnie` (`b2J65p6kFx2uVyzP`) ne faisait qu'un PATCH du Dossier (champs `Devis_*`), aucun document Dropbox/Airtable créé. Ajout de 5 nœuds (`Obtient Token Dropbox Devis` → `Prépare Document + Binaire Devis` → `Upload Devis Dropbox` → `Crée Document Devis` → `MAJ Document Devis Dropbox`) qui créent le `Document` (`Type_Document='Devis / Projet'`) et uploadent le PDF reçu en base64 sur Dropbox. ⚠️ Ordre critique : le nœud qui porte le binaire doit être le prédécesseur **immédiat** du nœud d'upload (un nœud `httpRequest` intermédiaire le perd) ; binaire attaché directement dans un Code node via `return [{ json, binary: { data: { data: base64, mimeType, fileName } } }]` (pas besoin de `Move Binary Data`).
   - **FIC jamais uploadé sur Dropbox** : `uploadFicPdf()`/`uploadDocumentCabinet()` (front) créaient bien le `Document` Airtable mais `REACT_APP_N8N_UPLOAD_WEBHOOK` n'était configuré **nulle part** (`.env` ni `.env.example`) → upload Dropbox toujours skippé, pour le FIC **et** pour tous les documents Cabinet (permis, carte grise…). Nouveau workflow n8n **« Upload Document Cabinet »** (`HgXcviVC3nACWNtq`, webhook `POST /webhook/upload-document-cabinet`) qui prend en charge l'upload Dropbox + MAJ `Dropbox_Path` pour un `document_id` déjà créé côté front. `REACT_APP_N8N_UPLOAD_WEBHOOK=/webhook/upload-document-cabinet` ajouté à `.env`/`.env.example`.
   - **Chemin Dropbox** : `/ged_alxor/{Cabinet_record_id}/{Contact_record_id}/{ID_Dossier}/{filename}` (vérifié par listing direct Dropbox) — `{Cabinet_record_id}` est hardcodé (`recv1hO80VCPY8LtQ` = ECA, seul cabinet actif ; à généricier si multi-tenant un jour). Front étendu pour transmettre `contact_id`/`id_dossier` (déjà dans `prospect.airtable_dossier_fields`) : `services/devisExtraction.ts`, `services/documentUpload.ts`, `store.ts` (`uploadDocReal`), `Pages/ProspectDetail.tsx`.
   - **Workflow Yousign (`hfNT0tCYt3ULRrNM`) — 3 bugs corrigés** :
     1. `GET Documents Devis FIC` filtrait `Type_Document='DEVIS'`/`'FIC'` — valeurs inexistantes (les vraies choices sont `'Devis / Projet'`/`'Fiche Information Conseil'`) → jamais de match.
     2. Le filtre comparait `{Dossier}` (champ lié) au **record ID** du Dossier — un champ lié résout vers son **champ primaire** (`ID_Dossier`, ex. `DOS_dGTOd2`), pas le recId (même piège déjà documenté pour `getDocumentsByDossier` dans `services/airtable.ts`). Corrigé en comparant à `$('GET Dossier').item.json.fields.ID_Dossier`.
     3. `GET Contact` était une branche parallèle déconnectée (directement sous le Webhook, sans lien vers la suite) → jamais exécutée avant `Prepare Signature 1` qui en dépend. Rechaînée en séquence : `Webhook → GET Dossier → GET Contact → GET Documents Devis FIC → ...` (URLs de ces 2 nœuds mises à jour pour référencer `$('Webhook Start Signature')` explicitement, vu le changement de prédécesseur immédiat).
   - **Testé de bout en bout** (PDF factice + dossier spécimen `DOS_dGTOd2`) : devis et FIC s'archivent correctement sur Dropbox, le workflow Yousign les retrouve et progresse jusqu'à l'appel réel à l'API Yousign, qui échoue avec *"Authorization failed"* — confirmant que tout fonctionne jusqu'au point exact où l'API Yousign doit être connectée.
5. **AGIRA FVA** (marque/modèle via immat) : spec prête, **bloqué étape 0** — certificat client mTLS à générer (CSR ORIAS 10058195 → `fva@agira.asso.fr`)
6. Test e2e Yousign sandbox — **prévu 2026-06-17** : connecter les vraies credentials API Yousign sandbox dans le workflow `hfNT0tCYt3ULRrNM` (credential HTTP Header Auth ou équivalent selon doc Yousign v3). Le pipeline documents est prêt et testé (cf. point 4 ci-dessus) : il ne reste que la connexion des credentials, puis un run réel pour valider la double signature devis→FIC puis contrat.
7. Chatbot Apporteur v2 (alignement Alex Web v11) — pas commencé
8. Agent vocal Alex (Vapi) : règles métier documentées (`ops/alex/documentation/ALEX_VOICE_AGENT_VOCAL_REGLES_METIER.md`) ; courriers types (brainstorm en cours)
9. Déploiement Netlify du front Cabinet ; rotation des credentials exposés (n8n, GitHub, Airtable, Dropbox, Gemini ×2)

## ⚠️ Consigne permanente

**Documenter systématiquement les décisions et avancées dans les fichiers du projet au fil du travail** : toute décision d'architecture, convention adoptée, workflow créé/modifié ou étape franchie doit être consignée immédiatement dans le fichier de documentation pertinent (`ops/alex/documentation/`, `docs/SETUP.md`, ou ce `CLAUDE.md` pour l'état d'avancement et les conventions). Un travail non documenté est considéré comme inachevé.

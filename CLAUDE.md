# CLAUDE.md — Alxor OS (Easy Courtage Assurance)

> Contexte projet chargé à chaque session Claude Code. Mise à jour : 2026-06-11.
> Aucun secret ici — toutes les clés/tokens sont dans `.env` (gitignoré) ou `.mcp.json` (gitignoré). Voir `docs/SETUP.md`.
> **Ce dépôt (`Nels72/alxor-os-1`) est désormais l'unique dépôt vivant du projet.**

## Objectif

**Alxor OS** est la plateforme digitale d'un cabinet de courtage en assurance français (« Easy Courtage Assurance », ECA). Cœur du produit : un **outil de matching assurance pour courtiers** — après extraction des données du Relevé d'Information (RI) d'un prospect, un moteur classe les compagnies partenaires par appétence/éligibilité pour orienter le courtier vers le bon extranet, avec **3 propositions tracées** (obligation DDA, auditable ACPR).

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
| **Gemini 2.5 Flash** | Extraction RI/devis, classification documents (multimodal) |
| **Claude API** | Extraction des fiches appétence compagnies (prompts dans `ops/.basedeconnaissance/`) |
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

## Schéma Airtable — base de connaissance « one row per product »

Principe adopté pour la base de connaissance compagnies : **une ligne = un produit compagnie** (ex. « AXA Auto Confort »), pas une ligne par compagnie. Chaque ligne porte les critères d'éligibilité + scoring issus de l'extraction de la fiche appétence (schéma JSON complet dans `ops/.basedeconnaissance/prompts_extraction_appetence.md`) :
- `meta` : compagnie, produit, **segment_cible** (`standard | aggrave | premium | jeune_conducteur | senior`), version fiche
- `eligibilite` : plancher aggravé, bonus/malus (max accepté, à l'étude), sinistres (36m/24m, types exclusifs), résiliation (motifs exclus, carence), conducteur (âge, permis), véhicule (énergies/catégories/usages exclus), géographie (départements exclus), ancienneté assurance
- `scoring_marche` : qualité/prix, gestion sinistres, garanties, réactivité, points forts/faibles
- Règle d'or extraction : **null si absent, jamais de valeur inventée** ; ambiguïtés dans `notes[]`

Cette table doit remplacer les règles hardcodées de `lib/compagnieRules.ts` (front Cabinet, 7 compagnies) pour que le métier puisse éditer sans dev. Le moteur (`lib/matchingEngine.ts`) garde ses 3 phases : éligibilité (gate, donnée manquante = bénéfice du doute) → appétence technique (0–100) → score composite → Top 3.

Tables existantes clés : Dossiers `tblh45gV9PZcN1fkz`, Documents `tblfxKmkeklx4FyGY`, Contacts `tbl9sFkklVymVBKNN`, Compagnies_et_Partenariats `tbl6nxHBezqId2O5R` (commissions + URL extranet, **pas encore de critères d'éligibilité**), REF_Produits (codes : AUT, MOT, MRH, MRP, RCPRO…).

## Conventions de travail

- **Secrets** : jamais en dur dans un fichier — toujours `.env` (`AIRTABLE_PAT`, `DROPBOX_*`, `GEMINI_API_KEY*`, `GITHUB_PERSONAL_ACCESS_TOKEN`) + `process.env` via dotenv dans les scripts. Les tokens MCP (JWT n8n, PAT GitHub) sont dans `.mcp.json` et `~/.claude.json` (gitignoré).
- **n8n** : toujours nœuds natifs plutôt que HTTP Request quand disponibles ; modifications via MCP n8n (outils : `search_workflows`, `get_workflow_details`, `execute_workflow`) ; consulter les skills n8n avant. MCP transport HTTP natif sur `https://n8n2.reaktimo.com/mcp-server/http`. v2.52 : Code nodes sandboxés (pas de `fetch`/`require`/`this.helpers`) → ExtractFromFile pour binary→base64.
- **Gemini** : `gemini-2.5-flash` est un modèle à *thinking* → ne PAS mettre `maxOutputTokens` (JSON tronqué) ; utiliser `generationConfig: { response_mime_type: "application/json" }`.
- **Make.com** : ne PAS modifier les blueprints JSON dans `ops/blueprints/` — uniquement via l'interface Make. Attachments optionnels : `{{ifempty(XX.field_url; emptyarray)}}`.
- **Airtable** : accès direct API autorisé sans confirmation. Attention : un champ inexistant dans un PATCH → 422 qui annule tout. Plan gratuit : quota reset le 1er du mois (429 = attendre).
- **Workflow « 2- Extraction RI »** (`823xFRdz4SJSfv0R`) : référence fonctionnelle du pipeline chatbot — **ne pas toucher**.
- **Front Cabinet** : développé dans la racine de ce repo (React 19 + Vite + Tailwind).
- Gmail v2.2 (n8n) : `sendTo` (pas `toList`), `emailType`.

## État d'avancement (2026-06-12)

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

**Prochaines étapes connues :**
0. ~~Corriger le credential n8n « Header Auth account »~~ — **FAIT 2026-06-12 via API** :
   - `PATCH /rest/credentials/vsMFMN5O6M4G7eMB` avec cookie de session (`POST /rest/login`) — l'API REST interne accepte bien le PATCH credentials avec un cookie navigateur
   - Name : `Airtable_HTTP` → `Authorization` (vérifié en relecture) ; Value : `Bearer <PAT n8n>` (PAT testé 200 sur l'URL exacte du nœud `Query Docs Provisoires`)
   - Reste à confirmer au prochain run planifié (8h quotidien) du workflow « Relance Docs Provisoires » (`BDEwnCPsP8aWgIkd`) — l'endpoint `/rest/workflows/{id}/run` de cette version n8n refuse l'exécution partielle par API
   - Diagnostic d'origine : `docs/DIAGNOSTIC_CREDENTIAL_AIRTABLE.md`
1. **Base de connaissance compagnies** — état 2026-06-11 :
   - **Schéma Airtable : FAIT** — 15 champs créés dans `Produits_CIE` via PAT n8n (`patlSsT4mcDVMulhv`). Seul `Motifs_Resilie_Exclus` à compléter : ajouter les 4 choices manquants dans l'UI (`fausse_declaration`, `sinistralite`, `vol`, `resil_mutuelle`).
   - **Front React : FAIT** — `services/produitsAirtable.ts` charge `Produits_CIE` → `CompagnieVehiculeRule[]` ; `matchingEngine.ts` accepte les règles en paramètre ; `store.ts` appelle `loadVehiculeRules()` au démarrage avec fallback sur `compagnieRules.ts` ; `FicheTarification.tsx` lit les règles depuis le store. Zéro erreur TS.
   - **Workflow n8n « Extraction Fiche Appétence » : CONSTRUIT 2026-06-12** (`pGtykoJc9ZILR8YU`, actif) — webhook `POST /webhook/extraction-fiche-appetence` body `{"record_id": "recXXX"}` → GET record Airtable → téléchargement PDF Dropbox (`dl=0`→`dl=1`) → base64 (ExtractFromFile) → Claude API `claude-opus-4-6` (PDF natif en document block, prompt auto/moto/mrh selon `Type_Produit`, max_tokens 8000) → validation JSON (champs critiques + gestion refusal/max_tokens) → PATCH `Produits_CIE` (selects filtrés sur les choices existants pour éviter le 422) + `JSON_Extraction`.
   - Testé : chaîne complète OK jusqu'à l'appel Claude — **bloqué sur la clé API Anthropic** (credential n8n « Anthropic API » `Dopd4Kc6zgDhWooQ`, header `x-api-key`, valeur placeholder à remplacer). Le plan Claude Pro ne donne PAS accès à l'API (offres distinctes) — options : compte console.anthropic.com prépayé (~0,10-0,15 €/fiche) ou bascule du workflow sur Gemini (clé déjà fonctionnelle).
   - **Record AXA « Mon Auto » (`rec0zItJNXQSPX4mB`) peuplé 2026-06-12** par extraction manuelle (Claude Code) : `Segment_Cible=Standard`, `Formules_Disponibles=[RC, Tiers_Etendu, Tous_Risques]`, `JSON_Extraction` complet (6,7 Ko). ⚠️ Le PDF est une **fiche produit POG**, pas une fiche d'appétence : aucun critère BM/sinistres/résiliation dedans → champs critères à null (règle d'or respectée). Pour valider le matching, fournir une vraie fiche d'appétence avec critères de souscription.
2. Matching DDA enrichi : axes véhicule/zone/usage, séparation appétence vs compétitivité, boucle de feedback sur la compagnie retenue
3. **AGIRA FVA** (marque/modèle via immat) : spec prête, **bloqué étape 0** — certificat client mTLS à générer (CSR ORIAS 10058195 → `fva@agira.asso.fr`)
4. Test e2e Yousign sandbox
5. Chatbot Apporteur v2 (alignement Alex Web v11) — pas commencé
6. Agent vocal Alex (Vapi) : règles métier documentées (`ops/alex/documentation/ALEX_VOICE_AGENT_VOCAL_REGLES_METIER.md`) ; courriers types (brainstorm en cours)
7. Déploiement Netlify du front Cabinet ; rotation des credentials exposés (n8n, GitHub, Airtable, Dropbox, Gemini ×2)

## ⚠️ Consigne permanente

**Documenter systématiquement les décisions et avancées dans les fichiers du projet au fil du travail** : toute décision d'architecture, convention adoptée, workflow créé/modifié ou étape franchie doit être consignée immédiatement dans le fichier de documentation pertinent (`ops/alex/documentation/`, `docs/SETUP.md`, ou ce `CLAUDE.md` pour l'état d'avancement et les conventions). Un travail non documenté est considéré comme inachevé.

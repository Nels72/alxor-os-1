# SETUP — Reproduire l'environnement de travail Alxor sur une nouvelle machine

> Mis à jour le 2026-06-16 (MCP n8n : migration vers `czlonkowski/n8n-mcp` stdio + REST API key). Dépôt unique du projet : `Nels72/alxor-os-1`.
> Aucune valeur de clé/token n'est copiée ici : voir la section
> [Credentials](#3-credentials--clés-api-et-tokens) pour la liste des secrets à récupérer,
> et la section [Sécurité](#6--config-trouvée-en-dur--à-faire-pivoter) pour les secrets
> actuellement écrits en clair qu'il faut **faire pivoter avant toute migration**.

---

## 1. Vue d'ensemble

| Composant | Rôle |
|---|---|
| **Claude Code** (CLI, install globale npm) | Assistant de dev principal |
| **n8n-mcp** (`czlonkowski/n8n-mcp` stdio) | Pilotage de l'instance n8n `https://n8n2.reaktimo.com` (tous les workflows via REST API key) |
| **github-mcp** | Accès GitHub (repos, PRs, issues) |
| **Airtable** | Pas de serveur MCP — accès direct à l'API REST (base `apprtejZaap5ouqGm`) via `curl`/scripts |
| **Dropbox** | Accès via API OAuth2 (app `alxor-ged`) depuis des scripts Node et les workflows n8n |
| **Netlify CLI** | Déploiement du chatbot apporteur (`alex-apporteur-eca.netlify.app`) |
| **Node.js + npm** | Runtime des scripts utilitaires à la racine du projet |
| **Python** (+ venv `presidio/venv`) | API locale Presidio (anonymisation), port 5080 |

---

## 2. Serveurs MCP configurés

Les MCP sont déclarés à **deux niveaux** (doublon volontaire — le niveau projet permet le partage via le repo, le niveau utilisateur les rend disponibles partout) :

### 2.1 Niveau utilisateur — `~/.claude.json` (clé `mcpServers`)

| Serveur | Transport | Auth | Instance/URL |
|---|---|---|---|
| `github-mcp` | stdio — `npx -y @modelcontextprotocol/server-github` | `GITHUB_PERSONAL_ACCESS_TOKEN` (fine-grained PAT `github_pat_…`) | api.github.com |
| `n8n-mcp` | **stdio** — `czlonkowski/n8n-mcp` v2.57.4 (install globale `npm i -g n8n-mcp`) | `N8N_API_KEY` (REST API key n8n, générée dans n8n → Settings → API → Create API Key, expire 2026-07-12) | `https://n8n2.reaktimo.com` |

### 2.2 Niveau projet — `.mcp.json` (à la racine du repo, **gitignoré**)

Structure JSON effective (à recréer après clonage) :

```json
{
  "mcpServers": {
    "github-mcp": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<github_pat_…>"
      }
    },
    "n8n-mcp": {
      "command": "npx",
      "args": ["-y", "n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "https://n8n2.reaktimo.com",
        "N8N_API_KEY": "<REST API key n8n>"
      }
    }
  }
}
```

> **Pourquoi `czlonkowski/n8n-mcp` en stdio ?** Le serveur MCP HTTP natif de n8n (`/mcp-server/http`) utilise un JWT (`aud: "mcp-server-api"`) qui ne donne accès qu'aux workflows explicitement activés pour MCP (2 workflows). `czlonkowski/n8n-mcp` utilise la REST API key (`aud: "public-api"`, `/api/v1/`) qui donne accès à **tous** les workflows. Installé globalement : `npm install -g n8n-mcp`.

**Outils exposés par `n8n-mcp` :**

| Outil | Rôle |
|---|---|
| `search_workflows` | Rechercher des workflows par nom/description |
| `get_workflow` | Détails complets d'un workflow |
| `create_workflow` / `update_workflow` / `delete_workflow` | CRUD workflows |
| `activate_workflow` / `deactivate_workflow` | Activer/désactiver |
| `execute_workflow` | Déclencher un workflow |
| `get_executions` / `get_execution` | Historique d'exécutions |

Les deux serveurs sont activés dans `~/.claude/settings.local.json` via
`"enabledMcpjsonServers": ["github-mcp", "n8n-mcp"]`.

**Commande pour github-mcp** (au lieu d'éditer les JSON à la main) :

```bash
# github-mcp — niveau utilisateur
claude mcp add github-mcp --scope user \
  -e GITHUB_PERSONAL_ACCESS_TOKEN=<github_pat_…> \
  -- npx -y @modelcontextprotocol/server-github

# github-mcp — niveau projet (écrit dans .mcp.json)
claude mcp add github-mcp --scope project \
  -e GITHUB_PERSONAL_ACCESS_TOKEN=<github_pat_…> \
  -- npx -y @modelcontextprotocol/server-github
```

Pour `n8n-mcp` (stdio), on peut aussi utiliser :
```bash
claude mcp add n8n-mcp --scope user \
  -e N8N_API_URL=https://n8n2.reaktimo.com \
  -e N8N_API_KEY=<REST_API_KEY> \
  -e MCP_MODE=stdio \
  -e LOG_LEVEL=error \
  -- npx -y n8n-mcp
```

---

## 3. Credentials — clés API et tokens

**Ne jamais écrire ces valeurs dans un fichier versionné.** Les stocker dans un gestionnaire de mots de passe et les injecter uniquement dans les configs locales gitignorées.

| Nom | Sert à | Où le régénérer |
|---|---|---|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Auth du serveur MCP GitHub (repos, PRs, issues) | GitHub → Settings → Developer settings → Fine-grained PAT (`github_pat_…`) |
| **n8n REST API key** | Auth du serveur MCP `n8n-mcp` (stdio) + appels directs `/api/v1/` — header `X-N8N-API-KEY`, **expire 2026-07-12** | n8n → Settings → API → Create API Key |
| **OpenRouter API key** (`sk-or-v1-…`) | Proxy LLM pour le workflow Extraction Devis Compagnie (`google/gemini-2.5-flash`) | openrouter.ai → Keys |
| **Airtable PAT** (`pat…`) | Lecture/écriture directe sur la base CRM `apprtejZaap5ouqGm` (table prospects `tblh45gV9PZcN1fkz`) via API REST | airtable.com/create/tokens |
| **Dropbox App key / App secret** (app `alxor-ged`, Full Dropbox) | OAuth2 client de l'app Dropbox utilisée pour la GED (renommage, recherche de fichiers) | Dropbox App Console |
| **Dropbox refresh token** | Token longue durée pour obtenir des access tokens (scripts locaux + credential n8n) | Flow OAuth via `get-dropbox-refresh-token.js` |
| **Netlify auth** | Déploiement du chatbot apporteur | `netlify login` (stocké par le CLI) |
| **Yousign API key** (sandbox) | Workflow n8n de double signature `hfNT0tCYt3ULRrNM` | Stockée côté n8n (credentials), pas sur la machine |

Credentials stockées **côté n8n** (pas à reproduire sur la machine, mais à vérifier sur l'instance) : Airtable, Dropbox, Google Gemini, OpenRouter, Yousign, SMTP.

---

## 4. Variables d'environnement

- **Aucune variable d'environnement système ou utilisateur Windows n'est utilisée pour les secrets.** (Les variables utilisateur existantes sont uniquement `Path`, `TEMP`, `TMP`, `OneDrive`, `ChocolateyLastPathUpdate`.)
- Les credentials MCP sont injectés directement dans les blocs `env` ou `headers` des configs :
  - `~/.claude.json` → `mcpServers.github-mcp.env.GITHUB_PERSONAL_ACCESS_TOKEN`
  - `~/.claude.json` → `mcpServers.n8n-mcp.env.N8N_API_KEY`
  - `.mcp.json` (racine projet) → idem
- Variables/headers consommés par les serveurs MCP :

| Paramètre | Type | Défini dans | Consommé par |
|---|---|---|---|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | env var | `~/.claude.json` et `.mcp.json` | `@modelcontextprotocol/server-github` |
| `N8N_API_KEY` | env var | `~/.claude.json` et `.mcp.json` | `czlonkowski/n8n-mcp` (stdio) |
| `N8N_API_URL` | env var | `~/.claude.json` et `.mcp.json` | `czlonkowski/n8n-mcp` (stdio) |

Il n'y a **pas de variable d'environnement système** pour les MCP. Le fichier `.env` (gitignoré) sert uniquement au front React (`REACT_APP_*`) et aux scripts Node (`ops/scripts/`).

---

## 5. Installation pas à pas

### Étape 1 — Prérequis

```powershell
# Node.js LTS (inclut npm et npx) — requis pour Claude Code, les MCP et les scripts
winget install OpenJS.NodeJS.LTS
# Git
winget install Git.Git
# Python 3 (pour Presidio)
winget install Python.Python.3.12
```

### Étape 2 — Claude Code

```powershell
npm install -g @anthropic-ai/claude-code
claude   # première exécution : login avec le compte n.duarte@alxor-os.fr (abonnement Claude Pro)
```

### Étape 3 — Cloner le projet

```powershell
# Dépôt unique du projet (front React + infrastructure ops)
git clone https://github.com/Nels72/alxor-os-1.git D:\NELS\alxor-os-1
cd D:\NELS\alxor-os-1
```

Structure principale après clonage :
```
alxor-os-1\
├── CLAUDE.md / docs\SETUP.md     # Contexte projet + procédure installation
├── .env.example                  # Modèle des variables d'environnement
├── [racine]                      # Application React (Pages\, components\, lib\, services\, …)
├── docs\                         # Documentation (GED, diagnostic Airtable)
└── ops\                          # Infrastructure opérationnelle
    ├── alex\                     # Chatbots HTML, PWA Netlify, documentation Alex
    ├── presidio\                 # API Python anonymisation (port 5080)
    ├── .basedeconnaissance\      # Prompts extraction fiches appétence
    ├── blueprints\               # Exports Make.com (NE PAS modifier en JSON)
    └── scripts\                  # Scripts Node.js utilitaires (n8n, Dropbox, Airtable)
```

### Étape 4 — Restaurer la config Claude Code utilisateur

Copier depuis l'ancienne machine (ou recréer) dans `C:\Users\<user>\.claude\` :

| Fichier/dossier | Contenu |
|---|---|
| `CLAUDE.md` | Instructions globales (config expert n8n, règles MCP) |
| `settings.json` | Modèle par défaut, thème |
| `settings.local.json` | Permissions allowlist + `enabledMcpjsonServers` |
| `skills\` | 7 skills n8n : `n8n-code-javascript`, `n8n-code-python`, `n8n-expression-syntax`, `n8n-mcp-tools-expert`, `n8n-node-configuration`, `n8n-validation-expert`, `n8n-workflow-patterns` |
| `projects\D--NELS-alxor-os-1\memory\` | Mémoire persistante du projet (contexte Alxor) |

> ⚠️ Ne **pas** copier `~/.claude.json` tel quel (il contient des tokens en clair et de l'état machine) — re-déclarer les MCP proprement (étape 5).

### Étape 5 — Déclarer les serveurs MCP

1. Installer `n8n-mcp` globalement :
   ```bash
   npm install -g n8n-mcp
   ```
2. Récupérer les secrets depuis le gestionnaire de mots de passe (**après rotation**, cf. section 6) :
   - PAT GitHub fine-grained (`github_pat_…`)
   - REST API key n8n (générée dans n8n → Settings → API → Create API Key, expire après ~30j)
3. Recréer `.mcp.json` à la racine (gitignoré, absent du clone) avec la structure de la section 2.2.
4. Ajouter la clé `mcpServers` dans `~/.claude.json` (même contenu que `.mcp.json`).
5. Ajouter `"enabledMcpjsonServers": ["github-mcp", "n8n-mcp"]` dans `~/.claude/settings.local.json`.
6. Vérifier : `claude mcp list` — les deux serveurs doivent apparaître. Dans une session, tester `search_workflows` pour confirmer la connexion n8n.

### Étape 6 — Configurer les credentials annexes

```powershell
# GitHub CLI (utilisé en parallèle du MCP)
gh auth login
# Netlify
npm install -g netlify-cli
netlify login
```

### Étape 7 — Environnement Python Presidio (optionnel)

```powershell
cd D:\NELS\AlxorFiles052026\presidio
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt   # ou les packages presidio-analyzer/presidio-anonymizer + flask
.\venv\Scripts\python presidio_api.py            # API locale sur http://127.0.0.1:5080/health
```

### Étape 8 — Vérification finale

- `claude` dans le projet → les MCP `n8n-mcp` et `github-mcp` apparaissent connectés.
- Outil `search_workflows` → liste **tous** les workflows de l'instance `https://n8n2.reaktimo.com`.
- Outil `get_workflow` sur `823xFRdz4SJSfv0R` → retourne les détails du workflow Extraction RI.
- Un appel Airtable de test (lecture base `apprtejZaap5ouqGm`) fonctionne avec le PAT configuré dans `.env`.

---

## 6. ⚠️ Config trouvée en dur — à faire pivoter

Les secrets suivants sont **écrits en clair** dans des fichiers de cette machine. Comme ils sont exposés (et certains dans des fichiers **non gitignorés**, donc commitables par erreur), il faut les **révoquer et regénérer tous**, puis nettoyer les fichiers.

### REST API key n8n (`N8N_API_KEY`)
- `~/.claude.json` (bloc `mcpServers.n8n-mcp.env.N8N_API_KEY`) — en clair sur disque, **gitignoré**
- `.mcp.json` (racine projet) — gitignoré

JWT signé (`aud: "public-api"`), **expire le 2026-07-12**. Donne accès à tous les workflows via `/api/v1/`. Utilisé par `czlonkowski/n8n-mcp` (MCP stdio) et par les appels REST directs.

> **Note historique (pour mémoire) :** L'ancien JWT MCP natif (`aud: "mcp-server-api"`, sans expiration) et un token de l'ancienne instance `https://n8n2.srv1070115.hstgr.cloud` étaient présents dans les configs. Le transport HTTP natif (`/mcp-server/http`) est conservé sur l'instance mais n'est plus utilisé côté client. L'ancienne instance est décommissionnée — sans risque.

### Clé OpenRouter (`sk-or-v1-…`)
- Workflow n8n « Extraction Devis Compagnie » (`b2J65p6kFx2uVyzP`) — nœud « Extrait Devis via Gemini », header `Authorization` en clair
- Pas sur la machine locale (uniquement côté n8n)

> **Note (scripts `ops/scripts/`)** : Plusieurs scripts JS référencent des tokens REST n8n codés en dur (ancienne approche). Ces scripts ne sont plus le canal principal d'interaction avec n8n (remplacé par le MCP). Ils sont à nettoyer lors de la rotation des credentials (cf. plan ci-dessous).

### Token GitHub (`GITHUB_PERSONAL_ACCESS_TOKEN`)
- `~/.claude.json` (bloc `mcpServers`)
- `.mcp.json`

### PAT Airtable
- `.claude/settings.local.json` du projet (≈ 6 règles de permission avec le token dans l'URL curl)
- `ops/scripts/check-airtable-record.js`

### Dropbox (app `alxor-ged`)
- **App key + App secret** : `ops/scripts/get-dropbox-refresh-token.js`, `ops/scripts/update-dropbox-credentials.js`, `ops/scripts/verify-new-dropbox.js`, `docs/DOCUMENTATION_GED_RENOMMAGE.md`, `ops/alex/chatbot/BRIEF_N8N_EXTRACTION_RENOMMAGE.md`
- **Refresh token (ancien)** : `ops/scripts/find-dropbox-root.js`, `ops/scripts/find-dropbox-file.js`, `ops/scripts/search-dropbox-file.js`, `ops/scripts/patch-dropbox-token.js`
- **Refresh token (actuel)** : `ops/scripts/update-dropbox-credentials.js`, `ops/scripts/verify-new-dropbox.js`, `docs/DOCUMENTATION_GED_RENOMMAGE.md`, `ops/alex/chatbot/BRIEF_N8N_EXTRACTION_RENOMMAGE.md`

### Plan de rotation recommandé

1. **Révoquer** : PAT GitHub, REST API key n8n (expire 2026-07-12), PAT Airtable, clé OpenRouter, et l'app Dropbox (regénérer le secret + invalider les refresh tokens).
2. **Regénérer** chaque credential et le stocker dans un gestionnaire de mots de passe.
3. **Nettoyer** les fichiers listés ci-dessus : remplacer les valeurs par `process.env.XXX` dans les scripts, supprimer les valeurs des fichiers Markdown, purger les règles de permission contenant des tokens dans les `settings.local.json`.
4. **Mettre à jour** `.mcp.json`, `~/.claude.json` et les credentials n8n (Dropbox) avec les nouvelles valeurs.
5. Les fichiers étant encore *untracked*, **vérifier avant tout `git add`** qu'aucun fichier contenant un secret n'est commité (les `*.js` racine et les 2 fichiers Markdown ne sont **pas** couverts par le `.gitignore` actuel).

# SETUP — Reproduire l'environnement de travail Alxor sur une nouvelle machine

> Mis à jour le 2026-06-11 (MCP n8n : migration vers transport HTTP natif). Dépôt unique du projet : `Nels72/alxor-os-1`.
> Aucune valeur de clé/token n'est copiée ici : voir la section
> [Credentials](#3-credentials--clés-api-et-tokens) pour la liste des secrets à récupérer,
> et la section [Sécurité](#6--config-trouvée-en-dur--à-faire-pivoter) pour les secrets
> actuellement écrits en clair qu'il faut **faire pivoter avant toute migration**.

---

## 1. Vue d'ensemble

| Composant | Rôle |
|---|---|
| **Claude Code** (CLI, install globale npm) | Assistant de dev principal |
| **n8n-mcp** | Pilotage de l'instance n8n `https://n8n2.reaktimo.com` (workflows Alxor) |
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
| `n8n-mcp` | **HTTP natif** — connexion directe au serveur MCP intégré dans n8n | `Authorization: Bearer <JWT>` (généré dans n8n → Settings → MCP Server) | `https://n8n2.reaktimo.com/mcp-server/http` |

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
      "url": "https://n8n2.reaktimo.com/mcp-server/http",
      "headers": {
        "Authorization": "Bearer <JWT n8n>"
      }
    }
  }
}
```

> **Pourquoi HTTP natif pour n8n ?** n8n intègre un serveur MCP depuis la version 1.x (`/mcp-server/http`). Le JWT est généré dans n8n → Settings → MCP Server API. Il est sans date d'expiration. Cette approche est préférable au wrapper npm `n8n-mcp@latest` : pas de dépendance npx, connexion directe, outillage plus riche.

**Outils exposés par le MCP n8n natif :**

| Outil | Rôle |
|---|---|
| `search_workflows` | Rechercher des workflows par nom/description |
| `get_workflow_details` | Détails complets d'un workflow + infos trigger |
| `execute_workflow` | Déclencher un workflow (modes : `chat`, `form`, `webhook`) |

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

Pour `n8n-mcp`, éditer `.mcp.json` directement (transport HTTP non supporté par `claude mcp add`).

---

## 3. Credentials — clés API et tokens

**Ne jamais écrire ces valeurs dans un fichier versionné.** Les stocker dans un gestionnaire de mots de passe et les injecter uniquement dans les configs locales gitignorées.

| Nom | Sert à | Où le régénérer |
|---|---|---|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Auth du serveur MCP GitHub (repos, PRs, issues) | GitHub → Settings → Developer settings → Fine-grained PAT (`github_pat_…`) |
| **JWT n8n MCP** | Auth du serveur MCP natif n8n (`/mcp-server/http`) — Bearer token, sans expiration | n8n → Settings → MCP Server API → Créer une clé |
| **Airtable PAT** (`pat…`) | Lecture/écriture directe sur la base CRM `apprtejZaap5ouqGm` (table prospects `tblh45gV9PZcN1fkz`) via API REST | airtable.com/create/tokens |
| **Dropbox App key / App secret** (app `alxor-ged`, Full Dropbox) | OAuth2 client de l'app Dropbox utilisée pour la GED (renommage, recherche de fichiers) | Dropbox App Console |
| **Dropbox refresh token** | Token longue durée pour obtenir des access tokens (scripts locaux + credential n8n) | Flow OAuth via `get-dropbox-refresh-token.js` |
| **Netlify auth** | Déploiement du chatbot apporteur | `netlify login` (stocké par le CLI) |
| **Yousign API key** (sandbox) | Workflow n8n de double signature `hfNT0tCYt3ULRrNM` | Stockée côté n8n (credentials), pas sur la machine |

Credentials stockées **côté n8n** (pas à reproduire sur la machine, mais à vérifier sur l'instance) : Airtable, Dropbox, Google Gemini, Yousign, SMTP.

---

## 4. Variables d'environnement

- **Aucune variable d'environnement système ou utilisateur Windows n'est utilisée pour les secrets.** (Les variables utilisateur existantes sont uniquement `Path`, `TEMP`, `TMP`, `OneDrive`, `ChocolateyLastPathUpdate`.)
- Les credentials MCP sont injectés directement dans les blocs `env` ou `headers` des configs :
  - `~/.claude.json` → `mcpServers.github-mcp.env.GITHUB_PERSONAL_ACCESS_TOKEN`
  - `~/.claude.json` → `mcpServers.n8n-mcp.headers.Authorization`
  - `.mcp.json` (racine projet) → idem
- Variables/headers consommés par les serveurs MCP :

| Paramètre | Type | Défini dans | Consommé par |
|---|---|---|---|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | env var | `~/.claude.json` et `.mcp.json` | `@modelcontextprotocol/server-github` |
| `Authorization: Bearer <JWT>` | header HTTP | `~/.claude.json` et `.mcp.json` | Serveur MCP natif n8n (`/mcp-server/http`) |

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

> Aucun package npm global à installer — n8n-mcp utilise le transport HTTP natif.

1. Récupérer les secrets depuis le gestionnaire de mots de passe (**après rotation**, cf. section 6) :
   - PAT GitHub fine-grained (`github_pat_…`)
   - JWT n8n MCP (généré dans n8n → Settings → MCP Server API)
2. Recréer `.mcp.json` à la racine (gitignoré, absent du clone) avec la structure de la section 2.2.
3. Ajouter la clé `mcpServers` dans `~/.claude.json` (même contenu que `.mcp.json`).
4. Ajouter `"enabledMcpjsonServers": ["github-mcp", "n8n-mcp"]` dans `~/.claude/settings.local.json`.
5. Vérifier : `claude mcp list` — les deux serveurs doivent apparaître. Dans une session, tester `search_workflows` pour confirmer la connexion n8n.

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
- Outil `search_workflows` → liste les workflows de l'instance `https://n8n2.reaktimo.com`.
- Outil `get_workflow_details` sur `823xFRdz4SJSfv0R` → retourne les détails du workflow Extraction RI.
- Un appel Airtable de test (lecture base `apprtejZaap5ouqGm`) fonctionne avec le PAT configuré dans `.env`.

---

## 6. ⚠️ Config trouvée en dur — à faire pivoter

Les secrets suivants sont **écrits en clair** dans des fichiers de cette machine. Comme ils sont exposés (et certains dans des fichiers **non gitignorés**, donc commitables par erreur), il faut les **révoquer et regénérer tous**, puis nettoyer les fichiers.

### JWT n8n MCP (`Authorization: Bearer …`)
- `~/.claude.json` (bloc `mcpServers.n8n-mcp.headers`) — en clair sur disque, **gitignoré**
- `.mcp.json` (racine projet) — gitignoré

Le JWT est spécifique au serveur MCP natif (`aud: "mcp-server-api"`). Il n'a **pas de date d'expiration** (`iat` uniquement, pas de `exp`). Il est sans risque s'il fuite en lecture seule, mais doit être régénéré si la machine est compromise.

> **Note historique (pour mémoire) :** Un token n8n de l'ancienne instance `https://n8n2.srv1070115.hstgr.cloud` (JWT signé) était présent dans `.cursor/mcp.json` du repo `alxor-os-1`. Ce fichier a été retiré du suivi Git (`.cursor/` est maintenant gitignoré). L'ancienne instance est décommissionnée — sans risque.

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

1. **Révoquer** : PAT GitHub, clé API n8n, PAT Airtable, et l'app Dropbox (regénérer le secret + invalider les refresh tokens).
2. **Regénérer** chaque credential et le stocker dans un gestionnaire de mots de passe.
3. **Nettoyer** les fichiers listés ci-dessus : remplacer les valeurs par `process.env.XXX` dans les scripts, supprimer les valeurs des fichiers Markdown, purger les règles de permission contenant des tokens dans les `settings.local.json`.
4. **Mettre à jour** `.mcp.json`, `~/.claude.json` et les credentials n8n (Dropbox) avec les nouvelles valeurs.
5. Les fichiers étant encore *untracked*, **vérifier avant tout `git add`** qu'aucun fichier contenant un secret n'est commité (les `*.js` racine et les 2 fichiers Markdown ne sont **pas** couverts par le `.gitignore` actuel).

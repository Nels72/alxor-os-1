# SETUP — Reproduire l'environnement de travail Alxor sur une nouvelle machine

> Mis à jour le 2026-06-11. Dépôt unique du projet : `Nels72/alxor-os-1`.
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

| Serveur | Commande | Variables d'env du serveur | Instance/URL |
|---|---|---|---|
| `github-mcp` | `npx -y @modelcontextprotocol/server-github` | `GITHUB_PERSONAL_ACCESS_TOKEN` | api.github.com |
| `n8n-mcp` | `C:\Users\<user>\AppData\Roaming\npm\n8n-mcp.cmd` (install globale : `npm install -g n8n-mcp`) | `N8N_API_URL`, `N8N_API_KEY` | `https://n8n2.reaktimo.com/api/v1` |

### 2.2 Niveau projet — `.mcp.json` (à la racine du repo, **gitignoré**)

| Serveur | Commande | Variables d'env du serveur | Instance/URL |
|---|---|---|---|
| `n8n-mcp` | `npx -y n8n-mcp@latest` | `MCP_MODE=stdio`, `LOG_LEVEL=error`, `DISABLE_CONSOLE_OUTPUT=true`, `N8N_API_URL`, `N8N_API_KEY` | `https://n8n2.reaktimo.com/api/v1` |
| `github-mcp` | `npx -y @modelcontextprotocol/server-github` | `GITHUB_PERSONAL_ACCESS_TOKEN` | api.github.com |

Les deux serveurs projet sont activés dans `~/.claude/settings.local.json` via
`"enabledMcpjsonServers": ["github-mcp", "n8n-mcp"]`.

**Commandes de déclaration équivalentes** (au lieu d'éditer les JSON à la main) :

```powershell
# Niveau utilisateur
claude mcp add github-mcp --scope user -e GITHUB_PERSONAL_ACCESS_TOKEN=<token> -- npx -y @modelcontextprotocol/server-github
claude mcp add n8n-mcp --scope user -e N8N_API_URL=https://n8n2.reaktimo.com/api/v1 -e N8N_API_KEY=<clé> -- npx -y n8n-mcp@latest

# Niveau projet (écrit dans .mcp.json)
claude mcp add n8n-mcp --scope project -e MCP_MODE=stdio -e LOG_LEVEL=error -e DISABLE_CONSOLE_OUTPUT=true -e N8N_API_URL=https://n8n2.reaktimo.com/api/v1 -e N8N_API_KEY=<clé> -- npx -y n8n-mcp@latest
claude mcp add github-mcp --scope project -e GITHUB_PERSONAL_ACCESS_TOKEN=<token> -- npx -y @modelcontextprotocol/server-github
```

---

## 3. Credentials — clés API et tokens

**Ne jamais écrire ces valeurs dans un fichier versionné.** Les stocker dans un gestionnaire de mots de passe et les injecter uniquement dans les configs locales gitignorées.

| Nom | Sert à | Où le régénérer |
|---|---|---|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Auth du serveur MCP GitHub (repos, PRs, issues) | GitHub → Settings → Developer settings → Fine-grained PAT |
| `N8N_API_KEY` | Auth API publique n8n (`https://n8n2.reaktimo.com/api/v1`), utilisée par n8n-mcp et les scripts `*.js` à la racine | n8n → Settings → API |
| **Airtable PAT** (`pat…`) | Lecture/écriture directe sur la base CRM `apprtejZaap5ouqGm` (table prospects `tblh45gV9PZcN1fkz`) via API REST | airtable.com/create/tokens |
| **Dropbox App key / App secret** (app `alxor-ged`, Full Dropbox) | OAuth2 client de l'app Dropbox utilisée pour la GED (renommage, recherche de fichiers) | Dropbox App Console |
| **Dropbox refresh token** | Token longue durée pour obtenir des access tokens (scripts locaux + credential n8n) | Flow OAuth via `get-dropbox-refresh-token.js` |
| **Netlify auth** | Déploiement du chatbot apporteur | `netlify login` (stocké par le CLI) |
| **Yousign API key** (sandbox) | Workflow n8n de double signature `hfNT0tCYt3ULRrNM` | Stockée côté n8n (credentials), pas sur la machine |

Credentials stockées **côté n8n** (pas à reproduire sur la machine, mais à vérifier sur l'instance) : Airtable, Dropbox, Google Gemini, Yousign, SMTP.

---

## 4. Variables d'environnement

- **Aucune variable d'environnement système ou utilisateur Windows n'est utilisée pour les secrets.** (Les variables utilisateur existantes sont uniquement `Path`, `TEMP`, `TMP`, `OneDrive`, `ChocolateyLastPathUpdate`.)
- Toutes les variables nécessaires aux MCP sont définies **inline** dans les blocs `env` des configs MCP :
  - `~/.claude.json` → `mcpServers.github-mcp.env`, `mcpServers.n8n-mcp.env`
  - `.mcp.json` (racine projet) → idem
- Variables consommées par les serveurs MCP :

| Variable | Définie dans | Consommée par |
|---|---|---|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | `~/.claude.json` et `.mcp.json` | `@modelcontextprotocol/server-github` |
| `N8N_API_URL` | `~/.claude.json` et `.mcp.json` | `n8n-mcp` |
| `N8N_API_KEY` | `~/.claude.json` et `.mcp.json` | `n8n-mcp` |
| `MCP_MODE`, `LOG_LEVEL`, `DISABLE_CONSOLE_OUTPUT` | `.mcp.json` uniquement | `n8n-mcp` (mode stdio silencieux) |

Il n'y a **pas de fichier `.env`** dans le projet : les scripts Node à la racine ont leurs tokens codés en dur (voir section 6 — à corriger).

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

1. Installer n8n-mcp en global (utilisé par la config niveau utilisateur) :
   ```powershell
   npm install -g n8n-mcp
   ```
2. Récupérer les secrets depuis le gestionnaire de mots de passe (**après rotation**, cf. section 6).
3. Lancer les commandes `claude mcp add` de la section 2.2, ou recréer `.mcp.json` à la racine (il est gitignoré, donc absent du clone).
4. Vérifier : `claude mcp list` puis, dans une session, l'outil `n8n_health_check`.

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
- `n8n_health_check` répond OK sur `https://n8n2.reaktimo.com`.
- Un appel Airtable de test (lecture base `apprtejZaap5ouqGm`) fonctionne avec le nouveau PAT.

---

## 6. ⚠️ Config trouvée en dur — à faire pivoter

Les secrets suivants sont **écrits en clair** dans des fichiers de cette machine. Comme ils sont exposés (et certains dans des fichiers **non gitignorés**, donc commitables par erreur), il faut les **révoquer et regénérer tous**, puis nettoyer les fichiers.

### Clé API n8n (`N8N_API_KEY`)
- `~/.claude.json` (bloc `mcpServers`)
- `.mcp.json` (gitignoré, mais en clair sur disque)
- `~/.claude/settings.local.json` (dans 2 règles de permission `Bash(curl …)`)
- Scripts dans `ops/scripts/` : `patch-dropbox-token.js`, `get-webhook-path.js`, `get-last-exec.js`, `test-full-response.js`, `fix-n8n-workflow.js`, `fix-dropbox-paths.js`, `update-dropbox-credentials.js`, `test-workflow.js`

> **Note historique (pour mémoire) :** Un token n8n de l'ancienne instance `https://n8n2.srv1070115.hstgr.cloud` (JWT signé, délivré par cette instance) était présent en clair dans `.cursor/mcp.json` du repo `alxor-os-1`. Ce fichier a été retiré du suivi Git (`.cursor/` est maintenant gitignoré). L'ancienne instance est décommissionnée — le token est sans risque.

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

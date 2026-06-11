# Diagnostic — Credential n8n « Header Auth account » (Airtable)

> Date : 2026-06-11 · Statut : **dette technique documentée, non corrigée**
> Diagnostic réalisé en lecture seule (exports `backups/n8n/` + logs d'exécution API n8n).
> Aucun secret dans ce fichier — valeurs dans `.env` (`AIRTABLE_PAT`).

## Contexte

Le CLAUDE.md note que le credential n8n `Header Auth account` (id `vsMFMN5O6M4G7eMB`, type `httpHeaderAuth`) « envoyait un mauvais header » — raison historique pour laquelle le PAT Airtable a été codé en dur dans ~21 nœuds HTTP répartis sur 8 workflows.

## Cause identifiée

**Le champ « Name » du credential contient `Airtable_HTTP` au lieu de `Authorization`.**

Quelqu'un a mis un libellé descriptif dans le champ qui définit le *nom du header HTTP*. Résultat : n8n envoie `Airtable_HTTP: <token>` et **aucun header `Authorization`** → Airtable répond `401 AUTHENTICATION_REQUIRED` sur tous les nœuds qui reposent uniquement sur ce credential.

**Preuve directe** — requête loggée dans l'exécution n°360 du workflow Relance Docs Provisoires (2026-06-10 06:00 UTC, nœud `Query Docs Provisoires`) :

```json
"request": {
  "headers": {
    "Airtable_HTTP": "**hidden**",
    "accept": "application/json,..."
  },
  "uri": "https://api.airtable.com/v0/apprtejZaap5ouqGm/tblfxKmkeklx4FyGY"
},
"messages": ["401 - {\"error\":{\"type\":\"AUTHENTICATION_REQUIRED\",\"message\":\"Authentication required\"}}"]
```

## Tableau comparatif des configurations de nœuds

| | Nœuds « PAT en dur » (fonctionnent) | Nœuds « credential » (échouent en 401) |
|---|---|---|
| Type de nœud | `n8n-nodes-base.httpRequest` v4.2 | `n8n-nodes-base.httpRequest` v4.2 (identique) |
| `authentication` | non défini (None) | `genericCredentialType` |
| `genericAuthType` | — | `httpHeaderAuth` |
| Credential attaché | aucun | `Header Auth account` (`vsMFMN5O6M4G7eMB`) |
| Header effectivement envoyé | `Authorization: Bearer <PAT>` (manuel, `sendHeaders: true`) | `Airtable_HTTP: <valeur cachée>` |
| Résultat Airtable | 200 | **401 AUTHENTICATION_REQUIRED** |

**Cas mixtes** (credential attaché + header `Authorization` manuel — fonctionnent grâce au header manuel, le credential est inopérant ou redondant) :
- Renommage Documents GED : `Récupère Document Airtable`, `Récupère Dossier Airtable`, `Récupère Contact Airtable`
- Création Prospect Cabinet : `Créer Contact`, `Créer Dossier` (ici `authentication` n'est même pas activé → credential purement décoratif)

## Impact constaté en production (vérifié dans les exécutions, 2026-06-11)

| Workflow | Impact |
|---|---|
| **Relance Docs Provisoires** (`BDEwnCPsP8aWgIkd`) | **En panne silencieuse** : échec quotidien à 8h Paris sur le 1er nœud, vérifié du 06 au 10/06 (probablement depuis la création le 31/05). Aucune relance J-7/J-1 ni alerte courtier n'est envoyée. |
| **Alex Voice — Vapi Tool Calls Handler** (`l0njaqhJvkXhfqtG`) | `HTTP Lookup Contact` et `HTTP Create Task` reçoivent un 401 **masqué en « success »** par `onError: continue` (vérifié exécution n°359). L'agent vocal ne retrouve jamais les clients. |
| **Yousign — Double Signature** (`hfNT0tCYt3ULRrNM`) | 0 exécution à ce jour, mais ses ~12 nœuds Airtable sont en credential seul → **le test e2e sandbox échouera** sur `GET Dossier`. Résidu cosmétique : `nodeCredentialType: airtableTokenApi` orphelin sur ces nœuds (trace d'une ancienne config en credential prédéfini). |
| Workflows avec PAT en dur (Distribution Lead, Extraction RI ×2, Extraction Devis, Auth Apporteur, Lookup Client, Renommage GED, Création Prospect) | Non impactés — mais dépendants du PAT en dur dans chaque nœud (cf. SETUP.md §6, rotation). |

## Configuration cible (à appliquer ultérieurement)

### 1. Corriger le credential (UI n8n → Credentials → « Header Auth account »)

| Champ | Valeur actuelle | Valeur cible |
|---|---|---|
| Name | `Airtable_HTTP` | `Authorization` |
| Value | masquée (à vérifier au même moment) | `Bearer <AIRTABLE_PAT_N8N>` |

> **PAT confirmé valide le 2026-06-11** — testé directement contre Airtable (200 sur `/Documents`).  
> Valeur exacte : visible dans le nœud « Recherche Token Airtable » du workflow n8n `cQMFVPZDiWsYZEyJ` (ne pas mettre en clair dans ce fichier).

**Pourquoi impossible via API :** le n8n REST API v1 ne dispose pas d'endpoint PATCH sur les credentials. L'endpoint interne `/rest/credentials/{id}` supporte PATCH mais requiert un cookie de session navigateur (authentification UI), pas un JWT ou API key.

### 2. Standardiser tous les nœuds Airtable HTTP Request

```
authentication:   genericCredentialType
genericAuthType:  httpHeaderAuth
credential:       Header Auth account (vsMFMN5O6M4G7eMB)
headerParameters: SUPPRIMER le header Authorization manuel (garder Content-Type)
nettoyage:        retirer les nodeCredentialType: airtableTokenApi orphelins (Yousign)
```

Périmètre : ~21 nœuds en dur (8 workflows) + 5 nœuds mixtes à nettoyer. Après migration, la **rotation du PAT = une seule modification** (le credential) au lieu de 21 nœuds.

Alternative plus propre à terme (préférence projet « nœuds natifs ») : nœuds Airtable natifs + credential `airtableTokenApi` — refactor plus lourd, à évaluer séparément.

### Lien avec la rotation des secrets (SETUP.md §6)

Ordre recommandé : **corriger le credential d'abord**, migrer les nœuds, puis faire la rotation du PAT (1 seul endroit à mettre à jour). Si la rotation se fait avant la migration, il faudra mettre à jour le credential **et** les 21 nœuds en dur.

## Plan de validation (après correction)

1. Ouvrir le credential dans l'UI n8n : vérifier Name = `Authorization` et Value = `Bearer <PAT>` (préfixe inclus).
2. Exécuter manuellement le seul nœud `Query Docs Provisoires` (GET sans effet de bord) → attendu : 200 avec la liste des documents provisoires.
3. Le lendemain : vérifier que l'exécution planifiée de 8h de Relance Docs Provisoires passe en `success`.
4. Rejouer un tool call Vapi (lookup client) → vérifier que `HTTP Lookup Contact` retourne un record et plus un 401 avalé.
5. Lancer le test e2e Yousign sandbox (déjà prévu) → `GET Dossier` doit passer.

## Niveau de confiance

**~99 %.** Le nom de header fautif (`Airtable_HTTP`) est observé directement dans la requête loggée par n8n. Le PAT cible (`patlSsT4mcDVMulhv`) est confirmé valide sur Airtable (test direct 2026-06-11). La seule action restante est la correction manuelle du champ Name dans l'UI n8n.

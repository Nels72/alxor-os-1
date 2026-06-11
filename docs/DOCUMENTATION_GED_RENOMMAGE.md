# Workflow GED — Renommage Automatique de Documents
**Dernière mise à jour : 2026-05-14**

---

## Vue d'ensemble

Workflow n8n qui classe et renomme automatiquement les documents reçus dans la GED Alxor selon une nomenclature standardisée.

**Flux :** Make.com → n8n → Airtable → Gemini IA → Dropbox → Airtable

---

## Nomenclature

```
TYPE_NOM_PRENOM_IDDOSSIER_YYYYMMDD.ext
```

Exemples :
- `CONTRAT_DUPONT_JEAN_DOSabc123_20260514.pdf`
- `DEVIS_MARTIN_SOPHIE_DOSxyz789_20260514.pdf`
- `AUTRE_INCONNU_X_DOSimWyq9_20260514.pdf` ← (quand Gemini ne reconnaît pas le type)

---

## Workflow n8n

**ID :** `BzKQPCi78YVPer8F`  
**Instance :** `https://n8n2.reaktimo.com`  
**Statut :** Actif ✅

### Nœuds (dans l'ordre)

| # | ID | Nom | Type | Rôle |
|---|----|-----|------|------|
| 1 | `webhook-trigger` | Webhook Make.com | Webhook | Reçoit `airtable_document_id` + `dropbox_path` |
| 2 | `get-airtable-doc` | Récupère Document Airtable | HTTP Request | Lit les champs du document (table `tblfxKmkeklx4FyGY`) |
| 3 | `get-airtable-dossier` | Récupère Dossier Airtable | HTTP Request | Lit les infos du dossier client (table `tblh45gV9PZcN1fkz`) |
| 4 | `prepare-context` | Prépare Contexte IA | Code | Construit le prompt Gemini |
| 5 | `ai-classify` | Agent IA Gemini - Classification | HTTP Request | Classifie le document via Gemini 2.5 Flash |
| 6 | `build-nomenclature` | Construit Nomenclature | Code | Génère `ancienPath`, `nouveauPath`, `nouveauNom` |
| 7 | `refresh-dropbox-token` | Obtient Token Dropbox | HTTP Request | Rafraîchit le token OAuth2 Dropbox (offline) |
| 8 | `dropbox-rename` | Renomme dans Dropbox | HTTP Request | Appelle `/2/files/move_v2` |
| 9 | `update-airtable` | MAJ Airtable Document | HTTP Request | Met à jour `Nom_Fichier`, `Dropbox_Path`, `Type_Document`, `Statut_Document = Valide` |
| 10 | `respond-webhook` | Réponse Webhook | Respond to Webhook | Retourne JSON de confirmation à Make.com |

### Webhook

- **URL :** `https://n8n2.reaktimo.com/webhook/renommage-document`
- **Méthode :** POST
- **Payload attendu :**
```json
{
  "airtable_document_id": "recXXXXXXXXXXXXXX",
  "dropbox_path": "/ged_alxor/recv.../rec.../dos.../fichier.pdf"
}
```

### Réponse (succès)
```json
{
  "status": "ok",
  "ancien_nom": "PC_recto-specimen.pdf",
  "nouveau_nom": "DEVIS_DUPONT_JEAN_DOSabc123_20260514.pdf"
}
```

---

## Credentials & API

### Airtable
- **Base :** `apprtejZaap5ouqGm`
- **PAT :** `{{AIRTABLE_PAT}}` (voir `.env` — configuré dans les nœuds HTTP)
- **Table Documents :** `tblfxKmkeklx4FyGY`
- **Table Dossiers :** `tblh45gV9PZcN1fkz`

### Dropbox
- **App :** `alxor-ged` (Full Dropbox — créée le 2026-05-14)
- **App key :** `{{DROPBOX_APP_KEY}}` (voir `.env`)
- **App secret :** `{{DROPBOX_APP_SECRET}}` (voir `.env`)
- **Refresh token :** `{{DROPBOX_REFRESH_TOKEN}}` (voir `.env`)
- **Compte :** `n.invest72@gmail.com`
- **Dossier racine GED :** `/ged_alxor/`
- **Token type :** offline (permanent, ne expire jamais sauf révocation)

> ⚠️ L'ancienne app (`8getvvoz6jer6qf`) était en mode "App folder" — ne pas réutiliser.

### Gemini
- **Modèle :** `gemini-2.5-flash` (via API v1)
- **Endpoint :** `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`
- **Clé API :** `{{GEMINI_API_KEY}}` (voir `.env`)

### n8n API
- **Clé :** `{{N8N_API_KEY}}` (voir `.env`)

---

## Scripts de maintenance

Tous dans `D:\NELS\AlxorFiles052026\` :

| Fichier | Rôle |
|---------|------|
| `test-workflow.js` | Test end-to-end via webhook |
| `get-last-exec.js` | Détails de la dernière exécution n8n |
| `check-airtable-record.js` | Lire un record Airtable |
| `verify-new-dropbox.js` | Vérifier accès Dropbox + existence fichier |
| `update-dropbox-credentials.js` | Mettre à jour les credentials Dropbox dans n8n |
| `get-webhook-path.js` | Lire la config du webhook n8n |

### Lancer un test manuel
```powershell
node "D:\NELS\AlxorFiles052026\test-workflow.js"
```
Modifier le `payload` dans le script pour changer l'`airtable_document_id` et le `dropbox_path`.

---

## Structure Dropbox

```
/ged_alxor/
  {cabinet_id}/        ← ID Airtable du cabinet (Cabinet_Tenant)
    {client_id}/       ← ID Airtable du client
      {dossier_id}/    ← ID Airtable du dossier (DOS_xxxxx)
        fichier.pdf
```

---

## Problèmes rencontrés & solutions

| Problème | Cause | Solution |
|----------|-------|----------|
| Dropbox `path/not_found` | App en mode "App folder" | Recréer une app en mode "Full Dropbox" |
| Gemini 404 | Modèle `gemini-1.5-flash` retraité | Utiliser `gemini-2.5-flash` via `/v1/` |
| `$helpers is not defined` | Non disponible sur cette instance n8n | Remplacer Code node par HTTP Request natif |
| Airtable 403 | PAT sans accès à la base | Ajouter la base dans les permissions du PAT |
| Token Dropbox expiré (4h) | Token short-lived | OAuth2 offline avec refresh token permanent |

---

## Prochaines évolutions possibles

- Améliorer le prompt Gemini pour mieux distinguer les types de documents Alxor
- Gérer les doublons (si un fichier avec le même nom existe déjà dans Dropbox)
- Ajouter un nœud de notification en cas d'erreur (email ou Slack)
- Connecter Make.com directement depuis le formulaire Tally

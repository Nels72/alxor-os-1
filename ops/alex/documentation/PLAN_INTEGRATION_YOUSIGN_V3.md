# Plan de Développement — Intégration Yousign API v3

**Projet :** Alxor OS — Signature électronique des dossiers de courtage
**Date :** 03/06/2026
**Statut :** À développer

---

## 1. Contexte et objectif

### Problème actuel

Aujourd'hui, la signature des documents d'un dossier de courtage se fait **hors système** (email, impression, scan). Ce n'est pas conforme : le devis et la fiche d'information et de conseil (FIC) doivent être signés **avant** la génération du contrat définitif.

### Objectif

Intégrer Yousign API v3 pour automatiser **deux signatures électroniques séquentielles** par dossier :

1. **Signature 1 — Devis + FIC** : le client signe électroniquement le devis et la fiche d'information légale
2. **Signature 2 — Contrat définitif** : une fois le devis signé, le contrat est généré et envoyé au client pour signature

Le tout orchestré automatiquement via n8n, sans intervention manuelle.

### Flux cible

```
Dossier prêt à signer
    │
    ▼
n8n récupère Devis + FIC depuis Dropbox
    │
    ▼
n8n crée Signature Request 1 via Yousign API
    │
    ▼
Client reçoit un email Yousign → signe le devis + FIC
    │
    ▼
Yousign envoie webhook "signature_request.done" → n8n
    │
    ▼
n8n télécharge les documents signés → Dropbox GED
n8n génère le contrat définitif
    │
    ▼
n8n crée Signature Request 2 via Yousign API
    │
    ▼
Client reçoit un email Yousign → signe le contrat
    │
    ▼
Yousign envoie webhook "signature_request.done" → n8n
    │
    ▼
n8n télécharge le contrat signé → Dropbox GED
n8n met à jour le statut du dossier dans Airtable
```

---

## 2. Architecture existante (ne pas modifier)

### Stack en place

| Composant | Rôle | Détail |
|---|---|---|
| **Airtable** | BDD | Base `apprtejZaap5ouqGm` — Tables : Contacts, Dossiers, Documents, Collaborateurs |
| **n8n** | Orchestration | Instance `https://n8n2.reaktimo.com` — 9 workflows actifs |
| **Make.com** | Scénarios chatbot | Crée Contact + Dossier + Documents, appelle n8n |
| **Dropbox** | GED | Arborescence `/GED_Alxor/{Cabinet}/{Contact}/{Dossier}/` |
| **Uploadcare** | Upload client | Upload côté chatbot, CDN URL transmise au webhook |
| **Gemini 2.5 Flash** | IA | Classification documents, extraction RI, extraction devis |

### Flux existant (ne change pas)

```
Chatbot → Make.com → Airtable (Contact + Dossier + Documents) + Dropbox (GED)
       → n8n /distribution-lead (assignation collaborateur)
       → n8n /extraction-ri (extraction RI + email courtier)
       → n8n /renommage-document (classification IA + renommage GED)
```

**Le workflow Yousign se branche APRÈS ce flux existant.** Il ne modifie aucun workflow ni scénario en place.

### Tables Airtable concernées

**Dossiers** (`tblh45gV9PZcN1fkz`) — champs existants utiles :
- `Contact` (linked record → Contacts)
- `Statut_Dossier` (select)
- `Type_Contrat` (select : AUT, MRH, MRP, etc.)
- `Collaborateurs_Cabinet_Client` (linked record → Collaborateurs)

**Documents** (`tblfxKmkeklx4FyGY`) — champs existants utiles :
- `Nom_Fichier`, `Dropbox_Path`, `Type_Document`, `Statut_Document`

**Contacts** (`tbl9sFkklVymVBKNN`) — champs existants utiles :
- `Nom_Complet`, `Email`, `Téléphone`, `Adresse`

### Credentials n8n existants

- **Gmail OAuth2** : `Z5fTzUA41HWJI8Y7` (envoi emails)
- **Header Auth Airtable** : `vsMFMN5O6M4G7eMB`
- **Dropbox** : OAuth2 offline token (refresh automatique dans les workflows)

### Contrainte technique n8n

L'instance n8n est en v2.52. Les Code nodes tournent dans **JsTaskRunnerSandbox** :
- Pas de `require()`, pas de `fetch`, pas de `this.helpers`
- Utiliser des nœuds HTTP Request pour les appels API
- Utiliser ExtractFromFile pour les conversions binary ↔ base64

---

## 3. Yousign API v3 — Référence technique

### Environnements

| Env | Base URL | Limites |
|---|---|---|
| **Sandbox** | `https://api-sandbox.yousign.app/v3` | 30 req/min, 200 req/h, 5 signataires max |
| **Production** | `https://api.yousign.app/v3` | Limites supérieures (selon contrat) |

### Authentification

Header `Authorization: Bearer {API_KEY}` sur chaque requête.
Chaque environnement a sa propre clé API (dashboard Yousign).

### Séquence d'appels API pour UNE signature

```
1. POST /v3/signature_requests
   → Crée une demande (statut "draft")
   → Retourne : signatureRequestId

2. POST /v3/signature_requests/{id}/documents/upload
   → Upload du PDF (multipart/form-data, max 50 MB)
   → Retourne : documentId

3. POST /v3/signature_requests/{id}/signers
   → Ajoute le signataire + position du champ signature
   → Retourne : signerId

4. POST /v3/signature_requests/{id}/activate
   → Passe en "ongoing", envoie l'email au signataire
```

### Payloads détaillés

**Créer une Signature Request :**
```json
{
  "name": "Devis Assurance Auto - Dupont Jean",
  "delivery_mode": "email",
  "timezone": "Europe/Paris",
  "external_id": "recXXXXXX__devis",
  "audit_trail_locale": "fr",
  "signers_allowed_to_decline": true
}
```

Le champ `external_id` est crucial : il permet d'identifier le dossier Airtable et le type de signature (devis ou contrat) quand le webhook revient. Format proposé : `{airtable_dossier_id}__devis` ou `{airtable_dossier_id}__contrat`.

**Uploader un document :**
```
POST /v3/signature_requests/{id}/documents/upload
Content-Type: multipart/form-data

file: [binary PDF]
nature: "signable_document"
```

**Ajouter un signataire :**
```json
{
  "info": {
    "first_name": "Jean",
    "last_name": "Dupont",
    "email": "jean.dupont@example.com",
    "phone_number": "+33612345678",
    "locale": "fr"
  },
  "signature_level": "electronic_signature",
  "signature_authentication_mode": "otp_sms",
  "fields": [
    {
      "type": "signature",
      "document_id": "{documentId}",
      "page": 1,
      "x": 77,
      "y": 700,
      "width": 200,
      "height": 68
    }
  ]
}
```

Notes :
- `signature_level` : `electronic_signature` (SES) suffit pour du courtage standard
- `signature_authentication_mode` : `otp_sms` (OTP par SMS) ou `otp_email` ou `no_otp`
- Coordonnées du champ signature : origine = coin haut-gauche du PDF, A4 = 596×842 pixels
- Outil de positionnement visuel : `placeit.yousign.fr`

### Webhooks

**Créer un abonnement webhook (une seule fois via API ou dashboard) :**
```json
POST /v3/webhook_subscriptions
{
  "endpoint": "https://n8n2.reaktimo.com/webhook/yousign-signature",
  "secret_key": "une_cle_hmac_secrete",
  "subscribed_events": [
    "signature_request.done",
    "signature_request.declined",
    "signature_request.expired"
  ],
  "description": "Alxor OS - n8n webhook",
  "sandbox": true,
  "enabled": true,
  "auto_retry": true
}
```

**Payload webhook reçu :**
```json
{
  "event_id": "uuid",
  "event_name": "signature_request.done",
  "event_time": "1670855889",
  "data": {
    "signature_request": {
      "id": "uuid",
      "external_id": "recXXXXXX__devis",
      "status": "done",
      "name": "Devis Assurance Auto - Dupont Jean",
      "...": "..."
    }
  }
}
```

**Headers webhook importants :**
- `x-yousign-signature-256` : signature HMAC-SHA256 du body
- `x-yousign-retry` : numéro de retry

**Vérification HMAC (dans un Code node n8n) :**
```javascript
const crypto = require('crypto');
const rawBody = JSON.stringify($input.item.json.body);
const signature = $input.item.json.headers['x-yousign-signature-256'];
const secret = 'une_cle_hmac_secrete';

const computed = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

if (computed !== signature) {
  throw new Error('Webhook signature invalide');
}
```

> **Attention** : la vérification HMAC avec `crypto.createHmac` pourrait ne pas fonctionner dans le sandbox n8n v2.52. Si `require('crypto')` est bloqué, il faudra utiliser un nœud HTTP Request vers un service externe de vérification, ou désactiver la vérification en sandbox et la tester en production. **À valider en développement.**

**Contrainte webhook** : Yousign attend une réponse HTTP 2xx en **< 1 seconde**. n8n répond immédiatement aux webhooks puis exécute le workflow — c'est compatible nativement.

### Récupérer les documents signés

```
GET /v3/signature_requests/{id}/documents/download?version=completed
Accept: application/zip
Authorization: Bearer {API_KEY}
```

Retourne le(s) PDF signé(s). Les documents sont conservés 10 ans par Yousign.

---

## 4. Modifications Airtable

### Nouveaux champs — Table Dossiers

| Champ | Type | Valeurs / Format | Usage |
|---|---|---|---|
| `Statut_Signature` | Single Select | `Aucun`, `En attente signature devis`, `Devis signé`, `En attente signature contrat`, `Contrat signé`, `Refusé`, `Expiré` | Suivi de l'état de signature du dossier |
| `Yousign_Request_ID_Devis` | Single line text | UUID Yousign | ID de la signature request du devis |
| `Yousign_Request_ID_Contrat` | Single line text | UUID Yousign | ID de la signature request du contrat |
| `Date_Signature_Devis` | Date (Include time) | ISO 8601 | Timestamp de la signature du devis |
| `Date_Signature_Contrat` | Date (Include time) | ISO 8601 | Timestamp de la signature du contrat |
| `Yousign_Signer_ID` | Single line text | UUID Yousign | ID du signataire (réutilisable pour la 2e signature) |

### Nouveaux champs — Table Documents

| Champ | Type | Usage |
|---|---|---|
| `Dropbox_Path_Signe` | Single line text | Chemin GED du document signé (après download Yousign) |
| `Est_Signe` | Checkbox | `true` quand le document signé a été récupéré et stocké |

---

## 5. Développement n8n — Workflow "Yousign Double Signature"

### Credential à créer

**Type : Header Auth**
- Name : `Yousign API Sandbox` (puis `Yousign API Production`)
- Header Name : `Authorization`
- Header Value : `Bearer {YOUSIGN_API_KEY}`

### Vue d'ensemble du workflow

Le workflow a **deux points d'entrée** :

1. **Webhook Trigger** (`/webhook/yousign-start`) : déclenche la signature 1 (devis + FIC)
2. **Webhook Trigger** (`/webhook/yousign-signature`) : reçoit les callbacks Yousign

> Alternative : un seul workflow avec deux Webhook nodes en entrée. Ou deux workflows séparés. **Au choix du développeur selon ce qui est le plus lisible.**

### Branche 1 — Déclenchement signature devis

**Point d'entrée :** Webhook POST `/webhook/yousign-start`

**Payload attendu :**
```json
{
  "dossier_id": "recXXXXXX",
  "contact_id": "recYYYYYY"
}
```

**Nœuds séquentiels :**

| # | Type nœud | Action | Détail |
|---|---|---|---|
| 1 | **Webhook** | Réception trigger | POST `/webhook/yousign-start` |
| 2 | **HTTP Request** | GET Dossier Airtable | `GET https://api.airtable.com/v0/{base}/{table}/{dossier_id}` — récupère les infos dossier |
| 3 | **HTTP Request** | GET Contact Airtable | `GET https://api.airtable.com/v0/{base}/{table}/{contact_id}` — récupère nom, email, téléphone |
| 4 | **HTTP Request** | Chercher documents Devis + FIC | `GET Documents` avec filtre `Dossier = dossier_id AND Type_Document IN (DEVIS, FIC)` |
| 5 | **IF** | Vérification | Devis ET FIC existent ? Si non → erreur, notifier le collaborateur |
| 6 | **HTTP Request** | Download Devis PDF depuis Dropbox | Utilise le `Dropbox_Path` du document Devis |
| 7 | **HTTP Request** | Download FIC PDF depuis Dropbox | Utilise le `Dropbox_Path` du document FIC |
| 8 | **HTTP Request** | Créer Signature Request | `POST /v3/signature_requests` avec `external_id = "{dossier_id}__devis"` |
| 9 | **HTTP Request** | Upload Devis PDF | `POST /v3/signature_requests/{id}/documents/upload` (multipart) |
| 10 | **HTTP Request** | Upload FIC PDF | `POST /v3/signature_requests/{id}/documents/upload` (multipart) |
| 11 | **HTTP Request** | Ajouter signataire | `POST /v3/signature_requests/{id}/signers` avec les infos Contact |
| 12 | **HTTP Request** | Activer la demande | `POST /v3/signature_requests/{id}/activate` |
| 13 | **HTTP Request** | PATCH Dossier Airtable | `Statut_Signature = "En attente signature devis"`, `Yousign_Request_ID_Devis = {id}` |
| 14 | **Respond to Webhook** | Réponse | `{ "status": "ok", "signature_request_id": "{id}" }` |

### Branche 2 — Réception webhook Yousign

**Point d'entrée :** Webhook POST `/webhook/yousign-signature`

**Nœuds séquentiels :**

| # | Type nœud | Action | Détail |
|---|---|---|---|
| 1 | **Webhook** | Réception callback Yousign | POST `/webhook/yousign-signature` — répondre immédiatement 200 |
| 2 | **Code** | Vérification HMAC | Valider `x-yousign-signature-256` (cf. section 3) |
| 3 | **Code** | Parser external_id | Extraire `dossier_id` et `type` depuis `external_id` (split sur `__`) |
| 4 | **Switch** | Router par event | `signature_request.done` / `signature_request.declined` / `signature_request.expired` |

**Cas `signature_request.done` :**

| # | Type nœud | Action |
|---|---|---|
| 5 | **IF** | `type == "devis"` ? |
| — | **OUI → Branche devis signé** | |
| 6a | **HTTP Request** | Download documents signés depuis Yousign (`GET /v3/signature_requests/{id}/documents/download?version=completed`) |
| 7a | **HTTP Request** | Upload vers Dropbox GED (même dossier, suffixe `_SIGNE`) |
| 8a | **HTTP Request** | PATCH Documents Airtable (`Dropbox_Path_Signe`, `Est_Signe = true`) |
| 9a | **HTTP Request** | PATCH Dossier Airtable (`Statut_Signature = "Devis signé"`, `Date_Signature_Devis`) |
| 10a | *(voir section 6)* | **Génération du contrat définitif** |
| 11a | **HTTP Request** | Upload contrat vers Dropbox GED |
| 12a | **HTTP Request** | Créer Signature Request 2 (`external_id = "{dossier_id}__contrat"`) |
| 13a | **HTTP Request** | Upload contrat PDF vers Yousign |
| 14a | **HTTP Request** | Ajouter signataire + Activer |
| 15a | **HTTP Request** | PATCH Dossier (`Statut_Signature = "En attente signature contrat"`, `Yousign_Request_ID_Contrat`) |
| — | **NON → Branche contrat signé** | |
| 6b | **HTTP Request** | Download contrat signé depuis Yousign |
| 7b | **HTTP Request** | Upload vers Dropbox GED |
| 8b | **HTTP Request** | PATCH Documents Airtable |
| 9b | **HTTP Request** | PATCH Dossier (`Statut_Signature = "Contrat signé"`, `Date_Signature_Contrat`, `Statut_Dossier = étape suivante`) |
| 10b | **HTTP Request** | Email de confirmation au client + collaborateur (Gmail, credential existant) |

**Cas `signature_request.declined` :**

| # | Action |
|---|---|
| 5 | PATCH Dossier Airtable (`Statut_Signature = "Refusé"`) |
| 6 | Email au collaborateur : "Le client a refusé de signer" |

**Cas `signature_request.expired` :**

| # | Action |
|---|---|
| 5 | PATCH Dossier Airtable (`Statut_Signature = "Expiré"`) |
| 6 | Email au collaborateur : "La demande de signature a expiré" |

---

## 6. Point ouvert — Génération du contrat définitif

Le contrat définitif (Signature 2) doit être **généré** après la signature du devis. Ce point nécessite une décision :

**Option A — Template PDF pré-rempli :**
Un modèle PDF existe déjà (fourni par la compagnie ou créé en interne), et n8n le remplit avec les données du dossier Airtable. Nécessite un outil de génération PDF dans n8n (nœud Code + librairie, ou service externe).

**Option B — Document uploadé manuellement :**
Le collaborateur prépare le contrat et le dépose dans Dropbox (ou Airtable). Un trigger détecte le dépôt et lance automatiquement la Signature 2.

**Option C — Document déjà présent :**
Le contrat existe déjà dans la GED au moment de la soumission (uploadé avec le devis). Dans ce cas, la Signature 2 se lance immédiatement après le webhook du devis signé.

> **Décision requise avant développement.** Ce choix impacte la complexité du workflow.

---

## 7. Point ouvert — Déclenchement de la Signature 1

Le workflow Yousign démarre quand un dossier est "prêt à signer". Ce déclenchement peut être :

**Option A — Manuel via webhook :**
Le collaborateur clique un bouton (dans un futur dashboard ou via un lien) qui appelle `/webhook/yousign-start`. Simple, pas de risque de faux déclenchement.

**Option B — Automatique sur statut Airtable :**
Un trigger n8n (polling ou Airtable automation) détecte quand `Statut_Dossier` passe à une valeur spécifique (ex: "Prêt à signer"). Automatique mais nécessite que le statut soit mis à jour de manière fiable.

**Option C — Appelé depuis Make.com :**
Le scénario Make existant appelle le webhook n8n après la création du dossier, comme il le fait déjà pour `/distribution-lead`. Simple à câbler mais suppose que le devis est prêt dès la soumission chatbot.

> **Décision requise avant développement.**

---

## 8. Nomenclature des fichiers signés (GED Dropbox)

Convention de nommage pour les documents signés dans la GED :

```
{CODE_TYPE}_SIGNE_{NOM}_{Prénom}_{ID_DOSSIER}_{YYYYMMDD}.pdf
```

Exemples :
- `DEVIS_SIGNE_DUPONT_Jean_recXXXXXX_20260603.pdf`
- `FIC_SIGNE_DUPONT_Jean_recXXXXXX_20260603.pdf`
- `CONTRAT_SIGNE_DUPONT_Jean_recXXXXXX_20260605.pdf`

Cohérent avec la nomenclature existante du workflow Renommage GED.

---

## 9. Sécurité

| Sujet | Mesure |
|---|---|
| Clé API Yousign | Stockée dans les credentials n8n (chiffrés), jamais en clair dans le workflow |
| Webhook HMAC | Vérifier `x-yousign-signature-256` sur chaque callback (cf. contrainte sandbox n8n) |
| Données personnelles | Les données client (nom, email, téléphone) transitent via Yousign — vérifier la conformité RGPD du contrat Yousign |
| Sandbox vs Production | Deux credentials séparés dans n8n. Ne jamais utiliser la clé production en dev |
| IPs Yousign (optionnel) | Whitelister `57.130.41.144/28`, `51.38.96.112/28`, `5.39.7.128/28` si le serveur n8n a un firewall |

---

## 10. Plan de test (sandbox)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Appeler `/webhook/yousign-start` avec un dossier valide (devis + FIC présents) | Signature Request créée, email reçu sur l'adresse test |
| 2 | Signer le devis via l'interface Yousign sandbox | Webhook reçu par n8n, `Statut_Signature = "Devis signé"`, PDF signé dans Dropbox |
| 3 | Vérifier que la Signature 2 (contrat) se lance automatiquement | Nouvelle Signature Request créée, email reçu |
| 4 | Signer le contrat | Webhook reçu, `Statut_Signature = "Contrat signé"`, PDF signé dans Dropbox, statut dossier mis à jour |
| 5 | Refuser une signature | `Statut_Signature = "Refusé"`, email au collaborateur |
| 6 | Laisser expirer une signature | `Statut_Signature = "Expiré"`, email au collaborateur |
| 7 | Appeler `/webhook/yousign-start` sans devis dans la GED | Erreur gérée, pas de Signature Request créée |
| 8 | Envoyer un webhook avec une signature HMAC invalide | Rejeté par n8n |

---

## 11. Livrables attendus

| # | Livrable | Type |
|---|---|---|
| 1 | Champs Airtable créés (6 sur Dossiers, 2 sur Documents) | Config Airtable |
| 2 | Credential Yousign dans n8n (sandbox + production) | Config n8n |
| 3 | Abonnement webhook Yousign pointant vers n8n | Config Yousign (API ou dashboard) |
| 4 | Workflow n8n "Yousign Double Signature" | Workflow n8n |
| 5 | Tests sandbox validés (8 scénarios ci-dessus) | Validation |
| 6 | Bascule sandbox → production | Config |

---

## 12. Prérequis avant de commencer

- [ ] Compte Yousign avec accès sandbox (40 jours gratuits)
- [ ] Clé API sandbox récupérée depuis le dashboard Yousign
- [ ] Décision sur le **déclenchement** de la Signature 1 (section 7)
- [ ] Décision sur la **génération du contrat** définitif (section 6)
- [ ] Accès n8n admin (`https://n8n2.reaktimo.com`)
- [ ] Accès Airtable admin (base `apprtejZaap5ouqGm`)
- [ ] Accès Dropbox (token existant dans n8n)
- [ ] Un dossier de test complet dans Airtable avec un devis et une FIC dans Dropbox

---

## Annexes

### A. Endpoints Yousign API v3 utilisés

| Méthode | Endpoint | Usage |
|---|---|---|
| POST | `/v3/signature_requests` | Créer une demande de signature |
| POST | `/v3/signature_requests/{id}/documents/upload` | Uploader un PDF |
| POST | `/v3/signature_requests/{id}/signers` | Ajouter un signataire |
| POST | `/v3/signature_requests/{id}/activate` | Activer (envoyer au client) |
| GET | `/v3/signature_requests/{id}` | Consulter le statut |
| GET | `/v3/signature_requests/{id}/documents/download?version=completed` | Télécharger les docs signés |
| POST | `/v3/webhook_subscriptions` | Créer l'abonnement webhook |

### B. Documentation Yousign

- Portail développeur : https://developers.yousign.com
- Getting started : https://developers.yousign.com/docs/getting-started
- Signature requests : https://developers.yousign.com/docs/signature-request-2
- Webhooks : https://developers.yousign.com/docs/webhooks
- Outil placement signature : https://placeit.yousign.fr
- Collection Postman : https://www.postman.com/yousign/yousign-api-v3

### C. Référence interne

- Instance n8n : `https://n8n2.reaktimo.com`
- Base Airtable : `apprtejZaap5ouqGm`
- Table Dossiers : `tblh45gV9PZcN1fkz`
- Table Documents : `tblfxKmkeklx4FyGY`
- Table Contacts : `tbl9sFkklVymVBKNN`
- GED Dropbox : `/GED_Alxor/{Cabinet}/{Contact}/{Dossier}/`
- Nomenclature docs : `{CODE_TYPE}_{NOM}_{Prénom}_{ID_DOSSIER}_{YYYYMMDD}.{ext}`

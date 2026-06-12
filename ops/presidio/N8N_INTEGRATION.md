# Intégration Presidio dans les workflows n8n

> Date : 2026-06-12 · Statut : API opérationnelle localement (port 5080)

## Architecture

```
[Trigger Airtable / Webhook]
        │
        ▼
[Télécharge PDF Dropbox]
        │
        ▼
[Gemini — Extraction RI/Devis]   ← PDF envoyé en base64 (binaire)
        │                          Presidio NE peut PAS anonymiser avant
        ▼
[PRESIDIO /analyze]              ← AUDIT LOG : liste les PII détectées dans le JSON
        │
        ▼
[ParseJSON + Calculs]
        │
        ▼
[PRESIDIO /anonymize]            ← OPTIONNEL : si envoi du JSON vers un 2e LLM externe
        │
        ▼
[AIRTABLE PATCH]                 ← Données complètes (PII OK, base légale contrat)
```

## Pourquoi Presidio ne peut pas agir AVANT Gemini sur les PDFs

Le workflow actuel envoie les PDFs **en base64 binaire** à Gemini (dans Make.com). Presidio travaille
sur du **texte**. On ne peut pas anonymiser une image PDF avant l'extraction.

**Ce que Presidio apporte dans ce contexte :**
- **Audit trail** : traçabilité de chaque PII traitée (RGPD Art. 30 — registre des traitements)
- **Verification** : contrôle que les données stockées en Airtable sont celles attendues
- **Protection avant 2e envoi LLM** : si on renvoie le JSON vers un autre modèle (ex. Claude API pour scoring), anonymiser d'abord

## Configuration sur le serveur n8n

Presidio doit tourner sur **le même serveur que n8n** (`n8n2.reaktimo.com`) :

```bash
# Sur n8n2.reaktimo.com (SSH)
cd /path/to/repo/ops/presidio
./install.sh   # installe en /opt/presidio-alxor + systemd service
```

Une fois installé, l'API écoute sur `http://127.0.0.1:5080` (localhost uniquement).

---

## Intégration — Workflow Extraction RI (823xFRdz4SJSfv0R)

### Nœud à ajouter : Audit PII post-Gemini

**Position** : Après le nœud qui reçoit le JSON de Make.com / Gemini, avant l'Airtable PATCH.

**Type** : HTTP Request

```json
{
  "name": "Presidio — Audit PII",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "http://127.0.0.1:5080/analyze",
    "sendBody": true,
    "contentType": "application/json",
    "body": {
      "text": "={{ JSON.stringify($json) }}",
      "language": "fr"
    },
    "options": {
      "timeout": 5000,
      "response": {
        "response": {
          "responseFormat": "json"
        }
      }
    },
    "onError": "continueRegularOutput"
  },
  "notes": "Audit RGPD — log les entités PII détectées. Ne bloque pas le flux si Presidio est indisponible."
}
```

**Ce que ça fait** :
- Appelle `/analyze` sur le JSON extrait par Gemini
- Log dans les exécutions n8n quelles entités PII ont été détectées
- `onError: continueRegularOutput` → le workflow continue même si Presidio est down

### Nœud optionnel : Anonymisation avant 2e LLM

Si le JSON extrait doit être envoyé vers un autre modèle (ex. Claude API pour l'extraction
des fiches appétence), ajouter ce nœud **avant** l'appel Claude :

**Type** : HTTP Request

```json
{
  "name": "Presidio — Anonymise pour LLM",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "http://127.0.0.1:5080/anonymize_for_gemini",
    "sendBody": true,
    "contentType": "application/json",
    "body": {
      "text": "={{ JSON.stringify($json) }}",
      "language": "fr"
    },
    "options": { "timeout": 10000 }
  }
}
```

**Puis** (après la réponse du LLM) :

```json
{
  "name": "Presidio — Désanonymise",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "http://127.0.0.1:5080/deanonymize",
    "sendBody": true,
    "contentType": "application/json",
    "body": {
      "data": "={{ $json }}",
      "mapping_id": "={{ $('Presidio — Anonymise pour LLM').item.json.mapping_id }}"
    },
    "options": { "timeout": 5000 }
  }
}
```

---

## Intégration — Workflow Extraction Devis (b2J65p6kFx2uVyzP)

Même pattern qu'Extraction RI. Ajouter le nœud **Audit PII** après réception du JSON Gemini.

---

## Intégration — Workflow Extraction RI Cabinet (IUQoM7IchXDpoaAP)

Ce workflow traite du texte (le courtier saisit ou colle le RI). Ici Presidio peut agir
**AVANT Gemini** :

```
[Webhook Cabinet reçoit texte RI]
        │
        ▼
[Presidio /anonymize_for_gemini]   ← anonymise le texte
        │                            retourne mapping_id
        ▼
[Gemini — Extraction RI sur texte anonymisé]
        │
        ▼
[Presidio /deanonymize]            ← restaure les vraies valeurs dans le JSON
        │
        ▼
[Airtable PATCH]
```

---

## Endpoints disponibles

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| `/health` | GET | Vérification que l'API tourne |
| `/entities` | GET | Liste les entités anonymisées vs conservées |
| `/analyze` | POST | **AUDIT** — détecte PII sans modifier le texte |
| `/anonymize` | POST | Anonymise + retourne mapping complet |
| `/deanonymize` | POST | Restaure les valeurs depuis le mapping |
| `/anonymize_for_gemini` | POST | Anonymise (optimisé, seuil 0.45) |

## Entités anonymisées vs conservées

| Type | Action | Raison |
|------|--------|--------|
| PERSON | Anonymisé `[PERSON_N]` | Noms conducteurs/souscripteurs |
| LOCATION | Anonymisé `[LOCATION_N]` | Adresses |
| PHONE_NUMBER | Anonymisé | Téléphones |
| EMAIL_ADDRESS | Anonymisé | Emails |
| DATE_OF_BIRTH | Anonymisé | Dates de naissance uniquement (pas les dates contrat) |
| FR_DRIVER_LICENSE | Anonymisé | Numéros de permis |
| FR_NATIONAL_ID | Anonymisé | CNI |
| FR_SIRET | Anonymisé | SIRET/SIREN |
| IBAN_CODE / CREDIT_CARD | Anonymisé | Données bancaires |
| **FR_LICENSE_PLATE** | **Conservé** | Immatriculation nécessaire pour la tarification |
| Bonus/malus, sinistres, compagnie | **Conservé** | Données métier assurance |

## Démarrage local (dev)

```bash
cd ops/presidio
./start_local.sh
# → API sur http://localhost:5080

# Test complet
venv/bin/python test_presidio.py

# Test health
curl http://localhost:5080/health
```

## Déploiement serveur

```bash
# Sur n8n2.reaktimo.com
cd /opt/presidio-alxor
sudo systemctl status presidio-alxor
sudo journalctl -u presidio-alxor -f
```

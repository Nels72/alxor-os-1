# Notice — Lookup Client : n8n + Make.com (architecture séparée)

> Le lookup client existant est géré par un workflow n8n dédié.
> Le scénario Make "6 - 2- [Alex] Chatbot Web Public" reste **inchangé**.

---

## Architecture

```
Chatbot Alex v11
  │
  ├─ Lookup client existant
  │    POST https://n8n2.reaktimo.com/webhook/alex-lookup
  │    → Workflow n8n "Alex - Lookup Client"
  │    → Réponse JSON synchrone { found, nom, tel, ... }
  │
  └─ Soumission dossier
       POST https://hook.eu1.make.com/ljj5zijhjxavez2kjo7ouhrbcf0liny7
       → Scénario Make "6 - 2- [Alex] Chatbot Web Public" (INCHANGÉ)
       → Contact + Dossier + GED + Email
```

**Pourquoi cette séparation :**
- Le scénario Make actuel ne supporte pas la réponse synchrone sans modifier le webhook response mode, ce qui casserait le flux MAJ Contact → Dossier → GED → Upload
- n8n gère nativement le "Respond to Webhook" (réponse synchrone simple)
- Zéro risque de régression sur le scénario Make en production

---

## Workflow n8n : "Alex - Lookup Client"

### Structure (5 nodes)

```
Webhook (POST /webhook/alex-lookup, responseMode: responseNode)
  → Airtable Search (table Contacts, filtre par email)
    → IF (contact trouvé ?)
      ├─ true  → Respond to Webhook { found: true, nom, tel, ... }
      └─ false → Respond to Webhook { found: false }
```

### Fichier d'import

Le blueprint est prêt dans :
```
alex/chatbot/n8n_alex_lookup_workflow.json
```

### Procédure d'import dans n8n

1. Ouvrir n8n : `https://n8n2.reaktimo.com`
2. Cliquer **Add workflow** → menu **...** → **Import from file**
3. Sélectionner `n8n_alex_lookup_workflow.json`
4. **Configurer le credential Airtable** :
   - Ouvrir le node "Recherche Contact Airtable"
   - Sélectionner le credential Airtable existant (Personal Access Token)
   - Vérifier que la base `apprtejZaap5ouqGm` est accessible
5. **Vérifier les noms de champs Airtable** dans le node de recherche :
   - Les champs mappés sont : Prénom, Nom, Email, Téléphone, Adresse, Code Postal, Ville, Date de naissance, Profil
   - Adapter si les noms diffèrent dans votre table Contacts
6. **Vérifier la formule de filtre** : `LOWER({Email}) = LOWER('email_reçu')`
   - Adapter `{Email}` si le champ s'appelle autrement
7. **Tester** avec "Test workflow" en envoyant le payload ci-dessous
8. **Activer** le workflow (toggle ON)

---

## Configuration des nodes

### Node 1 — Webhook

| Paramètre | Valeur |
|---|---|
| HTTP Method | POST |
| Path | `alex-lookup` |
| Response Mode | **Using 'Respond to Webhook' Node** |
| CORS | `*` (tous les origines, à restreindre en prod) |

URL résultante : `https://n8n2.reaktimo.com/webhook/alex-lookup`

### Node 2 — Airtable Search

| Paramètre | Valeur |
|---|---|
| Operation | Search |
| Base | `apprtejZaap5ouqGm` (BDD Alxor OS V2 - DEV) |
| Table | Contacts |
| Filter Formula | `LOWER({Email}) = LOWER('{{ $json.body.email }}')` |
| Fields | Prénom, Nom, Email, Téléphone, Adresse, Code Postal, Ville, Date de naissance, Profil |

### Node 3 — IF

| Condition | Valeur |
|---|---|
| Left Value | `{{ $json.id }}` |
| Operator | is not empty |

True = contact trouvé, False = non trouvé.

### Node 4 — Respond to Webhook (trouvé)

Renvoie un JSON avec les données du contact :
```json
{
  "found": true,
  "nom": "{{ $json.fields.Nom }}",
  "telephone": "{{ $json.fields.Téléphone }}",
  "email": "{{ $json.fields.Email }}",
  "adresse": "{{ $json.fields.Adresse }}",
  "code_postal": "{{ $json.fields['Code Postal'] }}",
  "ville": "{{ $json.fields.Ville }}",
  "date_naissance": "{{ $json.fields['Date de naissance'] }}",
  "profil": "{{ $json.fields.Profil }}"
}
```

### Node 5 — Respond to Webhook (non trouvé)

```json
{
  "found": false
}
```

---

## Champs Airtable à mapper

| Champ Airtable (table Contacts) | Clé JSON réponse | Utilisé dans le chatbot |
|---|---|---|
| Nom | `nom` | Pré-rempli, affiché dans le récap |
| Téléphone | `telephone` | Pré-rempli |
| Email | `email` | Pré-rempli, affiché dans thank you page |
| Adresse | `adresse` | Pré-rempli |
| Code Postal | `code_postal` | Stocké dans D (payload) |
| Ville | `ville` | Stocké dans D (payload) |
| Date de naissance | `date_naissance` | Pré-rempli |
| Profil | `profil` | Détermine les options produit |

---

## Payload entrant (chatbot → n8n)

```json
{
  "email": "sophie.dupont@email.fr",
  "prenom": "Sophie"
}
```

Le prénom est envoyé pour info/log mais la recherche se fait uniquement sur l'email (plus fiable).

---

## Scénario Make — Aucune modification requise

Le scénario **"6 - 2- [Alex] Chatbot Web Public"** reste strictement identique.

Seuls deux nouveaux champs arrivent dans le payload de soumission :

| Champ | Valeur | Utilisation |
|---|---|---|
| `_deja_client` | `"Oui"` ou `"Non"` | Informatif — peut être ignoré ou stocké |
| `_lookup_email` | `"email@test.fr"` ou `null` | Email utilisé pour le lookup (peut différer de l'email final) |

Ces champs sont ignorés par le scénario Make actuel (non mappés dans le webhook interface). Ils ne causent aucune erreur.

---

## Points d'attention

1. **Performance** : le workflow n8n lookup est minimal (Webhook → Airtable → Respond). Temps attendu < 2 secondes. Le chatbot a un timeout implicite (~10s via fetch).

2. **CORS** : le webhook n8n est configuré avec `Access-Control-Allow-Origin: *`. En production, restreindre au domaine du site ECA.

3. **Sécurité** : le lookup expose des données contact via un endpoint public. Options de durcissement :
   - Restreindre CORS au domaine ECA uniquement
   - Ajouter un header secret (`X-Alex-Key`) vérifié dans le workflow
   - Rate limiting au niveau serveur/proxy n8n
   - Ne renvoyer que les champs strictement nécessaires

4. **Base Airtable** : le workflow pointe vers la base DEV (`apprtejZaap5ouqGm`). Adapter l'ID de base si la production utilise une base différente.

---

## Test rapide

### Via curl (terminal)

```bash
curl -X POST https://n8n2.reaktimo.com/webhook/alex-lookup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@easycourtage.fr","prenom":"Marie"}'
```

Réponse attendue (si contact existe) :
```json
{"found":true,"nom":"Dupont","telephone":"+33 6 12 34 56 78",...}
```

Réponse attendue (si non trouvé) :
```json
{"found":false}
```

### Via le chatbot

1. Ouvrir `chatbot_eca_v11_final.html`
2. Cliquer "C'est parti !"
3. Entrer un prénom
4. Répondre "Oui" à "Déjà client ?"
5. Entrer un email connu dans Airtable
6. Vérifier que le chatbot affiche "je vous ai retrouvé(e)" et skip les coordonnées

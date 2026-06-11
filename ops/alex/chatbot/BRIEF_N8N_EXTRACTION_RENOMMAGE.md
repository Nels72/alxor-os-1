# BRIEF N8N — Workflows Extraction RI & Renommage Documents

## CONTEXTE GENERAL

Le scenario Make.com "Alex Apporteur" cree des Dossiers et des Documents dans Airtable puis uploade les fichiers dans Dropbox. Deux workflows n8n doivent ensuite traiter ces donnees en aval. Make.com est OK, ne pas le modifier. Seuls les workflows n8n sont a verifier/corriger.

---

## INSTANCE N8N

- URL : https://n8n2.reaktimo.com
- Projet : zwr2ku2Be5k6HNPX

## BASE AIRTABLE

- Base ID : apprtejZaap5ouqGm
- Nom : BDD Alxor os V2 -DEV 022026

### Tables concernees et leurs IDs :

| Table | Table ID | Role |
|-------|----------|------|
| Dossiers | tblh45gV9PZcN1fkz | Dossier client cree par Make |
| Documents | tblfxKmkeklx4FyGY | Enregistrement de chaque fichier uploade |
| Contacts | tbl9sFkklVymVBKNN | Fiche client |
| Apporteurs | tblXtiocGwBJ284xa | Fiche apporteur |
| REF_Sources | tbl15ljMYLWtF5MK7 | Table de reference des sources |

---

## CE QUE MAKE.COM CREE DANS AIRTABLE (sortie du scenario Alex Apporteur)

### 1. Enregistrement Dossier (table Dossiers — tblh45gV9PZcN1fkz)

Champs remplis par Make (module 47 du blueprint) :

| Champ Airtable | Field ID | Valeur |
|----------------|----------|--------|
| Contact | fldcxlD1Hu5QVjfu4 | [record_id du contact] (linked record) |
| Type_Contrat | flddCTvjbBf4bSl5Y | Ex: "AUT", "MRH", "MOT", "RCPRO"... |
| Source | fldem8qSpedXjaA3W | "Alex Apporteur" |
| Message_Initial | fldS1ReqnTdyaFiwc | Texte libre (situation du client) |
| RI_Contact | fldFRPn013tj8ZuOU | Attachment [{url: "https://ucarecdn.com/..."}] |
| Collaborateurs_Cabinet_Client | fldpjUfGyZ65eTlL1 | [record_id du collaborateur] |
| Documents_Tally | fldsCjsAgEeD8ExF7 | Attachment (fichiers supplementaires) |

Champs RI importants dans la table Dossiers (a remplir par le workflow Extraction RI) :

| Champ | Field ID | Type | Description |
|-------|----------|------|-------------|
| RI_JSON | fldIwU3SkqSGPEe5p | Long text | JSON brut extrait du RI par l'IA |
| RI_Traite | fldtmOdie1myIYHoX | Checkbox | true quand extraction terminee |
| RI_Date_Traitement | fld9qQ5zb92960VjE | Date | Date du traitement |
| RI_Compagnie_Precedente | fldjhreRmZplztL4y | Text | Nom de l'ancien assureur |
| RI_Bonus_Malus | fldEqwl0rwkEYzPfL | Number | Coefficient bonus-malus |
| RI_Nb_Sinistres | fldj7WFGk3QjYClzq | Number | Nombre de sinistres |
| Type_Sinistres | fld9dx4y7QZE0QDTZ | Long text | Description des sinistres |
| RI_Resilie | fldgcXMZWC0MLF7jB | Checkbox | Si l'assure a ete resilie |
| Motif_Resiliation_RI | fldqi10oasSjNMu3h | Text | Motif de resiliation |
| IA_Statut | fldRhe1eKhBNH0uTg | Select | "En attente", "Analyse en cours", "Termine", "Erreur" |
| IA_Verdict_Conformite | fldubeXdsz1r0JqNS | Long text | Verdict IA sur conformite |

### 2. Enregistrement Document (table Documents — tblfxKmkeklx4FyGY)

Champs remplis par Make (module 16 du blueprint) :

| Champ Airtable | Field ID | Valeur |
|----------------|----------|--------|
| Nom_Fichier | fldklkePqbeThTU8h | Nom original du fichier (ex: "PC_recto-specimen.pdf") |
| Statut_Document | fldVtas7gXdKsUIjV | "Provisoire" (par defaut a la creation) |
| Dossier | fldrQ1g1E1tqR01rR | [record_id du dossier] (linked record) |
| Date_Upload | fldZ7pj1em4vkor0U | Date du jour |
| Dropbox_URL | flddL6fHg2zt1oYl5 | Lien partage Dropbox |
| Dropbox_Path | flddZUDWDRJKBAIEE | Chemin Dropbox complet |
| Cabinet_Tenant | fldtvheIWmgP3VPGb | [record_id du cabinet] |

Champs a remplir par le workflow Renommage :

| Champ | Field ID | Type | Description |
|-------|----------|------|-------------|
| Type_Document | flduq6aZQ6siMBM4k | Select | "Releve Informations", "Piece Identite", "Contrat", etc. |
| Statut_Document | fldVtas7gXdKsUIjV | Select | Passe de "Provisoire" a "Valide" |
| Document_Conforme | fldHYwcqoEmOh0iwj | Checkbox | true si conforme |

### 3. Structure Dropbox creee par Make

```
/GED_Alxor/{cabinet_record_id}/{contact_record_id}/{ID_Dossier}/
    fichier1.pdf    ← nom original (Uploadcare)
    fichier2.jpg
```

Le dossier Dropbox est cree par Make (module 8) avec :
- Path : /GED_Alxor/{Cabinet_Tenant[]}/{Contact[]}/
- Nom du dossier : {ID_Dossier} (ex: "DOS-00042")

---

## WORKFLOW 1 : Renommage Documents

### Workflow existant

- ID : BzKQPCi78YVPer8F
- Webhook : POST https://n8n2.reaktimo.com/webhook/renommage-document
- Statut : Actif

### Ce qu'il fait

1. Recoit un POST avec `{ "airtable_document_id": "recXXX", "dropbox_path": "/ged_alxor/.../fichier.pdf" }`
2. Lit le document dans Airtable (table Documents tblfxKmkeklx4FyGY)
3. Lit le dossier associe dans Airtable (table Dossiers tblh45gV9PZcN1fkz)
4. Envoie le fichier a Gemini 2.5 Flash pour classification (type de document)
5. Construit le nouveau nom : `TYPE_NOM_PRENOM_IDDOSSIER_YYYYMMDD.ext`
6. Renomme le fichier dans Dropbox via `/2/files/move_v2`
7. Met a jour Airtable : Nom_Fichier, Dropbox_Path, Type_Document, Statut_Document = "Valide"

### Points a verifier

- Le webhook recoit bien `airtable_document_id` et `dropbox_path`
- Le noeud qui lit le Dossier utilise bien la table tblh45gV9PZcN1fkz (pas une autre)
- Le noeud qui lit le Document utilise bien la table tblfxKmkeklx4FyGY
- Le token Dropbox se rafraichit correctement (app "alxor-ged", mode Full Dropbox)
- Le prompt Gemini classifie correctement les types : "Releve Informations", "Piece Identite", "Justificatif Domicile", "Contrat", "Carte Grise Barree", "CPI", "Carte Grise Definitive", "Devis / Projet", "Questionnaire", "Fiche Information Conseil", "Autre"
- La nomenclature respecte le format : TYPE_NOM_PRENOM_IDDOSSIER_YYYYMMDD.ext
- La reponse webhook retourne { status, ancien_nom, nouveau_nom }

### PROBLEME CONNU

- Ce workflow utilise des noeuds HTTP Request au lieu de noeuds natifs Airtable/Dropbox (car `$helpers` n'etait pas dispo sur cette instance). Verifier si les noeuds natifs sont maintenant disponibles et migrer si possible.

### Credentials

- Airtable PAT : {{AIRTABLE_PAT}} (voir .env — dans les noeuds HTTP)
- Dropbox App : alxor-ged (Full Dropbox) — App key: {{DROPBOX_APP_KEY}}, App secret: {{DROPBOX_APP_SECRET}}, Refresh token: {{DROPBOX_REFRESH_TOKEN}} (voir .env)
- Gemini : gemini-2.5-flash, API key: {{GEMINI_API_KEY}} (voir .env)

---

## WORKFLOW 2 : Extraction RI

### Ce qu'il doit faire

Quand un nouveau Dossier est cree avec un fichier RI_Contact attache, ce workflow doit :

1. Detecter le nouveau dossier (trigger Airtable ou webhook depuis Make)
2. Telecharger le fichier RI depuis l'URL Airtable (champ RI_Contact du Dossier)
3. Envoyer le PDF/image a Gemini pour extraction des informations :
   - Compagnie precedente
   - Coefficient bonus-malus
   - Nombre de sinistres et leurs types
   - Si l'assure a ete resilie + motif
4. Ecrire les resultats dans le Dossier Airtable :
   - RI_JSON = JSON brut de l'extraction
   - RI_Compagnie_Precedente = nom de l'assureur
   - RI_Bonus_Malus = coefficient
   - RI_Nb_Sinistres = nombre
   - Type_Sinistres = description
   - RI_Resilie = true/false
   - Motif_Resiliation_RI = motif
   - RI_Traite = true
   - RI_Date_Traitement = date du jour
   - IA_Statut = "Termine" (ou "Erreur")
   - IA_Verdict_Conformite = resume de conformite

### Trigger recommande

Option A (webhook) : Make envoie un POST a n8n apres creation du Dossier avec { "dossier_id": "recXXX" }
Option B (Airtable trigger) : n8n surveille les nouveaux records dans Dossiers ou RI_Contact n'est pas vide et RI_Traite = false

### Format RI_JSON attendu

```json
{
  "compagnie": "AXA",
  "bonus_malus": 0.50,
  "nb_sinistres": 1,
  "sinistres": [
    { "date": "2024-03-15", "type": "Bris de glace", "montant": "250 EUR", "responsable": false }
  ],
  "resilie": false,
  "motif_resiliation": null,
  "date_extraction": "2026-05-27"
}
```

### A verifier

- Le workflow Extraction RI existe-t-il deja sur l'instance ? Chercher parmi les workflows existants
- Si oui, verifier qu'il pointe vers les bonnes tables (Dossiers tblh45gV9PZcN1fkz)
- Si non, le creer avec les specs ci-dessus
- Le champ RI_Contact dans Dossiers est un attachment Airtable (array d'objets avec url, filename, size, type)
- L'URL du fichier RI est une URL Uploadcare (https://ucarecdn.com/...) stockee via Make
- Gemini doit recevoir le fichier en base64 ou via URL pour extraction

---

## RESUME DES TACHES

1. VERIFIER le workflow "Renommage Documents" (ID BzKQPCi78YVPer8F) : s'assurer qu'il fonctionne avec les documents crees par le scenario Make "Alex Apporteur"
2. VERIFIER/CREER le workflow "Extraction RI" : extraire les donnees du releve d'informations et les ecrire dans le Dossier Airtable
3. Les deux workflows doivent utiliser les memes tables et field IDs que Make (documentes ci-dessus)

---

## TACHE 3 (rappel) : Creer le workflow "Alex Auth Apporteur"

Voir le fichier BRIEF_N8N_ALEX_APPORTEUR.md pour les instructions detaillees.
En resume : Webhook POST /alex-auth-apporteur → Airtable Search Apporteurs par Token → IF trouve → IF Statut=Actif → Respond { valid, id_apporteur, nom, email }

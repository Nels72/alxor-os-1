# INSTRUCTIONS N8N — Workflows Alex Apporteur

Tu dois creer un workflow n8n et verifier un workflow existant. Voici les instructions precises.

## Infos de connexion

- Instance n8n : https://n8n2.reaktimo.com
- Projet n8n : zwr2ku2Be5k6HNPX
- Base Airtable : apprtejZaap5ouqGm

---

## TACHE 1 : Creer le workflow "Alex Auth Apporteur"

Ce workflow authentifie un apporteur d'affaires via un token unique.

### Noeuds a creer dans cet ordre :

NOEUD 1 — Webhook
- Type : Webhook
- Methode : POST
- Path : alex-auth-apporteur
- Response Mode : "Respond to Webhook" (pas "Last Node")

NOEUD 2 — Airtable Search
- Type : Airtable (Search Records / Get Many)
- Base : apprtejZaap5ouqGm
- Table : Apporteurs
- Filter by formula : {Token} = "{{ $json.body.token }}"
- Limite : 1

NOEUD 3 — IF (enregistrement trouve ?)
- Condition : verifier que le noeud Airtable a retourne au moins 1 resultat
- Si le tableau de resultats est vide → branche "false"

NOEUD 4a — Respond to Webhook (branche false = token invalide)
- Response Body (JSON) :
{
  "valid": false,
  "reason": "Token invalide"
}

NOEUD 4b — IF (branche true = token trouve, verifier le statut)
- Condition : le champ "Statut" du premier resultat Airtable doit etre egal a "Actif"

NOEUD 5a — Respond to Webhook (branche false = statut inactif)
- Response Body (JSON) :
{
  "valid": false,
  "reason": "Compte inactif ou revoque"
}

NOEUD 5b — Respond to Webhook (branche true = succes)
- Response Body (JSON) :
{
  "valid": true,
  "id_apporteur": "{{ valeur du champ ID_Apporteur }}",
  "nom": "{{ valeur du champ Nom_Apporteur }}",
  "email": "{{ valeur du champ Email_Apporteur }}"
}

### Champs de la table Airtable "Apporteurs" :
- Token (formule, 8 caracteres, ex: "k9m2x4ab")
- ID_Apporteur (formule, ex: "AP-001")
- Nom_Apporteur (texte, ex: "Jean Paul Mssihid")
- Email_Apporteur (email, ex: "jp@exemple.fr")
- Statut (select : "Actif", "Inactif", "Revoque")

### Test : envoyer ce POST pour verifier :
POST https://n8n2.reaktimo.com/webhook/alex-auth-apporteur
Content-Type: application/json
Body: { "token": "d7gpboap" }
Resultat attendu : { "valid": true, "id_apporteur": "...", "nom": "Jean Paul Mssihid", "email": "..." }

---

## TACHE 2 : Verifier et corriger le workflow "Alex Lookup Client"

Ce workflow existe deja. Il permet de chercher un client existant par email. Son webhook path est /webhook/alex-lookup.

### Ce qu'il doit faire :

NOEUD 1 — Webhook POST sur /webhook/alex-lookup
- Recoit : { "email": "sophie@exemple.fr", "prenom": "Sophie" }
- Response Mode : "Respond to Webhook"

NOEUD 2 — Airtable Search
- Base : apprtejZaap5ouqGm
- Table : Contacts (pas Apporteurs)
- Filter by formula : {Email} = "{{ $json.body.email }}"

NOEUD 3 — IF (client trouve ?)

NOEUD 4a — Si non trouve → Respond to Webhook :
{ "found": false }

NOEUD 4b — Si trouve → Respond to Webhook avec les champs du contact :
{
  "found": true,
  "nom": "{{ champ Nom }}",
  "prenom": "{{ champ Prenom }}",
  "telephone": "{{ champ Telephone }}",
  "adresse": "{{ champ Adresse }}",
  "code_postal": "{{ champ Code_Postal }}",
  "ville": "{{ champ Ville }}",
  "date_naissance": "{{ champ Date_Naissance au format YYYY-MM-DD }}",
  "email": "{{ champ Email }}",
  "profil": "{{ champ Profil }}",
  "siret": "{{ champ SIRET ou null }}"
}

### Points a verifier sur le workflow existant :
- Le webhook path est bien /webhook/alex-lookup
- La table Airtable interrogee est bien "Contacts" (pas "Apporteurs")
- La reponse JSON contient TOUS les champs listes ci-dessus
- Le champ date_naissance est renvoye au format YYYY-MM-DD (pas DD/MM/YYYY)
- Si le client n'est pas trouve, la reponse est { "found": false } (pas une erreur)
- Le Response Mode du webhook est "Respond to Webhook" (pas "Last Node")

---

## RESUME

1. CREER "Alex Auth Apporteur" : Webhook → Airtable Search (Apporteurs, par Token) → IF trouve → IF Statut=Actif → Respond { valid, id_apporteur, nom, email }
2. VERIFIER "Alex Lookup Client" : Webhook → Airtable Search (Contacts, par Email) → IF trouve → Respond { found, nom, prenom, telephone, adresse, code_postal, ville, date_naissance, email, profil, siret }

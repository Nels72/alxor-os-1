# Chatbot Apporteur v1 — Fiche Technique

## Vue d'ensemble

Chatbot conversationnel HTML/JS single-file pour les apporteurs d'affaires d'Easy Courtage Assurance. Permet aux apporteurs authentifies de soumettre des demandes de devis pour leurs clients.

- **Fichier source** : `alex/chatbot/chatbot_apporteur_v1.html` (1090 lignes)
- **Fichier admin** : `alex/chatbot/chatbot_apporteur_v1_admin.html` (bypass auth)
- **Deploiement** : `alex/deploy-apporteur/` (Netlify)
- **URL production** : `https://alex-apporteur-eca.netlify.app?token={TOKEN}`
- **Site Netlify** : alex-apporteur-eca (ID: `571eda89-50c0-4c2e-92d1-a786edf63b32`)
- **Avatar** : Lettre "A" CSS (pas de Lottie — leger)
- **Webhook Make (soumission)** : `https://hook.eu1.make.com/7hpv3j9psrpumea9op43vdj77lujyusl`
- **Webhook n8n (auth)** : `https://n8n2.reaktimo.com/webhook/alex-auth-apporteur`
- **Webhook n8n (lookup)** : `https://n8n2.reaktimo.com/webhook/alex-lookup`
- **Scenario Make** : `4 - Alex Apporteur`

---

## Stack technique

| Composant | Technologie |
|---|---|
| Frontend | HTML/CSS/JS vanilla, single-file, police Sora (Google Fonts) |
| Upload fichiers | Uploadcare API directe (cle : `a66f066444c9f0f50bfb`) |
| CDN Uploadcare | `https://3z7o986o1b.ucarecd.net` |
| Autocompletion adresse | API adresse.gouv.fr |
| Authentification | n8n webhook `/alex-auth-apporteur` (token URL) |
| Lookup client | n8n webhook `/alex-lookup` (email) |
| Soumission | Make.com webhook (POST JSON) |
| Icones | Tabler Icons (webfont CDN) |

---

## PWA (Progressive Web App)

L'application est installable sur tous les appareils (telephone, tablette, ordinateur) grace aux fichiers PWA :

| Fichier | Role |
|---|---|
| `manifest.json` | Nom, icones, theme, mode standalone |
| `sw.js` | Service worker minimal (requis pour l'installation) |
| `icons/icon-192.png` | Icone 192x192 ("A" blanc sur fond bleu #1B3A6B) |
| `icons/icon-512.png` | Icone 512x512 |

### Installation

- **iPhone/iPad** : Safari → Partager → Sur l'ecran d'accueil
- **Android** : Chrome → bandeau "Installer" en bas, ou menu ⋮ → Installer l'application
- **PC/Mac** : Chrome/Edge → icone d'installation dans la barre d'adresse, ou menu ⋮ → Installer Alex...

---

## Authentification

L'apporteur accede via une **URL personnalisee avec token** :

```
https://alex-apporteur-eca.netlify.app?token=ABC123XYZ
```

### Flux d'authentification

1. Le chatbot lit le parametre `token` de l'URL
2. POST vers `/alex-auth-apporteur` avec `{ token: "ABC123XYZ" }`
3. n8n verifie dans la table Airtable **Apporteurs** (par champ Token)
4. Reponse : `{ valid: true/false, id_apporteur, nom, email, reason }`

### Cas d'erreur

| Situation | Comportement |
|---|---|
| Pas de token dans l'URL | Affiche "Lien invalide" |
| Token invalide / introuvable | Affiche "Acces refuse" |
| Compte apporteur inactif | Affiche "Acces refuse — Compte inactif" |
| Token valide | Demarre le parcours, affiche "Bonjour {nom}" |

### Persistance

Le token est stocke en `localStorage` (`alex_apporteur_token`) pour eviter de re-saisir l'URL a chaque visite.

### Mode Admin

`?admin=1` bypass completement l'authentification (pour les tests internes).

---

## Flux conversationnel (28 etapes)

```
BLOC A : CLIENT EXISTANT ?
 0  Accueil ("Bonjour {nom_apporteur}")
 1  Deja client ? (Oui/Non)
 2  Email client (si oui)
 3  Lookup n8n
    |-- Trouve --> confirmation --> skip coordonnees (isExistingClient=true)
    +-- Non trouve --> Reessayer / Continuer comme nouveau

 4  Prenom (nouveau client uniquement)

BLOC B : PROFIL & PRODUIT
 5  Profil (Particulier / Professionnel / Entreprise)
 6  Produit (filtre par profil)
    |-- Auto/Moto/Cycle --> BLOC C
    |-- Flotte Auto --> BLOC D (etape 10)
    |-- RC Decennale --> etape 22 puis BLOC E
    +-- Autres --> BLOC E (etape 12)

BLOC C : VEHICULE (Auto/Moto/Cycle uniquement)
 7  Date permis (masque jj/mm/aaaa)
 8  Vehicule (marque + modele, texte libre)
 9  Immatriculation (masque AA-000-BB)

BLOC D : HISTORIQUE ASSURANCE
10  Assure 36 mois ? (Oui/Non)
    |-- Oui --> 11 Upload RI (optionnel, badge rouge "fortement deconseille")
    +-- Non --> bonus_malus="Sans bonus ni malus", skip vers 12

11  Upload RI (Uploadcare, PDF/JPG/PNG)

BLOC E : SITUATION
12  Description besoin (textarea, question adaptee par produit)

BLOC F : COORDONNEES (skip si client existant)
13  Intro coordonnees
14  Confirmation prenom --> 15 correction si besoin
16  Nom de famille
17  Email
18  Telephone (+33, masque FR)
19  Adresse (autocompletion gouv.fr)
20  Date de naissance
21  SIRET (conditionnel Pro/Entreprise uniquement)

BLOC G : RC DECENNALE (branche specifique)
22  Deja assure en RCD ? (Oui/Non)

BLOC H : FINALISATION
23  Preference de contact (Telephone/Email)
24  Mode documents (Joindre maintenant / Envoyer par email apres)
25  Multi-upload fichiers (si "Joindre maintenant")
26  Recapitulatif (Confirmer / Recommencer)
27  Envoi + Thank you page
```

---

## Produits par profil

| Particulier | Professionnel | Entreprise |
|---|---|---|
| Auto | Auto | Auto |
| Habitation | Local Professionnel | RC Decennale |
| Moto | RC Professionnelle | Flotte Auto |
| Mutuelle Sante | Flotte Auto | Sante & Prevoyance Collective |
| Cycle | Mutuelle Sante | Cyber Risque |
| | Sante & Prevoyance Coll. | RC Entreprise |

---

## Payload webhook Make.com

```json
{
  "id_apporteur": "recXXXXXX",
  "profil": "Particulier",
  "produit": "Auto",
  "date_permis": "15/06/2010",
  "vehicule": "Peugeot 308",
  "immatriculation": "AB-123-CD",
  "assure_36mois": "Oui",
  "bonus_malus": null,
  "rcd_deja_assure": null,
  "fichier_ri": "releve.pdf",
  "fichier_ri_url": "https://3z7o986o1b.ucarecd.net/{uuid}/releve.pdf",
  "situation": "Premiere assurance, tarif competitif recherche",
  "prenom": "Marie-Claire",
  "nom": "Dupont",
  "email": "marie.dupont@email.fr",
  "telephone": "+330612345678",
  "adresse": "12 Rue de la Paix, 75002 Paris",
  "code_postal": "75002",
  "ville": "Paris",
  "date_naissance": "20/03/1990",
  "siret": null,
  "contact_pref": "Telephone",
  "doc_mode": "Joindre maintenant (recommande)",
  "fichier_supp": "carte_grise.pdf,permis.jpg",
  "fichier_supp_url": ["https://3z7o986o1b.ucarecd.net/{uuid}/carte_grise.pdf"],
  "_deja_client": "Non",
  "_lookup_email": null,
  "nom_apporteur": "Jean Dupont",
  "email_apporteur": "jean@apporteur.fr",
  "token": "ABC123XYZ",
  "source": "Alex Apporteur",
  "submitted_at": "2026-05-30T14:30:00.000Z"
}
```

---

## Validations

| Champ | Validation |
|---|---|
| Email | Regex standard |
| Telephone | Format FR, conversion 06 --> +33 6, validation `+330[1-9]\d{8}` |
| Immatriculation | Masque AA-000-BB, feedback visuel vert/rouge |
| Date permis | Format jj/mm/aaaa, masque numerique auto |
| Date naissance | Format jj/mm/aaaa, masque numerique auto |
| Prenom / Nom | Auto-capitalisation (premiere lettre + apres tiret) |
| Textarea | Minimum 5 caracteres |

---

## Workflows n8n impliques

| Workflow | ID | Webhook | Role |
|---|---|---|---|
| Auth Apporteur | `cQMFVPZDiWsYZEyJ` | POST `/alex-auth-apporteur` | Verifie token apporteur |
| Lookup Client | `fp7G2yFpUTAjMFJz` | POST `/alex-lookup` | Recherche client par email |
| Distribution Lead | `5NKiix7J0TogufIz` | POST `/distribution-lead` | Assigne collaborateur |
| Extraction RI | `823xFRdz4SJSfv0R` | POST `/extraction-ri` | Extrait RI + email courtier |
| Renommage GED | `BzKQPCi78YVPer8F` | POST `/renommage-document` | Classifie/renomme documents (Gemini 2.5 Flash multimodal) |

---

## Flux end-to-end (Chatbot --> Make --> n8n)

```
1. Apporteur remplit le chatbot (token auth)
2. Soumission --> POST webhook Make.com
3. Make Scenario 4 "Alex Apporteur" :
   a. Cree Contact dans Airtable
   b. Cree Dossier dans Airtable (avec apporteur_collab_id)
   c. Upload documents vers Dropbox (GED_Alxor/{Cabinet}/{Contact}/{Dossier}/)
   d. Cree enregistrement(s) Document dans Airtable
   e. POST /distribution-lead --> n8n assigne un collaborateur
   f. POST /extraction-ri (collab_email, collab_nom) --> n8n extrait RI + email courtier
   g. POST /renommage-document (par document) --> n8n classifie et renomme les fichiers via Gemini
```

### Contrainte Make.com : attachments Airtable optionnels

Lorsque le champ `RI_Contact` est vide (produit sans RI), le module Airtable "Creer Dossier" echoue avec `[422] Invalid attachment object` si on envoie un objet vide.

**Solution** : utiliser la formule `{{ifempty(XX.fichier_ri_url; emptyarray)}}` dans le champ RI_Contact du module Airtable. Appliquee sur les scenarios 4 (Alex Apporteur) et 6 (Alex Legacy).

---

## Deploiement Netlify

### Structure du dossier `deploy-apporteur/`

```
deploy-apporteur/
  index.html          # Copie de chatbot_apporteur_v1.html
  manifest.json       # PWA manifest (nom, icones, theme, standalone)
  sw.js               # Service worker minimal (requis pour install PWA)
  _redirects          # SPA redirect: /*  /index.html  200
  _headers            # Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
  icons/
    icon-192.png      # Icone PWA 192x192
    icon-512.png      # Icone PWA 512x512
```

### Commande de deploiement

```bash
cd alex/deploy-apporteur
netlify deploy --prod --dir=. --message="description du deploy"
```

### Mise a jour du chatbot

1. Modifier `alex/chatbot/chatbot_apporteur_v1.html`
2. Copier vers `alex/deploy-apporteur/index.html`
3. Deployer avec `netlify deploy --prod --dir=.`

---

## Onboarding apporteur

### Ajout d'un nouvel apporteur

1. Creer un enregistrement dans la table Airtable **Apporteurs** avec un Token unique
2. Mettre le statut a "Actif"
3. Creer l'email d'onboarding a partir du template `alex/chatbot/email_preview.html`
4. Personnaliser : nom de l'apporteur et token dans l'URL du CTA
5. Envoyer l'email depuis `tr@easycourtage.fr`

### Template email d'onboarding

Les emails d'onboarding se trouvent dans `alex/chatbot/` :

| Fichier | Destinataire | Token |
|---|---|---|
| `email_preview.html` | Template / preview | — |
| `email_mmartins.html` | Michael Martins | `wznzinxt` |
| `email_jpmsihid.html` | Jean Paul Mssihid | `d7gpboap` |

### Contenu de l'email

- **CTA principal** : bouton "Acceder a Alex →" avec lien `https://alex-apporteur-eca.netlify.app?token={TOKEN}`
- **Qualite des informations** (bloc bleu) : recommandation PDF, infos completes et exactes
- **Installation PWA** (bloc vert) : instructions detaillees pour iPhone/iPad, Android (telephone & tablette), PC/Mac
- **Version beta** (bloc violet) : BDD clients pas encore entierement rapatriee sur Alxor OS
- **Lien personnel** (bloc jaune) : avertissement de ne pas partager le lien
- **Vos retours comptent** (bloc gris) : feedback vers n.duarte@alxor-os.fr

### Apporteurs actifs

| Apporteur | Token | URL |
|---|---|---|
| Michael Martins | `wznzinxt` | `https://alex-apporteur-eca.netlify.app?token=wznzinxt` |
| Jean Paul Mssihid | `d7gpboap` | `https://alex-apporteur-eca.netlify.app?token=d7gpboap` |

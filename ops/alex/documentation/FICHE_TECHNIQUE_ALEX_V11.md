# Alex Chatbot v11 — Fiche Technique

## Vue d'ensemble

Alex est un chatbot conversationnel HTML/JS single-file qui remplace le formulaire Tally pour la collecte de demandes de devis d'assurance sur le site Easy Courtage Assurance.

- **Fichier source** : `alex/chatbot/chatbot_eca_v11_final.html`
- **Animation** : `alex/chatbot/alex-lottie.json` (Lottie, ~540 Ko)
- **Webhook Make (soumission)** : `https://hook.eu1.make.com/ljj5zijhjxavez2kjo7ouhrbcf0liny7`
- **Webhook n8n (lookup client)** : `https://n8n2.reaktimo.com/webhook/alex-lookup`
- **Scénario Make** : `6 - 2- [Alex] Chatbot Web Public` (inchangé)
- **Workflow n8n** : `Alex - Lookup Client`

---

## Stack technique

| Composant | Technologie |
|---|---|
| Frontend | HTML/CSS/JS vanilla, single-file |
| Animation avatar | Lottie (lottie-web 5.12 CDN) |
| Upload fichiers | Uploadcare SDK (clé : `a66f066444c9f0f50bfb`) |
| Autocomplétion adresse | API adresse.gouv.fr |
| Webhook soumission | Make.com (POST JSON) |
| Webhook lookup client | n8n (POST JSON, réponse synchrone) |

---

## Flux conversationnel (28 étapes)

```
0  Accueil ("C'est parti ?")
1  Prénom (brise-glace, capitalize auto)
   → Politesse : "Ravie de vous rencontrer [Prénom] 😊"
2  Déjà client ? (Oui/Non)
   ├─ Oui → 3 Email client → 4 Lookup Make
   │        ├─ Trouvé → 6 (skip coordonnées, isExistingClient=true)
   │        └─ Non trouvé → Réessayer/Continuer nouveau
   └─ Non → 5 Profil (Particulier/Pro/Entreprise)
5  Profil
6  Produit (options adaptées au profil)
   ├─ Auto/Moto/Cycle → 7 Permis → 8 Véhicule → 9 Immat → 10
   ├─ Flotte Auto → 10
   ├─ RC Décennale → 24 → 12
   └─ Autres → 12
10 Assuré 36 mois ? (Oui → 11 RI → 12 | Non → skip contrat → 12)
12 Documents spécifiques (multi-upload)
13 Contrat précédent (niveau adaptatif par produit)
14 Situation (textarea, question adaptée par produit)
   ├─ Client existant → 22 (DDN)
   └─ Nouveau → 15-21 (coordonnées complètes)
15 Intro coordonnées (avec prénom)
16 Confirmation prénom → 17 correction si besoin
18 Nom (capitalize)
19 Email (lowercase)
20 Téléphone (+33)
21 Adresse (autocomplétion)
22 Date de naissance
23 SIRET (si Pro/Entreprise)
25 Préférence contact
26 Récapitulatif (confirmer/recommencer)
27 Envoi + Thank you page dynamique (prénom + email)
```

---

## Fonctionnalités clés v11

### 1. Client existant (lookup)
- Étape 4 : POST `{ lookup: true, email, prenom }` vers le webhook Make
- Réponse attendue : `{ found: true/false, nom, telephone, adresse, ... }`
- Si trouvé : pré-remplissage D + skip coordonnées (étapes 15-21)
- Si non trouvé : options "Réessayer" ou "Continuer comme nouveau client"

### 2. Auto-capitalisation
- `capitalizeName()` : première lettre de chaque mot + après tiret
- Appliqué sur : prénom (étapes 1, 17), nom (étape 18)
- Email : `.toLowerCase().trim()` (étape 19)

### 3. Contrat précédent — niveaux par produit
| Niveau | Produits | Comportement |
|---|---|---|
| `red` | RI (Relevé Info) | "fortement déconseillé" de passer |
| `orange` | Auto, Moto, Cycle, Flotte, RCD, RC Pro, RC Ent, Santé Coll | "recommandé" |
| `neutral` | Habitation, Local Pro, Mutuelle, Cyber | "Passer cette étape" |

### 4. Validations
- **Date** : format jj/mm/aaaa, cohérence naissance/permis (17 ans min)
- **Téléphone** : masque +33, conversion 06→+33 6
- **Immatriculation** : masque AA-000-BB
- **Texte libre** : anti-charabia, filtre injures, longueur min 5 car
- **Email** : validation regex standard
- **Modération** : détection charabia (consonnes ×6), mots inappropriés

### 5. Upload
- **Simple** : RI, contrat précédent (Uploadcare)
- **Multi-upload** : documents spécifiques (ajout itératif + confirmation)
- CDN Uploadcare → URLs transmises dans le payload

---

## Payload webhook (soumission finale)

```json
{
  "profil": "Particulier",
  "produit": "Auto",
  "date_permis": "15/06/2010",
  "vehicule": "Peugeot 308",
  "immatriculation": "AB-123-CD",
  "assure_36mois": "Oui",
  "bonus_malus": null,
  "rcd_deja_assure": null,
  "fichier_ri": "releve.pdf",
  "fichier_ri_url": "https://ucarecdn.com/...",
  "docs_utiles": "carte_grise.pdf,sinistres.pdf",
  "docs_utiles_url": "https://ucarecdn.com/...,https://ucarecdn.com/...",
  "contrat_precedent": "contrat.pdf",
  "contrat_precedent_url": "https://ucarecdn.com/...",
  "situation": "Première assurance, tarif compétitif recherché",
  "prenom": "Marie-Claire",
  "nom": "Dupont",
  "email": "marie.dupont@email.fr",
  "telephone": "+33 6 12 34 56 78",
  "adresse": "12 Rue de la Paix, 75002 Paris",
  "code_postal": "75002",
  "ville": "Paris",
  "date_naissance": "20/03/1990",
  "siret": null,
  "contact_pref": "Téléphone",
  "_deja_client": "Non",
  "_lookup_email": null,
  "source": "alex_chatbot",
  "submitted_at": "2026-05-16T14:30:00.000Z"
}
```

---

## Fichiers du projet

| Fichier | Rôle |
|---|---|
| `chatbot_eca_v11_final.html` | Version courante (production) |
| `chatbot_eca_v10_final.html` | Backup v10 stable |
| `alex-lottie.json` | Animation Lottie avatar Alex |
| `n8n_alex_lookup_workflow.json` | Blueprint n8n workflow lookup client |
| `2- [V1] Alex Chatbot Web Public 052026.blueprint.json` | Blueprint Make scénario principal |

---

## Dépendances CDN

```
lottie-web 5.12.2       — Animation avatar
Uploadcare 3.x          — Upload fichiers
Tabler Icons (webfont)   — Icônes UI
```

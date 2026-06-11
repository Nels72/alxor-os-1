# Brainstorm & Planification — Courriers types automatisés via Alex

> **Date** : 10/06/2026
> **Contexte** : Le cabinet utilise aujourd'hui la bibliothèque de courriers types d'AssurOffice (variables `##nom_client##`, `##adresse_client##`, etc.), avec envoi manuel. Objectif : porter cette bibliothèque dans l'écosystème Alxor OS (Airtable + n8n + Dropbox + Alex) pour permettre **l'envoi automatisé** (déclencheurs) et **l'envoi à la demande** (client via Alex web/vocal, gestionnaire via Cabinet, apporteur via Chatbot Apporteur).
> **Contrainte clé** : pas d'EDI à ce jour → les statuts quittance/impayé ne remontent pas automatiquement des compagnies. Toute automatisation "encaissement" repose sur une saisie ou un parsing manuel/semi-manuel en amont.

---

## 1. Inventaire des courriers types par famille

Légende **Mode** : 🤖 Auto (déclencheur sans intervention) · 🤝 Semi-auto (généré auto, validé par un humain avant envoi) · 👤 À la demande (client/gestionnaire/apporteur déclenche).

### Famille A — Production / Entrée en relation

| Code | Courrier | Déclencheur | Mode | Canal |
|---|---|---|---|---|
| `PROD_AR_DEVIS` | Accusé de réception demande de devis | Création lead (chatbot/web/tel) | 🤖 | Email |
| `PROD_DEVIS` | Envoi devis + FIC (devoir de conseil) | Devis prêt dans Airtable | 🤝 | Email + Yousign |
| `PROD_RELANCE_DEVIS` | Relance devis sans réponse (J+5, J+12) | Statut "Devis envoyé" inchangé | 🤖 | Email/SMS |
| `PROD_BIENVENUE` | Lettre de bienvenue nouveau client | Statut → "Contrat signé" | 🤖 | Email |
| `PROD_CP` | Envoi conditions particulières + CG | Réception CP compagnie | 🤝 | Email |
| `PROD_MANDAT_RESIL` | Mandat de résiliation ancien assureur (Hamon/Chatel) | Souscription avec contrat existant | 🤝 | Email + Yousign |
| `PROD_RESIL_COMPAGNIE` | Lettre de résiliation à l'ancien assureur | Mandat signé | 🤝 | LRAR / Email |

### Famille B — Pièces manquantes (déjà partiellement couvert par le workflow n8n "Relance Docs")

| Code | Courrier | Déclencheur | Mode | Canal |
|---|---|---|---|---|
| `PIECES_LISTE` | Liste des pièces à fournir (par produit : auto, moto, MRH, santé, pro) | Ouverture dossier | 🤖 | Email + chatbot |
| `PIECES_RELANCE_1` | 1ʳᵉ relance pièces manquantes | J+3 sans réception | 🤖 | Email/SMS |
| `PIECES_RELANCE_2` | 2ᵉ relance pièces manquantes | J+10 | 🤖 | Email/SMS |
| `PIECES_MISE_EN_GARDE` | Mise en garde : dossier incomplet, risque de nullité/non-garantie | J+21 | 🤝 | Email (copie GED) |
| `PIECES_AR` | Accusé de réception pièce conforme/non conforme | Upload chatbot + contrôle | 🤖 | Email/chatbot |

### Famille C — Cotisations / Encaissement (⚠️ dépend de la saisie manuelle sans EDI)

| Code | Courrier | Déclencheur | Mode | Canal |
|---|---|---|---|---|
| `COTIS_APPEL` | Appel de cotisation / avis d'échéance | Échéance J-30 (cron) | 🤝 | Email |
| `COTIS_ECHEANCIER` | Échéancier de paiement (= `DOC_ECHEANCIER` Alex Vocal, vérif. renforcée) | Demande client | 👤 | Email/chatbot |
| `COTIS_QUITTANCE` | Quittance / reçu de paiement | Encaissement saisi | 🤖 | Email |
| `IMPAYE_RELANCE_1` | Relance amiable impayé (prélèvement rejeté) | Statut quittance → "Impayé" (J+5) | 🤝 | Email/SMS |
| `IMPAYE_RELANCE_2` | 2ᵉ relance impayé + coordonnées de virement (= `IMPAYE_VIREMENT_PRO`) | J+15 | 🤝 | Email |
| `IMPAYE_MED` | **Mise en demeure art. L113-3** (suspension garantie à 30 j, résiliation possible à +10 j) | J+25, décision gestionnaire | 🤝 **obligatoire** | **LRAR uniquement** (AR24/Maileva) |
| `IMPAYE_SUSPENSION` | Notification de suspension de garantie | J+30 post-MED | 🤝 | LRAR + Email |
| `IMPAYE_REGUL` | Confirmation de régularisation / remise en vigueur | Paiement reçu | 🤖 | Email |

> ⚠️ **Règle métier Alex (R14)** : Alex ne dit JAMAIS "vous êtes/n'êtes plus couvert" en cas d'impayé. Les courriers impayés sont générés par Alex mais le **statut de garantie reste du ressort du gestionnaire**. Sinistre + impayé simultanés = transfert immédiat, aucun courrier auto.

### Famille D — Vie du contrat / Attestations (cœur du self-service Alex)

| Code | Courrier | Déclencheur | Mode | Canal |
|---|---|---|---|---|
| `DOC_MVA` | Attestation auto / Mémo Véhicule Assuré | Demande client (vérif. standard) | 👤🤖 | Email/chatbot |
| `DOC_HABITATION` | Attestation habitation (+ version "pour bailleur") | Demande client | 👤🤖 | Email/chatbot |
| `DOC_EMPRUNTEUR` | Attestation emprunteur | Demande client | 👤🤖 | Email/chatbot |
| `DOC_SCOLAIRE` | Attestation responsabilité civile / scolaire | Demande client (pic septembre) | 👤🤖 | Email/chatbot |
| `DOC_CONTRAT` | Renvoi contrat / CP (vérif. renforcée) | Demande client | 👤 | Email |
| `DOC_RI` | Relevé d'information (obligation : délivrance sous 15 jours) | Demande client, motif collecté | 🤝 | Email |
| `VIE_AVENANT` | Confirmation de modification + avenant | Modif. traitée par gestionnaire | 🤝 | Email |
| `VIE_AVIS_ECHEANCE_CHATEL` | Avis d'échéance avec mention loi Chatel (date limite de dénonciation) | Échéance J-75 (envoi entre J-90 et J-15) | 🤝 | Email |
| `VIE_INDEXATION` | Information de revalorisation/indexation de cotisation | Avis compagnie reçu | 🤝 | Email |

### Famille E — Résiliation

| Code | Courrier | Déclencheur | Mode | Canal |
|---|---|---|---|---|
| `RESIL_AR` | AR de demande de résiliation + rappel conséquences | Intention `CONTRAT_RESILIATION` | 🤝 | Email |
| `RESIL_CONFIRMATION` | Confirmation de résiliation effective + date d'effet | Résiliation actée compagnie | 🤝 | Email |
| `RESIL_RETENTION` | Courrier de rétention / proposition alternative | Avant confirmation, selon motif | 👤 | Email/tel |
| `RESIL_RI_SORTIE` | Envoi RI de sortie | Résiliation effective | 🤖 | Email |

### Famille F — Sinistres

| Code | Courrier | Déclencheur | Mode | Canal |
|---|---|---|---|---|
| `SIN_AR` | AR de déclaration de sinistre + n° de dossier | Intention `SIN_DECLARATION` | 🤖 | Email |
| `SIN_PIECES` | Demande de pièces sinistre (constat, photos, factures, PV) | Ouverture dossier sinistre | 🤖 | Email/chatbot |
| `SIN_RELANCE_PIECES` | Relance pièces sinistre | J+7, J+15 | 🤖 | Email/SMS |
| `SIN_POINT` | Point d'avancement sinistre (= `SIN_SUIVI`) | Demande client ou jalon | 👤🤖 | Email/chatbot |
| `SIN_CLOTURE` | Notification de clôture / règlement | Clôture saisie | 🤝 | Email |

### Famille G — Réglementaire & Relationnel

| Code | Courrier | Déclencheur | Mode | Canal |
|---|---|---|---|---|
| `REG_RGPD` | Réponse à demande d'accès/suppression données (30 j max) | Demande client | 🤝 | Email |
| `REG_CONSEIL` | Renouvellement devoir de conseil / actualisation situation | Annuel ou événement de vie | 🤝 | Email |
| `REL_SATISFACTION` | Enquête satisfaction / NPS | J+30 post-souscription, post-sinistre | 🤖 | Email |
| `REL_ANNIVERSAIRE` | Anniversaire contrat + bilan garanties (cross-sell) | Date anniversaire | 🤖 | Email |
| `REL_VOEUX` | Vœux / communication cabinet | Cron annuel | 🤖 | Email |

---

## 2. Cas d'usage par canal de déclenchement

### 2.1 Automatique (cron / événement Airtable)
- **Cron quotidien n8n** : scan des échéances (J-90 Chatel, J-30 appel de cotisation, anniversaires), des dossiers incomplets (relances pièces J+3/J+10/J+21), des devis sans réponse (J+5/J+12), des sinistres en attente de pièces.
- **Événement Airtable** (webhook/trigger sur changement de statut) : lead créé → AR ; contrat signé → bienvenue ; quittance passée "Impayé" → chaîne impayé ; pièce reçue → AR pièce.

### 2.2 À la demande — client via Alex (web + vocal)
Reprend la classification existante d'Alex Vocal :
- **Vérification standard** → attestations (MVA, habitation, emprunteur, scolaire) : génération + envoi immédiats.
- **Vérification renforcée** → échéancier, contrat/CP, données financières.
- **Semi-auto** → RI (collecte du motif, alerte rétention), suivi sinistre.
- **Jamais en self-service** : mise en demeure, suspension, tout courrier engageant la garantie.

### 2.3 À la demande — gestionnaire via Cabinet
- Écran "Générer un courrier" sur la fiche client : choix du modèle, prévisualisation avec variables fusionnées, édition libre du corps, envoi (email) ou export PDF (LRAR papier/AR24).
- File de validation des courriers 🤝 générés automatiquement (mode brouillon → "Valider et envoyer").

### 2.4 À la demande — apporteur via Chatbot Apporteur
- Sous-ensemble restreint : liste de pièces par produit, AR devis, relance pièces de SES dossiers uniquement. Pas d'accès aux courriers cotisation/impayé.

---

## 3. Moteur de fusion : variables et modèles

### 3.1 Dictionnaire de variables canonique
Conserver la syntaxe AssurOffice `##variable##` pour faciliter la migration de la bibliothèque existante, avec un mapping vers Airtable :

| Variable | Source Airtable |
|---|---|
| `##civilite##`, `##nom_client##`, `##prenom_client##` | Clients.Civilité / Nom / Prénom |
| `##adresse_client##`, `##cp_client##`, `##ville_client##` | Clients.Adresse… |
| `##email_client##`, `##tel_client##` | Clients.Email / Téléphone |
| `##num_contrat##`, `##produit##`, `##compagnie##` | Contrats.Numéro / Produit / Compagnie |
| `##date_effet##`, `##date_echeance##` | Contrats.Dates |
| `##cotisation_ttc##`, `##fractionnement##` | Contrats.Cotisation / Périodicité |
| `##immatriculation##`, `##vehicule##` | Contrats.Immat / Véhicule |
| `##montant_impaye##`, `##date_rejet##` | Quittances.Montant / Date rejet |
| `##liste_pieces_manquantes##` | Rollup Pièces (statut ≠ reçu conforme) |
| `##date_jour##`, `##gestionnaire##`, `##signature_cabinet##` | Système / Utilisateur |

Règles : variable manquante = **blocage de l'envoi** (jamais d'envoi avec un `##…##` non résolu) ; formatage centralisé (dates `dd/mm/yyyy`, montants `1 234,56 €`).

### 3.2 Stockage des modèles
- **Table Airtable `Modeles_Courriers`** : Code, Famille, Libellé, Objet email, Corps HTML, Variables requises, Mode (auto/semi/demande), Canal autorisé, Vérification requise (standard/renforcée), Actif (oui/non), Version.
- Corps en **HTML** (un seul format source) → email direct + conversion **PDF** (Gotenberg auto-hébergé ou API type CloudConvert) pour pièce jointe/GED/LRAR.
- Migration : export de la bibliothèque AssurOffice → nettoyage → import Airtable (les variables `##…##` passent telles quelles).

### 3.3 Traçabilité
- **Table `Courriers_Envoyes`** : modèle, client, contrat, canal, date, déclencheur (auto/qui), statut (brouillon/validé/envoyé/échec), lien PDF GED.
- Archivage systématique du PDF dans la **GED Dropbox** (réutiliser la convention de renommage du workflow Renommage GED).
- Indispensable pour la conformité (preuve d'envoi, DDA, réclamations).

---

## 4. Architecture cible (n8n)

```
Déclencheurs                      Moteur                        Sortie
─────────────                ──────────────────            ─────────────
Cron quotidien      ─┐                                   ┌─ Email (SMTP)
Webhook Airtable    ─┤       WF "Moteur Courriers"       ├─ Lien chatbot Alex
Alex web/vocal      ─┼──►    1. Charger modèle           ├─ PDF → GED Dropbox
Cabinet (bouton)    ─┤       2. Charger données client   ├─ Log Courriers_Envoyes
Chatbot Apporteur   ─┘       3. Fusion ##variables##     └─ (Phase 4) LRAR AR24
                             4. Contrôle complétude
                             5. HTML→PDF si besoin
                             6. Routage selon Mode :
                                auto → envoi
                                semi → brouillon à valider
```

- **Un seul workflow "Moteur Courriers"** appelé en sous-workflow par tous les déclencheurs (mutualisation fusion/PDF/log/GED).
- Les workflows existants (Relance Docs, Lookup Client, Distribution Lead) deviennent des **déclencheurs** qui appellent le moteur au lieu de gérer leurs propres emails.

---

## 5. Contraintes & garde-fous (sans EDI)

1. **Statuts quittance manuels** : la chaîne impayé démarre sur une saisie gestionnaire (ou un parsing semi-auto des emails compagnies en Phase 3). Tant que la donnée n'est pas fiable → tout courrier impayé reste 🤝 semi-auto.
2. **Mise en demeure = LRAR obligatoire** (L113-3). Jamais par email simple, jamais déclenchée par Alex sans validation. Intégration AR24/Maileva en Phase 4 ; en attendant : génération PDF + envoi postal manuel.
3. **Attestations** : Alex ne génère que ce que le cabinet est habilité à émettre ; si l'attestation vient de la compagnie, Alex renvoie le document GED existant, il ne le fabrique pas.
4. **Vérification d'identité** avant tout envoi self-service (niveaux standard/renforcé déjà définis pour Alex Vocal — à répliquer sur le web).
5. **Kill-switch par modèle** (champ Actif) + plafond d'envois/jour pour éviter un emballement de cron.

---

## 6. Phasage proposé

| Phase | Contenu | Dépendances |
|---|---|---|
| **0 — Fondations** | Export bibliothèque AssurOffice, création tables `Modeles_Courriers` + `Courriers_Envoyes`, dictionnaire de variables, choix moteur PDF | Accès export AssurOffice |
| **1 — Moteur + à la demande gestionnaire** | WF n8n "Moteur Courriers", bouton "Générer un courrier" dans Cabinet, prévisualisation + envoi email, archivage GED | Phase 0 |
| **2 — Automatisations sûres** | Relances pièces (refonte Relance Docs sur le moteur), AR devis/sinistre, bienvenue, relance devis, satisfaction, anniversaire | Phase 1 |
| **3 — Self-service Alex** | Attestations + échéancier via Alex web/vocal avec vérification d'identité, RI semi-auto ; chaîne impayé en mode brouillon-à-valider | Phase 1 + vérif. identité web |
| **4 — Encaissement & LRAR** | Intégration AR24/Maileva (MED, suspension), parsing avis compagnies, Chatel J-90 automatisé | Phase 2-3 + fiabilisation données quittances |

**Quick win recommandé** : Phase 1 + relances pièces (Phase 2) — le workflow Relance Docs existe déjà, il suffit de le brancher sur le moteur et la bibliothèque migrée.

---

## 7. Décisions à prendre

1. **Export AssurOffice** : sous quel format peut-on extraire la bibliothèque actuelle (DOC/RTF/HTML) ? Combien de modèles ?
2. **Moteur PDF** : Gotenberg auto-hébergé (gratuit, à héberger) vs API SaaS (CloudConvert/PDFMonkey, coût/courrier) ?
3. **Expéditeur email** : domaine dédié (ex. `courriers@alxor-os.fr`) + SPF/DKIM, ou SMTP actuel du cabinet ?
4. **Validation** : qui valide les courriers 🤝 (file unique ou par gestionnaire de portefeuille) ?
5. **SMS** : canal de relance souhaité dès la Phase 2 ? (Twilio/OVH SMS)
6. **Périmètre apporteur** : confirmer la liste restreinte de modèles accessibles côté Chatbot Apporteur.

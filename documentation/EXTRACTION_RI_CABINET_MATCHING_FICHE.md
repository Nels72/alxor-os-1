# Extraction RI Cabinet · Matching IA · Fiche Tarification (Auto/Moto)

> Documentation technique — parcours Cabinet (face à face courtier).
> Dernière mise à jour : 2026-06-02.

## 1. Vue d'ensemble du parcours

```
Création prospect (ProspectForm — 2 étapes : Identité → Produit)
        │  (plus aucune collecte de pièces ici)
        ▼
Écran détail (ProspectDetail)
  ├─ Onglet INFOS : identité + données tarifantes + CTA « Passer aux documents »
  ├─ Onglet DOCUMENTS :
  │     ├─ Upload des pièces Phase 1 (réel → Airtable/Dropbox)
  │     ├─ Upload « Relevé d'Information » → EXTRACTION RI AUTO (Gemini)
  │     └─ Bouton « Calculer le Matching » (inline, bas de page)
  └─ Bannière haute : si GES ≥ 60 → CTA « Passer au matching »
        ▼
Matching local (matchingEngine) → ai_suggestions
        ▼
Fiche Tarification (FicheTarification) → recopie extranet compagnie
```

## 2. Extraction RI Cabinet (n8n)

**Workflow** : `Extraction RI Cabinet` — ID `IUQoM7IchXDpoaAP` — webhook `POST /webhook/extraction-ri-cabinet`.

**Entrée (front → n8n)** : `{ dossier_id, file_base64, file_type }` (le PDF du RI est envoyé en base64 ; pas de dépôt dans `RI_Contact`, contrairement au flux chatbot).

**Chaîne** : `Webhook → Prepare Gemini RI → Gemini Extraction RI → Parse RI Response → PATCH Dossier RI → Respond RI Data`.

**Aligné sur le pipeline éprouvé du chatbot** (`2- Extraction RI`, ID `823xFRdz4SJSfv0R`) :
- Prompt **AGIRA/FFA** riche (rubriques A→F, conducteurs multiples, dates JJ/MM→YYYY-MM-DD), via `system_instruction`.
- `generationConfig: { response_mime_type: "application/json" }` **sans `maxOutputTokens`** (sinon `gemini-2.5-flash`, modèle à *thinking*, tronque le JSON → erreur `finishReason: MAX_TOKENS`).
- `Parse RI Response` produit : `rawJson` (→ champ Airtable `RI_JSON`), des champs plats compatibles avec l'interface front `RIExtrait`, et un objet `airtableFields`.
- `PATCH Dossier RI` écrit `airtableFields` dans la table Dossiers ; **header `Authorization: Bearer <PAT>` en dur** (NE PAS utiliser le credential `vsMFMN5O6M4G7eMB` qui envoie un mauvais nom de header) ; `onError: continueRegularOutput` pour que le webhook réponde même si l'écriture échoue.

**Champs renvoyés au front** (extrait) : `bonus_malus`, `compagnie_precedente`, `nb_sinistres_36m`, `resilie`, `motif_resiliation`, `date_releve`, `date_effet_contrat`, `vehicule_marque`, `vehicule_modele`, `vehicule_categorie` (énergie), `immatriculation`, `usage_vehicule`, `date_permis`, `annees_bonus_050`, `nb_mois` (ancienneté assurance depuis la date d'effet), `sinistres[]` (`{date, nature, type, conducteur_nom}`), `airtableFields` (dont `RI_JSON`), `dossierId`.

**Champs Airtable écrits** (table Dossiers `tblh45gV9PZcN1fkz`) : `RI_JSON`, `RI_Traité`, `RI_Date_Traitement`, `RI_Compagnie_Précédente`, `RI_Bonus_Malus`, `RI_Nb_Sinistres`, `Type_Sinistres`, `RI_Résilié`, `Motif_Resiliation_RI`, `IA_Statut`, `Immatriculation_Véhicule`, `Numero_Police`, `Date_Permis_De_Conduire`.
⚠️ `Usage_Vehicule` **n'existe pas** dans la table → ne jamais l'écrire (provoque `422 UNKNOWN_FIELD_NAME` qui annule tout le PATCH).

**Clé Gemini** : `gemini-2.5-flash` (v1beta). Utiliser la clé valide partagée avec le chatbot (`AIzaSyDNRE…`), pas l'ancienne `AIzaSyBqxW…` (révoquée → HTTP 400).

## 3. Déclenchement de l'extraction (front)

- Fichier `services/extractionRI.ts` → `extractRIData(dossierId, file)` (POST webhook, gère réponse vide/non-JSON).
- `Pages/ProspectDetail.tsx` → `runRIExtraction(file)` : appelée **automatiquement** quand le courtier charge le document `releve_information` (PDF, produit véhicule) dans l'onglet Documents (`triggerFileUpload`). Bouton « Analyser un RI manuellement » en secours.
- Hydrate `prospect.product_data` via `hydrateAutoProductData()` (`lib/prospectProductData.ts`).

## 4. Données tarifantes & matching

- `lib/prospectProductData.ts` : type `AutoProductData` (discriminé `type: 'vehicule'`) + `hydrateAutoProductData()` + helpers `calcAge`, `calcAnciennetePermis`, `isVehiculeProduct`, `VEHICULE_CODES`.
- `lib/compagnieRules.ts` : base de connaissance 7 compagnies véhicule (éligibilité + scoring marché).
- `lib/matchingEngine.ts` : `runVehiculeMatching(prospect)` — 3 phases (éligibilité → appétence → composite), top 3, estimation prime. Branché dans `store.ts` (`runIAAnalysis`) pour les produits AUT/MOT.

## 5. Fiche Tarification

`components/FicheTarification.tsx` — blocs : Souscripteur (âge), Véhicule & Permis (immat, marque, modèle, usage, énergie, ancienneté permis), **Antécédents** (compagnie, **date d'effet**, **mois d'assurance** = `nb_mois`, bonus/malus, nb sinistres, coeff nb mois, résilié), **Détail des sinistres** (date / responsabilité / nature), Formule souhaitée, Offre sélectionnée. Liens extranet dynamiques depuis `compagnieRules`. « Copier tout » + « Imprimer ».

## 6. Historique des correctifs (session 2026-06-02)

1. Auth PATCH Airtable corrigée (Bearer en dur) + `onError: continueRegularOutput`.
2. Clé Gemini invalide remplacée.
3. `maxOutputTokens` retiré (troncature JSON) → alignement complet sur le pipeline chatbot (RI_JSON + données riches).
4. Champ inexistant `Usage_Vehicule` retiré du PATCH (422).
5. Front : extraction auto au chargement du RI (plus de double upload) ; wizard de création réduit à 2 étapes (pièces collectées uniquement au détail).
6. Fiche : détail des sinistres (nature/responsabilité), **mois d'assurance**, **date d'effet**.
7. Navigation : CTA « Passer aux documents » (Infos) + « Passer au matching » (bannière).

## 6bis. Ajustements (session 2026-06-03)

- Bannière : bouton uniquement si Phase 1 complète (« Passer au matching ») ; plus de CTA « Gérer la GED ».
- Conducteur secondaire : champs Nom / Prénom / Date de naissance / Date de permis (front-only, fiche) + upload « Permis CDR Secondaire » (type `permis_secondaire`, GED Airtable).
- **RI conditionnel** : toggle « Conducteur sans antécédents (non assuré 36 mois) » (`product_data.sans_antecedents`) → RI exclu des bloquants Phase 1 (logique chatbot Alex étape 10) + carte extraction masquée ; bouton d'upload manuel du RI retiré (carte = statut seul, extraction auto au chargement du doc).
- Fiche : ligne « Date d'échéance » (RI `bonus_malus.date_echeance`, renvoyée par n8n comme `date_echeance`/`bm_date_echeance`).
- Provisoire : délai d'échéance par défaut via `DocumentConfig.delai_provisoire_jours` (Carte Grise = 30 j, règle relance n8n ; autres = 90 j).

## 7. À faire (prochaines itérations)

- **AGIRA / FVA** : enrichir `vehicule_modele` (et marque/énergie) à partir de l'immatriculation via les **web services FVA** (compte courtier existant). Point d'accroche prévu : nœud HTTP dans le workflow Cabinet, déclenché si `vehicule_modele` absent + immat présente, `onError: continueRegularOutput`.
  - **Prérequis à fournir** : URL endpoint, mode d'auth, format requête (plaque), schéma de réponse, confirmation que la réponse expose marque/modèle.
  - Source officielle alternative : API Particulier ANTS/SIV (habilitation administrative lourde) ; API SIV tierces payantes en dernier recours.

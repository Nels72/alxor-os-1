# Plan d'optimisation – Mode Démo : Sélecteur de Placement & Double Conformité

**Rôle :** Expert Product Builder & Senior Developer  
**Objectif :** Évolution du mode démo pour intégrer l’arbitrage humain et la validation de souscription, sans modifier le design global.  
**Contrainte :** Ne supprimer aucun élément existant de la landing page ou du mode démo. Itérer uniquement sur la section des résultats de tarification.

---

## Vue d’ensemble

| Composant | Fichiers principaux | Portée |
|-----------|---------------------|--------|
| Cartes recommandations IA | `pages/ProspectDetail.tsx`, `store.ts`, `types.ts` | Section résultats tarification |
| Indicateur GES / Indice de Sécurité | `pages/ProspectDetail.tsx` (bloc latéral) | Remplacement visuel GES |
| Données & persistance | `types.ts`, `store.ts`, `services/airtable.ts` | Logique métier |

---

## Phase 1 : Affinement du Sélecteur de Placement (Human-in-the-loop)

### 1.1 Extension du modèle de données

**Fichier :** `types.ts`

- Étendre `AISuggestion` :
  - `appetence_technique?: number` – Score basé sur les règles de souscription compagnie (0–100)
  - `competitivite_marche?: number` – Positionnement prix/garanties (0–100)
  - `note_expertise_courtier?: string` – Note d’expertise du courtier (justification)
- Ajouter au `Prospect` (ou sur `ai_suggestion`) :
  - `note_expertise_courtier?: string` – Stockée avec la sélection pour la Fiche de Préconisation

**Exemple :**

```ts
export interface AISuggestion {
  compagnie: string;
  score: number;
  tarif_estime: number;
  justification: string[];
  franchise?: string;
  garanties?: string;
  appetence_technique?: number;
  competitivite_marche?: number;
  note_expertise_courtier?: string;
}
```

### 1.2 Mise à jour des données mock dans le store

**Fichier :** `store.ts` (fonction `runIAAnalysis`)

Pour chaque offre (Allianz, AXA, Thélem), ajouter :

- `appetence_technique` – ex. ALLIANZ: 94, AXA: 87, THELEM: 82
- `competitivite_marche` – ex. ALLIANZ: 91, AXA: 85, THELEM: 88

### 1.3 Indicateurs visuels sur les cartes

**Fichier :** `pages/ProspectDetail.tsx` (lignes 324–376)

Sous le titre compagnie (après `{sugg.compagnie}`), insérer deux badges discrets :

1. **Appétence Technique**  
   - Badge `px-2 py-1 rounded-lg text-[9px] font-black uppercase`  
   - Ex. : `"Appétence 94%"` avec icône (ShieldCheck ou équivalent)

2. **Compétitivité Marché**  
   - Même style  
   - Ex. : `"Marché 91%"` avec icône (TrendingUp ou BarChart)

Couleurs proposées :  
- Appétence : `bg-blue-50 text-blue-600 border border-blue-100`  
- Compétitivité : `bg-slate-50 text-slate-600 border border-slate-100`

Position : ligne de badges sous le nom de la compagnie, avant le bloc « Analyse des bénéfices ».

### 1.4 Bouton « Ajuster l’arbitrage » et zone de texte

**Fichier :** `pages/ProspectDetail.tsx`

- Sur la carte **sélectionnée** (`isSelected === true`) :
  - Bouton ou icône `PenTool` / `Edit` : « Ajuster l’arbitrage »
  - Placé à côté du bouton « Offre sélectionnée » ou au-dessus
- Au clic :
  - Ouvrir une petite zone de texte inline sous la carte ou dans un mini-collapse
  - Label : **« Note d’expertise du courtier »**
  - Placeholder : ex. « Privilégié pour la qualité de gestion sinistre »
  - État local : `expertiseNoteEditing` (compagnie en cours d’édition) + valeur texte
- Lors de la sélection ou de la saisie :
  - Mettre à jour `ai_suggestion` avec `note_expertise_courtier`
  - Utiliser `updateProspect(prospect.id, { ai_suggestion: { ...sugg, note_expertise_courtier: value } })`

Design : `textarea` ou `input` avec `rounded-2xl border border-slate-200`, style cohérent avec le reste.

---

## Phase 2 : Double Conformité (Le Bouclier)

### 2.1 Remplacement du bloc « Global Enrollment Score »

**Fichier :** `pages/ProspectDetail.tsx` (lignes 519–539)

- Remplacer le bloc actuel (cercle SVG + « Global Enrollment Score ») par un module **« Indice de Sécurité du CA »**.
- Ne pas supprimer le GES : le garder ailleurs si besoin (ex. Timeline ou autre bloc) ou le laisser en lecture dans la logique métier pour le workflow.

### 2.2 Structure du module « Indice de Sécurité du CA »

Nouveau bloc latéral :

1. **Titre :** `Indice de Sécurité du CA`
2. **Bouclier 1 – Conformité DDA :**
   - Statut : « Validé - Documents & KYC complets »
   - Icône : `ShieldCheck` en vert
   - Condition : Phase 1 complète (`phase1Complete === true`)
3. **Bouclier 2 – Conformité Souscription :**
   - Statut : « Vérifié - Adéquation règles compagnie »
   - Icône : `ShieldCheck` en vert
   - Condition : Analyse IA terminée et offre sélectionnée (`prospect.ia_analysis_done && prospect.ai_suggestion`)

### 2.3 Logique « Critère limitrophe »

Pour simuler un critère proche de la limite (ex. antécédent) :

- Ajouter au `Prospect` ou dans un contexte local :  
  `conformite_limitrophe?: boolean`
- Quand `conformite_limitrophe === true` :
  - Badge orange : `bg-orange-50 text-orange-600 border border-orange-200`
  - Texte : « Vérification experte requise »
  - S’appliquer au Bouclier concerné (DDA ou Souscription) selon les règles métier

Optionnel : champ calculé à partir des données (ex. antécédents, âge, franchise) pour définir si on affiche le statut orange.

### 2.4 Rendu proposé

```
┌─────────────────────────────────────────┐
│  Indice de Sécurité du CA               │
├─────────────────────────────────────────┤
│  [Bouclier 1] Conformité DDA            │
│  Validé - Documents & KYC complets      │
├─────────────────────────────────────────┤
│  [Bouclier 2] Conformité Souscription   │
│  Vérifié - Adéquation règles compagnie  │
└─────────────────────────────────────────┘
```

Pour un critère limitrophe :

```
│  [Bouclier 2] Conformité Souscription   │
│  Vérification experte requise (orange)  │
```

Conserver le même style visuel : `rounded-[2.5rem]`, `border border-slate-200`, palette actuelle.

---

## Phase 3 : Logique métier & Données

### 3.1 Variable locale pour le choix final

**Objet « choix courtier » :**

```ts
interface ChoixCourtier {
  compagnie: string;
  tarif_estime: number;
  franchise?: string;
  garanties?: string;
  note_expertise_courtier?: string;
  date_selection?: string;
}
```

Ce choix est déjà porté par `prospect.ai_suggestion`. L’extension de `AISuggestion` avec `note_expertise_courtier` suffit. Pas besoin de structure séparée si tout reste dans `ai_suggestion`.

### 3.2 Intégration Airtable / Fiche de Préconisation

**Fichier :** `services/airtable.ts`

- Étendre `AirtableProspect.fields` :
  - `'Compagnie sélectionnée'?: string`
  - `'Note expertise courtier'?: string`
- Dans `mapAirtableProspectToApp` : mapper ces champs depuis/vers `ai_suggestion.compagnie` et `note_expertise_courtier`.

À l’envoi vers Airtable (quand la fonction sera branchée) :

- Envoyer : `prospect.ai_suggestion?.compagnie`, `prospect.ai_suggestion?.note_expertise_courtier`, et autres champs utiles pour la Fiche de Préconisation.

### 3.3 Mise à jour du store lors des actions

- `updateProspect` est déjà appelé lors de la sélection d’offre.
- S’assurer que la mise à jour inclut toujours `note_expertise_courtier` quand l’utilisateur saisit la note.
- Lors de « Editer devis & FIC » : `quoteData` doit refléter la compagnie et les infos de l’offre sélectionnée, y compris la note d’expertise si on l’affiche dans le modal.

---

## Phase 4 : Checklist d’implémentation

### Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `types.ts` | Extension `AISuggestion` (appetence_technique, competitivite_marche, note_expertise_courtier) |
| `store.ts` | Ajout des champs dans `runIAAnalysis` |
| `pages/ProspectDetail.tsx` | Badges, bouton arbitrage, zone texte, module Indice de Sécurité |
| `services/airtable.ts` | Champs Airtable pour compagnie et note expertise (optionnel, pour future intégration) |

### Contraintes à respecter

- [ ] Aucune suppression d’éléments de la landing page.
- [ ] Aucune suppression d’éléments du mode démo existant.
- [ ] Modifications limitées à la section des résultats de tarification (ProspectDetail, onglet Documents).
- [ ] Conserver l’esthétique actuelle : couleurs (#4F7CFF, #10B981, slate), arrondis, espacements.

### Ordre recommandé

1. `types.ts` – Extension des interfaces
2. `store.ts` – Données mock pour appetence/compétitivité
3. `pages/ProspectDetail.tsx` – Phase 1 (badges + arbitrage)
4. `pages/ProspectDetail.tsx` – Phase 2 (module Indice de Sécurité)
5. `services/airtable.ts` – Champs pour Fiche de Préconisation (si besoin immédiat)

---

## Annexes

### A. Mapping des statuts de conformité

| État | Bouclier 1 (DDA) | Bouclier 2 (Souscription) |
|------|-------------------|----------------------------|
| Phase 1 incomplète | Badge gris ou orange « En cours » | — |
| Phase 1 complète | Badge vert « Validé » | — |
| Analyse IA + sélection | Badge vert | Badge vert « Vérifié » |
| Critère limitrophe | — | Badge orange « Vérification experte requise » |

### B. Exemple de payload pour Airtable (futur)

```json
{
  "Compagnie sélectionnée": "ALLIANZ",
  "Note expertise courtier": "Privilégié pour la qualité de gestion sinistre",
  "GES Score": 60
}
```

---

*Document généré le 09/03/2025 – Plan d’optimisation ALXOR OS*

# Prompts d'extraction — Fiches appétence compagnie
> Usage : Claude API dans n8n · modèle `claude-opus-4-6` recommandé
> Injecter le texte extrait du PDF dans `{{CONTENU_PDF}}`

---

## Prompt 1 — Fiche appétence AUTO

### System prompt

```
Tu es un expert en souscription assurance IARD, spécialisé dans les produits automobile en France.
Tu extrais des informations structurées depuis des fiches d'appétence ou fiches produit compagnies.

Règles absolues :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises markdown, sans backticks.
- Si une valeur n'est pas mentionnée dans le document, utilise null — jamais une valeur inventée.
- Si une valeur est ambiguë ou conditionnelle, ajoute une entrée dans le tableau "notes" avec le contexte exact.
- Les listes sont toujours des tableaux JSON, même si elles ne contiennent qu'un seul élément.
- Les booléens sont true ou false (minuscules), jamais "oui"/"non".
- Les montants sont en euros, sous forme de nombre entier ou décimal sans symbole.
- Le bonus-malus est exprimé en coefficient décimal (ex : 1.25, pas "25% de malus").
```

### User prompt

```
Voici le contenu d'une fiche appétence / fiche produit Auto d'une compagnie d'assurance française.

Extrais toutes les informations disponibles et produis un objet JSON strictement conforme au schéma ci-dessous.

---
CONTENU DU DOCUMENT :
{{CONTENU_PDF}}
---

SCHÉMA JSON ATTENDU :
{
  "meta": {
    "compagnie": "string — nom exact de la compagnie tel qu'il apparaît dans le document",
    "produit": "string — nom commercial du produit (ex: AXA Auto Confort)",
    "segment_cible": "string — une valeur parmi : 'standard' | 'aggrave' | 'premium' | 'jeune_conducteur' | 'senior'. Détermine à partir du contenu : un produit pour profils malussés, multisinistrés ou résiliés non-paiement = 'aggrave'.",
    "version_fiche": "string | null — version ou date de la fiche si mentionnée",
    "date_extraction": "string — date du jour au format YYYY-MM-DD"
  },

  "eligibilite": {

    "plancher_aggrave": {
      "description": "Seuils MINIMUM requis pour les produits aggravés — en dessous de ces seuils, le profil est trop bon risque et doit être orienté vers le produit standard de la compagnie",
      "bonus_min_aggrave": "number | null — coefficient BM minimum pour être éligible à ce produit (ex: 1.26 signifie que BM < 1.26 = trop bon risque)",
      "sinistres_min_aggrave_36m": "number | null — nombre minimum de sinistres sur 36 mois pour être dans la cible",
      "resilie_np_requis": "boolean | null — true si le produit cible spécifiquement les résiliés non-paiement",
      "nb_resiliations_min": "number | null — nombre minimum de résiliations antérieures pour être dans la cible"
    },

    "bonus_malus": {
      "bonus_max_accepte": "number | null — coefficient BM maximum accepté (ex: 1.50)",
      "bonus_max_a_etude": "number | null — coefficient BM au-delà duquel le dossier passe en étude",
      "bonus_excellent_seuil": "number | null — coefficient en dessous duquel la compagnie considère le profil excellent (ex: 0.80)"
    },

    "sinistres": {
      "nb_sinistres_max_36m": "number | null — nombre max de sinistres toutes causes sur 36 mois",
      "nb_sinistres_responsables_max_36m": "number | null — nombre max de sinistres responsables sur 36 mois",
      "nb_sinistres_max_24m": "number | null — si la compagnie raisonne sur 24 mois",
      "types_sinistres_exclusifs": ["string"] "— liste des types de sinistres entraînant refus systématique (ex: 'délit de fuite', 'alcool au volant')"
    },

    "resiliation": {
      "accepte_resilie": "boolean | null",
      "delai_carence_mois": "number | null — nombre de mois après résiliation avant acceptation",
      "motifs_exclus": ["string"] "— liste des motifs de résiliation refusés (ex: 'non_paiement', 'fausse_declaration', 'sinistralite_excessive', 'vol', 'resiliation_mutuelle')"
    },

    "conducteur": {
      "age_min": "number | null — âge minimum du conducteur principal en années",
      "age_max": "number | null — âge maximum en années (rare, ex: 85)",
      "anciennete_permis_min_mois": "number | null",
      "accepte_permis_probatoire": "boolean | null — permis de moins de 2 ans / conduite accompagnée AAC",
      "accepte_conducteur_secondaire_moins_25ans": "boolean | null",
      "accepte_jeune_conducteur_sans_antecedents": "boolean | null"
    },

    "vehicule": {
      "energies_exclues": ["string"] "— valeurs possibles: 'essence', 'diesel', 'electrique', 'hybride', 'gpl', 'hydrogene'",
      "categories_exclues": ["string"] "— ex: 'utilitaire', 'collection', 'competition', 'suv', 'berline'",
      "age_vehicule_max_ans": "number | null",
      "valeur_vehicule_max_eur": "number | null",
      "puissance_max_cv": "number | null",
      "usages_exclus": ["string"] "— ex: 'professionnel', 'vtc', 'livraison', 'taxi'"
    },

    "geographie": {
      "departements_exclus": ["string"] "— codes département ex: ['75', '93', '13']",
      "zones_a_etude": ["string"] "— départements ou régions en étude au cas par cas"
    },

    "anciennete_assurance": {
      "min_mois_assures": "number | null — nombre minimum de mois assurés en continu",
      "accepte_premiere_assurance": "boolean | null"
    }
  },

  "formules": [
    {
      "code": "string — identifiant court ex: 'RC', 'TE', 'TR'",
      "nom": "string — nom commercial ex: 'Responsabilité Civile', 'Tiers Étendu', 'Tous Risques'",
      "disponible": "boolean",
      "prime_base_indicative_eur": "number | null — prime annuelle indicative profil standard",
      "franchise_dommages_eur": "number | null",
      "franchise_vol_eur": "number | null",
      "franchise_bris_glace_eur": "number | null"
    }
  ],

  "garanties": {
    "incluses_tous_risques": ["string"] "— garanties incluses de base en TR",
    "incluses_tiers_etendu": ["string"] "— garanties incluses en TE",
    "options_disponibles": ["string"] "— garanties disponibles en option",
    "exclusions_notables": ["string"] "— exclusions importantes à signaler au courtier"
  },

  "scoring_marche": {
    "rapport_qualite_prix": "number | null — note 0 à 100, à laisser null si non mentionné dans le document",
    "gestion_sinistres": "number | null — note 0 à 100",
    "etendue_garanties": "number | null — note 0 à 100",
    "reactivite": "number | null — note 0 à 100",
    "points_forts": ["string"] "— points forts cités dans le document",
    "points_faibles": ["string"] "— points faibles ou restrictions notables"
  },

  "notes": ["string"] "— tout élément ambigu, conditionnel ou ne rentrant pas dans le schéma, avec citation exacte du document source"
}

Rappel : null si absent, jamais de valeur inventée. Uniquement le JSON, rien d'autre.
```

---

## Prompt 2 — Fiche appétence MOTO

### System prompt

```
Tu es un expert en souscription assurance IARD, spécialisé dans les produits deux-roues motorisés (moto, scooter, cyclo) en France.
Tu extrais des informations structurées depuis des fiches d'appétence ou fiches produit compagnies.

Règles absolues :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises markdown, sans backticks.
- Si une valeur n'est pas mentionnée dans le document, utilise null — jamais une valeur inventée.
- Si une valeur est ambiguë ou conditionnelle, ajoute une entrée dans le tableau "notes" avec le contexte exact.
- Les listes sont toujours des tableaux JSON, même si elles ne contiennent qu'un seul élément.
- Les booléens sont true ou false (minuscules), jamais "oui"/"non".
- Les montants sont en euros, sous forme de nombre entier ou décimal sans symbole.
- Le bonus-malus est exprimé en coefficient décimal (ex : 1.25).
- La cylindrée est exprimée en cm³ (entier).
```

### User prompt

```
Voici le contenu d'une fiche appétence / fiche produit Moto / Deux-roues d'une compagnie d'assurance française.

Extrais toutes les informations disponibles et produis un objet JSON strictement conforme au schéma ci-dessous.

---
CONTENU DU DOCUMENT :
{{CONTENU_PDF}}
---

SCHÉMA JSON ATTENDU :
{
  "meta": {
    "compagnie": "string",
    "produit": "string — nom commercial (ex: APRIL Moto Essentiel)",
    "version_fiche": "string | null",
    "date_extraction": "string — YYYY-MM-DD"
  },

  "eligibilite": {

    "bonus_malus": {
      "bonus_max_accepte": "number | null",
      "bonus_max_a_etude": "number | null",
      "bonus_excellent_seuil": "number | null"
    },

    "sinistres": {
      "nb_sinistres_max_36m": "number | null",
      "nb_sinistres_responsables_max_36m": "number | null",
      "types_sinistres_exclusifs": ["string"]
    },

    "resiliation": {
      "accepte_resilie": "boolean | null",
      "delai_carence_mois": "number | null",
      "motifs_exclus": ["string"]
    },

    "conducteur": {
      "age_min": "number | null",
      "age_max": "number | null",
      "anciennete_permis_min_mois": "number | null",
      "anciennete_permis_moto_min_mois": "number | null — spécifique permis A/A2",
      "accepte_permis_a2": "boolean | null — permis A2 (puissance limitée)",
      "accepte_permis_a_progressif": "boolean | null — accès progressif permis A",
      "accepte_conducteur_secondaire_moins_25ans": "boolean | null"
    },

    "vehicule": {
      "cylindree_max_cm3": "number | null",
      "cylindree_min_cm3": "number | null",
      "puissance_max_kw": "number | null",
      "categories_acceptees": ["string"] "— ex: 'moto', 'scooter', 'cyclo', 'trail', 'sportive', 'custom', 'side_car'",
      "categories_exclues": ["string"],
      "age_vehicule_max_ans": "number | null",
      "valeur_vehicule_max_eur": "number | null",
      "energies_exclues": ["string"],
      "usages_exclus": ["string"] "— ex: 'competition', 'circuit', 'livraison'"
    },

    "geographie": {
      "departements_exclus": ["string"],
      "zones_a_etude": ["string"]
    },

    "anciennete_assurance": {
      "min_mois_assures": "number | null",
      "accepte_premiere_assurance_moto": "boolean | null"
    }
  },

  "formules": [
    {
      "code": "string",
      "nom": "string",
      "disponible": "boolean",
      "prime_base_indicative_eur": "number | null",
      "franchise_dommages_eur": "number | null",
      "franchise_vol_eur": "number | null",
      "franchise_bris_glace_eur": "number | null",
      "equipement_conducteur_inclus": "boolean | null — protection équipements incluse"
    }
  ],

  "garanties": {
    "incluses_tous_risques": ["string"],
    "incluses_tiers_etendu": ["string"],
    "equipement_conducteur": {
      "disponible": "boolean | null",
      "plafond_eur": "number | null",
      "franchise_eur": "number | null"
    },
    "options_disponibles": ["string"],
    "exclusions_notables": ["string"]
  },

  "specificites_moto": {
    "accepte_moto_sportive_haute_puissance": "boolean | null — ex: superbike > 100kW",
    "accepte_collection": "boolean | null — moto de collection > 30 ans",
    "accepte_sidecar": "boolean | null",
    "accepte_quad": "boolean | null",
    "bonus_moto_independant_auto": "boolean | null — BM moto dissocié du BM auto"
  },

  "scoring_marche": {
    "rapport_qualite_prix": "number | null",
    "gestion_sinistres": "number | null",
    "etendue_garanties": "number | null",
    "reactivite": "number | null",
    "points_forts": ["string"],
    "points_faibles": ["string"]
  },

  "notes": ["string"]
}

Rappel : null si absent, jamais de valeur inventée. Uniquement le JSON, rien d'autre.
```

---

## Prompt 3 — Fiche appétence MRH

### System prompt

```
Tu es un expert en souscription assurance IARD, spécialisé dans les produits Multirisques Habitation (MRH) en France.
Tu extrais des informations structurées depuis des fiches d'appétence ou fiches produit compagnies.

Règles absolues :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises markdown, sans backticks.
- Si une valeur n'est pas mentionnée dans le document, utilise null — jamais une valeur inventée.
- Si une valeur est ambiguë ou conditionnelle, ajoute une entrée dans le tableau "notes" avec le contexte exact.
- Les listes sont toujours des tableaux JSON, même si elles ne contiennent qu'un seul élément.
- Les booléens sont true ou false (minuscules), jamais "oui"/"non".
- Les montants sont en euros, sous forme de nombre entier ou décimal sans symbole.
- Les surfaces sont en m² (nombre entier).
```

### User prompt

```
Voici le contenu d'une fiche appétence / fiche produit MRH (Multirisques Habitation) d'une compagnie d'assurance française.

Extrais toutes les informations disponibles et produis un objet JSON strictement conforme au schéma ci-dessous.

---
CONTENU DU DOCUMENT :
{{CONTENU_PDF}}
---

SCHÉMA JSON ATTENDU :
{
  "meta": {
    "compagnie": "string",
    "produit": "string — nom commercial (ex: Groupama Habitat Essentiel)",
    "version_fiche": "string | null",
    "date_extraction": "string — YYYY-MM-DD"
  },

  "eligibilite": {

    "logement": {
      "types_acceptes": ["string"] "— ex: 'appartement', 'maison', 'studio', 'chambre', 'loft'",
      "types_exclus": ["string"],
      "statuts_occupant_acceptes": ["string"] "— ex: 'proprietaire', 'locataire', 'colocataire', 'usufruitier'",
      "statuts_occupant_exclus": ["string"],
      "surface_max_m2": "number | null",
      "surface_min_m2": "number | null",
      "nb_pieces_max": "number | null",
      "usage_exclusif_habitation_requis": "boolean | null — exclut usage mixte pro/perso",
      "accepte_meuble_de_tourisme": "boolean | null",
      "accepte_location_saisonniere": "boolean | null",
      "accepte_colocation": "boolean | null"
    },

    "construction": {
      "annee_construction_min": "number | null — ex: 1948 (exclut avant-guerre)",
      "materiaux_exclus": ["string"] "— ex: 'pans_de_bois', 'chaume', 'toiture_terrasse_ancienne'",
      "accepte_dependances": "boolean | null — grange, garage détaché, etc.",
      "accepte_piscine": "boolean | null",
      "accepte_panneaux_solaires": "boolean | null"
    },

    "geographie": {
      "departements_exclus": ["string"],
      "zones_inondables_exclus": "boolean | null — zone PPRi classée",
      "zones_a_etude": ["string"]
    },

    "antecedents": {
      "accepte_resilie": "boolean | null",
      "motifs_resilie_exclus": ["string"],
      "nb_sinistres_max_36m": "number | null",
      "types_sinistres_exclusifs": ["string"] "— ex: 'incendie_responsable', 'degat_des_eaux_repetitif'"
    }
  },

  "formules": [
    {
      "code": "string — ex: 'BASE', 'CONFORT', 'PREMIUM'",
      "nom": "string",
      "disponible": "boolean",
      "prime_base_indicative_eur": "number | null — prime annuelle profil standard T3 locataire",
      "franchise_dommages_eur": "number | null",
      "franchise_vol_eur": "number | null",
      "franchise_dde_eur": "number | null — dégât des eaux",
      "franchise_catastrophe_naturelle_eur": "number | null"
    }
  ],

  "garanties": {
    "incluses_base": ["string"] "— garanties incluses dans la formule d'entrée",
    "incluses_premium": ["string"] "— garanties incluses dans la formule haute",
    "capitaux": {
      "mobilier_max_eur": "number | null — capital mobilier maximum garanti",
      "immobilier_max_eur": "number | null — pour les propriétaires",
      "objets_de_valeur_max_eur": "number | null",
      "materiel_informatique_max_eur": "number | null"
    },
    "responsabilite_civile": {
      "incluse": "boolean | null",
      "plafond_eur": "number | null"
    },
    "protection_juridique": {
      "incluse": "boolean | null",
      "plafond_eur": "number | null"
    },
    "options_disponibles": ["string"],
    "exclusions_notables": ["string"]
  },

  "specificites_mrh": {
    "accepte_animaux_dangereux": "boolean | null — chiens catégorie 1/2",
    "accepte_piscine_enterree": "boolean | null",
    "accepte_dependance_non_attenante": "boolean | null",
    "accepte_chambre_etudiante": "boolean | null",
    "remise_multicontrat_auto": "boolean | null — réduction si contrat auto dans la même compagnie"
  },

  "scoring_marche": {
    "rapport_qualite_prix": "number | null",
    "gestion_sinistres": "number | null",
    "etendue_garanties": "number | null",
    "reactivite": "number | null",
    "points_forts": ["string"],
    "points_faibles": ["string"]
  },

  "notes": ["string"]
}

Rappel : null si absent, jamais de valeur inventée. Uniquement le JSON, rien d'autre.
```

---

## Notes d'intégration n8n

### Appel API dans le nœud HTTP Request

```json
{
  "model": "claude-opus-4-6",
  "max_tokens": 2000,
  "system": "{{system_prompt_selon_type_doc}}",
  "messages": [
    {
      "role": "user",
      "content": "{{user_prompt_avec_contenu_pdf_injecté}}"
    }
  ]
}
```

### Nœud de validation après extraction (Code node n8n)

```javascript
const raw = $input.first().json.content[0].text;

let parsed;
try {
  parsed = JSON.parse(raw);
} catch (e) {
  throw new Error(`JSON invalide : ${e.message} — Contenu reçu : ${raw.substring(0, 200)}`);
}

// Champs obligatoires selon le type de produit
const requiredAuto = ['meta.compagnie', 'eligibilite.bonus_malus.bonus_max_accepte', 'eligibilite.resiliation.accepte_resilie'];
const requiredMoto = [...requiredAuto, 'eligibilite.vehicule.cylindree_max_cm3'];
const requiredMRH  = ['meta.compagnie', 'eligibilite.logement.types_acceptes', 'eligibilite.antecedents.accepte_resilie'];

// Vérification présence des champs critiques (null accepté, absent non)
function checkField(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : '__ABSENT__'), obj) !== '__ABSENT__';
}

const produit = parsed.meta?.produit?.toLowerCase() || '';
const required = produit.includes('moto') ? requiredMoto : produit.includes('mrh') || produit.includes('habitation') ? requiredMRH : requiredAuto;

const missing = required.filter(f => !checkField(parsed, f));
if (missing.length > 0) {
  throw new Error(`Champs obligatoires manquants : ${missing.join(', ')}`);
}

return [{ json: parsed }];
```

### Convention de nommage Dropbox → détection type doc

| Préfixe fichier | Prompt utilisé |
|---|---|
| `fiche-appetence-auto-*` | Prompt Auto |
| `fiche-appetence-moto-*` | Prompt Moto |
| `fiche-appetence-mrh-*` | Prompt MRH |
| `fiche-produit-auto-*` | Prompt Auto |
| `contrat-ref-auto-*` | Prompt Auto (extraction light) |

/**
 * Types de données tarifantes par famille produit.
 * Périmètre actuel : Auto / Moto (AUT, MOT).
 * Les autres familles seront ajoutées ultérieurement.
 */

// ─── Auto / Moto ────────────────────────────────────────────────────────────

export interface AutoProductData {
  type: 'vehicule';

  // ── Depuis extraction RI (hydratés automatiquement, lecture seule) ──────
  bonus_malus?: number;              // Coefficient CRM (ex: 0.80, 1.25)
  nb_sinistres_36m?: number;         // Sinistres déclarés sur 36 mois
  type_sinistres?: string | null;    // "Responsable / Non-responsable / Bris de glace"
  resilie?: boolean;                 // Contrat résilié par la compagnie
  motif_resiliation?: string | null; // Motif si résilié
  compagnie_precedente?: string;     // Nom de la compagnie actuelle / précédente
  immatriculation?: string | null;   // Plaque d'immatriculation
  vehicule_marque?: string | null;   // Ex: "RENAULT"
  vehicule_modele?: string | null;   // Ex: "CLIO 5"
  vehicule_usage?: string | null;    // "Trajet travail" / "Plaisir" / "Professionnel"
  vehicule_energie?: string | null;  // "Essence" / "Diesel" / "Electrique" / "Hybride"
  date_permis?: string | null;       // Format DD/MM/YYYY
  anciennete_permis_mois?: number;   // Calculé (today - date_permis)
  bm_nb_annees_050?: number | null;  // Nb années à 0.50 (coefficient mois)
  date_releve_ri?: string | null;    // Date du relevé RI (DD/MM/YYYY)
  date_effet_contrat?: string | null; // Date d'effet / souscription (YYYY-MM-DD)
  nb_mois?: number | null;           // Mois d'assurance cumulés depuis la date d'effet
  bm_date_echeance?: string | null;  // Date de dernière échéance du RI (bonus_malus)
  formule_actuelle?: string | null;  // Formule en cours (pour info)
  sinistres?: Array<{                 // Sinistres détaillés (rubrique F du RI)
    date?: string | null;
    nature?: string | null;          // responsable / non_responsable / partielle
    type?: string | null;            // corporel / materiel / bris_de_glace / vol / autre
    conducteur_nom?: string | null;
  }>;

  // ── Saisie courtier ──────────────────────────────────────────────────────
  /** Véhicule à assurer — distinct du véhicule du RI (qui peut être un ancien véhicule) */
  immatriculation_a_assurer?: string | null;
  formule_souhaitee?: 'RC' | 'Tiers Étendu' | 'Tous Risques';
  conducteur_secondaire?: boolean;
  date_naissance_conducteur_secondaire?: string; // YYYY-MM-DD
  nom_conducteur_secondaire?: string;            // front-only (fiche)
  prenom_conducteur_secondaire?: string;         // front-only (fiche)
  date_permis_conducteur_secondaire?: string;    // YYYY-MM-DD, front-only (fiche)
  /** Conducteur/souscripteur sans antécédents d'assurance (non assuré sur 36 mois) → RI non requis */
  sans_antecedents?: boolean;
}

// Extensible : union type pour les prochains produits
export type ProspectProductData = AutoProductData;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Familles de produits supportant les données tarifantes structurées */
export const VEHICULE_CODES = ['AUT', 'MOT', 'CYCLO', 'FLO_AUT'] as const;

/** Retourne true si le produit est de la famille véhicule */
export function isVehiculeProduct(typeContrat: string): boolean {
  return VEHICULE_CODES.some(code => typeContrat.toUpperCase().startsWith(code.replace('_', '')) || typeContrat.toUpperCase() === code);
}

/**
 * Calcule l'ancienneté du permis en mois à partir d'une date DD/MM/YYYY.
 * Retourne null si la date est invalide.
 */
export function calcAnciennetePermis(datePermis: string | null | undefined): number | null {
  if (!datePermis) return null;
  // Accepte DD/MM/YYYY ou YYYY-MM-DD
  let d: Date;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePermis)) {
    const [day, month, year] = datePermis.split('/').map(Number);
    d = new Date(year, month - 1, day);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(datePermis)) {
    d = new Date(datePermis);
  } else {
    return null;
  }
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

/**
 * Calcule l'âge en années à partir d'une date de naissance (DD/MM/YYYY ou YYYY-MM-DD).
 * Retourne null si invalide.
 */
export function calcAge(dateNaissance: string | null | undefined): number | null {
  if (!dateNaissance) return null;
  let d: Date;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateNaissance)) {
    const [day, month, year] = dateNaissance.split('/').map(Number);
    d = new Date(year, month - 1, day);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateNaissance)) {
    d = new Date(dateNaissance);
  } else {
    return null;
  }
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** Parse une date DD/MM/YYYY ou YYYY-MM-DD → Date, sinon null. */
function parseDateFlexible(s: string | null | undefined): Date | null {
  if (!s) return null;
  let d: Date;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [day, month, year] = s.split('/').map(Number);
    d = new Date(year, month - 1, day);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    d = new Date(s);
  } else {
    return null;
  }
  return isNaN(d.getTime()) ? null : d;
}

export const AGE_MIN_PERMIS = 17; // Conduite accompagnée dès 17 ans

/**
 * Vérifie la cohérence date de permis / date de naissance.
 * Retourne true si INCOHÉRENT (permis obtenu avant l'âge minimum légal).
 * Retourne false si cohérent, ou si une des deux dates est absente/invalide (pas de blocage).
 */
export function permisAvantAgeMinimum(
  dateNaissance: string | null | undefined,
  datePermis: string | null | undefined,
  ageMin: number = AGE_MIN_PERMIS
): boolean {
  const dn = parseDateFlexible(dateNaissance);
  const dp = parseDateFlexible(datePermis);
  if (!dn || !dp) return false;
  const seuil = new Date(dn.getFullYear() + ageMin, dn.getMonth(), dn.getDate());
  return dp < seuil;
}

/**
 * Hydrate un AutoProductData depuis les champs Airtable Dossier + le RI_JSON brut.
 * Préserve les champs courtier existants (formule_souhaitee, conducteur_secondaire).
 */
export function hydrateAutoProductData(
  dossierFields: Record<string, unknown>,
  riJson?: Record<string, unknown>,
  existing?: Partial<AutoProductData>
): AutoProductData {
  const datePermis = (dossierFields.Date_Permis_De_Conduire as string) || null;

  return {
    type: 'vehicule',
    // Champs Airtable principaux
    bonus_malus:          (dossierFields.RI_Bonus_Malus as number) || undefined,
    nb_sinistres_36m:     (dossierFields.RI_Nb_Sinistres as number) ?? undefined,
    type_sinistres:       (dossierFields.Type_Sinistres as string) || null,
    resilie:              (dossierFields['RI_Résilié'] as boolean) ?? undefined,
    motif_resiliation:    (dossierFields.Motif_Resiliation_RI as string) || null,
    compagnie_precedente: (dossierFields.RI_Compagnie_Précédente as string) || undefined,
    immatriculation:      (dossierFields['Immatriculation_Véhicule'] as string) || null,
    date_permis:          datePermis,
    anciennete_permis_mois: calcAnciennetePermis(datePermis) ?? undefined,
    // Champs issus du RI_JSON brut
    vehicule_marque:   (riJson?.vehicule_marque as string) || null,
    vehicule_modele:   (riJson?.vehicule_modele as string) || null,
    vehicule_usage:    (riJson?.vehicule_usage as string) || null,
    vehicule_energie:  (riJson?.vehicule_categorie as string) || null,
    bm_nb_annees_050:  (riJson?.bm_nb_annees_050 as number) ?? (dossierFields.bm_nb_annees_050 as number) ?? null,
    date_releve_ri:    (riJson?.date_releve as string) || null,
    date_effet_contrat: (riJson?.date_effet_contrat as string) || null,
    nb_mois:           (riJson?.nb_mois as number) ?? null,
    bm_date_echeance:  (riJson?.date_echeance as string) || null,
    formule_actuelle:  (riJson?.formule_actuelle as string) || null,
    sinistres:         Array.isArray(riJson?.sinistres) ? (riJson!.sinistres as AutoProductData['sinistres']) : existing?.sinistres,
    // Préservation saisie courtier
    formule_souhaitee:  existing?.formule_souhaitee,
    conducteur_secondaire: existing?.conducteur_secondaire,
    date_naissance_conducteur_secondaire: existing?.date_naissance_conducteur_secondaire,
    nom_conducteur_secondaire: existing?.nom_conducteur_secondaire,
    prenom_conducteur_secondaire: existing?.prenom_conducteur_secondaire,
    date_permis_conducteur_secondaire: existing?.date_permis_conducteur_secondaire,
    sans_antecedents: existing?.sans_antecedents,
  };
}

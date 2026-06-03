/**
 * Base de connaissance compagnies — famille Véhicule (Auto / Moto).
 * Critères d'éligibilité (gate binaire) + scoring marché.
 *
 * À enrichir avec les vraies règles d'appétence Easy Courtage.
 */

export interface VehiculeEligibiliteCriteria {
  /** Bonus/Malus maximum accepté (ex: 1.50 → refuse > 1.50) */
  bonus_max: number;
  /** Nombre de sinistres 36 mois maximum accepté */
  sinistres_max: number;
  /** Accepte les profils résiliés par leur précédente compagnie */
  accepte_resilie: boolean;
  /** Motifs de résiliation exclus même si accepte_resilie = true */
  motifs_resilie_exclus?: string[];
  /** Âge conducteur minimum (ans) */
  age_conducteur_min?: number;
  /** Ancienneté permis minimum (mois) */
  anciennete_permis_min_mois?: number;
  /** Énergies de véhicule exclues */
  energies_exclus?: string[];
}

export interface CompagnieVehiculeRule {
  /** Nom commercial */
  compagnie: string;
  /** URL de l'espace courtier extranet */
  extranet_url: string;
  /** Critères d'éligibilité (exclusion dure) */
  eligible: VehiculeEligibiliteCriteria;
  /**
   * Positionnement marché (0-100).
   * Valeurs stables — reflètent la connaissance métier du courtier.
   */
  scoring: {
    rapport_qualite_prix: number;   // tarif vs couverture
    gestion_sinistres: number;       // qualité de gestion + réseau garages
    etendue_garanties: number;       // richesse des garanties de base
    reactivite: number;              // délais réponse + digitalisation
  };
  /** Formules disponibles */
  formules_disponibles: ('RC' | 'Tiers Étendu' | 'Tous Risques')[];
  /** Bonus de score (%) si bonus_malus du client ≤ 0.50 */
  bonus_score_excellent?: number;
  /**
   * Base de prime annuelle estimée TTC (profil moyen, bonus 1.0, 0 sinistre).
   * Sera modulée par le scoring d'appétence.
   */
  prime_base: number;
}

// ─── Compagnies véhicule partenaires Easy Courtage ──────────────────────────

export const COMPAGNIES_VEHICULE: CompagnieVehiculeRule[] = [
  {
    compagnie: 'ALLIANZ',
    extranet_url: 'https://www.allianz.fr/espace-pro',
    eligible: {
      bonus_max: 1.50,
      sinistres_max: 2,
      accepte_resilie: false,
      anciennete_permis_min_mois: 12,
    },
    scoring: {
      rapport_qualite_prix: 78,
      gestion_sinistres: 90,
      etendue_garanties: 88,
      reactivite: 82,
    },
    formules_disponibles: ['RC', 'Tiers Étendu', 'Tous Risques'],
    bonus_score_excellent: 8,
    prime_base: 820,
  },
  {
    compagnie: 'AXA',
    extranet_url: 'https://www.axa.fr/pro/espace-courtier',
    eligible: {
      bonus_max: 2.00,
      sinistres_max: 3,
      accepte_resilie: false,
      anciennete_permis_min_mois: 0,
    },
    scoring: {
      rapport_qualite_prix: 72,
      gestion_sinistres: 85,
      etendue_garanties: 82,
      reactivite: 88,
    },
    formules_disponibles: ['RC', 'Tiers Étendu', 'Tous Risques'],
    prime_base: 900,
  },
  {
    compagnie: 'THELEM',
    extranet_url: 'https://www.thelem-assurances.fr/espace-courtier',
    eligible: {
      bonus_max: 1.75,
      sinistres_max: 2,
      accepte_resilie: false,
      anciennete_permis_min_mois: 6,
    },
    scoring: {
      rapport_qualite_prix: 88,
      gestion_sinistres: 76,
      etendue_garanties: 72,
      reactivite: 74,
    },
    formules_disponibles: ['RC', 'Tiers Étendu', 'Tous Risques'],
    bonus_score_excellent: 5,
    prime_base: 750,
  },
  {
    compagnie: 'GROUPAMA',
    extranet_url: 'https://www.groupama.fr/pro/espace-courtier',
    eligible: {
      bonus_max: 2.50,
      sinistres_max: 3,
      accepte_resilie: true,
      motifs_resilie_exclus: ['non-paiement', 'fraude'],
      anciennete_permis_min_mois: 0,
    },
    scoring: {
      rapport_qualite_prix: 75,
      gestion_sinistres: 80,
      etendue_garanties: 78,
      reactivite: 72,
    },
    formules_disponibles: ['RC', 'Tiers Étendu', 'Tous Risques'],
    prime_base: 870,
  },
  {
    compagnie: 'MAIF',
    extranet_url: 'https://www.maif.fr/espace-courtier',
    eligible: {
      bonus_max: 1.25,
      sinistres_max: 1,
      accepte_resilie: false,
      anciennete_permis_min_mois: 24,
    },
    scoring: {
      rapport_qualite_prix: 82,
      gestion_sinistres: 96,
      etendue_garanties: 80,
      reactivite: 78,
    },
    formules_disponibles: ['Tiers Étendu', 'Tous Risques'],
    bonus_score_excellent: 12,
    prime_base: 780,
  },
  {
    compagnie: 'COVEA (MMA)',
    extranet_url: 'https://www.mma.fr/espace-pro',
    eligible: {
      bonus_max: 3.50,
      sinistres_max: 4,
      accepte_resilie: true,
      anciennete_permis_min_mois: 0,
    },
    scoring: {
      rapport_qualite_prix: 65,
      gestion_sinistres: 72,
      etendue_garanties: 68,
      reactivite: 66,
    },
    formules_disponibles: ['RC', 'Tiers Étendu', 'Tous Risques'],
    prime_base: 1050,
  },
  {
    compagnie: 'APRIL Moto',
    extranet_url: 'https://www.april-moto.com/espace-courtier',
    eligible: {
      bonus_max: 1.50,
      sinistres_max: 2,
      accepte_resilie: false,
      anciennete_permis_min_mois: 12,
    },
    scoring: {
      rapport_qualite_prix: 85,
      gestion_sinistres: 78,
      etendue_garanties: 76,
      reactivite: 80,
    },
    formules_disponibles: ['RC', 'Tiers Étendu', 'Tous Risques'],
    bonus_score_excellent: 6,
    prime_base: 760,
  },
];

/** Retourne les règles d'une compagnie par nom (insensible à la casse) */
export function getCompagnieRule(compagnie: string): CompagnieVehiculeRule | undefined {
  return COMPAGNIES_VEHICULE.find(
    c => c.compagnie.toLowerCase() === compagnie.toLowerCase()
  );
}

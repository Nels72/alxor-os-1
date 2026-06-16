/**
 * Base de connaissance compagnies — famille Véhicule (Auto / Moto).
 * Critères d'éligibilité (gate binaire) + scoring marché.
 *
 * ⚠️ Filet de secours STATIQUE uniquement — utilisé par le store quand
 * Airtable (`Produits_CIE`) est inaccessible ou ne contient pas encore de
 * données réelles exploitables. La source de vérité est Airtable
 * (`services/produitsAirtable.ts`) : toute compagnie/produit ajouté ou
 * complété côté Airtable apparaît instantanément dans le front, sans
 * modification de ce fichier.
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
   * Base de prime annuelle estimée TTC — réservé à un futur usage de
   * tarification réelle. NON utilisé par le moteur de matching actuel
   * (doctrine 2026-06-16 : le matching ne tarife pas).
   */
  prime_base: number;
  /**
   * Fourchette de franchise réelle (€), extraite des fiches produits/DG —
   * absente tant qu'aucune donnée réelle n'a été extraite (jamais de valeur
   * inventée). Alimentée depuis Airtable `Produits_CIE` (`Franchise_Min_EUR`/
   * `Franchise_Max_EUR`) ; volontairement absente ici (filet de secours).
   */
  franchise_min?: number;
  franchise_max?: number;
}

// ─── Compagnies véhicule partenaires Easy Courtage ──────────────────────────
//
// Les 4 compagnies réellement partenaires (cf. Airtable `Compagnies_et_Partenariats`,
// vérifié 2026-06-16). Les critères d'éligibilité et le scoring marché ci-dessous
// sont des valeurs NEUTRES provisoires (permissives par défaut, bénéfice du doute) :
// tant que le métier n'a pas saisi de vrais critères dans `Produits_CIE`, ce filet
// de secours ne doit pas prétendre à une expertise qu'il n'a pas.

export const COMPAGNIES_VEHICULE: CompagnieVehiculeRule[] = [
  {
    compagnie: 'ALLIANZ FRANCE',
    extranet_url: 'https://sdw-alex-courtage.allianz.fr/',
    eligible: {
      bonus_max: 1.50,
      sinistres_max: 2,
      accepte_resilie: false,
    },
    scoring: {
      rapport_qualite_prix: 70,
      gestion_sinistres: 70,
      etendue_garanties: 70,
      reactivite: 70,
    },
    formules_disponibles: ['RC', 'Tiers Étendu', 'Tous Risques'],
    prime_base: 900,
  },
  {
    compagnie: 'AXA FRANCE IARD',
    extranet_url: 'https://inaxa.axa-courtage.fr/Pages/Accueil.aspx',
    eligible: {
      bonus_max: 1.50,
      sinistres_max: 2,
      accepte_resilie: false,
    },
    scoring: {
      rapport_qualite_prix: 70,
      gestion_sinistres: 70,
      etendue_garanties: 70,
      reactivite: 70,
    },
    formules_disponibles: ['RC', 'Tiers Étendu', 'Tous Risques'],
    prime_base: 900,
  },
  {
    compagnie: 'THELEM ASSURANCES',
    extranet_url: 'https://portail-courtage.thelem-assurances.fr/portail-courtage/accueil.action',
    eligible: {
      bonus_max: 1.50,
      sinistres_max: 2,
      accepte_resilie: false,
    },
    scoring: {
      rapport_qualite_prix: 70,
      gestion_sinistres: 70,
      etendue_garanties: 70,
      reactivite: 70,
    },
    formules_disponibles: ['RC', 'Tiers Étendu', 'Tous Risques'],
    prime_base: 900,
  },
  {
    compagnie: 'MAXANCE',
    // ⚠️ Typo « hhtps:// » présente telle quelle dans Airtable
    // (Compagnies_et_Partenariats, URL_Extranet) — corrigée ici pour que le
    // lien fonctionne ; à corriger aussi côté Airtable.
    extranet_url: 'https://extranet.maxance.com',
    eligible: {
      bonus_max: 1.50,
      sinistres_max: 2,
      accepte_resilie: false,
    },
    scoring: {
      rapport_qualite_prix: 70,
      gestion_sinistres: 70,
      etendue_garanties: 70,
      reactivite: 70,
    },
    formules_disponibles: ['RC', 'Tiers Étendu', 'Tous Risques'],
    prime_base: 900,
  },
];

/** Retourne les règles d'une compagnie par nom (insensible à la casse) */
export function getCompagnieRule(compagnie: string): CompagnieVehiculeRule | undefined {
  return COMPAGNIES_VEHICULE.find(
    c => c.compagnie.toLowerCase() === compagnie.toLowerCase()
  );
}

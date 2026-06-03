/**
 * Moteur de matching véhicule (Auto / Moto).
 * Scoring local en 3 phases : éligibilité → appétence → composite.
 * Produit des AISuggestion[] compatibles avec le format existant du store.
 */

import type { AISuggestion } from '../types';
import type { Prospect } from '../types';
import type { AutoProductData } from './prospectProductData';
import { calcAge, VEHICULE_CODES } from './prospectProductData';
import { COMPAGNIES_VEHICULE, type CompagnieVehiculeRule } from './compagnieRules';

// ─── Pondérations du score composite ────────────────────────────────────────
const W_APPETENCE    = 0.50;
const W_QUALITE_PRIX = 0.20;
const W_SINISTRES    = 0.15;
const W_GARANTIES    = 0.10;
const W_REACTIVITE   = 0.05;

// ─── Paramètres de pénalité d'appétence ─────────────────────────────────────
const PENALITE_PAR_TRANCHE_MALUS = 25;  // points perdus par 0.25 de bonus > 1.00
const PENALITE_PAR_SINISTRE      = 8;   // points perdus par sinistre déclaré
const BONUS_ANCIENNETE_MAX       = 10;  // max +10 pts pour 20 ans de permis
const PENALITE_JEUNE_CONDUCTEUR  = 15;  // -15 pts si conducteur < 25 ans
const SEUIL_JEUNE_CONDUCTEUR     = 25;

// ─── Base de prime d'estimation ─────────────────────────────────────────────
const PRIME_MULTIPLICATEUR_MALUS     = 180;  // € par tranche de 0.25 de malus
const PRIME_MULTIPLICATEUR_SINISTRE  = 60;   // € par sinistre
const PRIME_REDUCTION_ANCIENNETE     = 0.02; // 2% de réduction par 12 mois d'ancienneté

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

// ─── Phase 1 : Éligibilité ───────────────────────────────────────────────────

interface EligibiliteResult {
  eligible: boolean;
  motif_exclusion?: string;
}

function checkEligibilite(
  rule: CompagnieVehiculeRule,
  data: AutoProductData,
  ageConducteur: number | null
): EligibiliteResult {
  const { eligible: crit } = rule;

  // Bonus/Malus
  if (data.bonus_malus !== undefined && data.bonus_malus > crit.bonus_max) {
    return {
      eligible: false,
      motif_exclusion: `Bonus/Malus ${data.bonus_malus.toFixed(2)} > seuil ${crit.bonus_max.toFixed(2)}`,
    };
  }

  // Sinistres
  if (data.nb_sinistres_36m !== undefined && data.nb_sinistres_36m > crit.sinistres_max) {
    return {
      eligible: false,
      motif_exclusion: `${data.nb_sinistres_36m} sinistres > maximum ${crit.sinistres_max}`,
    };
  }

  // Résiliation
  if (data.resilie === true && !crit.accepte_resilie) {
    return {
      eligible: false,
      motif_exclusion: 'Profil résilié non accepté',
    };
  }

  // Motifs résiliation exclus
  if (
    data.resilie === true &&
    crit.accepte_resilie &&
    data.motif_resiliation &&
    crit.motifs_resilie_exclus?.some(m =>
      data.motif_resiliation!.toLowerCase().includes(m.toLowerCase())
    )
  ) {
    return {
      eligible: false,
      motif_exclusion: `Motif résiliation "${data.motif_resiliation}" exclu`,
    };
  }

  // Âge conducteur
  if (crit.age_conducteur_min !== undefined && ageConducteur !== null && ageConducteur < crit.age_conducteur_min) {
    return {
      eligible: false,
      motif_exclusion: `Âge conducteur ${ageConducteur} ans < minimum ${crit.age_conducteur_min} ans`,
    };
  }

  // Ancienneté permis
  if (
    crit.anciennete_permis_min_mois !== undefined &&
    crit.anciennete_permis_min_mois > 0 &&
    data.anciennete_permis_mois !== undefined &&
    data.anciennete_permis_mois < crit.anciennete_permis_min_mois
  ) {
    return {
      eligible: false,
      motif_exclusion: `Ancienneté permis ${data.anciennete_permis_mois} mois < minimum ${crit.anciennete_permis_min_mois} mois`,
    };
  }

  // Énergie exclue
  if (
    crit.energies_exclus?.length &&
    data.vehicule_energie &&
    crit.energies_exclus.some(e =>
      data.vehicule_energie!.toLowerCase().includes(e.toLowerCase())
    )
  ) {
    return {
      eligible: false,
      motif_exclusion: `Énergie "${data.vehicule_energie}" non acceptée`,
    };
  }

  return { eligible: true };
}

// ─── Phase 2 : Score appétence technique ─────────────────────────────────────

function calcAppetence(
  rule: CompagnieVehiculeRule,
  data: AutoProductData,
  ageConducteur: number | null
): number {
  let score = 100;

  // Pénalité bonus/malus (par tranche de 0.25 au-dessus de 1.00)
  if (data.bonus_malus !== undefined && data.bonus_malus > 1.0) {
    const tranches = Math.ceil((data.bonus_malus - 1.0) / 0.25);
    score -= tranches * PENALITE_PAR_TRANCHE_MALUS;
  }

  // Pénalité sinistres
  if (data.nb_sinistres_36m !== undefined) {
    score -= data.nb_sinistres_36m * PENALITE_PAR_SINISTRE;
  }

  // Bonus ancienneté permis (plafonné à 20 ans = 240 mois)
  if (data.anciennete_permis_mois !== undefined) {
    const bonusAnciennete = (data.anciennete_permis_mois / 240) * BONUS_ANCIENNETE_MAX;
    score += Math.min(bonusAnciennete, BONUS_ANCIENNETE_MAX);
  }

  // Malus jeune conducteur
  if (ageConducteur !== null && ageConducteur < SEUIL_JEUNE_CONDUCTEUR) {
    score -= PENALITE_JEUNE_CONDUCTEUR;
  }

  // Bonus profil excellent (bonus ≤ 0.50)
  if (
    rule.bonus_score_excellent &&
    data.bonus_malus !== undefined &&
    data.bonus_malus <= 0.50
  ) {
    score += rule.bonus_score_excellent;
  }

  return clamp(Math.round(score), 0, 100);
}

// ─── Phase 3 : Score composite ───────────────────────────────────────────────

function calcComposite(
  rule: CompagnieVehiculeRule,
  appetence: number
): number {
  return Math.round(
    appetence                          * W_APPETENCE +
    rule.scoring.rapport_qualite_prix  * W_QUALITE_PRIX +
    rule.scoring.gestion_sinistres     * W_SINISTRES +
    rule.scoring.etendue_garanties     * W_GARANTIES +
    rule.scoring.reactivite            * W_REACTIVITE
  );
}

// ─── Estimation prime ────────────────────────────────────────────────────────

function estimatePrime(
  rule: CompagnieVehiculeRule,
  data: AutoProductData
): number {
  let prime = rule.prime_base;

  // Surcoût bonus/malus
  if (data.bonus_malus !== undefined && data.bonus_malus > 1.0) {
    const tranches = Math.ceil((data.bonus_malus - 1.0) / 0.25);
    prime += tranches * PRIME_MULTIPLICATEUR_MALUS;
  }

  // Surcoût sinistres
  if (data.nb_sinistres_36m !== undefined && data.nb_sinistres_36m > 0) {
    prime += data.nb_sinistres_36m * PRIME_MULTIPLICATEUR_SINISTRE;
  }

  // Réduction ancienneté (max 40% = 20 ans)
  if (data.anciennete_permis_mois !== undefined) {
    const reductionAns = Math.min(data.anciennete_permis_mois / 12, 20);
    prime = prime * (1 - reductionAns * PRIME_REDUCTION_ANCIENNETE);
  }

  return Math.round(prime / 10) * 10; // arrondi à 10€
}

// ─── Génération justifications ────────────────────────────────────────────────

function buildJustifications(
  rule: CompagnieVehiculeRule,
  data: AutoProductData,
  score: number,
  appetence: number
): string[] {
  const justifs: string[] = [];

  if (appetence >= 80) {
    justifs.push('Profil risque favorable pour cette compagnie');
  }
  if (rule.scoring.rapport_qualite_prix >= 85) {
    justifs.push('Excellent rapport qualité/prix sur ce segment');
  }
  if (rule.scoring.gestion_sinistres >= 88) {
    justifs.push('Reconnu pour la qualité de gestion sinistre');
  }
  if (data.bonus_malus !== undefined && data.bonus_malus <= 0.80) {
    justifs.push(`Bonus ${data.bonus_malus.toFixed(2)} — tarif optimisé`);
  }
  if (data.anciennete_permis_mois !== undefined && data.anciennete_permis_mois >= 120) {
    justifs.push(`${Math.floor(data.anciennete_permis_mois / 12)} ans de permis — profil stable`);
  }
  if (rule.formules_disponibles.includes('Tous Risques')) {
    justifs.push('Tous Risques disponible avec options modulables');
  }

  // Assurer au moins 2 justifications
  if (justifs.length === 0) {
    justifs.push('Compagnie active sur votre profil produit');
    justifs.push('Conditions générales adaptées à ce type de véhicule');
  } else if (justifs.length === 1) {
    justifs.push('Tarif dans la moyenne du marché sur ce segment');
  }

  return justifs.slice(0, 3); // max 3
}

// ─── Point d'entrée principal ────────────────────────────────────────────────

export interface MatchingResult {
  suggestions: AISuggestion[];
  /** Pourcentage de données renseignées (0-100) */
  confidence: number;
  /** Nombre de compagnies éligibles avant filtrage top 3 */
  nb_eligibles: number;
}

export function runVehiculeMatching(prospect: Prospect): AISuggestion[] {
  const data = prospect.product_data?.type === 'vehicule'
    ? prospect.product_data
    : {} as AutoProductData;

  const ageConducteur = calcAge(prospect.date_naissance);

  // Calcul confiance (% champs renseignés)
  const champsClés: (keyof AutoProductData)[] = [
    'bonus_malus', 'nb_sinistres_36m', 'resilie',
    'date_permis', 'immatriculation', 'vehicule_marque',
  ];
  const renseignes = champsClés.filter(k => data[k] !== undefined && data[k] !== null).length;
  const confidence = Math.round((renseignes / champsClés.length) * 100);

  // Phase 1 : Éligibilité
  const eligibles = COMPAGNIES_VEHICULE.filter(rule => {
    const res = checkEligibilite(rule, data, ageConducteur);
    return res.eligible;
  });

  if (eligibles.length === 0) {
    // Aucune compagnie éligible → retourner COVEA en fallback (risques lourds)
    const covea = COMPAGNIES_VEHICULE.find(c => c.compagnie.includes('COVEA'));
    if (!covea) return [];
    eligibles.push(covea);
  }

  // Phases 2 + 3 : Scoring
  const scored = eligibles.map(rule => {
    const appetence = calcAppetence(rule, data, ageConducteur);
    const composite = calcComposite(rule, appetence);
    const prime = estimatePrime(rule, data);
    const justifications = buildJustifications(rule, data, composite, appetence);

    return {
      compagnie: rule.compagnie,
      score: composite,
      tarif_estime: prime,
      franchise: rule.formules_disponibles.includes(
        data.formule_souhaitee || 'Tous Risques'
      )
        ? data.formule_souhaitee === 'RC' ? '0€ (RC seule)' : '300€'
        : '350€',
      garanties: rule.formules_disponibles.join(', '),
      justification: justifications,
      appetence_technique: appetence,
      competitivite_marche: rule.scoring.rapport_qualite_prix,
      note_expertise_courtier: confidence < 40
        ? `Scoring partiel (${confidence}% des données disponibles) — charger le RI pour affiner`
        : undefined,
    } satisfies AISuggestion;
  });

  // Top 3 par score composite décroissant
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

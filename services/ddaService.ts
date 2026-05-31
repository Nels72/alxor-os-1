import { updateDossier, type AirtableDossier } from './airtable';
import type { AISuggestion } from '../types';

export interface DDAPropositions {
  suggestions: AISuggestion[];
  compagnieRetenue?: string;
  motifChoix?: string;
}

/**
 * Enregistre les 3 propositions DDA dans le Dossier Airtable
 * Obligation DDA : traçabilité ACPR — 3 propositions minimum documentées
 */
export async function saveDDAPropositions(
  dossierId: string,
  data: DDAPropositions
): Promise<AirtableDossier> {
  const sorted = [...data.suggestions].sort((a, b) => b.score - a.score);

  const fields: Partial<AirtableDossier['fields']> = {
    DDA_Date_Analyse: new Date().toISOString().split('T')[0],
  };

  // Proposition 1 (meilleur score)
  if (sorted[0]) {
    fields.DDA_Proposition_1_Compagnie = sorted[0].compagnie;
    fields.DDA_Proposition_1_Score = sorted[0].score;
    fields.DDA_Proposition_1_Justification = sorted[0].justification.join('\n');
    fields.DDA_Proposition_1_Prime_Estimee = sorted[0].tarif_estime;
  }

  // Proposition 2
  if (sorted[1]) {
    fields.DDA_Proposition_2_Compagnie = sorted[1].compagnie;
    fields.DDA_Proposition_2_Score = sorted[1].score;
    fields.DDA_Proposition_2_Justification = sorted[1].justification.join('\n');
    fields.DDA_Proposition_2_Prime_Estimee = sorted[1].tarif_estime;
  }

  // Proposition 3
  if (sorted[2]) {
    fields.DDA_Proposition_3_Compagnie = sorted[2].compagnie;
    fields.DDA_Proposition_3_Score = sorted[2].score;
    fields.DDA_Proposition_3_Justification = sorted[2].justification.join('\n');
    fields.DDA_Proposition_3_Prime_Estimee = sorted[2].tarif_estime;
  }

  // Compagnie retenue + motif (si déjà choisi)
  if (data.compagnieRetenue) {
    fields.DDA_Compagnie_Retenue = data.compagnieRetenue;
  }
  if (data.motifChoix) {
    fields.DDA_Motif_Choix = data.motifChoix;
  }

  return updateDossier(dossierId, fields);
}

/**
 * Enregistre le choix final de compagnie (justification courtier)
 */
export async function saveDDAChoixFinal(
  dossierId: string,
  compagnie: string,
  motif: string
): Promise<AirtableDossier> {
  return updateDossier(dossierId, {
    DDA_Compagnie_Retenue: compagnie,
    DDA_Motif_Choix: motif,
    Statut_Dossier: 'En étude',
  });
}


// Correction de l'import : WORKFLOW_DOCUMENTS est le membre exporté de ./preDevisDocuments
import { WORKFLOW_DOCUMENTS } from './preDevisDocuments';

export const calculateGESTotal = (
  produit: string,
  docsUploaded: string[],
  piecesContractuelles: string[] = []
): number => {
  // Phase 1: Pré-devis (0-60%) — granulaire sur bloquants puis obligatoires
  const rawKey = produit || 'AUT';
  const docsRequis = WORKFLOW_DOCUMENTS[rawKey] || WORKFLOW_DOCUMENTS[rawKey.toLowerCase()] || WORKFLOW_DOCUMENTS['AUT'];
  const bloquants = docsRequis.filter(d => d.phase === 1 && d.bloquant);
  const obligatoiresP1 = docsRequis.filter(d => d.phase === 1 && d.obligatoire);

  let phase1Score = 0;
  if (bloquants.length > 0) {
    const bloquantsFournis = bloquants.filter(d => docsUploaded.includes(d.type));
    phase1Score = Math.round((bloquantsFournis.length / bloquants.length) * 60);
  } else if (obligatoiresP1.length > 0) {
    const obligatoiresFournis = obligatoiresP1.filter(d => docsUploaded.includes(d.type));
    phase1Score = Math.round((obligatoiresFournis.length / obligatoiresP1.length) * 60);
  } else {
    phase1Score = 60;
  }

  // Phase 2: Contractuel (0-40% additionnel → max 100%)
  const piecesRequises = ['rib', 'mandat_prelevement', 'contrat_signe'];
  const fournis = piecesRequises.filter(p => piecesContractuelles.includes(p));
  const phase2Score = Math.round((fournis.length / piecesRequises.length) * 40);

  return Math.min(phase1Score + phase2Score, 100);
};

export const checkConversionThreshold = (
  gesScore: number,
  produit: string,
  docsUploaded: string[],
  contratSigne: boolean
): { canConvert: boolean; relanceRequired: boolean } => {
  if (!contratSigne) return { canConvert: false, relanceRequired: false };

  // Vérifier si des documents provisoires sont utilisés (cas Auto)
  const config = WORKFLOW_DOCUMENTS[produit.toLowerCase()] || [];
  const hasProvisoires = config.some(d => d.peut_etre_provisoire && docsUploaded.includes(d.type));

  // Seuil de conversion à 90% si documents provisoires (Auto)
  if (gesScore >= 90 && hasProvisoires) {
    return { canConvert: true, relanceRequired: true };
  }

  // Seuil normal à 100%
  if (gesScore === 100) {
    return { canConvert: true, relanceRequired: false };
  }

  return { canConvert: false, relanceRequired: false };
};

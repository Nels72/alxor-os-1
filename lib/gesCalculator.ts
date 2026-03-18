
// Correction de l'import : WORKFLOW_DOCUMENTS est le membre exporté de ./preDevisDocuments
import { WORKFLOW_DOCUMENTS } from './preDevisDocuments';

export const calculateGESTotal = (
  produit: string, 
  docsUploaded: string[], 
  piecesContractuelles: string[] = []
): number => {
  // Phase 1: Pré-devis (0-50%)
  const docsRequis = WORKFLOW_DOCUMENTS[produit.toLowerCase()] || WORKFLOW_DOCUMENTS['auto'];
  const docsObligatoires = docsRequis.filter(d => d.obligatoire);
  
  let phase1Score = 0;
  if (docsObligatoires.length === 0) {
    phase1Score = 50;
  } else {
    const uploaded = docsObligatoires.filter(d => docsUploaded.includes(d.type));
    phase1Score = Math.round((uploaded.length / docsObligatoires.length) * 50);
  }

  // Phase 2: Contractuel (0-50% additionnel)
  // Pieces: rib, mandat_prelevement, contrat_signe
  const piecesRequises = ['rib', 'mandat_prelevement', 'contrat_signe'];
  const fournis = piecesRequises.filter(p => piecesContractuelles.includes(p));
  const phase2Score = Math.round((fournis.length / piecesRequises.length) * 50);

  return phase1Score + phase2Score;
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
  const hasProvisoires = config.some(d => d.provisoire_accepte && docsUploaded.includes(d.type));

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

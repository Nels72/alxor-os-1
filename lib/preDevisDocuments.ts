// src/lib/preDevisDocuments.ts
// Configuration des documents requis pour chaque type de contrat
// VERSION CORRIGÉE - Février 2026

export interface DocumentConfig {
  type: string;
  label: string;
  phase: 1 | 2 | 3;
  obligatoire: boolean;
  description?: string;
  peut_etre_provisoire?: boolean;
}

// ============================
// AUTO PARTICULIER
// ============================

const AUTO_PHASE_1: DocumentConfig[] = [
  {
    type: 'permis_conduire',
    label: 'Permis de Conduire',
    phase: 1,
    obligatoire: true,
    description: 'Recto-verso',
    peut_etre_provisoire: true,
  },
  {
    type: 'carte_grise',
    label: 'Carte Grise',
    phase: 1,
    obligatoire: true,
    description: 'Certificat d\'immatriculation du véhicule',
    peut_etre_provisoire: true,
  },
  {
    type: 'releve_information',
    label: 'Relevé(s) d\'Information 36 mois',
    phase: 1,
    obligatoire: true,
    description: 'Historique assurance sur 36 derniers mois',
  },
];

// ============================
// RC PRO / MULTIRISQUE PRO
// ============================

const MRP_PHASE_1: DocumentConfig[] = [
  {
    type: 'kbis',
    label: 'KBIS',
    phase: 1,
    obligatoire: true,
    description: 'Extrait K-bis de moins de 3 mois',
  },
  {
    type: 'carte_identite_gerant',
    label: 'Carte d\'Identité du Gérant',
    phase: 1,
    obligatoire: true,
    description: 'CNI ou Passeport en cours de validité',
  },
  {
    type: 'bail_ou_taxe_fonciere',
    label: 'Bail Commercial OU Taxe Foncière',
    phase: 1,
    obligatoire: true,
    description: 'Préciser lequel dans les notes',
  },
  {
    type: 'bilan_comptable',
    label: 'Bilan Comptable',
    phase: 1,
    obligatoire: true,
    description: 'Dernier exercice fiscal clos',
  },
  {
    type: 'descriptif_activite',
    label: 'Descriptif Activité',
    phase: 1,
    obligatoire: true,
    description: 'Description détaillée de l\'activité professionnelle',
  },
  {
    type: 'attestation_assurance_actuelle',
    label: 'Attestation Assurance Actuelle',
    phase: 1,
    obligatoire: false,
    description: 'Si remplacement de contrat existant',
  },
];

// ============================
// HABITATION PARTICULIER
// ============================

const HABITATION_PHASE_1: DocumentConfig[] = [
  {
    type: 'carte_identite',
    label: 'Carte d\'Identité',
    phase: 1,
    obligatoire: true,
    description: 'CNI ou Passeport en cours de validité',
  },
  {
    type: 'justificatif_domicile',
    label: 'Justificatif de Domicile',
    phase: 1,
    obligatoire: true,
    description: 'Facture de moins de 3 mois',
  },
  {
    type: 'titre_propriete_ou_bail',
    label: 'Titre de Propriété OU Bail',
    phase: 1,
    obligatoire: true,
    description: 'Justificatif d\'occupation du logement',
  },
  {
    type: 'descriptif_bien',
    label: 'Descriptif du Bien',
    phase: 1,
    obligatoire: true,
    description: 'Surface, nombre de pièces, étage',
  },
  {
    type: 'attestation_assurance_actuelle',
    label: 'Attestation Assurance Actuelle',
    phase: 1,
    obligatoire: false,
    description: 'Si remplacement de contrat existant',
  },
];

// ============================
// SANTÉ INDIVIDUELLE
// ============================

const SANTE_INDIVIDUELLE_PHASE_1: DocumentConfig[] = [
  {
    type: 'carte_identite',
    label: 'Carte d\'Identité',
    phase: 1,
    obligatoire: true,
    description: 'CNI ou Passeport en cours de validité',
  },
  {
    type: 'carte_vitale',
    label: 'Carte Vitale ou Attestation Sécu',
    phase: 1,
    obligatoire: true,
    description: 'Carte Vitale ou attestation de droits',
  },
  {
    type: 'questionnaire_sante',
    label: 'Questionnaire de Santé',
    phase: 1,
    obligatoire: true,
    description: 'Pré-rempli par l\'IA',
  },
  {
    type: 'justificatif_domicile',
    label: 'Justificatif de Domicile',
    phase: 1,
    obligatoire: true,
    description: 'Facture de moins de 3 mois',
  },
  {
    type: 'rib_iban',
    label: 'RIB/IBAN',
    phase: 1,
    obligatoire: true,
    description: 'Relevé d\'Identité Bancaire',
  },
  {
    type: 'avis_imposition',
    label: 'Avis d\'Imposition',
    phase: 1,
    obligatoire: false,
    description: 'Pour calcul aide CSS si applicable',
  },
];

const SANTE_INDIVIDUELLE_PHASE_2: DocumentConfig[] = [
  {
    type: 'signature_devis_fic',
    label: 'Signature Devis & FIC',
    phase: 2,
    obligatoire: true,
    description: 'Acceptation proposition commerciale (80% GES)',
  },
  {
    type: 'certificat_adhesion_precedente',
    label: 'Certificat Adhésion Précédente',
    phase: 2,
    obligatoire: false,
    description: 'Si portabilité mutuelle (90% GES)',
  },
  {
    type: 'contrat_definitif',
    label: 'Signature Contrat Définitif',
    phase: 2,
    obligatoire: true,
    description: 'Conditions Générales & Particulières (100% GES)',
  },
];

// ============================
// SANTÉ COLLECTIVE
// ============================

const SANTE_COLLECTIVE_PHASE_1: DocumentConfig[] = [
  {
    type: 'kbis',
    label: 'KBIS',
    phase: 1,
    obligatoire: true,
    description: 'Extrait K-bis de moins de 3 mois',
  },
  {
    type: 'carte_identite_gerant',
    label: 'Carte d\'Identité du Gérant',
    phase: 1,
    obligatoire: true,
    description: 'CNI ou Passeport en cours de validité',
  },
  {
    type: 'liste_salaries',
    label: 'Liste Nominative Salariés',
    phase: 1,
    obligatoire: true,
    description: 'Nom, prénom, âge, statut de chaque salarié',
  },
  {
    type: 'bulletins_salaire',
    label: 'Bulletins de Salaire',
    phase: 1,
    obligatoire: true,
    description: 'Dirigeant + échantillon salariés',
  },
  {
    type: 'effectif_insee',
    label: 'Effectif INSEE',
    phase: 1,
    obligatoire: true,
    description: 'Attestation effectif entreprise',
  },
  {
    type: 'due_actuel',
    label: 'DUE ou Notice Actuelle',
    phase: 1,
    obligatoire: false,
    description: 'Si remplacement de contrat',
  },
  {
    type: 'statistiques_sinistralite',
    label: 'Statistiques Sinistralité',
    phase: 1,
    obligatoire: false,
    description: 'Si remplacement de contrat',
  },
];

const SANTE_COLLECTIVE_PHASE_2: DocumentConfig[] = [
  {
    type: 'signature_devis_fic',
    label: 'Signature Devis & FIC',
    phase: 2,
    obligatoire: true,
    description: 'Acceptation proposition commerciale (80% GES)',
  },
  {
    type: 'due_signe',
    label: 'DUE Signé',
    phase: 2,
    obligatoire: true,
    description: 'Document Unique d\'Information (85% GES)',
  },
  {
    type: 'rib_iban',
    label: 'RIB/IBAN Entreprise',
    phase: 2,
    obligatoire: true,
    description: 'Relevé d\'Identité Bancaire (90% GES)',
  },
  {
    type: 'bulletins_adhesion_salaries',
    label: 'Bulletins Adhésion Salariés',
    phase: 2,
    obligatoire: false,
    description: 'Optionnel selon compagnie (95% GES)',
  },
  {
    type: 'contrat_definitif',
    label: 'Signature Contrat Définitif',
    phase: 2,
    obligatoire: true,
    description: 'Conditions Générales & Particulières (100% GES)',
  },
];

// ============================
// PRÉVOYANCE INDIVIDUELLE / TNS
// ============================

const PREVOYANCE_PHASE_1: DocumentConfig[] = [
  {
    type: 'carte_identite',
    label: 'Carte d\'Identité',
    phase: 1,
    obligatoire: true,
    description: 'CNI ou Passeport en cours de validité',
  },
  {
    type: 'questionnaire_medical',
    label: 'Questionnaire Médical Détaillé',
    phase: 1,
    obligatoire: true,
    description: 'Pré-rempli par l\'IA',
  },
  {
    type: 'justificatif_revenus',
    label: 'Justificatif de Revenus',
    phase: 1,
    obligatoire: true,
    description: '3 derniers bulletins ou liasse fiscale TNS',
  },
  {
    type: 'justificatif_domicile',
    label: 'Justificatif de Domicile',
    phase: 1,
    obligatoire: true,
    description: 'Facture de moins de 3 mois',
  },
  {
    type: 'rib_iban',
    label: 'RIB/IBAN',
    phase: 1,
    obligatoire: true,
    description: 'Relevé d\'Identité Bancaire',
  },
];

const PREVOYANCE_PHASE_2: DocumentConfig[] = [
  {
    type: 'signature_devis_fic',
    label: 'Signature Devis & FIC',
    phase: 2,
    obligatoire: true,
    description: 'Acceptation proposition commerciale (70% GES)',
  },
  {
    type: 'questionnaire_medical_complementaire',
    label: 'Questionnaire Médical Complémentaire',
    phase: 2,
    obligatoire: false,
    description: 'Si exigé par la compagnie (80% GES)',
  },
  {
    type: 'certificat_medical',
    label: 'Certificat Médical',
    phase: 2,
    obligatoire: false,
    description: 'Si capital supérieur au seuil (90% GES)',
  },
  {
    type: 'contrat_definitif',
    label: 'Signature Contrat Définitif',
    phase: 2,
    obligatoire: true,
    description: 'Conditions Générales & Particulières (100% GES)',
  },
];

// ============================
// ASSURANCE VIE
// ============================

const VIE_PHASE_1: DocumentConfig[] = [
  {
    type: 'carte_identite',
    label: 'Carte d\'Identité',
    phase: 1,
    obligatoire: true,
    description: 'CNI ou Passeport en cours de validité',
  },
  {
    type: 'justificatif_domicile',
    label: 'Justificatif de Domicile',
    phase: 1,
    obligatoire: true,
    description: 'Facture de moins de 3 mois',
  },
  {
    type: 'rib_iban',
    label: 'RIB/IBAN',
    phase: 1,
    obligatoire: true,
    description: 'Relevé d\'Identité Bancaire',
  },
  {
    type: 'questionnaire_patrimonial',
    label: 'Questionnaire Patrimonial',
    phase: 1,
    obligatoire: true,
    description: 'Pré-rempli par l\'IA',
  },
  {
    type: 'avis_imposition',
    label: 'Avis d\'Imposition',
    phase: 1,
    obligatoire: true,
    description: 'Dernier avis d\'imposition',
  },
];

const VIE_PHASE_2: DocumentConfig[] = [
  {
    type: 'bulletin_souscription',
    label: 'Signature Bulletin de Souscription',
    phase: 2,
    obligatoire: true,
    description: 'Bulletin de souscription (80% GES)',
  },
  {
    type: 'questionnaire_lab',
    label: 'Questionnaire LAB Signé',
    phase: 2,
    obligatoire: true,
    description: 'Lutte anti-blanchiment (90% GES)',
  },
  {
    type: 'contrat_et_dic',
    label: 'Signature Contrat & DIC',
    phase: 2,
    obligatoire: true,
    description: 'Contrat et Document d\'Information Clé (100% GES)',
  },
];

// ============================
// ASSURANCE EMPRUNTEUR
// ============================

const EMPRUNTEUR_PHASE_1: DocumentConfig[] = [
  {
    type: 'carte_identite',
    label: 'Carte d\'Identité',
    phase: 1,
    obligatoire: true,
    description: 'CNI ou Passeport en cours de validité',
  },
  {
    type: 'offre_pret',
    label: 'Offre de Prêt Bancaire',
    phase: 1,
    obligatoire: true,
    description: 'Offre de prêt ou simulation bancaire',
  },
  {
    type: 'questionnaire_medical_simplifie',
    label: 'Questionnaire Médical Simplifié',
    phase: 1,
    obligatoire: true,
    description: 'Pré-rempli par l\'IA',
  },
  {
    type: 'justificatif_domicile',
    label: 'Justificatif de Domicile',
    phase: 1,
    obligatoire: true,
    description: 'Facture de moins de 3 mois',
  },
  {
    type: 'rib_iban',
    label: 'RIB/IBAN',
    phase: 1,
    obligatoire: true,
    description: 'Relevé d\'Identité Bancaire',
  },
];

const EMPRUNTEUR_PHASE_2: DocumentConfig[] = [
  {
    type: 'signature_devis_fic',
    label: 'Signature Devis & FIC',
    phase: 2,
    obligatoire: true,
    description: 'Acceptation proposition commerciale (70% GES)',
  },
  {
    type: 'questionnaire_medical_complementaire',
    label: 'Questionnaire Médical Complémentaire',
    phase: 2,
    obligatoire: false,
    description: 'Si exigé par la compagnie (80% GES)',
  },
  {
    type: 'certificat_medical',
    label: 'Certificat Médical',
    phase: 2,
    obligatoire: false,
    description: 'Si capital supérieur au seuil (90% GES)',
  },
  {
    type: 'contrat_et_cp',
    label: 'Signature Contrat & CP',
    phase: 2,
    obligatoire: true,
    description: 'Contrat et Conditions Particulières (100% GES)',
  },
];

// ============================
// PHASE 2 : PRÉ-CONTRACTUALISATION
// ============================

const PHASE_2_COMMUNE: DocumentConfig[] = [
  {
    type: 'signature_devis_fic',
    label: 'Devis & FIC',
    phase: 2,
    obligatoire: true,
    description: 'Signé & Reçu (upload manuel ou lien Yousign)',
  },
  {
    type: 'rib_iban',
    label: 'RIB',
    phase: 2,
    obligatoire: true,
    description: 'Pour le prélèvement automatique',
  },
];

// ============================
// PHASE 3 : FINALISATION
// ============================

const PHASE_3_COMMUNE: DocumentConfig[] = [
  {
    type: 'contrat_definitif',
    label: 'Contrat Final',
    phase: 3,
    obligatoire: true,
    description: 'Upload depuis extranet compagnie',
    peut_etre_provisoire: true,
  },
];

// ============================
// EXPORT DES CONFIGURATIONS PAR PRODUIT
// ============================

export const WORKFLOW_DOCUMENTS: Record<string, DocumentConfig[]> = {
  // AUTO
  auto: [...AUTO_PHASE_1, ...PHASE_2_COMMUNE, ...PHASE_3_COMMUNE],
  
  // MULTIRISQUE PRO
  mrp: [...MRP_PHASE_1, ...PHASE_2_COMMUNE, ...PHASE_3_COMMUNE],
  rc_pro: [...MRP_PHASE_1, ...PHASE_2_COMMUNE, ...PHASE_3_COMMUNE],
  pro: [...MRP_PHASE_1, ...PHASE_2_COMMUNE, ...PHASE_3_COMMUNE],
  
  // HABITATION
  habitation: [...HABITATION_PHASE_1, ...PHASE_2_COMMUNE, ...PHASE_3_COMMUNE],
  
  // SANTÉ
  sante: [...SANTE_INDIVIDUELLE_PHASE_1, ...SANTE_INDIVIDUELLE_PHASE_2],
  sante_individuelle: [...SANTE_INDIVIDUELLE_PHASE_1, ...SANTE_INDIVIDUELLE_PHASE_2],
  sante_collective: [...SANTE_COLLECTIVE_PHASE_1, ...SANTE_COLLECTIVE_PHASE_2],
  
  // PRÉVOYANCE
  prevoyance: [...PREVOYANCE_PHASE_1, ...PREVOYANCE_PHASE_2],
  
  // ASSURANCE VIE
  vie: [...VIE_PHASE_1, ...VIE_PHASE_2],
  assurance_vie: [...VIE_PHASE_1, ...VIE_PHASE_2],
  
  // ASSURANCE EMPRUNTEUR
  emprunteur: [...EMPRUNTEUR_PHASE_1, ...EMPRUNTEUR_PHASE_2],
  assurance_emprunteur: [...EMPRUNTEUR_PHASE_1, ...EMPRUNTEUR_PHASE_2],
};

// ============================
// HELPERS
// ============================

/**
 * Récupère les documents requis pour un type de contrat
 */
export function getDocumentsForContract(contractType: string): DocumentConfig[] {
  const normalized = contractType.toLowerCase().replace(/\s+/g, '_');
  return WORKFLOW_DOCUMENTS[normalized] || WORKFLOW_DOCUMENTS.auto;
}

/**
 * Vérifie si un document est obligatoire pour un type de contrat
 */
export function isDocumentRequired(contractType: string, docType: string): boolean {
  const docs = getDocumentsForContract(contractType);
  const doc = docs.find(d => d.type === docType);
  return doc?.obligatoire || false;
}

/**
 * Calcule le pourcentage de complétion d'un dossier
 */
export function calculateCompletionPercentage(
  contractType: string,
  uploadedDocs: string[]
): number {
  const allDocs = getDocumentsForContract(contractType);
  const requiredDocs = allDocs.filter(d => d.obligatoire);
  
  if (requiredDocs.length === 0) return 100;
  
  const completedRequired = requiredDocs.filter(d => 
    uploadedDocs.includes(d.type)
  ).length;
  
  return Math.round((completedRequired / requiredDocs.length) * 100);
}

/**
 * Récupère uniquement les documents de Phase 1
 */
export function getPhase1Documents(contractType: string): DocumentConfig[] {
  return getDocumentsForContract(contractType).filter(d => d.phase === 1);
}

/**
 * Récupère uniquement les documents de Phase 2
 */
export function getPhase2Documents(contractType: string): DocumentConfig[] {
  return getDocumentsForContract(contractType).filter(d => d.phase === 2);
}

/**
 * Récupère uniquement les documents de Phase 3
 */
export function getPhase3Documents(contractType: string): DocumentConfig[] {
  return getDocumentsForContract(contractType).filter(d => d.phase === 3);
}

/**
 * Vérifie si la Phase 1 est complète
 */
export function isPhase1Complete(contractType: string, uploadedDocs: string[]): boolean {
  const phase1Docs = getPhase1Documents(contractType).filter(d => d.obligatoire);
  return phase1Docs.every(d => uploadedDocs.includes(d.type));
}

/**
 * Vérifie si la Phase 2 est complète
 */
export function isPhase2Complete(contractType: string, uploadedDocs: string[]): boolean {
  const phase2Docs = getPhase2Documents(contractType).filter(d => d.obligatoire);
  return phase2Docs.every(d => uploadedDocs.includes(d.type));
}

/**
 * Vérifie si la Phase 3 est complète
 */
export function isPhase3Complete(contractType: string, uploadedDocs: string[]): boolean {
  const phase3Docs = getPhase3Documents(contractType).filter(d => d.obligatoire);
  return phase3Docs.every(d => uploadedDocs.includes(d.type));
}


export type EtapeProcessus = 
  | 'sollicitation'      // Réception demande
  | 'analyse'            // Collecte docs + questionnaire
  | 'devis'              // Établissement proposition
  | 'signature'          // Validation contractuelle
  | 'activation';        // Mise en service contrat

export type TypeDocument = 
  | 'piece_identite'
  | 'permis_conduire'
  | 'carte_grise'
  | 'releve_information'
  | 'justificatif_domicile'
  | 'rib'
  | 'questionnaire_sante'
  | 'attestation_ancienne_assurance'
  | 'kbis'
  | 'bilan_comptable'
  | 'attestation_decennale_anterieure'
  | 'diplomes_qualifications'
  | 'questionnaire_risques'
  | 'plan_locaux'
  | 'liste_vehicules'
  | 'devis_signe'
  | 'contrat_signe'
  | 'mandat_prelevement'
  | 'photos_locaux'
  | 'inventaire_mobilier'
  | 'questionnaire_chantiers';

export interface DocumentRequirement {
  type: TypeDocument;
  label: string;
  description: string;
  etape: EtapeProcessus;
  obligatoire: boolean;
  ges_poids: number; // Contribution au score (total = 100)
  formats_acceptes: string[];
  taille_max_mo: number;
}

export interface ProductDocumentConfig {
  produit: string;
  code_produit: string;
  documents: DocumentRequirement[];
}

export const PRODUCT_CONFIGS: Record<string, ProductDocumentConfig> = {
  "auto": {
    produit: "Assurance Automobile",
    code_produit: "auto",
    documents: [
      { type: "piece_identite", label: "Pièce d'identité", description: "CNI ou Passeport", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf", "jpg"], taille_max_mo: 5 },
      { type: "permis_conduire", label: "Permis de conduire", description: "Recto-verso", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf", "jpg"], taille_max_mo: 5 },
      { type: "carte_grise", label: "Carte grise", description: "Certificat d'immatriculation", etape: "analyse", obligatoire: true, ges_poids: 15, formats_acceptes: ["pdf", "jpg"], taille_max_mo: 5 },
      { type: "releve_information", label: "Relevé d'information", description: "Historique 3 ans", etape: "analyse", obligatoire: true, ges_poids: 15, formats_acceptes: ["pdf"], taille_max_mo: 3 },
      { type: "justificatif_domicile", label: "Justificatif domicile", description: "Moins de 3 mois", etape: "analyse", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf", "jpg"], taille_max_mo: 5 },
      { type: "attestation_ancienne_assurance", label: "Ancienne attestation", description: "Si transfert", etape: "devis", obligatoire: false, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 3 },
      { type: "devis_signe", label: "Devis signé", description: "Acceptation électronique", etape: "signature", obligatoire: true, ges_poids: 20, formats_acceptes: ["pdf"], taille_max_mo: 10 },
      { type: "mandat_prelevement", label: "Mandat SEPA", description: "Autorisation prélèvement", etape: "signature", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 3 },
      { type: "rib", label: "RIB", description: "IBAN/BIC", etape: "activation", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf", "jpg"], taille_max_mo: 3 }
    ]
  },
  "habitation": {
    produit: "Multirisque Habitation",
    code_produit: "habitation",
    documents: [
      { type: "piece_identite", label: "Pièce d'identité", description: "CNI ou Passeport", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "justificatif_domicile", label: "Justificatif domicile", description: "Moins de 3 mois", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "questionnaire_risques", label: "Questionnaire risques", description: "Détails du logement", etape: "analyse", obligatoire: true, ges_poids: 20, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "plan_locaux", label: "Plan des locaux", description: "Schéma ou plan archi", etape: "analyse", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf", "jpg"], taille_max_mo: 10 },
      { type: "attestation_ancienne_assurance", label: "Attestation proprio/locataire", description: "Bail ou titre", etape: "analyse", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "photos_locaux", label: "Photos locaux", description: "Vues d'ensemble", etape: "devis", obligatoire: false, ges_poids: 10, formats_acceptes: ["jpg"], taille_max_mo: 10 },
      { type: "devis_signe", label: "Devis signé", description: "Signature e-IDAS", etape: "signature", obligatoire: true, ges_poids: 20, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "mandat_prelevement", label: "Mandat SEPA", description: "Signature électronique", etape: "signature", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 3 },
      { type: "rib", label: "RIB", description: "IBAN", etape: "activation", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 2 }
    ]
  },
  "sante": {
    produit: "Mutuelle Santé Individuelle",
    code_produit: "sante",
    documents: [
      { type: "piece_identite", label: "Pièce d'identité", description: "CNI/Passeport", etape: "sollicitation", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "questionnaire_sante", label: "Questionnaire santé", description: "Formulaire médical", etape: "analyse", obligatoire: true, ges_poids: 30, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "carte_grise", label: "Attestation Vitale", description: "Ou carte vitale scannée", etape: "analyse", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf", "jpg"], taille_max_mo: 5 },
      { type: "attestation_ancienne_assurance", label: "Résil. Mutuelle Préc.", description: "Attestation de fin", etape: "devis", obligatoire: false, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "devis_signe", label: "Devis signé", description: "Contrat mutuelle", etape: "signature", obligatoire: true, ges_poids: 25, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "mandat_prelevement", label: "Mandat SEPA", description: "Prélèvement auto", etape: "signature", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 3 },
      { type: "rib", label: "RIB", description: "IBAN", etape: "activation", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 2 }
    ]
  },
  "rcpro": {
    produit: "Responsabilité Civile Professionnelle",
    code_produit: "rcpro",
    documents: [
      { type: "piece_identite", label: "ID Dirigeant", description: "CNI Dirigeant", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "kbis", label: "Extrait KBIS", description: "Moins de 3 mois", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "questionnaire_risques", label: "Questionnaire activité", description: "Détails métiers", etape: "analyse", obligatoire: true, ges_poids: 20, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "bilan_comptable", label: "Bilan comptable", description: "Dernière liasse fiscale", etape: "analyse", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 10 },
      { type: "diplomes_qualifications", label: "Diplômes / Certifs", description: "Preuve expertise", etape: "analyse", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "attestation_ancienne_assurance", label: "Antériorité RC Pro", description: "Si existante", etape: "devis", obligatoire: false, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "devis_signe", label: "Devis signé", description: "Acceptation RC Pro", etape: "signature", obligatoire: true, ges_poids: 25, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "mandat_prelevement", label: "Mandat SEPA", description: "Gestion auto", etape: "signature", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 3 },
      { type: "rib", label: "RIB Pro", description: "IBAN Pro", etape: "activation", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 2 }
    ]
  },
  "mrp": {
    produit: "Multirisque Professionnelle",
    code_produit: "mrp",
    documents: [
      { type: "piece_identite", label: "ID Dirigeant", description: "CNI", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "kbis", label: "Kbis", description: "KBIS entreprise", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "questionnaire_risques", label: "Questionnaire locaux", description: "Détail des risques locaux", etape: "analyse", obligatoire: true, ges_poids: 20, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "plan_locaux", label: "Plan des locaux", description: "Surface et agencement", etape: "analyse", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 10 },
      { type: "inventaire_mobilier", label: "Inventaire mobilier", description: "Valeur à assurer", etape: "analyse", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "photos_locaux", label: "Photos locaux", description: "Photos intérieur/extérieur", etape: "devis", obligatoire: false, ges_poids: 10, formats_acceptes: ["jpg"], taille_max_mo: 10 },
      { type: "devis_signe", label: "Devis signé", description: "Acceptation MRP", etape: "signature", obligatoire: true, ges_poids: 25, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "mandat_prelevement", label: "Mandat SEPA", description: "Gestion prélèvement", etape: "signature", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 3 },
      { type: "rib", label: "RIB Pro", description: "IBAN entreprise", etape: "activation", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 2 }
    ]
  },
  "decennale": {
    produit: "RC Décennale",
    code_produit: "decennale",
    documents: [
      { type: "piece_identite", label: "ID Dirigeant", description: "CNI Dirigeant", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "kbis", label: "Kbis", description: "KBIS artisan/société", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "diplomes_qualifications", label: "Diplômes / Qualif.", description: "Preuve de compétence", etape: "analyse", obligatoire: true, ges_poids: 15, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "attestation_decennale_anterieure", label: "Attest. Antérieure", description: "Si déjà assuré", etape: "analyse", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "questionnaire_chantiers", label: "Questionnaire chantiers", description: "Détail des activités", etape: "analyse", obligatoire: true, ges_poids: 15, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "bilan_comptable", label: "Dernier bilan", description: "Si activité existante", etape: "devis", obligatoire: false, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "devis_signe", label: "Devis signé", description: "Acceptation Décennale", etape: "signature", obligatoire: true, ges_poids: 30, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "mandat_prelevement", label: "Mandat SEPA", description: "Prélèvement", etape: "signature", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 3 },
      { type: "rib", label: "RIB", description: "IBAN", etape: "activation", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 2 }
    ]
  },
  "flotte": {
    produit: "Flotte Auto",
    code_produit: "flotte",
    documents: [
      { type: "piece_identite", label: "ID Dirigeant", description: "CNI Dirigeant", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "kbis", label: "Kbis", description: "KBIS société", etape: "sollicitation", obligatoire: true, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "liste_vehicules", label: "Liste des véhicules", description: "Fichier avec immatriculations", etape: "analyse", obligatoire: true, ges_poids: 25, formats_acceptes: ["pdf", "xlsx"], taille_max_mo: 10 },
      { type: "releve_information", label: "Relevés infos conducteurs", description: "Sinistralité globale", etape: "analyse", obligatoire: true, ges_poids: 15, formats_acceptes: ["pdf"], taille_max_mo: 10 },
      { type: "bilan_comptable", label: "Bilan", description: "Liasse fiscale", etape: "devis", obligatoire: false, ges_poids: 5, formats_acceptes: ["pdf"], taille_max_mo: 10 },
      { type: "devis_signe", label: "Devis signé", description: "Acceptation Flotte", etape: "signature", obligatoire: true, ges_poids: 25, formats_acceptes: ["pdf"], taille_max_mo: 5 },
      { type: "mandat_prelevement", label: "Mandat SEPA", description: "Prélèvement", etape: "signature", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 3 },
      { type: "rib", label: "RIB Pro", description: "IBAN entreprise", etape: "activation", obligatoire: true, ges_poids: 10, formats_acceptes: ["pdf"], taille_max_mo: 2 }
    ]
  }
};

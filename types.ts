
export type RoleCode = 'ADMIN_ALXOR' | 'COURTIER' | 'CLIENT';
export type ContractStatus = 'brouillon' | 'en_attente' | 'valide' | 'archive' | 'resilie';
export type DocStatus = 'recu' | 'a_completer' | 'conforme' | 'scanning';
export type RequestStatus = 'ouverte' | 'en_cours' | 'terminee';
export type ClientType = 'PARTICULIER' | 'PRO';
export type PriorityLevel = 'Basse' | 'Moyenne' | 'Haute' | 'Critique';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Role {
  id: string;
  code: RoleCode;
  label: string;
}

export interface Client {
  id: string;
  courtier_id: string;
  type: ClientType;
  raison_sociale?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  /** Adresse (rue, cp, ville) pour Identité */
  adresse?: string;
  /** Client Pro uniquement */
  siret?: string;
  code_ape?: string;
  created_at: string;
  ges_score?: number;
}

export interface Contrat {
  id: string;
  client_id: string;
  courtier_id: string;
  type_contrat: string;
  compagnie: string;
  statut: ContractStatus;
  numero_contrat: string;
  date_effet: string;
  date_echeance: string;
  prime_annuelle: number;
  /** Prime annuelle HT (extraite ou calculée), pour affichage grille */
  prime_annuelle_ht?: number;
  /** Phase 3 : extraction IA (AUTO) */
  immatriculation?: string;
  /** Phase 3 : extraction IA (MRH/MRP) */
  adresse_risque?: string;
  /** GED : simulation conformité (documents obligatoires manquants) */
  is_missing_docs?: boolean;
  /** Gestionnaire (nom courtier) pour affichage Data Bar */
  gestionnaire?: string;
  /** Origine de la sollicitation : Cabinet, Apporteur ou Tally Public */
  source?: 'Cabinet' | 'Apporteur' | 'Tally Public';
  /** Date de résiliation (contrat clos / ghost card) */
  resignationDate?: string;
  /** Motif de résiliation */
  resignationReason?: string;
  /** Historique d’avenants (timeline compacte sous la carte) */
  amendments?: Amendment[];
  /** @deprecated Utiliser amendments */
  hasAvenant?: boolean;
  /** @deprecated Utiliser amendments */
  avenants?: Avenant[];
  created_at: string;
}

/** Avenant pour la timeline (delta commission, libellé métier) */
export interface Amendment {
  date: string;
  label: string;
  /** Variation de commission annuelle (€), ex. +12.5 */
  deltaCommission?: number;
  ancienne_immat?: string;
  ancienne_adresse_risque?: string;
}

/** @deprecated Utiliser Amendment */
export interface Avenant {
  date: string;
  motif: string;
  ancienne_immat?: string;
  ancienne_adresse_risque?: string;
  ancienne_prime?: number;
}

export interface AISuggestion {
  compagnie: string;
  score: number;
  tarif_estime: number;
  justification: string[];
  franchise?: string;
  garanties?: string;
  /** Score basé sur les règles de souscription compagnie */
  appetence_technique?: number;
  /** Positionnement prix/garanties */
  competitivite_marche?: number;
  /** Note d'expertise du courtier (justification du choix) */
  note_expertise_courtier?: string;
}

export interface Prospect {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse?: string;
  type_contrat_demande: string;
  statut: 'nouveau' | 'en_analyse' | 'devis_envoye' | 'converti';
  ges_score: number;
  created_at: string;
  descriptif_projet?: string;
  ia_analysis_done?: boolean;
  ai_suggestions?: AISuggestion[]; 
  ai_suggestion?: AISuggestion;    
  priority?: PriorityLevel;
  fiche_conseil_generee?: boolean;
  signature_manuelle_validee?: boolean; // Correspond à la signature du DEVIS/FIC
  contrat_definitif_envoye?: boolean;
  contrat_definitif_signe?: boolean;
  /** Critère limitrophe (ex: antécédent proche de la limite) → badge orange */
  conformite_limitrophe?: boolean;
  /** Documents marqués provisoires → GES plafonné à 90% */
  documents_provisoires?: Record<string, { date_echeance: string }>;
  /** RI 36 mois : période incomplète → GES plafonné à 90% */
  periode_incomplete_ri?: boolean;
  /** Pièces jointes lues depuis Airtable (clé = type workflow ex. permis_conduire) */
  airtable_attachments?: Record<
    string,
    { url: string; filename?: string }[]
  >;
  /** Champs bruts du record Dossiers (courtier, statuts, etc.) */
  airtable_dossier_fields?: Record<string, unknown>;
}

export interface Document {
  id: string;
  client_id?: string;
  contrat_id?: string;
  type_document: string;
  file_url: string;
  statut: DocStatus;
  uploaded_by: string;
  created_at: string;
}

export interface DocumentGED {
  id: string;
  sollicitation_id: string;
  type_document: string;
  storage_url: string;
  statut: DocStatus;
  metadata_extraite?: any;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  timestamp: string;
}

/** Réclamation client – registre ACPR */
export interface Reclamation {
  id: string;
  date_reception: string;
  client_id: string;
  client_nom: string;
  objet: string;
  statut: 'ar_a_envoyer' | 'en_cours' | 'reponse_envoyee';
  created_at: string;
}

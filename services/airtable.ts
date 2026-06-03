const AIRTABLE_BEARER =
  process.env.REACT_APP_AIRTABLE_TOKEN ||
  process.env.REACT_APP_AIRTABLE_PAT ||
  process.env.REACT_APP_AIRTABLE_API_KEY ||
  '';
const AIRTABLE_BASE_ID = process.env.REACT_APP_AIRTABLE_BASE_ID || '';

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const headers = {
  'Authorization': `Bearer ${AIRTABLE_BEARER}`,
  'Content-Type': 'application/json',
};

// Rate limiter global — Airtable free = 5 req/s
// On utilise 1 seul slot + 400ms min pour laisser de la marge aux autres
// consommateurs (n8n, Make.com) qui partagent le même quota base.
let pending: Promise<void> = Promise.resolve();

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export async function airtableFetch(url: string, options?: RequestInit): Promise<Response> {
  // Sérialise toutes les requêtes : chaque appel attend la fin du précédent + 400ms
  const slot = pending.then(() => delay(400));
  pending = slot.catch(() => {});
  await slot;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const wait = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt + 1) * 1000;
      console.warn(`Airtable 429 — retry dans ${wait}ms (tentative ${attempt + 1}/${maxRetries})`);
      await delay(wait);
      continue;
    }
    return response;
  }
  // Dernière tentative sans retry
  return fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
}

/**
 * Vide la file d'attente du rate limiter.
 * Utile quand un batch en arrière-plan est annulé.
 */
export function resetRateLimiter(): void {
  pending = Promise.resolve();
}

// ============================
// TYPES — calés sur le schéma Airtable réel
// ============================

export interface AirtableContact {
  id: string;
  fields: {
    Nom?: string;
    'Prénom'?: string;
    Nom_Complet?: string;
    Email?: string;
    'Téléphone'?: string;
    Adresse?: string;
    Civilite?: 'M.' | 'Mme';
    Type_Contact?: 'Prospect' | 'Client';
    Statut_Contact?: 'Actif' | 'Inactif' | 'Archivé';
    Type_Client?: 'Particulier' | 'Professionnel' | 'Entreprise';
    Date_Naissance?: string;
    SIRET?: string;
    Raison_Sociale?: string;
    Cabinet_Tenant?: string;
    'Préférence_Contact'?: string[];
    Dossiers?: string[];
    Date_Création?: string;
  };
}

export interface AirtableDossier {
  id: string;
  fields: {
    ID_Dossier?: string;
    Contact?: string[];
    Type_Contrat?: string;
    Statut_Dossier?: 'Nouveau à traiter' | 'Contacté' | 'En étude' | 'En cours' | 'Suspendu' | 'Résilié';
    Source?: 'Cabinet' | 'Alex Web Public' | 'Alex Apporteur';
    Message_Initial?: string;
    Notes_Courtier?: string;
    'GES Score'?: number;
    Phase?: string;
    Collaborateurs_Cabinet_Client?: string[];
    RI_Contact?: Array<{ url: string; filename?: string }>;
    RI_Traité?: boolean;
    RI_JSON?: string;
    RI_Compagnie_Précédente?: string;
    RI_Bonus_Malus?: number;
    RI_Nb_Sinistres?: number;
    Type_Sinistres?: string;
    RI_Résilié?: boolean;
    Motif_Resiliation_RI?: string;
    IA_Statut?: string;
    Immatriculation_Véhicule?: string;
    Date_Permis_De_Conduire?: string;
    Numero_Police?: string;
    Montant_Prime_Annuelle?: number;
    Date_Signature?: string;
    Date_Debut_Contrat?: string;
    Date_Fin_Contrat?: string;
    Documents?: string[];
    Documents_Tally?: Array<{ url: string; filename?: string }>;
    Compagnies_et_Partenariats?: string[];
    Date_Création?: string;
    DDA_Proposition_1_Compagnie?: string;
    DDA_Proposition_1_Score?: number;
    DDA_Proposition_1_Justification?: string;
    DDA_Proposition_1_Prime_Estimee?: number;
    DDA_Proposition_2_Compagnie?: string;
    DDA_Proposition_2_Score?: number;
    DDA_Proposition_2_Justification?: string;
    DDA_Proposition_2_Prime_Estimee?: number;
    DDA_Proposition_3_Compagnie?: string;
    DDA_Proposition_3_Score?: number;
    DDA_Proposition_3_Justification?: string;
    DDA_Proposition_3_Prime_Estimee?: number;
    DDA_Compagnie_Retenue?: string;
    DDA_Motif_Choix?: string;
    DDA_Date_Analyse?: string;
    [key: string]: unknown;
  };
}

export type DocumentStatut = 'Valide' | 'Provisoire' | 'Manquant';

export type DocumentType =
  | 'Relevé Informations'
  | 'Permis de Conduire'
  | 'Carte Grise Barrée'
  | 'Carte Grise Définitive'
  | 'Pièce Identité'
  | 'Justificatif Domicile'
  | 'Contrat'
  | 'Devis / Projet'
  | 'Fiche Information Conseil'
  | 'CPI'
  | 'Questionnaire'
  | 'Vérification Requise'
  | 'Inconnu'
  | 'Autre';

export interface AirtableDocument {
  id: string;
  fields: {
    Nom_Fichier?: string;
    Type_Document?: DocumentType;
    Statut_Document?: DocumentStatut;
    Document_Conforme?: boolean;
    Dossier?: string[];
    Date_Upload?: string;
    Dropbox_URL?: string;
    Dropbox_Path?: string;
    Date_Echeance_Provisoire?: string;
    Relance_Envoyee?: boolean;
    [key: string]: unknown;
  };
}

const DOC_TYPE_MAPPING: Record<string, DocumentType> = {
  // Auto
  permis_conduire: 'Permis de Conduire',
  carte_grise: 'Carte Grise Définitive',
  releve_information: 'Relevé Informations',
  // Identité
  carte_identite: 'Pièce Identité',
  carte_identite_gerant: 'Pièce Identité',
  carte_vitale: 'Autre',
  // Domicile / Bien
  justificatif_domicile: 'Justificatif Domicile',
  titre_propriete_ou_bail: 'Autre',
  descriptif_bien: 'Autre',
  // Pro / MRP
  kbis: 'Autre',
  bail_ou_taxe_fonciere: 'Autre',
  bilan_comptable: 'Autre',
  descriptif_activite: 'Autre',
  attestation_assurance_actuelle: 'Autre',
  // Santé collective
  liste_salaries: 'Autre',
  bulletins_salaire: 'Autre',
  effectif_insee: 'Autre',
  due_actuel: 'Autre',
  statistiques_sinistralite: 'Autre',
  due_signe: 'Autre',
  bulletins_adhesion_salaries: 'Autre',
  // Santé individuelle
  certificat_adhesion_precedente: 'Autre',
  avis_imposition: 'Autre',
  // Prévoyance
  justificatif_revenus: 'Autre',
  certificat_medical: 'Autre',
  // Questionnaires (tous produits)
  questionnaire_sante: 'Questionnaire',
  questionnaire_medical: 'Questionnaire',
  questionnaire_medical_simplifie: 'Questionnaire',
  questionnaire_medical_complementaire: 'Questionnaire',
  questionnaire_patrimonial: 'Questionnaire',
  questionnaire_lab: 'Questionnaire',
  // Contractuel
  contrat_definitif: 'Contrat',
  contrat_et_dic: 'Contrat',
  contrat_et_cp: 'Contrat',
  signature_devis_fic: 'Devis / Projet',
  bulletin_souscription: 'Devis / Projet',
  // Financier
  rib_iban: 'Autre',
  offre_pret: 'Autre',
};

export function mapDocTypeToAirtable(workflowType: string): DocumentType {
  return DOC_TYPE_MAPPING[workflowType] || 'Autre';
}

// ── Mapping produits via PRODUCT_CATALOG ────────────────────
import { PRODUCT_CATALOG, getProductByCode } from '../lib/productCatalog';

/** Legacy front keys → code Airtable (rétrocompat anciens stores/données) */
const LEGACY_TO_CODE: Record<string, string> = {
  auto: 'AUT',
  mrp: 'MRP',
  rc_pro: 'RCPRO',
  pro: 'MRP',
  habitation: 'MRH',
  sante: 'SNT',
  sante_individuelle: 'SNT',
  sante_collective: 'COLL',
  prevoyance: 'Autre',
  vie: 'Autre',
  assurance_vie: 'Autre',
  emprunteur: 'EMPRUNTEUR',
  assurance_emprunteur: 'EMPRUNTEUR',
};

/**
 * Convertit un code produit (front ou Airtable) vers le code Airtable.
 * Accepte : 'AUT', 'auto', 'MRP', 'mrp', 'rc_pro', etc.
 */
export function mapProductToAirtable(code: string): string {
  // Si c'est déjà un code Airtable valide, on le retourne directement
  if (getProductByCode(code)) return code;
  // Sinon, tenter le mapping legacy
  return LEGACY_TO_CODE[code.toLowerCase()] || 'Autre';
}

/**
 * Convertit un code Airtable vers le code front.
 * Avec le nouveau catalogue, le code Airtable EST le code front.
 */
export function mapAirtableToProduct(typeContrat: string): string {
  // Le code Airtable est désormais le code canonique
  if (getProductByCode(typeContrat)) return typeContrat;
  // Fallback legacy
  return typeContrat?.toLowerCase() || 'AUT';
}

// ============================
// CONTACTS
// ============================

export async function createContact(fields: Partial<AirtableContact['fields']>): Promise<AirtableContact> {
  const response = await airtableFetch(`${AIRTABLE_API_URL}/Contacts`, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erreur Airtable Contacts: ${response.status}`);
  }
  return response.json();
}

export async function getContactById(recordId: string): Promise<AirtableContact> {
  const response = await airtableFetch(`${AIRTABLE_API_URL}/Contacts/${recordId}`);
  if (!response.ok) throw new Error(`Erreur Airtable: ${response.status}`);
  return response.json();
}

// ============================
// DOSSIERS
// ============================

export async function createDossier(fields: Partial<AirtableDossier['fields']>): Promise<AirtableDossier> {
  const response = await airtableFetch(`${AIRTABLE_API_URL}/Dossiers`, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erreur Airtable Dossiers: ${response.status}`);
  }
  return response.json();
}

export async function getDossierById(recordId: string): Promise<AirtableDossier> {
  const response = await airtableFetch(`${AIRTABLE_API_URL}/Dossiers/${recordId}`);
  if (!response.ok) throw new Error(`Erreur Airtable: ${response.status}`);
  return response.json();
}

export async function updateDossier(
  recordId: string,
  fields: Partial<AirtableDossier['fields']>
): Promise<AirtableDossier> {
  const response = await airtableFetch(`${AIRTABLE_API_URL}/Dossiers/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) throw new Error(`Erreur Airtable: ${response.status}`);
  return response.json();
}

export async function listDossiers(filterFormula?: string): Promise<AirtableDossier[]> {
  const params = new URLSearchParams();
  if (filterFormula) params.set('filterByFormula', filterFormula);
  params.set('pageSize', '100');

  const url = `${AIRTABLE_API_URL}/Dossiers?${params.toString()}`;
  const response = await airtableFetch(url);
  if (!response.ok) throw new Error(`Erreur Airtable: ${response.status}`);
  const data = await response.json();
  return data.records || [];
}

// ============================
// DOCUMENTS
// ============================

export async function getDocumentsByDossier(dossierId: string): Promise<AirtableDocument[]> {
  const filterFormula = `FIND("${dossierId}", ARRAYJOIN({Dossier}))`;
  const response = await airtableFetch(
    `${AIRTABLE_API_URL}/Documents?filterByFormula=${encodeURIComponent(filterFormula)}`
  );
  if (!response.ok) throw new Error(`Erreur Airtable: ${response.status}`);
  const data = await response.json();
  return data.records || [];
}

export async function createDocument(fields: Partial<AirtableDocument['fields']>): Promise<AirtableDocument> {
  const response = await airtableFetch(`${AIRTABLE_API_URL}/Documents`, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erreur Airtable Documents: ${response.status}`);
  }
  return response.json();
}

export async function updateDocument(
  recordId: string,
  fields: Partial<AirtableDocument['fields']>
): Promise<AirtableDocument> {
  const response = await airtableFetch(`${AIRTABLE_API_URL}/Documents/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) throw new Error(`Erreur Airtable: ${response.status}`);
  return response.json();
}

// ============================
// FLUX COMPLET : Création prospect depuis le Cabinet
// ============================

export const CABINET_TENANT = 'EAS-Y8LtQ';

export interface CabinetProspectInput {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  code_produit: string;
  commentaires?: string;
  collaborateur_id?: string;
  civilite: 'M.' | 'Mme';
  date_naissance: string;
  type_client: 'Particulier' | 'Professionnel' | 'Entreprise';
  siret?: string;
  raison_sociale?: string;
}

export interface CabinetProspectResult {
  contact: AirtableContact;
  dossier: AirtableDossier;
}

const N8N_BASE = process.env.REACT_APP_N8N_BASE_URL || '';
const CABINET_WEBHOOK_PATH = '/webhook/creation-prospect-cabinet';

export async function createCabinetProspect(input: CabinetProspectInput): Promise<CabinetProspectResult> {
  // Route via n8n webhook — 0 appel Airtable depuis le navigateur
  const webhookUrl = `${N8N_BASE}${CABINET_WEBHOOK_PATH}`;
  const body: Record<string, unknown> = {
    nom: input.nom,
    prenom: input.prenom,
    email: input.email,
    telephone: input.telephone,
    adresse: input.adresse,
    type_contrat: mapProductToAirtable(input.code_produit), // code catalogue = code Airtable
    commentaires: input.commentaires || '',
    civilite: input.civilite,
    date_naissance: input.date_naissance,
    type_client: input.type_client,
    cabinet_tenant: CABINET_TENANT,
  };
  if (input.siret) body.siret = input.siret;
  if (input.raison_sociale) body.raison_sociale = input.raison_sociale;

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Erreur webhook n8n: ${res.status}`);
  }

  const data = await res.json();
  if (data.status !== 'ok' || !data.dossier_id) {
    throw new Error('Réponse webhook invalide');
  }

  // Retourne un format compatible avec l'existant
  return {
    contact: { id: data.contact_id, fields: {} } as AirtableContact,
    dossier: { id: data.dossier_id, fields: data.dossier_fields || {} } as AirtableDossier,
  };
}

// ============================
// PATCH helpers unitaires
// ============================

/**
 * Met à jour le champ Message_Initial (Besoins et attentes) sur un Dossier.
 */
export async function updateDossierMessageInitial(
  dossierId: string,
  messageInitial: string
): Promise<void> {
  await updateDossier(dossierId, { Message_Initial: messageInitial });
}

// ============================
// MAPPERS : Airtable → App (format Prospect local)
// ============================

export function mapDossierToProspect(
  dossier: AirtableDossier,
  contact?: AirtableContact | null
) {
  const f = dossier.fields;
  const c = contact?.fields;

  const statutMap: Record<string, string> = {
    'Nouveau à traiter': 'nouveau',
    'Contacté': 'en_analyse',
    'En étude': 'en_analyse',
    'En cours': 'devis_envoye',
    'Suspendu': 'devis_envoye',
    'Résilié': 'converti',
  };

  return {
    id: dossier.id,
    nom: c?.Nom || '',
    prenom: c?.['Prénom'] || '',
    email: c?.Email || '',
    telephone: c?.['Téléphone'] || '',
    adresse: c?.Adresse || '',
    type_contrat_demande: mapAirtableToProduct(f.Type_Contrat || ''),
    statut: statutMap[f.Statut_Dossier || ''] || 'nouveau',
    ges_score: f['GES Score'] || 0,
    created_at: f.Date_Création || new Date().toISOString(),
    source: f.Source || 'Cabinet',
    contact_id: contact?.id,
    priority: 'Moyenne' as const,
    descriptif_projet: f.Message_Initial || '',
  };
}

export function mapProspectStatutToAirtable(statut: string): string {
  const mapping: Record<string, string> = {
    nouveau: 'Nouveau à traiter',
    en_analyse: 'En étude',
    devis_envoye: 'En cours',
    converti: 'En cours',
  };
  return mapping[statut] || 'Nouveau à traiter';
}

// ============================
// LOOKUP CONTACT ANTI-DOUBLON
// ============================

export interface ContactLookupResult {
  id: string;
  nom_complet: string;
  email: string;
  telephone: string;
  nb_dossiers: number;
  dossier_ids: string[];
}

/**
 * Recherche un contact existant par email et/ou téléphone.
 * Retourne les contacts matchés (peut être vide).
 */
export async function lookupContactByEmailOrPhone(
  email?: string,
  phone?: string
): Promise<ContactLookupResult[]> {
  if (!email && !phone) return [];

  const clauses: string[] = [];
  if (email) clauses.push(`{Email}="${email}"`);
  if (phone) clauses.push(`{Téléphone}="${phone}"`);

  const formula = clauses.length > 1
    ? `OR(${clauses.join(',')})`
    : clauses[0];

  const params = new URLSearchParams({
    filterByFormula: formula,
    'fields[]': ['Nom_Complet', 'Email', 'Téléphone', 'Dossiers'].join(','),
  });

  // Airtable n'accepte qu'un seul fields[] par param — il faut en envoyer plusieurs
  const url = `${AIRTABLE_API_URL}/Contacts?filterByFormula=${encodeURIComponent(formula)}&fields%5B%5D=Nom_Complet&fields%5B%5D=Email&fields%5B%5D=T%C3%A9l%C3%A9phone&fields%5B%5D=Dossiers`;

  const response = await airtableFetch(url);
  if (!response.ok) {
    console.error('Lookup contact failed:', response.status);
    return [];
  }

  const data = await response.json();
  return (data.records || []).map((r: any) => ({
    id: r.id,
    nom_complet: r.fields?.Nom_Complet || '(sans nom)',
    email: r.fields?.Email || '',
    telephone: r.fields?.['Téléphone'] || '',
    nb_dossiers: (r.fields?.Dossiers || []).length,
    dossier_ids: r.fields?.Dossiers || [],
  }));
}

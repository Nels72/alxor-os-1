import { airtableFetch } from './airtable';

const AIRTABLE_BASE_ID = process.env.REACT_APP_AIRTABLE_BASE_ID || '';
const APPORTEURS_TABLE_ID = 'tblXtiocGwBJ284xa';
const DOSSIERS_TABLE_ID = 'tblh45gV9PZcN1fkz';
const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${APPORTEURS_TABLE_ID}`;
const DOSSIERS_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${DOSSIERS_TABLE_ID}`;

export type ApporteurStatut = 'Actif' | 'Inactif' | 'Suspendu';
export type ApporteurType = 'Indépendant' | 'Courtier' | 'Réseau' | 'Partenaire';
export type ActivationFormulaire = 'Actif' | 'Inactif' | 'Révoqué';

export interface ApporteurDossier {
  id: string;
  idDossier: string;
  statut: string;
  typeContrat: string;
  primeAnnuelle?: number;
  commissionApporteur?: number;
  totalReverseApporteur?: number;
  commsEnAttente?: number;
  dateCreation?: string;
}

export interface Apporteur {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  raisonSociale?: string;
  siret?: string;
  type?: ApporteurType;
  statut: ApporteurStatut;
  activationFormulaire?: ActivationFormulaire;
  commissionDefaut?: number;
  collaborateurIds: string[];
  dossierIds: string[];
  /** Rollup Airtable — total commissions versées */
  cumulReverseApporteur?: number;
  /** Rollup Airtable — total commissions en attente */
  totalEnAttente?: number;
  dateInscription?: string;
  derniereActivite?: string;
  notes?: string;
  lienAlex?: string;
}

function parseRollup(val: unknown): number | undefined {
  if (typeof val === 'number') return val;
  if (Array.isArray(val) && val.length > 0) {
    const n = parseFloat(String(val[0]));
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

function mapRecord(r: { id: string; fields: Record<string, unknown> }): Apporteur {
  return {
    id: r.id,
    nom: (r.fields['Nom_Apporteur'] as string) || '—',
    email: (r.fields['Email_Apporteur'] as string) || undefined,
    telephone: (r.fields['Téléphone'] as string) || undefined,
    raisonSociale: (r.fields['Raison_Sociale'] as string) || undefined,
    siret: (r.fields['SIRET'] as string) || undefined,
    type: (r.fields['Type_Apporteur'] as ApporteurType) || undefined,
    statut: (r.fields['Statut'] as ApporteurStatut) || 'Actif',
    activationFormulaire: (r.fields['Activation_Formulaire'] as ActivationFormulaire) || undefined,
    commissionDefaut: typeof r.fields['Commission_Defaut'] === 'number'
      ? (r.fields['Commission_Defaut'] as number)
      : undefined,
    collaborateurIds: Array.isArray(r.fields['Collaborateurs_Cabinet_Client'])
      ? (r.fields['Collaborateurs_Cabinet_Client'] as string[])
      : [],
    dossierIds: Array.isArray(r.fields['Dossiers_Apportes'])
      ? (r.fields['Dossiers_Apportes'] as string[])
      : [],
    cumulReverseApporteur: parseRollup(r.fields['Total_Reverse_Apporteur']),
    totalEnAttente: parseRollup(r.fields['Total_Global_En_Attente']),
    dateInscription: (r.fields['Date_Inscription'] as string) || undefined,
    derniereActivite: (r.fields['Derniere_Activite'] as string) || undefined,
    notes: (r.fields['Notes'] as string) || undefined,
    lienAlex: (r.fields['Lien_Apporteur_Alex'] as string) || undefined,
  };
}

const FIELDS = [
  'Nom_Apporteur',
  'Email_Apporteur',
  'Téléphone',
  'Raison_Sociale',
  'SIRET',
  'Type_Apporteur',
  'Statut',
  'Activation_Formulaire',
  'Commission_Defaut',
  'Collaborateurs_Cabinet_Client',
  'Dossiers_Apportes',
  'Total_Reverse_Apporteur',
  'Total_Global_En_Attente',
  'Date_Inscription',
  'Derniere_Activite',
  'Lien_Apporteur_Alex',
  'Notes',
].map((f) => `fields[]=${encodeURIComponent(f)}`).join('&');

export async function listApporteurs(): Promise<Apporteur[]> {
  const response = await airtableFetch(
    `${API_URL}?${FIELDS}&sort[0][field]=Nom_Apporteur&sort[0][direction]=asc&pageSize=100`
  );
  if (!response.ok) throw new Error(`Erreur Airtable Apporteurs: ${response.status}`);
  const data = await response.json();
  return (data.records || []).map(mapRecord);
}

/** Charge les dossiers liés à un apporteur depuis leurs IDs. */
export async function fetchDossiersApporteur(dossierIds: string[]): Promise<ApporteurDossier[]> {
  if (dossierIds.length === 0) return [];

  const filter = `OR(${dossierIds.map((id) => `RECORD_ID()="${id}"`).join(',')})`;
  const fields = [
    'ID_Dossier', 'Statut_Dossier', 'Type_Contrat',
    'Montant_Prime_Annuelle', 'Montant_Comm_Apporteur',
    'Total_Reverse_Apporteur', 'Comms_Dossier_En_Attente', 'Date_Création',
  ].map((f) => `fields[]=${encodeURIComponent(f)}`).join('&');

  const response = await airtableFetch(
    `${DOSSIERS_URL}?${fields}&filterByFormula=${encodeURIComponent(filter)}`
  );
  if (!response.ok) return [];
  const data = await response.json();

  return (data.records || []).map((r: { id: string; fields: Record<string, unknown> }): ApporteurDossier => ({
    id: r.id,
    idDossier: (r.fields['ID_Dossier'] as string) || r.id.slice(-6),
    statut: (r.fields['Statut_Dossier'] as string) || '—',
    typeContrat: (r.fields['Type_Contrat'] as string) || '—',
    primeAnnuelle: typeof r.fields['Montant_Prime_Annuelle'] === 'number'
      ? (r.fields['Montant_Prime_Annuelle'] as number) : undefined,
    commissionApporteur: typeof r.fields['Montant_Comm_Apporteur'] === 'number'
      ? (r.fields['Montant_Comm_Apporteur'] as number) : undefined,
    totalReverseApporteur: typeof r.fields['Total_Reverse_Apporteur'] === 'number'
      ? (r.fields['Total_Reverse_Apporteur'] as number) : undefined,
    commsEnAttente: typeof r.fields['Comms_Dossier_En_Attente'] === 'number'
      ? (r.fields['Comms_Dossier_En_Attente'] as number) : undefined,
    dateCreation: (r.fields['Date_Création'] as string) || undefined,
  }));
}

export async function updateApporteur(
  id: string,
  updates: Partial<{
    statut: ApporteurStatut;
    activationFormulaire: ActivationFormulaire;
    commissionDefaut: number;
    collaborateurIds: string[];
    dossierIds: string[];
    notes: string;
  }>
): Promise<Apporteur> {
  const fields: Record<string, unknown> = {};
  if (updates.statut !== undefined) fields['Statut'] = updates.statut;
  if (updates.activationFormulaire !== undefined) fields['Activation_Formulaire'] = updates.activationFormulaire;
  if (updates.commissionDefaut !== undefined) fields['Commission_Defaut'] = updates.commissionDefaut;
  if (updates.collaborateurIds !== undefined) fields['Collaborateurs_Cabinet_Client'] = updates.collaborateurIds;
  if (updates.dossierIds !== undefined) fields['Dossiers_Apportes'] = updates.dossierIds;
  if (updates.notes !== undefined) fields['Notes'] = updates.notes;

  const response = await airtableFetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Échec mise à jour apporteur: ${response.status} — ${JSON.stringify(err)}`);
  }
  const data = await response.json();
  return mapRecord(data);
}

/**
 * Appelé par n8n ou le front après création d'un dossier via canal apporteur.
 * Ajoute le dossier à la liste Dossiers_Apportés de l'apporteur.
 */
export async function linkDossierToApporteur(
  apporteurId: string,
  dossierId: string,
  currentDossierIds: string[]
): Promise<void> {
  if (currentDossierIds.includes(dossierId)) return;
  const response = await airtableFetch(`${API_URL}/${apporteurId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: { 'Dossiers_Apportes': [...currentDossierIds, dossierId] },
    }),
  });
  if (!response.ok) throw new Error(`Échec liaison dossier apporteur: ${response.status}`);
}

import { airtableFetch } from './airtable';

const AIRTABLE_BASE_ID = process.env.REACT_APP_AIRTABLE_BASE_ID || '';
const TABLE_NAME = 'Documents_Cabinet';
const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`;

export type DocCabinetCategorie =
  | 'ORIAS'
  | 'RCP'
  | 'Mandat'
  | 'DDA'
  | 'Convention'
  | 'Administratif'
  | 'Légal'
  | 'Protocole'
  | 'Modèle'
  | 'Autre';

export interface DocumentCabinet {
  id: string;
  nom: string;
  categorie: DocCabinetCategorie;
  url?: string;
  notes?: string;
  date_upload?: string;
  date_expiration?: string;
}

function mapRecord(r: { id: string; fields: Record<string, unknown> }): DocumentCabinet {
  return {
    id: r.id,
    nom: (r.fields['Nom'] as string) || '—',
    categorie: (r.fields['Categorie'] as DocCabinetCategorie) || 'Autre',
    url: (r.fields['URL'] as string) || undefined,
    notes: (r.fields['Notes'] as string) || undefined,
    date_upload: (r.fields['Date_Upload'] as string) || undefined,
    date_expiration: (r.fields['Date_Expiration'] as string) || undefined,
  };
}

export async function listDocumentsCabinet(): Promise<DocumentCabinet[]> {
  const response = await airtableFetch(
    `${API_URL}?sort%5B0%5D%5Bfield%5D=Categorie&sort%5B0%5D%5Bdirection%5D=asc&pageSize=100`
  );
  // Graceful : si la table n'existe pas encore, on retourne []
  if (response.status === 404 || response.status === 422) return [];
  if (!response.ok) throw new Error(`Erreur Airtable Documents Cabinet: ${response.status}`);
  const data = await response.json();
  return (data.records || []).map(mapRecord);
}

export async function createDocumentCabinet(doc: {
  nom: string;
  categorie: DocCabinetCategorie;
  url?: string;
  notes?: string;
  date_expiration?: string;
}): Promise<DocumentCabinet> {
  const fields: Record<string, unknown> = {
    Nom: doc.nom,
    Categorie: doc.categorie,
    Date_Upload: new Date().toISOString().slice(0, 10),
  };
  if (doc.url) fields['URL'] = doc.url;
  if (doc.notes) fields['Notes'] = doc.notes;
  if (doc.date_expiration) fields['Date_Expiration'] = doc.date_expiration;

  const response = await airtableFetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Échec création document: ${response.status} — ${JSON.stringify(err)}`);
  }
  const data = await response.json();
  return mapRecord(data);
}

export async function deleteDocumentCabinet(id: string): Promise<void> {
  const response = await airtableFetch(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Échec suppression document: ${response.status}`);
}

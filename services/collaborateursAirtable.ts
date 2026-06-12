/**
 * Collaborateurs du cabinet — table Airtable Collaborateurs_Cabinet_Client.
 * Sert au sélecteur de profil (V1) et à la reprise de dossier sur absence.
 */

import { airtableFetch } from './airtable';

const AIRTABLE_BASE_ID = process.env.REACT_APP_AIRTABLE_BASE_ID || '';
const COLLABORATEURS_TABLE_ID = 'tbl4G9iXzUpCL0qIS';
const COLLAB_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${COLLABORATEURS_TABLE_ID}`;

export type CollaborateurRole = 'Admin' | 'Assistant' | 'Commercial' | 'Stagiaire';
export type CollaborateurStatut = 'Actif' | 'Absent';

export interface Collaborateur {
  id: string;
  nom: string;
  role: CollaborateurRole;
  statutActivite: CollaborateurStatut;
  email?: string;
}

let collabCache: { data: Collaborateur[]; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60_000;

export async function listCollaborateurs(): Promise<Collaborateur[]> {
  if (collabCache && Date.now() - collabCache.ts < CACHE_TTL_MS) {
    return collabCache.data;
  }
  const response = await airtableFetch(`${COLLAB_API_URL}?pageSize=100`);
  if (!response.ok) throw new Error(`Erreur Airtable Collaborateurs: ${response.status}`);
  const data = await response.json();
  const collabs: Collaborateur[] = (data.records || []).map(
    (r: { id: string; fields: Record<string, unknown> }) => ({
      id: r.id,
      nom:
        (typeof r.fields['Nom_Complet'] === 'string' && r.fields['Nom_Complet']) ||
        `${r.fields['Prenom'] || ''} ${r.fields['Nom'] || ''}`.trim() ||
        '—',
      role: (r.fields['Role'] as CollaborateurRole) || 'Commercial',
      statutActivite: (r.fields['Statut_Activite'] as CollaborateurStatut) || 'Actif',
      email: typeof r.fields['Email_Pro'] === 'string' ? r.fields['Email_Pro'] : undefined,
    })
  );
  collabCache = { data: collabs, ts: Date.now() };
  return collabs;
}

export function clearCollaborateursCache(): void {
  collabCache = null;
}

/**
 * Reprise d'un dossier dont le titulaire est absent : réassigne le dossier
 * au collaborateur repreneur et trace le changement dans Historique_Assignation.
 */
export async function reprendreDossier(
  dossierId: string,
  repreneur: Collaborateur,
  ancienTitulaire: Collaborateur | null,
  historiqueActuel: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const ligne = `${today} — Repris par ${repreneur.nom}${
    ancienTitulaire ? ` (précédent : ${ancienTitulaire.nom}, ${ancienTitulaire.statutActivite.toLowerCase()})` : ''
  }`;
  const historique = historiqueActuel ? `${historiqueActuel}\n${ligne}` : ligne;

  const response = await airtableFetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Dossiers/${dossierId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          Collaborateurs_Cabinet_Client: [repreneur.id],
          Historique_Assignation: historique,
        },
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Échec de la reprise du dossier: ${response.status}`);
  }
}

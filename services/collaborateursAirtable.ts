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
  prenom?: string;
  nomFamille?: string;
  role: CollaborateurRole;
  statutActivite: CollaborateurStatut;
  email?: string;
}

let collabCache: { data: Collaborateur[]; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60_000;

function mapRecord(r: { id: string; fields: Record<string, unknown> }): Collaborateur {
  return {
    id: r.id,
    nom:
      (typeof r.fields['Nom_Complet'] === 'string' && r.fields['Nom_Complet']) ||
      `${r.fields['Prenom'] || ''} ${r.fields['Nom'] || ''}`.trim() ||
      '—',
    prenom: typeof r.fields['Prenom'] === 'string' ? r.fields['Prenom'] : undefined,
    nomFamille: typeof r.fields['Nom'] === 'string' ? r.fields['Nom'] : undefined,
    role: (r.fields['Role'] as CollaborateurRole) || 'Commercial',
    statutActivite: (r.fields['Statut_Activite'] as CollaborateurStatut) || 'Actif',
    email: typeof r.fields['Email_Pro'] === 'string' ? r.fields['Email_Pro'] : undefined,
  };
}

export async function listCollaborateurs(): Promise<Collaborateur[]> {
  if (collabCache && Date.now() - collabCache.ts < CACHE_TTL_MS) {
    return collabCache.data;
  }
  const response = await airtableFetch(`${COLLAB_API_URL}?pageSize=100`);
  if (!response.ok) throw new Error(`Erreur Airtable Collaborateurs: ${response.status}`);
  const data = await response.json();
  const collabs: Collaborateur[] = (data.records || []).map(mapRecord);
  collabCache = { data: collabs, ts: Date.now() };
  return collabs;
}

export function clearCollaborateursCache(): void {
  collabCache = null;
}

/**
 * Authentifie un collaborateur par email + mot de passe provisoire.
 * Retourne le collaborateur si trouvé et actif, null sinon.
 */
export async function authenticateCollaborateur(
  email: string,
  password: string
): Promise<Collaborateur | null> {
  const filterFormula = encodeURIComponent(
    `AND({Email_Pro}="${email.toLowerCase().trim()}",{MDP_Prov}="${password}",{Statut_Activite}="Actif")`
  );
  const response = await airtableFetch(`${COLLAB_API_URL}?filterByFormula=${filterFormula}&maxRecords=1`);
  if (!response.ok) throw new Error(`Erreur Airtable auth: ${response.status}`);
  const data = await response.json();
  if (!data.records || data.records.length === 0) return null;
  const collab = mapRecord(data.records[0]);
  // Mettre à jour le cache pour éviter un rechargement inutile
  if (collabCache) {
    const idx = collabCache.data.findIndex((c) => c.id === collab.id);
    if (idx >= 0) collabCache.data[idx] = collab;
  }
  return collab;
}

/**
 * Crée un nouveau collaborateur dans Airtable.
 */
export async function createCollaborateur(fields: {
  prenom: string;
  nom: string;
  email: string;
  role: CollaborateurRole;
  statut: CollaborateurStatut;
  mdpProv?: string;
}): Promise<Collaborateur> {
  const body: Record<string, unknown> = {
    Prenom: fields.prenom,
    Nom: fields.nom,
    Email_Pro: fields.email.toLowerCase().trim(),
    Role: fields.role,
    Statut_Activite: fields.statut,
  };
  if (fields.mdpProv) body['MDP_Prov'] = fields.mdpProv;

  const response = await airtableFetch(COLLAB_API_URL, {
    method: 'POST',
    body: JSON.stringify({ fields: body }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Échec création collaborateur: ${response.status} — ${JSON.stringify(err)}`);
  }
  const data = await response.json();
  clearCollaborateursCache();
  return mapRecord(data);
}

/**
 * Met à jour un collaborateur existant (PATCH partiel).
 */
export async function updateCollaborateur(
  id: string,
  updates: Partial<{
    prenom: string;
    nom: string;
    email: string;
    role: CollaborateurRole;
    statut: CollaborateurStatut;
    mdpProv: string;
  }>
): Promise<Collaborateur> {
  const fields: Record<string, unknown> = {};
  if (updates.prenom !== undefined) fields['Prenom'] = updates.prenom;
  if (updates.nom !== undefined) fields['Nom'] = updates.nom;
  if (updates.email !== undefined) fields['Email_Pro'] = updates.email.toLowerCase().trim();
  if (updates.role !== undefined) fields['Role'] = updates.role;
  if (updates.statut !== undefined) fields['Statut_Activite'] = updates.statut;
  if (updates.mdpProv !== undefined) fields['MDP_Prov'] = updates.mdpProv;

  const response = await airtableFetch(`${COLLAB_API_URL}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Échec mise à jour collaborateur: ${response.status} — ${JSON.stringify(err)}`);
  }
  const data = await response.json();
  clearCollaborateursCache();
  return mapRecord(data);
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

import type { Prospect } from '../types';
import type { AirtableRecord } from './airtableService';

const BEARER =
  process.env.REACT_APP_AIRTABLE_TOKEN ||
  process.env.REACT_APP_AIRTABLE_PAT ||
  process.env.REACT_APP_AIRTABLE_API_KEY ||
  '';
const BASE_ID = process.env.REACT_APP_AIRTABLE_BASE_ID || '';
const DOSSIERS_TABLE =
  process.env.REACT_APP_AIRTABLE_TABLE_NAME || 'Dossiers';
const CONTACTS_TABLE =
  process.env.REACT_APP_AIRTABLE_CONTACTS_TABLE || 'Contacts';
const CONTACT_LINK_FIELD =
  (process.env.REACT_APP_AIRTABLE_CONTACT_LINK_FIELD || '').trim();

const RIB_FIELD = process.env.REACT_APP_DOSSIER_RIB_FIELD || 'RIB';

/** workflow doc type → noms de champs Airtable possibles (attachments) */
export const AIRTABLE_DOC_FIELD_ALIASES: Record<string, string[]> = {
  permis_conduire: [
    'Permis de conduire',
    'Permis',
    'Permis_conduire',
    'Permis de Conduire',
  ],
  carte_grise: [
    'Carte grise',
    'Carte Grise',
    'Carte_Grise',
    'CG',
    'Certificat d\'immatriculation',
  ],
  releve_information: [
    'Relevé(s) d\'information 36 mois',
    'Relevé d\'information',
    'Relevés d\'information',
    'RI',
    'RI_36',
    'Relevé information',
  ],
};

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${BEARER}`,
    'Content-Type': 'application/json',
  };
}

function isRecordIdArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((x) => typeof x === 'string' && x.startsWith('rec'))
  );
}

export function getLinkedContactIdsFromDossier(
  dossierFields: Record<string, unknown>
): string[] {
  if (CONTACT_LINK_FIELD) {
    const v = dossierFields[CONTACT_LINK_FIELD];
    if (isRecordIdArray(v)) return v;
    return [];
  }
  for (const key of [
    'Contact',
    'Contacts',
    'Fiche contact',
    'Client',
    'Clients',
    'Contact(s)',
  ]) {
    const v = dossierFields[key];
    if (isRecordIdArray(v)) return v;
  }
  return [];
}

export function parseAttachments(
  value: unknown
): { url: string; filename?: string }[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: { url: string; filename?: string }[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === 'object' &&
      'url' in item &&
      typeof (item as { url: unknown }).url === 'string'
    ) {
      const u = (item as { url: string; filename?: string }).url;
      if (u) out.push({ url: u, filename: (item as { filename?: string }).filename });
    }
  }
  return out.length ? out : null;
}

export function buildWorkflowAttachmentMap(
  fields: Record<string, unknown>
): NonNullable<Prospect['airtable_attachments']> {
  const result: NonNullable<Prospect['airtable_attachments']> = {};
  for (const [workflowType, aliases] of Object.entries(
    AIRTABLE_DOC_FIELD_ALIASES
  )) {
    for (const alias of aliases) {
      const att = parseAttachments(fields[alias]);
      if (att?.length) {
        result[workflowType] = att;
        break;
      }
    }
  }
  return result;
}

export function getInsuranceTypeLabel(fields: Record<string, unknown>): string {
  for (const k of [
    'Type de contrat',
    'Type d\'assurance',
    'Nature de la demande',
    'Produit',
    'Type de contrat demandé',
  ]) {
    const v = fields[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '—';
}

export function getBrokerDisplayName(
  fields: Record<string, unknown>
): string | null {
  for (const k of [
    'Courtier',
    'Nom courtier',
    'Collaborateur assigné',
    'Gestionnaire',
    'Courtier référent',
  ]) {
    const v = fields[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (
      Array.isArray(v) &&
      v.length &&
      typeof v[0] === 'string' &&
      !v[0].startsWith('rec')
    ) {
      return v[0].trim();
    }
  }
  return null;
}

function mapStatutToProspect(raw: unknown): Prospect['statut'] {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('convert')) return 'converti';
  if (
    s.includes('devis') ||
    s.includes('signé') ||
    s.includes('signe') ||
    s.includes('attente retour')
  ) {
    return 'devis_envoye';
  }
  if (
    s.includes('analys') ||
    s.includes('cours') ||
    s.includes('tarif')
  ) {
    return 'en_analyse';
  }
  return 'nouveau';
}

function numField(fields: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = fields[k];
    if (typeof v === 'number' && !Number.isNaN(v)) {
      return Math.max(0, Math.min(100, Math.round(v)));
    }
  }
  return 30;
}

function extractContactIdentity(cf: Record<string, unknown>): {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
} {
  const prenom =
    typeof cf['Prénom'] === 'string' ? cf['Prénom'].trim() : '';
  const nom = typeof cf['Nom'] === 'string' ? cf['Nom'].trim() : '';
  let email = '';
  const em = cf['Email'];
  if (typeof em === 'string' && em.trim()) email = em.trim();
  const tel =
    typeof cf['Téléphone'] === 'string'
      ? cf['Téléphone'].trim()
      : typeof cf['Telephone'] === 'string'
        ? cf['Telephone'].trim()
        : '';
  const full =
    typeof cf['Nom complet'] === 'string' ? cf['Nom complet'].trim() : '';
  if (!prenom && !nom && full) {
    const parts = full.split(/\s+/);
    return {
      prenom: parts[0] || 'Client',
      nom: parts.slice(1).join(' ') || ' ',
      email,
      telephone: tel || '—',
    };
  }
  return {
    prenom: prenom || 'Client',
    nom: nom || ' ',
    email,
    telephone: tel || '—',
  };
}

async function fetchJsonRecord(
  table: string,
  id: string
): Promise<AirtableRecord | null> {
  if (!BEARER || !BASE_ID) return null;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchDossierById(
  dossierId: string
): Promise<{ record?: AirtableRecord; error?: string }> {
  if (!BEARER || !BASE_ID) {
    return { error: 'Configuration Airtable manquante.' };
  }
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(DOSSIERS_TABLE)}/${encodeURIComponent(dossierId.trim())}`;
  const res = await fetch(url, { headers: headers() });
  if (res.status === 404) return { error: 'Dossier introuvable.' };
  if (!res.ok) return { error: `Erreur ${res.status}` };
  const record: AirtableRecord = await res.json();
  return { record };
}

export async function listDossierRecords(): Promise<AirtableRecord[]> {
  if (!BEARER || !BASE_ID) return [];
  const out: AirtableRecord[] = [];
  let offset = '';
  do {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(DOSSIERS_TABLE)}?pageSize=100${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) break;
    const data = await res.json();
    const recs = data.records as AirtableRecord[];
    if (Array.isArray(recs)) out.push(...recs);
    offset = typeof data.offset === 'string' ? data.offset : '';
  } while (offset);
  return out;
}

export async function mapDossierToProspect(
  dossier: AirtableRecord
): Promise<Prospect> {
  const f = dossier.fields;
  const contactIds = getLinkedContactIdsFromDossier(f);
  let nom = '';
  let prenom = 'Client';
  let email = '';
  let telephone = '—';

  if (contactIds.length > 0) {
    const contact = await fetchJsonRecord(CONTACTS_TABLE, contactIds[0]);
    if (contact?.fields) {
      const id = extractContactIdentity(contact.fields);
      nom = id.nom;
      prenom = id.prenom;
      email = id.email;
      telephone = id.telephone;
    }
  }

  if (!nom.trim() && !email) {
    const full =
      typeof f['Nom / Prénom'] === 'string'
        ? f['Nom / Prénom'].trim()
        : typeof f['Nom client'] === 'string'
          ? f['Nom client'].trim()
          : '';
    if (full) {
      const p = full.split(/\s+/);
      prenom = p[0] || 'Client';
      nom = p.slice(1).join(' ') || ' ';
    }
  }

  const statutRaw =
    f['Statut_Dossier'] ?? f['Statut dossier'] ?? f['Statut'] ?? '';
  const ges = numField(f, ['GES', 'Score GES', 'GES Score', 'Score']);
  const attachments = buildWorkflowAttachmentMap(f);
  const ribAtt = parseAttachments(f[RIB_FIELD] ?? f['RIB']);
  if (ribAtt?.length) {
    attachments['rib_iban'] = ribAtt;
  }
  const typeLabel = getInsuranceTypeLabel(f);
  const isAuto =
    /auto|véhicule|vehicule|automobile|flotte/i.test(typeLabel.toLowerCase());
  const phase1Keys = ['permis_conduire', 'carte_grise', 'releve_information'];
  const hasAllPhase1Auto =
    isAuto &&
    phase1Keys.every((k) => (attachments[k]?.length ?? 0) > 0);

  return {
    id: dossier.id,
    nom: nom.trim() || '—',
    prenom: prenom.trim() || 'Client',
    email: email || '—',
    telephone,
    type_contrat_demande: typeLabel,
    statut: mapStatutToProspect(statutRaw),
    ges_score: hasAllPhase1Auto ? Math.max(ges, 60) : ges,
    created_at:
      typeof f['Date de création'] === 'string'
        ? f['Date de création']
        : dossier.createdTime?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    airtable_attachments:
      Object.keys(attachments).length > 0 ? attachments : undefined,
    airtable_dossier_fields: f,
  };
}

export function isRibMissing(fields: Record<string, unknown>): boolean {
  const ribKey = RIB_FIELD;
  const v = fields[ribKey] ?? fields['RIB'];
  for (const sk of ['Statut_RIB', 'Statut RIB', 'RIB Statut']) {
    const s = fields[sk];
    if (typeof s === 'string' && /manquant/i.test(s)) return true;
  }
  if (v == null) return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (typeof v === 'string' && !v.trim()) return true;
  return false;
}

export function collectMissingDocumentLabels(
  fields: Record<string, unknown>
): string[] {
  const missing: string[] = [];
  if (isRibMissing(fields)) missing.push('RIB');

  const typeLabel = getInsuranceTypeLabel(fields);
  const isAuto =
    /auto|véhicule|vehicule|automobile|flotte/i.test(typeLabel.toLowerCase());

  const statut = String(
    fields['Statut_Dossier'] ?? fields['Statut dossier'] ?? ''
  );
  if (statut && /incomplet|manquant|à fournir|a fournir/i.test(statut)) {
    if (isAuto && /permis/i.test(statut)) {
      missing.push('Permis de conduire');
    }
    if (isAuto && /carte grise|cg\b|immatricul/i.test(statut)) {
      missing.push('Carte grise');
    }
    if (isAuto && /relevé|ri\b|information/i.test(statut)) {
      missing.push("Relevé(s) d'information");
    }
  }

  const checks: [string, string][] = [
    ['Permis OK', 'Permis de conduire'],
    ['Carte grise OK', 'Carte grise'],
    ['RI OK', "Relevé(s) d'information"],
    ['KBIS OK', 'KBIS'],
  ];
  for (const [field, label] of checks) {
    if (fields[field] === false) missing.push(label);
  }

  if (isAuto) {
    for (const [workflowType, aliases] of Object.entries(
      AIRTABLE_DOC_FIELD_ALIASES
    )) {
      const hasFile = aliases.some(
        (a) => (parseAttachments(fields[a])?.length ?? 0) > 0
      );
      if (hasFile) continue;
      if (workflowType === 'permis_conduire') {
        missing.push('Permis de conduire');
      } else if (workflowType === 'carte_grise') {
        missing.push('Carte grise');
      } else if (workflowType === 'releve_information') {
        missing.push("Relevé(s) d'information");
      }
    }
  }

  return [...new Set(missing)];
}

export async function patchDossierFields(
  dossierId: string,
  fields: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  if (!BEARER || !BASE_ID) {
    return { ok: false, error: 'Configuration Airtable manquante.' };
  }
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(DOSSIERS_TABLE)}/${encodeURIComponent(dossierId.trim())}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: t.slice(0, 200) || `Erreur ${res.status}` };
  }
  return { ok: true };
}

/** Upload optionnel via Cloudinary (unsigned preset) → URL publique pour Airtable. */
export async function uploadFileToPublicUrl(file: File): Promise<string | null> {
  const cloud = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || '';
  const preset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || '';
  if (!cloud || !preset) return null;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', preset);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/auto/upload`,
    { method: 'POST', body: fd }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { secure_url?: string };
  return typeof data.secure_url === 'string' ? data.secure_url : null;
}

export async function uploadRIBToAirtable(
  dossierId: string,
  file: File
): Promise<{ ok: boolean; error?: string; demo?: boolean }> {
  const url = await uploadFileToPublicUrl(file);
  if (url) {
    const patch = await patchDossierFields(dossierId, {
      [RIB_FIELD]: [{ url }],
    });
    return patch.ok ? { ok: true } : { ok: false, error: patch.error };
  }
  return { ok: true, demo: true };
}

export { RIB_FIELD };

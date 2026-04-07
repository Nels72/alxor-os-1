import type { AirtableRecord } from '../services/airtableService';

export type ClientUserSession = {
  dossierId: string;
  clientName: string;
  clientEmail: string;
  dossier: AirtableRecord;
  contact: AirtableRecord | null;
};

function extractEmailFromFields(fields: Record<string, unknown>): string {
  const emailField = fields['Email'];
  if (typeof emailField === 'string' && emailField.trim()) {
    return emailField.trim();
  }
  for (const key of ['E-mail', 'email', 'Mail'] as const) {
    const v = fields[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function extractClientNameFromFields(fields: Record<string, unknown>): string {
  for (const key of [
    'Nom complet',
    'Nom et prénom',
    'Nom/Prénom',
    'Nom & Prénom',
  ] as const) {
    const v = fields[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const prenom =
    typeof fields['Prénom'] === 'string' ? fields['Prénom'].trim() : '';
  const nom = typeof fields['Nom'] === 'string' ? fields['Nom'].trim() : '';
  if (prenom || nom) return `${prenom} ${nom}`.trim();
  const name = fields['Name'];
  if (typeof name === 'string' && name.trim()) return name.trim();
  return '';
}

export function readClientSession(): ClientUserSession | null {
  try {
    const raw = localStorage.getItem('userSession');
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<string, unknown>;

    if (
      typeof data.dossierId === 'string' &&
      typeof data.clientName === 'string' &&
      typeof data.clientEmail === 'string' &&
      data.dossier &&
      typeof data.dossier === 'object'
    ) {
      return data as unknown as ClientUserSession;
    }

    if (
      data.id &&
      typeof data.id === 'string' &&
      data.fields &&
      typeof data.fields === 'object'
    ) {
      const dossier = data as unknown as AirtableRecord;
      const name =
        extractClientNameFromFields(dossier.fields) ||
        extractEmailFromFields(dossier.fields) ||
        'Client';
      return {
        dossierId: dossier.id,
        clientName: name,
        clientEmail: extractEmailFromFields(dossier.fields),
        dossier,
        contact: null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function clearClientSession(): void {
  localStorage.removeItem('userSession');
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

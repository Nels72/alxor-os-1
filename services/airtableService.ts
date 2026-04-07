export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}

/** Données normalisées après login client (stockage `userSession`). */
export interface VerifiedClientSession {
  dossierId: string;
  clientName: string;
  clientEmail: string;
  dossier: AirtableRecord;
  contact: AirtableRecord | null;
}

const AIRTABLE_BEARER =
  process.env.REACT_APP_AIRTABLE_TOKEN ||
  process.env.REACT_APP_AIRTABLE_PAT ||
  process.env.REACT_APP_AIRTABLE_API_KEY ||
  '';
const AIRTABLE_BASE_ID = process.env.REACT_APP_AIRTABLE_BASE_ID || '';
const AIRTABLE_DOSSIERS_TABLE =
  process.env.REACT_APP_AIRTABLE_TABLE_NAME || 'Dossiers';
const AIRTABLE_CONTACTS_TABLE =
  process.env.REACT_APP_AIRTABLE_CONTACTS_TABLE || 'Contacts';
const AIRTABLE_CONTACT_LINK_FIELD =
  (process.env.REACT_APP_AIRTABLE_CONTACT_LINK_FIELD || '').trim();

function getEnvError(): string | null {
  if (!AIRTABLE_BEARER || !AIRTABLE_BASE_ID || !AIRTABLE_DOSSIERS_TABLE) {
    return 'Configuration Airtable manquante (jeton / base / table Dossiers).';
  }
  return null;
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${AIRTABLE_BEARER}`,
    'Content-Type': 'application/json',
  };
}

function extractClientName(fields: Record<string, unknown>): string {
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

function extractEmail(fields: Record<string, unknown>): string {
  const emailField = fields['Email'];
  if (typeof emailField === 'string' && emailField.trim()) {
    return emailField;
  }
  const fallbacks = ['E-mail', 'email', 'Mail'];
  for (const key of fallbacks) {
    const value = fields[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return '';
}

function isRecordIdArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((x) => typeof x === 'string' && x.startsWith('rec'))
  );
}

/** IDs des fiches Contacts liées depuis le record Dossiers. */
function getLinkedContactIds(
  dossierFields: Record<string, unknown>
): string[] {
  if (AIRTABLE_CONTACT_LINK_FIELD) {
    const v = dossierFields[AIRTABLE_CONTACT_LINK_FIELD];
    if (isRecordIdArray(v)) return v;
    return [];
  }
  const guessKeys = [
    'Contact',
    'Contacts',
    'Fiche contact',
    'Client',
    'Clients',
    'Contact(s)',
  ];
  for (const key of guessKeys) {
    const v = dossierFields[key];
    if (isRecordIdArray(v)) return v;
  }
  return [];
}

async function parseErrorMessage(response: Response): Promise<string | null> {
  try {
    const body = await response.clone().json();
    const err = body?.error;
    if (err && typeof err.message === 'string') {
      return err.message;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function fetchRecord(
  tableName: string,
  recordId: string
): Promise<{ record?: AirtableRecord; error?: string; status?: number }> {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`;
  const response = await fetch(url, { headers: authHeaders() });

  if (response.status === 401) {
    const detail = await parseErrorMessage(response);
    return {
      error: detail
        ? `Jeton ou clé invalide : ${detail}`
        : 'Jeton ou clé invalide (401).',
      status: 401,
    };
  }

  if (response.status === 403) {
    return {
      error:
        'Accès refusé (403). Vérifiez les droits du jeton sur cette base et ces tables.',
      status: 403,
    };
  }

  if (response.status === 404) {
    return { error: 'Record introuvable (404).', status: 404 };
  }

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    return {
      error:
        detail ?? `Erreur Airtable (${response.status}). Réessayez plus tard.`,
      status: response.status,
    };
  }

  const record: AirtableRecord = await response.json();
  return { record };
}

export async function verifyCredentials(
  email: string,
  recordId: string
): Promise<{ session?: VerifiedClientSession; error?: string }> {
  const envError = getEnvError();
  if (envError) {
    return { error: envError };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedRecordId = recordId.trim();

  try {
    const dossierResult = await fetchRecord(
      AIRTABLE_DOSSIERS_TABLE,
      normalizedRecordId
    );
    if (dossierResult.error || !dossierResult.record) {
      if (dossierResult.status === 404) {
        return {
          error: 'Dossier introuvable (404). Vérifiez l’ID du record.',
        };
      }
      return { error: dossierResult.error ?? 'Erreur lors du chargement du dossier.' };
    }

    const dossier = dossierResult.record;
    console.log('Airtable response (dossier):', dossier);

    let contactRecord: AirtableRecord | null = null;
    let airtableEmail = extractEmail(dossier.fields).toLowerCase().trim();

    if (!airtableEmail) {
      const contactIds = getLinkedContactIds(dossier.fields);
      if (contactIds.length === 0) {
        return {
          error:
            AIRTABLE_CONTACT_LINK_FIELD
              ? `Aucun contact lié via le champ « ${AIRTABLE_CONTACT_LINK_FIELD} ».`
              : 'Aucun contact lié à ce dossier. Indiquez REACT_APP_AIRTABLE_CONTACT_LINK_FIELD dans .env.local avec le nom exact du champ lien vers Contacts.',
        };
      }

      const contactResult = await fetchRecord(
        AIRTABLE_CONTACTS_TABLE,
        contactIds[0]
      );
      if (contactResult.error || !contactResult.record) {
        return {
          error:
            contactResult.status === 404
              ? 'Contact lié introuvable dans la table Contacts (404).'
              : contactResult.error ?? 'Erreur lors du chargement du contact.',
        };
      }

      contactRecord = contactResult.record;
      console.log('Airtable response (contact):', contactRecord);
      airtableEmail = extractEmail(contactRecord.fields).toLowerCase().trim();
    } else {
      const contactIds = getLinkedContactIds(dossier.fields);
      if (contactIds.length > 0) {
        const contactResult = await fetchRecord(
          AIRTABLE_CONTACTS_TABLE,
          contactIds[0]
        );
        if (contactResult.record) {
          contactRecord = contactResult.record;
          console.log('Airtable response (contact):', contactRecord);
        }
      }
    }

    if (!airtableEmail || airtableEmail !== normalizedEmail) {
      return {
        error:
          'E-mail ne correspond pas au contact de ce dossier. Vérifiez le champ Email dans la table Contacts.',
      };
    }

    const nameSource = contactRecord?.fields ?? dossier.fields;
    const clientName =
      extractClientName(nameSource) ||
      extractClientName(dossier.fields) ||
      'Client';

    return {
      session: {
        dossierId: dossier.id,
        clientName,
        clientEmail: normalizedEmail,
        dossier,
        contact: contactRecord,
      },
    };
  } catch {
    return { error: 'Erreur de connexion au serveur' };
  }
}

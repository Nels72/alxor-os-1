import { queryTable } from '../airtableClient.js';

export const name = 'get_client_fiche';

export const description =
  "Récupère la fiche complète d'un client : coordonnées, tous ses dossiers (contrats actifs et clos), documents de chaque dossier. Prend un nom de contact ou un record ID.";

export const inputSchema = {
  type: 'object' as const,
  properties: {
    contactName: {
      type: 'string',
      description: "Nom complet ou partiel du contact (ex: 'Jean Dupont')",
    },
    contactId: {
      type: 'string',
      description: 'Record ID Airtable du contact (si connu, prioritaire sur le nom)',
    },
  },
  required: [],
};

interface ContactResult {
  id: string;
  nom_complet: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  date_naissance?: string;
  type_client?: string;
  civilite?: string;
  siret?: string;
  raison_sociale?: string;
  statut_contact?: string;
  dossiers: DossierResult[];
}

interface DossierResult {
  id: string;
  id_dossier?: string;
  type_contrat?: string;
  statut_dossier?: string;
  compagnie?: string;
  prime_annuelle?: number;
  date_debut?: string;
  date_fin?: string;
  statut_signature?: string;
  ges_score?: number;
  documents: DocumentResult[];
}

interface DocumentResult {
  id: string;
  type: string;
  statut: string;
  nom_fichier?: string;
}

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0] || '';
  return '';
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  return undefined;
}

export async function execute(input: Record<string, unknown>): Promise<unknown> {
  const contactId = input.contactId as string | undefined;
  const contactName = input.contactName as string | undefined;

  if (!contactId && !contactName) {
    return { error: 'contactName ou contactId requis' };
  }

  let contacts;
  if (contactId) {
    contacts = await queryTable(
      'Contacts',
      `RECORD_ID()="${contactId}"`,
      undefined,
      1,
    );
  } else {
    contacts = await queryTable(
      'Contacts',
      `FIND(LOWER("${contactName}"), LOWER({Nom_Complet}))>0`,
      undefined,
      5,
    );
  }

  if (!contacts.length) {
    return { error: `Aucun contact trouvé pour "${contactName || contactId}"` };
  }

  const contact = contacts[0];
  const f = contact.fields;

  const dossierIds = (f['Dossiers'] as string[]) || [];
  const dossiers: DossierResult[] = [];

  if (dossierIds.length > 0) {
    const filter =
      dossierIds.length <= 10
        ? `OR(${dossierIds.map((id) => `RECORD_ID()="${id}"`).join(',')})`
        : '';

    const dossierRecords = await queryTable('Dossiers', filter || undefined);

    const relevantDossiers = filter
      ? dossierRecords
      : dossierRecords.filter((d) => dossierIds.includes(d.id));

    for (const d of relevantDossiers) {
      const df = d.fields;
      const idDossier = str(df['ID_Dossier']);

      let documents: DocumentResult[] = [];
      if (idDossier) {
        const docRecords = await queryTable(
          'Documents',
          `{Dossier}="${idDossier}"`,
          ['Type_Document', 'Statut_Document', 'Nom_Fichier'],
          50,
        );
        documents = docRecords.map((doc) => ({
          id: doc.id,
          type: str(doc.fields['Type_Document']),
          statut: str(doc.fields['Statut_Document']),
          nom_fichier: str(doc.fields['Nom_Fichier']) || undefined,
        }));
      }

      dossiers.push({
        id: d.id,
        id_dossier: idDossier || undefined,
        type_contrat: str(df['Type_Contrat']) || undefined,
        statut_dossier: str(df['Statut_Dossier']) || undefined,
        compagnie: str(df['Compagnies_et_Partenariats']) || undefined,
        prime_annuelle: num(df['Montant_Prime_Annuelle']),
        date_debut: str(df['Date_Debut_Contrat']) || undefined,
        date_fin: str(df['Date_Fin_Contrat']) || undefined,
        statut_signature: str(df['Statut_Signature']) || undefined,
        ges_score: num(df['GES Score']),
        documents,
      });
    }
  }

  const result: ContactResult = {
    id: contact.id,
    nom_complet: str(f['Nom_Complet']),
    email: str(f['Email']) || undefined,
    telephone: str(f['Téléphone']) || undefined,
    adresse: str(f['Adresse']) || undefined,
    date_naissance: str(f['Date_Naissance']) || undefined,
    type_client: str(f['Type_Client']) || undefined,
    civilite: str(f['Civilite']) || undefined,
    siret: str(f['SIRET']) || undefined,
    raison_sociale: str(f['Raison_Sociale']) || undefined,
    statut_contact: str(f['Statut_Contact']) || undefined,
    dossiers,
  };

  return result;
}

import { queryTable } from '../airtableClient.js';

export const name = 'query_contacts';

export const description =
  "Recherche ou liste les contacts (clients/prospects) dans Airtable. Sans searchTerm, retourne tous les contacts (avec filterByFormula optionnel). Avec searchTerm, recherche par nom, email ou téléphone.";

export const inputSchema = {
  type: 'object' as const,
  properties: {
    searchTerm: {
      type: 'string',
      description:
        'Nom (partiel ou complet), email ou téléphone. Omettre pour lister tous les contacts.',
    },
    searchBy: {
      type: 'string',
      enum: ['nom', 'email', 'telephone'],
      description: "Champ de recherche (défaut : 'nom'). Ignoré si searchTerm absent.",
    },
    filterByFormula: {
      type: 'string',
      description:
        "Formule Airtable directe (alternative à searchTerm). Exemples : {Type_Contact}='Client', {Statut_Contact}='Actif'",
    },
    fields: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Champs à retourner. Principaux : Nom_Complet, Nom, Prénom, Email, Téléphone, Adresse, Date_Naissance, Type_Contact, Statut_Contact, Type_Client, SIRET, Raison_Sociale, Dossiers',
    },
    maxRecords: {
      type: 'number',
      description: 'Limite de résultats (défaut : 100)',
    },
  },
};

export async function execute(input: Record<string, unknown>): Promise<unknown> {
  const term = input.searchTerm as string | undefined;
  const by = (input.searchBy as string) || 'nom';
  const max = (input.maxRecords as number) || 100;
  const fields = input.fields as string[] | undefined;
  const directFilter = input.filterByFormula as string | undefined;

  let filter: string | undefined;

  if (term) {
    switch (by) {
      case 'email':
        filter = `LOWER({Email})=LOWER("${term}")`;
        break;
      case 'telephone':
        filter = `OR({Téléphone}="${term}", {Téléphone}="${term.replace(/\s/g, '')}")`;
        break;
      default:
        filter = `OR(FIND(LOWER("${term}"), LOWER({Nom_Complet}))>0, FIND(LOWER("${term}"), LOWER({Nom}))>0, FIND(LOWER("${term}"), LOWER({Prénom}))>0)`;
    }
  } else if (directFilter) {
    filter = directFilter;
  }

  const records = await queryTable('Contacts', filter, fields, max);

  return {
    count: records.length,
    contacts: records.map((r) => ({
      id: r.id,
      ...r.fields,
    })),
  };
}

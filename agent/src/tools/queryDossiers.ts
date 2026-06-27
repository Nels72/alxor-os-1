import { queryTable } from '../airtableClient.js';

export const name = 'query_dossiers';

export const description =
  "Recherche des dossiers (contrats/prospects) dans la base Airtable avec un filtre. Utilise filterByFormula Airtable. Les contrats actifs ont Statut_Dossier='En cours' et Date_Fin_Contrat renseignée. Le champ Date_Fin_Contrat contient la date d'échéance.";

export const inputSchema = {
  type: 'object' as const,
  properties: {
    filterByFormula: {
      type: 'string',
      description:
        "Formule Airtable. Exemples : AND({Statut_Dossier}='En cours', IS_AFTER({Date_Fin_Contrat}, '2026-08-31'), IS_BEFORE({Date_Fin_Contrat}, '2026-10-01'))",
    },
    fields: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Champs à retourner. Principaux : ID_Dossier, Type_Contrat, Montant_Prime_Annuelle, Date_Debut_Contrat, Date_Fin_Contrat, Statut_Dossier, Statut_Signature, Contact, Compagnies_et_Partenariats, Source, GES Score',
    },
    maxRecords: {
      type: 'number',
      description: 'Limite de résultats (défaut : 100)',
    },
  },
  required: ['filterByFormula'],
};

export async function execute(input: Record<string, unknown>): Promise<unknown> {
  const filter = input.filterByFormula as string;
  const fields = input.fields as string[] | undefined;
  const maxRecords = (input.maxRecords as number) || 100;

  const records = await queryTable('Dossiers', filter, fields, maxRecords);

  return {
    count: records.length,
    records: records.map((r) => ({
      id: r.id,
      ...r.fields,
    })),
  };
}

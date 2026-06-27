import { queryTable } from '../airtableClient.js';

export const name = 'query_collaborateurs';

export const description =
  "Liste les collaborateurs du cabinet (table Collaborateurs_Cabinet_Client). Permet de voir l'équipe, la charge de travail, les rôles et statuts d'activité. Utile pour les rapports de production par collaborateur.";

export const inputSchema = {
  type: 'object' as const,
  properties: {
    filterByFormula: {
      type: 'string',
      description:
        "Formule Airtable optionnelle. Exemples : {Statut_Activite}='Actif', {Role}='Commercial'",
    },
    fields: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Champs à retourner. Principaux : Nom_Complet, Prenom, Nom, Role, Statut_Activite, Email_Pro, Telephone Pro, Charge_Actuelle, ID_Collaborateur, Dossiers, Apporteurs_Assignes',
    },
  },
};

export async function execute(input: Record<string, unknown>): Promise<unknown> {
  const filter = (input.filterByFormula as string) || '';
  const fields = input.fields as string[] | undefined;

  const records = await queryTable('Collaborateurs_Cabinet_Client', filter || undefined, fields, 100);

  return {
    count: records.length,
    records: records.map((r) => ({
      id: r.id,
      ...r.fields,
    })),
  };
}

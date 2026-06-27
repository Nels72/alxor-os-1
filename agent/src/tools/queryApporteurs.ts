import { queryTable } from '../airtableClient.js';

export const name = 'query_apporteurs';

export const description =
  "Liste les apporteurs d'affaires du cabinet (table Apporteurs). Permet de voir leurs informations, commissions, dossiers apportés, statut et activité. Le champ Commission_Defaut est le taux de rétrocession par défaut (ex: 0.5 = 50%). Les champs Total_Reverse_Apporteur et Total_Global_En_Attente sont des rollups sur les dossiers liés.";

export const inputSchema = {
  type: 'object' as const,
  properties: {
    filterByFormula: {
      type: 'string',
      description:
        "Formule Airtable optionnelle. Exemples : {Statut}='Actif', {Type_Apporteur}='Indépendant'",
    },
    fields: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Champs à retourner. Principaux : Nom_Apporteur, Email_Apporteur, Téléphone, Type_Apporteur, Statut, Commission_Defaut, Total_Reverse_Apporteur, Total_Global_En_Attente, Dossiers_Apportes, Collaborateurs_Cabinet_Client, SIRET, Raison_Sociale, Derniere_Activite, Activation_Formulaire',
    },
  },
};

export async function execute(input: Record<string, unknown>): Promise<unknown> {
  const filter = (input.filterByFormula as string) || '';
  const fields = input.fields as string[] | undefined;

  const records = await queryTable('Apporteurs', filter || undefined, fields, 100);

  return {
    count: records.length,
    records: records.map((r) => ({
      id: r.id,
      ...r.fields,
    })),
  };
}

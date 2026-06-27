import { queryTable } from '../airtableClient.js';

export const name = 'rapport_production';

export const description =
  "Génère un rapport de production et/ou état des commissions. Charge les dossiers avec leurs données financières (primes, commissions, apporteurs) et agrège par collaborateur, apporteur, compagnie ou période. Utile pour : volume de production, CA primes, commissions cabinet, rétrocessions apporteurs, taux de transformation.";

export const inputSchema = {
  type: 'object' as const,
  properties: {
    filterByFormula: {
      type: 'string',
      description:
        "Filtre optionnel sur les dossiers. Exemples : {Statut_Dossier}='En cours' pour le portefeuille actif, AND({Statut_Dossier}='En cours', {Type_Contrat}='AUT') pour les contrats auto actifs",
    },
    groupBy: {
      type: 'string',
      enum: ['collaborateur', 'apporteur', 'compagnie', 'type_contrat', 'statut', 'source'],
      description: 'Axe de regroupement principal pour le rapport',
    },
    includeCommissions: {
      type: 'boolean',
      description: 'Inclure le détail des commissions et rétrocessions (défaut : true)',
    },
  },
};

interface DossierRecord {
  id: string;
  fields: Record<string, unknown>;
}

function safeNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (Array.isArray(val)) return val.length > 0 ? safeNumber(val[0]) : 0;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function safeString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(', ');
  return String(val ?? '—');
}

export async function execute(input: Record<string, unknown>): Promise<unknown> {
  const filter = (input.filterByFormula as string) || undefined;
  const groupBy = (input.groupBy as string) || 'collaborateur';
  const includeCommissions = input.includeCommissions !== false;

  const fields = [
    'ID_Dossier', 'Type_Contrat', 'Statut_Dossier', 'Montant_Prime_Annuelle',
    'Montant_Commission_Annuelle', 'Montant_Comm_Apporteur', 'Tx_Com_Dossier_Applique',
    'Taux_Apporteur', 'Total_Reverse_Apporteur', 'Commission_Fractionnee',
    'Comms_Dossier_En_Attente', 'Contact', 'Collaborateurs_Cabinet_Client',
    'Apporteur_Dossier', 'Compagnies_et_Partenariats', 'Source',
    'Date_Debut_Contrat', 'Date_Fin_Contrat', 'Devis_Prime_TTC',
  ];

  const dossiers = await queryTable('Dossiers', filter, fields, 1000);

  const totaux = {
    nb_dossiers: dossiers.length,
    total_primes: 0,
    total_commissions_cabinet: 0,
    total_retrocessions_apporteurs: 0,
    total_en_attente: 0,
  };

  const groups: Record<string, {
    label: string;
    nb_dossiers: number;
    total_primes: number;
    total_commissions: number;
    total_retrocessions: number;
    total_en_attente: number;
    dossiers_ids: string[];
  }> = {};

  for (const d of dossiers) {
    const f = d.fields;
    const prime = safeNumber(f['Montant_Prime_Annuelle']);
    const commCabinet = safeNumber(f['Montant_Commission_Annuelle']);
    const commApporteur = safeNumber(f['Montant_Comm_Apporteur']);
    const enAttente = safeNumber(f['Comms_Dossier_En_Attente']);

    totaux.total_primes += prime;
    totaux.total_commissions_cabinet += commCabinet;
    totaux.total_retrocessions_apporteurs += commApporteur;
    totaux.total_en_attente += enAttente;

    let groupKey: string;
    switch (groupBy) {
      case 'apporteur':
        groupKey = safeString(f['Apporteur_Dossier']);
        break;
      case 'compagnie':
        groupKey = safeString(f['Compagnies_et_Partenariats']);
        break;
      case 'type_contrat':
        groupKey = safeString(f['Type_Contrat']);
        break;
      case 'statut':
        groupKey = safeString(f['Statut_Dossier']);
        break;
      case 'source':
        groupKey = safeString(f['Source']);
        break;
      default:
        groupKey = safeString(f['Collaborateurs_Cabinet_Client']);
    }

    if (!groupKey || groupKey === '—') groupKey = 'Non assigné';

    if (!groups[groupKey]) {
      groups[groupKey] = {
        label: groupKey,
        nb_dossiers: 0,
        total_primes: 0,
        total_commissions: 0,
        total_retrocessions: 0,
        total_en_attente: 0,
        dossiers_ids: [],
      };
    }

    const g = groups[groupKey];
    g.nb_dossiers++;
    g.total_primes += prime;
    g.total_commissions += commCabinet;
    g.total_retrocessions += commApporteur;
    g.total_en_attente += enAttente;
    g.dossiers_ids.push(safeString(f['ID_Dossier']));
  }

  const result: Record<string, unknown> = {
    totaux,
    groupBy,
    groupes: Object.values(groups).sort((a, b) => b.total_primes - a.total_primes),
  };

  if (!includeCommissions) {
    for (const g of result.groupes as typeof groups[string][]) {
      delete (g as Record<string, unknown>)['total_commissions'];
      delete (g as Record<string, unknown>)['total_retrocessions'];
      delete (g as Record<string, unknown>)['total_en_attente'];
    }
    delete (result.totaux as Record<string, unknown>)['total_commissions_cabinet'];
    delete (result.totaux as Record<string, unknown>)['total_retrocessions_apporteurs'];
    delete (result.totaux as Record<string, unknown>)['total_en_attente'];
  }

  return result;
}

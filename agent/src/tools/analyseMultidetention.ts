import { queryTable } from '../airtableClient.js';

export const name = 'analyse_multidetention';

export const description =
  "Analyse la multidétention d'un client : identifie les produits qu'il détient, ceux qui lui manquent, et propose des opportunités argumentées. Prend un nom ou un record ID de contact.";

export const inputSchema = {
  type: 'object' as const,
  properties: {
    contactName: {
      type: 'string',
      description: 'Nom complet ou partiel du contact',
    },
    contactId: {
      type: 'string',
      description: 'Record ID Airtable du contact (prioritaire sur le nom)',
    },
  },
  required: [],
};

interface ProductDef {
  code: string;
  label: string;
  category: string;
}

const PRODUCT_CATALOG: ProductDef[] = [
  { code: 'AUT', label: 'Auto', category: 'Véhicule' },
  { code: 'MOT', label: 'Moto', category: 'Véhicule' },
  { code: 'CYCLO', label: 'Cyclo / Scooter', category: 'Véhicule' },
  { code: 'FLO_AUT', label: 'Flotte Auto', category: 'Véhicule' },
  { code: 'PLAISANCE', label: 'Bateau / Jet Ski', category: 'Véhicule' },
  { code: 'MRH', label: 'Habitation (MRH)', category: 'Particulier' },
  { code: 'PNO', label: 'Propriétaire Non Occupant', category: 'Particulier' },
  { code: 'SNT', label: 'Mutuelle Santé', category: 'Particulier' },
  { code: 'PJ', label: 'Protection Juridique', category: 'Particulier' },
  { code: 'MRP', label: 'Multirisque Pro (MRP)', category: 'Professionnel' },
  { code: 'RCPRO', label: 'RC Professionnelle', category: 'Professionnel' },
  { code: 'RCE', label: 'RC Entreprise', category: 'Professionnel' },
  { code: 'RCD', label: 'RC Décennale', category: 'Professionnel' },
  { code: 'CYBER', label: 'Cyber Risques', category: 'Professionnel' },
  { code: 'COLL', label: 'Santé / Prévoyance Collective', category: 'Professionnel' },
  { code: 'EMPRUNTEUR', label: 'Assurance Emprunteur', category: 'Transversal' },
];

interface Opportunity {
  produit_code: string;
  produit_label: string;
  category: string;
  pertinence: 'haute' | 'moyenne' | 'basse';
  argumentaire: string;
  question_qualification?: string;
}

const PERTINENCE_RULES: Record<string, {
  condition: (profil: string, detenus: string[]) => boolean;
  pertinence: 'haute' | 'moyenne' | 'basse';
  argumentaire: string;
  question?: string;
}> = {
  MRH: {
    condition: (profil) => profil === 'Particulier',
    pertinence: 'haute',
    argumentaire:
      "Client particulier sans assurance habitation. Selon le profil (propriétaire/locataire), la MRH est obligatoire ou fortement recommandée.",
    question: 'Propriétaire ou locataire ?',
  },
  PJ: {
    condition: (profil, detenus) =>
      profil === 'Particulier' && (detenus.includes('MRH') || detenus.includes('AUT')),
    pertinence: 'moyenne',
    argumentaire:
      "Client déjà équipé en auto ou habitation. La Protection Juridique complète naturellement la couverture, sauf si déjà incluse dans un contrat existant.",
    question: 'PJ déjà incluse dans un contrat existant ?',
  },
  SNT: {
    condition: (profil) => profil === 'Particulier',
    pertinence: 'moyenne',
    argumentaire:
      "Aucune mutuelle santé individuelle détectée. À vérifier : le client peut être couvert par la mutuelle de son employeur (obligation ANI).",
    question: 'Couvert par une mutuelle employeur ?',
  },
  EMPRUNTEUR: {
    condition: (profil, detenus) =>
      (profil === 'Particulier' && detenus.includes('MRH')),
    pertinence: 'basse',
    argumentaire:
      "Client propriétaire (MRH active). Possibilité de délégation d'assurance emprunteur (loi Lemoine) si crédit immobilier en cours.",
    question: 'Crédit immobilier en cours ?',
  },
  MRP: {
    condition: (profil) => profil === 'Professionnel' || profil === 'Entreprise',
    pertinence: 'haute',
    argumentaire:
      "Client professionnel sans multirisque pro. Protection des locaux, du matériel et de la perte d'exploitation.",
  },
  RCPRO: {
    condition: (profil) => profil === 'Professionnel' || profil === 'Entreprise',
    pertinence: 'haute',
    argumentaire:
      "Client professionnel sans RC Pro. Obligatoire pour de nombreuses professions réglementées, fortement recommandée pour toutes.",
  },
  CYBER: {
    condition: (profil) => profil === 'Professionnel' || profil === 'Entreprise',
    pertinence: 'moyenne',
    argumentaire:
      "Risque cyber en forte croissance. Couvre les conséquences d'une cyberattaque : perte de données, interruption d'activité, responsabilité envers les tiers.",
  },
};

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0] || '';
  return '';
}

export async function execute(input: Record<string, unknown>): Promise<unknown> {
  const contactId = input.contactId as string | undefined;
  const contactName = input.contactName as string | undefined;

  if (!contactId && !contactName) {
    return { error: 'contactName ou contactId requis' };
  }

  let contacts;
  if (contactId) {
    contacts = await queryTable('Contacts', `RECORD_ID()="${contactId}"`, undefined, 1);
  } else {
    contacts = await queryTable(
      'Contacts',
      `FIND(LOWER("${contactName}"), LOWER({Nom_Complet}))>0`,
      undefined,
      1,
    );
  }

  if (!contacts.length) {
    return { error: `Aucun contact trouvé pour "${contactName || contactId}"` };
  }

  const contact = contacts[0];
  const cf = contact.fields;
  const nomComplet = str(cf['Nom_Complet']);
  const typeClient = str(cf['Type_Client']) || 'Particulier';
  const dossierIds = (cf['Dossiers'] as string[]) || [];

  if (!dossierIds.length) {
    return {
      contact: nomComplet,
      type_client: typeClient,
      produits_detenus: [],
      score_multidetention: 0,
      message: 'Aucun dossier trouvé pour ce contact.',
    };
  }

  const filter = `OR(${dossierIds.map((id) => `RECORD_ID()="${id}"`).join(',')})`;
  const dossiers = await queryTable('Dossiers', filter, [
    'Type_Contrat',
    'Statut_Dossier',
    'Compagnies_et_Partenariats',
    'Montant_Prime_Annuelle',
    'Date_Fin_Contrat',
  ]);

  const dossiersActifs = dossiers.filter((d) => {
    const statut = str(d.fields['Statut_Dossier']);
    return /en cours|contacté|en étude/i.test(statut) || !!d.fields['Date_Fin_Contrat'];
  });

  const produitsDetenusCodes = [
    ...new Set(
      dossiersActifs
        .map((d) => str(d.fields['Type_Contrat']).toUpperCase())
        .filter(Boolean),
    ),
  ];

  const produitsDetenusLabels = produitsDetenusCodes.map((code) => {
    const p = PRODUCT_CATALOG.find((pc) => pc.code === code);
    return p ? p.label : code;
  });

  const profil = /professionnel|entreprise/i.test(typeClient) ? 'Professionnel' : 'Particulier';

  const produitsPertinents = PRODUCT_CATALOG.filter((p) => {
    if (profil === 'Particulier') {
      return ['AUT', 'MOT', 'MRH', 'PNO', 'SNT', 'PJ', 'EMPRUNTEUR'].includes(p.code);
    }
    return ['AUT', 'FLO_AUT', 'MRP', 'RCPRO', 'RCE', 'RCD', 'CYBER', 'COLL', 'EMPRUNTEUR'].includes(p.code);
  });

  const nbPertinents = produitsPertinents.length;
  const nbDetenus = produitsDetenusCodes.filter((c) =>
    produitsPertinents.some((p) => p.code === c),
  ).length;
  const scoreMultidetention = nbPertinents > 0
    ? Math.round((nbDetenus / nbPertinents) * 100)
    : 0;

  const opportunities: Opportunity[] = [];
  for (const produit of produitsPertinents) {
    if (produitsDetenusCodes.includes(produit.code)) continue;

    const rule = PERTINENCE_RULES[produit.code];
    if (rule && rule.condition(profil, produitsDetenusCodes)) {
      opportunities.push({
        produit_code: produit.code,
        produit_label: produit.label,
        category: produit.category,
        pertinence: rule.pertinence,
        argumentaire: rule.argumentaire,
        question_qualification: rule.question,
      });
    }
  }

  const pertinenceOrder = { haute: 0, moyenne: 1, basse: 2 };
  opportunities.sort((a, b) => pertinenceOrder[a.pertinence] - pertinenceOrder[b.pertinence]);

  const primeTotal = dossiersActifs.reduce((sum, d) => {
    const p = d.fields['Montant_Prime_Annuelle'];
    return sum + (typeof p === 'number' ? p : 0);
  }, 0);

  return {
    contact: nomComplet,
    contact_id: contact.id,
    type_client: typeClient,
    profil,
    produits_detenus: produitsDetenusLabels,
    produits_detenus_codes: produitsDetenusCodes,
    nb_dossiers_actifs: dossiersActifs.length,
    prime_totale_annuelle: primeTotal,
    score_multidetention: scoreMultidetention,
    score_label:
      scoreMultidetention < 30 ? 'faible' : scoreMultidetention < 60 ? 'moyen' : 'bon',
    nb_produits_pertinents: nbPertinents,
    nb_produits_detenus: nbDetenus,
    opportunites: opportunities,
    avertissement:
      'Ces recommandations sont basées sur les contrats connus dans le portefeuille ECA. Le client peut détenir des contrats chez d\'autres courtiers ou assureurs non visibles ici.',
  };
}

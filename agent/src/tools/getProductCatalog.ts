export const name = 'get_product_catalog';

export const description =
  "Retourne le catalogue complet des 16 produits d'assurance commercialisés par Easy Courtage, organisés par catégorie.";

export const inputSchema = {
  type: 'object' as const,
  properties: {},
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

const PARTICULIER_CODES = ['AUT', 'MOT', 'CYCLO', 'MRH', 'PNO', 'SNT', 'PJ', 'EMPRUNTEUR', 'PLAISANCE'];
const PROFESSIONNEL_CODES = ['AUT', 'FLO_AUT', 'MRP', 'RCPRO', 'RCE', 'RCD', 'CYBER', 'COLL', 'EMPRUNTEUR'];

export async function execute(_input: Record<string, unknown>): Promise<unknown> {
  return {
    total_products: PRODUCT_CATALOG.length,
    products: PRODUCT_CATALOG,
    pertinence_par_profil: {
      Particulier: PARTICULIER_CODES,
      Professionnel: PROFESSIONNEL_CODES,
    },
  };
}

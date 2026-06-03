
/** Catalogue centralisé des produits – aligné sur REF_Produits Airtable */

export interface ProductDef {
  /** Code Airtable (Nomenclature_Type_Contrat) */
  code: string;
  /** Label affichage formulaire */
  label: string;
  /** Catégorie pour regroupement dropdown */
  category: 'vehicule' | 'particulier' | 'professionnel' | 'transversal';
  /** Clé pour lookup dans WORKFLOW_DOCUMENTS (preDevisDocuments.ts) */
  docSet: 'auto' | 'mrp' | 'rcd' | 'habitation' | 'sante' | 'sante_collective' | 'prevoyance' | 'vie' | 'emprunteur' | 'generic';
  /** Type FIC si applicable (ficTemplates.ts) */
  ficType?: 'auto' | 'mrh' | 'mrp' | 'sante' | 'sante_collective' | 'prevoyance' | 'vie' | 'emprunteur';
}

export const PRODUCT_CATALOG: ProductDef[] = [
  // ── Véhicule ──────────────────────────────────────────────
  { code: 'AUT',       label: 'Auto',                        category: 'vehicule',      docSet: 'auto',             ficType: 'auto' },
  { code: 'MOT',       label: 'Moto',                        category: 'vehicule',      docSet: 'auto',             ficType: 'auto' },
  { code: 'CYCLO',     label: 'Cyclo',                       category: 'vehicule',      docSet: 'auto',             ficType: 'auto' },
  { code: 'FLO_AUT',   label: 'Flotte Auto',                 category: 'vehicule',      docSet: 'auto',             ficType: 'auto' },
  { code: 'PLAISANCE', label: 'Bateau / Jet Ski',            category: 'vehicule',      docSet: 'generic' },

  // ── Particulier ───────────────────────────────────────────
  { code: 'MRH',       label: 'Habitation',                  category: 'particulier',   docSet: 'habitation',       ficType: 'mrh' },
  { code: 'PNO',       label: 'Propriétaire Non Occupant',   category: 'particulier',   docSet: 'habitation',       ficType: 'mrh' },
  { code: 'SNT',       label: 'Mutuelle Santé',              category: 'particulier',   docSet: 'sante',            ficType: 'sante' },
  { code: 'PJ',        label: 'Protection Juridique',        category: 'particulier',   docSet: 'generic' },

  // ── Professionnel ─────────────────────────────────────────
  { code: 'MRP',       label: 'MRP Multirisques Pro',        category: 'professionnel', docSet: 'mrp',              ficType: 'mrp' },
  { code: 'RCPRO',     label: 'RC Professionnelle',          category: 'professionnel', docSet: 'mrp',              ficType: 'mrp' },
  { code: 'RCE',       label: 'RC Entreprise',               category: 'professionnel', docSet: 'mrp',              ficType: 'mrp' },
  { code: 'RCD',       label: 'RC Décennale',                category: 'professionnel', docSet: 'rcd',              ficType: 'mrp' },
  { code: 'CYBER',     label: 'Cyber Risque',                category: 'professionnel', docSet: 'generic' },
  { code: 'COLL',      label: 'Santé / Prévoyance Coll.',    category: 'professionnel', docSet: 'sante_collective', ficType: 'sante_collective' },

  // ── Transversal ───────────────────────────────────────────
  { code: 'EMPRUNTEUR', label: 'Assurance Emprunteur',       category: 'transversal',   docSet: 'emprunteur',       ficType: 'emprunteur' },
  { code: 'Autre',      label: 'Autre',                      category: 'transversal',   docSet: 'generic' },
];

/** Labels de catégorie pour l'affichage groupé */
export const CATEGORY_LABELS: Record<ProductDef['category'], string> = {
  vehicule:      'Véhicule',
  particulier:   'Particulier',
  professionnel: 'Professionnel',
  transversal:   'Transversal',
};

/** Ordre d'affichage des catégories */
export const CATEGORY_ORDER: ProductDef['category'][] = [
  'vehicule', 'particulier', 'professionnel', 'transversal',
];

// ── Helpers ──────────────────────────────────────────────────

/** Lookup produit par code Airtable */
export const getProductByCode = (code: string): ProductDef | undefined =>
  PRODUCT_CATALOG.find(p => p.code === code);

/** Label lisible d'un code produit */
export const getProductLabel = (code: string): string =>
  getProductByCode(code)?.label ?? code;

/** Clé docSet pour lookup WORKFLOW_DOCUMENTS */
export const getDocSetKey = (code: string): string =>
  getProductByCode(code)?.docSet ?? 'generic';

/** Type FIC pour ficTemplates */
export const getFicType = (code: string): string | undefined =>
  getProductByCode(code)?.ficType;

/** Produits groupés par catégorie (pour dropdown) */
export const getProductsByCategory = (): { category: ProductDef['category']; label: string; products: ProductDef[] }[] =>
  CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    products: PRODUCT_CATALOG.filter(p => p.category === cat),
  }));

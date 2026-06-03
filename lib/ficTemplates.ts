// lib/ficTemplates.ts
// Templates et constantes pour la Fiche d'Information et de Conseil (FIC)
// Conformité DDA — tous produits couverts.

import type { DevisExtrait, GarantieExtraite, OptionExtraite } from '../services/devisExtraction';

// ============================
// CONSTANTES LÉGALES ECA
// ============================

export const ECA_LEGAL = {
  raisonSociale: 'EASY COURTAGE ASSURANCE',
  formeJuridique: 'Société à responsabilité limitée à associé unique',
  capital: '10 000 €',
  siege: '47 rue Victor Hugo 94140 Alfortville',
  rcs: '524 966 421 R.C.S. Créteil',
  oriasNumero: '10 058 195',
  oriasCategorie: 'Courtier d\'assurance',
  oriasUrl: 'www.orias.fr',
  acpr: 'Autorité de Contrôle Prudentiel et de Résolution, 61 rue Taitbout 75436 Paris Cedex 09',
  articleCode: 'L 520-1. II catégorie b)',

  presentationText: `Société à responsabilité limitée à associé unique, au capital social de 10 000 €, dont le siège est sis au 47 rue Victor Hugo 94140 Alfortville et immatriculée sous le n° 524 966 421 R.C.S. Créteil. Immatriculée à l'ORIAS (www.orias.fr) dans la catégorie « Courtier d'assurance » sous le n° 10 058 195, soumise au contrôle de l'Autorité de Contrôle Prudentiel et de Résolution, 61 rue Taitbout 75436 Paris Cedex 09.

Notre société ne détient aucune participation directe ou indirecte d'une compagnie d'assurance. Aucune entreprise d'assurance ne détient de participation directe ou indirecte dans notre société. EASY COURTAGE ASSURANCE exerce son activité en application des dispositions de l'article L 520-1. II catégorie b) du Code des Assurances. EASY COURTAGE ASSURANCE ne prétend pas fonder son analyse sur un nombre suffisant de contrats d'assurance offert sur le marché. La liste des compagnies d'assurance partenaires étant disponible sur demande.

Notre société est rémunérée sous la forme de commissions qui nous sont versées par les assureurs en pourcentage de la prime HT que vous réglez. Notre société est également rémunérée sous la forme d'honoraires que vous réglez. Les honoraires sont établis en fonction du montant de la prime d'assurance annuelle hors taxes.`,

  partenaires: [
    'AXA', 'ALLIANZ', 'GENERALI', 'THELEM ASSURANCES', 'M.M.A', 'APRIL', 'ASAF', 'OYAT',
    'EURODOMMAGES', 'LEADER', 'MAXANCE', 'RCDPRO', 'NETVOX', 'SOS MALUS', 'CARMINE',
    'HELVETIA', 'ALBINGIA', 'ADVALUE', 'ENTORIA', 'ECA ASSURANCES', 'SADA', 'DIF ASSURANCES',
    'WAZARI', 'APIVIA', 'ZEPHIR', 'XENASSUR', 'NEOLIANE',
  ],

  reclamationsText: `En cas de réclamation, vous pouvez vous adresser au Service Réclamations d'EASY COURTAGE ASSURANCE par courrier au 47 rue Victor Hugo 94140 Alfortville ou par email à reclamation@easycourtage.fr. Si le désaccord persiste, vous pouvez saisir le Médiateur de l'Assurance : La Médiation de l'Assurance, TSA 50110, 75441 Paris Cedex 09 — www.mediation-assurance.org`,
};

// ============================
// INTERFACES DONNÉES FIC
// ============================

export interface FicSouscripteur {
  civilite?: string;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
}

export interface FicDataBase {
  souscripteur: FicSouscripteur;
  compagnie: string;
  primeAnnuelleTTC: number;
  fraisDossierTTC: number;
  formuleProposee: string;
  recommandation: string;
  lieuSignature: string;
  dateSignature: string;
  garanties: GarantieExtraite[];
  options: OptionExtraite[];
}

// --- Données produit-spécifiques ---

export interface AutoFicData extends FicDataBase {
  type: 'auto';
  vehicule: {
    marque?: string;
    modele?: string;
    immatriculation?: string;
    lieuGarage?: string;
  };
  formuleSouhaitee?: string;
}

export interface MrhFicData extends FicDataBase {
  type: 'mrh';
  logement: {
    typeLogement?: string; // Appartement / Maison
    qualiteOccupant?: string; // Propriétaire / Locataire
    surface?: string;
    nbPieces?: string;
    etage?: string;
  };
}

export interface MrpFicData extends FicDataBase {
  type: 'mrp';
  entreprise: {
    raisonSociale?: string;
    siren?: string;
    adresseSiege?: string;
    activite?: string;
  };
}

export interface SanteFicData extends FicDataBase {
  type: 'sante';
  regime?: string;
  compositionFamille?: string;
}

export interface SanteCollectiveFicData extends FicDataBase {
  type: 'sante_collective';
  entreprise: {
    raisonSociale?: string;
    siren?: string;
    effectif?: string;
    ccn?: string; // Convention collective
  };
}

export interface PrevoyanceFicData extends FicDataBase {
  type: 'prevoyance';
  revenus?: string;
  situationFamiliale?: string;
}

export interface VieFicData extends FicDataBase {
  type: 'vie';
  objectifs?: string;
  profilRisque?: string;
  clauseBeneficiaire?: string;
}

export interface EmprunteurFicData extends FicDataBase {
  type: 'emprunteur';
  pret: {
    montant?: string;
    duree?: string;
    taux?: string;
    banque?: string;
  };
}

export type FicData =
  | AutoFicData
  | MrhFicData
  | MrpFicData
  | SanteFicData
  | SanteCollectiveFicData
  | PrevoyanceFicData
  | VieFicData
  | EmprunteurFicData;

// ============================
// TITRES PAR PRODUIT
// ============================

export const FIC_TITLES: Record<FicData['type'], string> = {
  auto: 'AUTOMOBILE',
  mrh: 'MULTIRISQUE HABITATION',
  mrp: 'MULTIRISQUE PROFESSIONNELLE / RC PRO',
  sante: 'COMPLÉMENTAIRE SANTÉ',
  sante_collective: 'COMPLÉMENTAIRE SANTÉ COLLECTIVE',
  prevoyance: 'PRÉVOYANCE',
  vie: 'ASSURANCE VIE',
  emprunteur: 'ASSURANCE EMPRUNTEUR',
};

// ============================
// FORMULES PAR PRODUIT
// ============================

export const AUTO_FORMULES = [
  { code: 'F1', label: 'Responsabilité Civile, Défense civile, Défense pénale et recours suite à accident, Assistance, Garantie personnelle du conducteur' },
  { code: 'F2', label: 'F1 + BDG + Vol + Incendie - Explosion - Tempêtes, Attentats et actes de terrorisme, Catastrophes naturelles et technologiques' },
  { code: 'F3', label: 'F2 + Dommages tous accidents' },
  { code: 'F4', label: 'F3 + Contenu du véhicule, Indemnisation renforcée' },
];

export const MRH_GARANTIES_BASE = [
  'Responsabilité Civile',
  'Incendie - Explosion',
  'Dégâts des eaux',
  'Vol - Vandalisme',
  'Catastrophes naturelles',
  'Catastrophes technologiques',
  'Tempêtes',
  'Bris de glace',
  'Dommages électriques',
  'Attentats - Actes de terrorisme',
];

export const MRH_SERVICES_OPTIONNELS = [
  'Assistance habitation',
  'Protection juridique',
  'Garantie scolaire',
  'Garantie objets de valeur',
  'Garantie piscine / véranda',
  'Dépannage d\'urgence',
];

export const MRP_GARANTIES = [
  'Responsabilité Civile Exploitation',
  'Responsabilité Civile Professionnelle',
  'Incendie - Explosion',
  'Dégâts des eaux',
  'Vol - Vandalisme',
  'Bris de glace',
  'Bris de machine',
  'Dommages électriques',
  'Catastrophes naturelles',
  'Catastrophes technologiques',
  'Tempêtes',
  'Attentats - Actes de terrorisme',
  'Perte d\'exploitation',
  'Protection juridique',
  'Marchandises transportées',
];

export const SANTE_NIVEAUX = [
  { poste: 'Soins courants', niveaux: ['Économique', 'Confort', 'Confort+', 'Optimal'] },
  { poste: 'Hospitalisation', niveaux: ['Économique', 'Confort', 'Confort+', 'Optimal'] },
  { poste: 'Dentaire', niveaux: ['Économique', 'Confort', 'Confort+', 'Optimal'] },
  { poste: 'Optique', niveaux: ['Économique', 'Confort', 'Confort+', 'Optimal'] },
  { poste: 'Médecines douces', niveaux: ['Non couvert', 'Base', 'Confort', 'Optimal'] },
];

export const PREVOYANCE_GARANTIES = [
  'Capital Décès',
  'Incapacité Temporaire Totale (ITT)',
  'Invalidité Permanente Totale (IPT)',
  'Invalidité Permanente Partielle (IPP)',
  'Rente conjoint',
  'Rente éducation',
];

export const VIE_OPTIONS = [
  'Fonds en euros',
  'Unités de compte',
  'Gestion pilotée',
  'Gestion libre',
  'Option d\'arbitrage automatique',
];

export const EMPRUNTEUR_GARANTIES = [
  'Décès (DC)',
  'Perte Totale et Irréversible d\'Autonomie (PTIA)',
  'Incapacité Temporaire Totale (ITT)',
  'Invalidité Permanente Partielle (IPP)',
  'Invalidité Permanente Totale (IPT)',
  'Perte d\'emploi',
];

// ============================
// HELPERS — PRÉ-REMPLISSAGE
// ============================

import type { Prospect, AISuggestion } from '../types';
import { getFicType } from './productCatalog';

/**
 * Détecte le type FIC à partir du type de contrat demandé.
 */
export function detectFicType(typeContrat: string): FicData['type'] {
  // Lookup direct par code Airtable via productCatalog
  const catalogFicType = getFicType(typeContrat);
  if (catalogFicType) return catalogFicType as FicData['type'];

  // Fallback regex pour les valeurs legacy ou texte libre
  const t = typeContrat.toLowerCase();
  if (/auto|véhicule|vehicule|automobile|flotte|moto|cyclo/i.test(t)) return 'auto';
  if (/habitation|mrh|pno/i.test(t)) return 'mrh';
  if (/mrp|rc_pro|rc pro|pro|multirisque|rce|rcd|décennale|decennale/i.test(t)) return 'mrp';
  if (/sante_collective|santé collective|collective|coll/i.test(t)) return 'sante_collective';
  if (/sante|santé|mutuelle|complémentaire|snt/i.test(t)) return 'sante';
  if (/prevoyance|prévoyance/i.test(t)) return 'prevoyance';
  if (/vie|épargne|epargne/i.test(t)) return 'vie';
  if (/emprunteur|prêt|pret|crédit|credit/i.test(t)) return 'emprunteur';
  return 'auto'; // fallback
}

/**
 * Construit les données FIC pré-remplies depuis le prospect, la suggestion IA
 * et les données extraites du devis compagnie.
 */
export function buildFicData(
  prospect: Prospect,
  suggestion: AISuggestion,
  devisExtrait: DevisExtrait | null,
  fraisDossierTTC: number = 0,
): FicData {
  const ficType = detectFicType(prospect.type_contrat_demande || '');
  const dossier = prospect.airtable_dossier_fields || {};

  const souscripteur: FicSouscripteur = {
    nom: prospect.nom || '',
    prenom: prospect.prenom || '',
    dateNaissance: dossier.Date_Naissance as string || '',
    adresse: prospect.adresse || '',
    telephone: prospect.telephone || '',
    email: prospect.email || '',
  };

  const base: Omit<FicDataBase, never> = {
    souscripteur,
    compagnie: devisExtrait?.compagnie || suggestion.compagnie || '',
    primeAnnuelleTTC: devisExtrait?.primeAnnuelleTTC || suggestion.tarif_estime || 0,
    fraisDossierTTC,
    formuleProposee: devisExtrait?.formule || suggestion.garanties || '',
    recommandation: suggestion.note_expertise_courtier || suggestion.justification?.join('. ') || '',
    lieuSignature: 'Alfortville',
    dateSignature: new Date().toLocaleDateString('fr-FR'),
    garanties: devisExtrait?.garanties || [],
    options: devisExtrait?.options || [],
  };

  switch (ficType) {
    case 'auto':
      return {
        ...base,
        type: 'auto',
        vehicule: {
          marque: dossier.Marque_Véhicule as string || '',
          modele: dossier.Modèle_Véhicule as string || '',
          immatriculation: dossier.Immatriculation_Véhicule as string || '',
          lieuGarage: prospect.adresse || '',
        },
        formuleSouhaitee: devisExtrait?.formule || '',
      };

    case 'mrh':
      return {
        ...base,
        type: 'mrh',
        logement: {
          typeLogement: dossier.Type_Logement as string || '',
          qualiteOccupant: dossier.Qualite_Occupant as string || '',
          surface: dossier.Surface as string || '',
          nbPieces: dossier.Nb_Pieces as string || '',
          etage: dossier.Etage as string || '',
        },
      };

    case 'mrp':
      return {
        ...base,
        type: 'mrp',
        entreprise: {
          raisonSociale: dossier.Raison_Sociale as string || '',
          siren: dossier.SIREN as string || '',
          adresseSiege: dossier.Adresse_Siege as string || prospect.adresse || '',
          activite: dossier.Activite as string || '',
        },
      };

    case 'sante':
      return {
        ...base,
        type: 'sante',
        regime: dossier.Regime_Securite_Sociale as string || '',
        compositionFamille: dossier.Composition_Famille as string || '',
      };

    case 'sante_collective':
      return {
        ...base,
        type: 'sante_collective',
        entreprise: {
          raisonSociale: dossier.Raison_Sociale as string || '',
          siren: dossier.SIREN as string || '',
          effectif: dossier.Effectif as string || '',
          ccn: dossier.CCN as string || '',
        },
      };

    case 'prevoyance':
      return {
        ...base,
        type: 'prevoyance',
        revenus: dossier.Revenus as string || '',
        situationFamiliale: dossier.Situation_Familiale as string || '',
      };

    case 'vie':
      return {
        ...base,
        type: 'vie',
        objectifs: dossier.Objectifs_Patrimoniaux as string || '',
        profilRisque: dossier.Profil_Risque as string || '',
        clauseBeneficiaire: dossier.Clause_Beneficiaire as string || '',
      };

    case 'emprunteur':
      return {
        ...base,
        type: 'emprunteur',
        pret: {
          montant: dossier.Montant_Pret as string || '',
          duree: dossier.Duree_Pret as string || '',
          taux: dossier.Taux_Pret as string || '',
          banque: dossier.Banque as string || '',
        },
      };
  }
}

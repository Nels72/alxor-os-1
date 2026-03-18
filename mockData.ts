
import { User, Client, Contrat, Document, AuditLog, Prospect, Role } from './types';

export const mockUser: User = {
  id: 'u1',
  email: 'jean.marc@dupont-assur.fr',
  password_hash: 'hashed_pw',
  first_name: 'Jean-Marc',
  last_name: 'Dupont',
  is_active: true,
  created_at: new Date().toISOString()
};

export const mockRoles: Role[] = [
  { id: 'r1', code: 'ADMIN_ALXOR', label: 'Administrateur ALXOR' },
  { id: 'r2', code: 'COURTIER', label: 'Courtier' },
  { id: 'r3', code: 'CLIENT', label: 'Assuré' }
];

export const mockProspects: Prospect[] = [
  {
    id: 'p1',
    nom: 'Lemoine',
    prenom: 'Alice',
    email: 'alice.lemoine@email.com',
    telephone: '06 12 34 56 78',
    type_contrat_demande: 'Auto Professionnel',
    statut: 'en_analyse',
    ges_score: 30,
    created_at: new Date().toISOString(),
    priority: 'Haute',
    ai_suggestion: { 
      compagnie: 'ALLIANZ', 
      score: 96,
      tarif_estime: 1120,
      franchise: '380€',
      garanties: 'Tous Risques Excellence, Panne 0km',
      justification: ['Garanties optimales', 'Meilleur score de matching']
    }
  },
  {
    id: 'p2',
    nom: 'Martin',
    prenom: 'Thomas',
    email: 'thomas.martin@email.com',
    telephone: '07 88 99 00 11',
    type_contrat_demande: 'Habitation',
    statut: 'devis_envoye',
    ges_score: 70,
    priority: 'Moyenne',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    ai_suggestion: { 
      compagnie: 'THELEM ASSURANCES', 
      score: 84,
      tarif_estime: 490,
      franchise: '150€',
      garanties: 'Formule Intégrale + Vol',
      justification: ['Spécialiste habitation de proximité', 'Tarif compétitif']
    }
  }
];

export const mockClients: Client[] = [
  {
    id: 'c1',
    courtier_id: 'court1',
    type: 'PARTICULIER',
    nom: 'Bernard',
    prenom: 'Jean-Pierre',
    email: 'jp.bernard@gmail.com',
    telephone: '06 44 55 66 77',
    adresse: '15 Avenue des Lilas, 69003 Lyon',
    created_at: new Date(Date.now() - 31536000000).toISOString(),
    ges_score: 100
  },
  {
    id: 'c2',
    courtier_id: 'court1',
    type: 'PRO',
    raison_sociale: 'SARL Multi-Services',
    nom: 'Lefebvre',
    prenom: 'Marc',
    email: 'contact@multi-services.fr',
    telephone: '01 90 12 34 56',
    adresse: '42 Boulevard Haussmann, 75009 Paris',
    siret: '123 456 789 00012',
    code_ape: '7022Z',
    created_at: new Date(Date.now() - 15768000000).toISOString(),
    ges_score: 90
  },
  {
    id: 'c3',
    courtier_id: 'court1',
    type: 'PARTICULIER',
    nom: 'Durand',
    prenom: 'Sophie',
    email: 's.durand88@outlook.com',
    telephone: '07 55 44 33 22',
    adresse: '8 Place de la Gare, 31000 Toulouse',
    created_at: new Date(Date.now() - 5000000000).toISOString(),
    ges_score: 100
  },
  {
    id: 'c4',
    courtier_id: 'court1',
    type: 'PRO',
    raison_sociale: 'Boulangerie "Le Bon Pain"',
    nom: 'Petit',
    prenom: 'Amélie',
    email: 'amelie.petit@lebonpain.fr',
    telephone: '04 67 89 01 23',
    adresse: '22 Rue de la République, 34000 Montpellier',
    siret: '987 654 321 00034',
    code_ape: '5610A',
    created_at: new Date(Date.now() - 8000000000).toISOString(),
    ges_score: 80
  },
  {
    id: 'c5',
    courtier_id: 'court1',
    type: 'PARTICULIER',
    nom: 'Morel',
    prenom: 'Lucas',
    email: 'lucas.morel@icloud.com',
    telephone: '06 11 22 33 44',
    adresse: '5 Rue des Écoles, 33000 Bordeaux',
    created_at: new Date(Date.now() - 1000000000).toISOString(),
    ges_score: 45
  }
];

export const mockContracts: Contrat[] = [
  {
    id: 'con1',
    client_id: 'c1',
    courtier_id: 'court1',
    type_contrat: 'Automobile',
    compagnie: 'ALLIANZ',
    numero_contrat: 'ALZ-AUTO-99281',
    statut: 'valide',
    date_effet: '2024-01-01',
    date_echeance: '2025-01-01',
    prime_annuelle: 840,
    immatriculation: 'CD-456-EF',
    source: 'Cabinet',
    amendments: [
      { date: '2024-06-15', label: 'Remplacement véhicule', deltaCommission: 12.5, ancienne_immat: 'AB-123-CD' },
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 'conR1',
    client_id: 'c1',
    courtier_id: 'court1',
    type_contrat: 'Automobile',
    compagnie: 'GROUPAMA',
    numero_contrat: 'GRP-AUTO-77801',
    statut: 'resilie',
    date_effet: '2021-03-01',
    date_echeance: '2022-03-01',
    prime_annuelle: 620,
    immatriculation: 'XY-999-ZZ',
    resignationDate: '2022-11-30',
    resignationReason: 'Vente du véhicule',
    source: 'Cabinet',
    amendments: [
      { date: '2022-06-10', label: 'Changement véhicule', deltaCommission: -18.75 },
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 'con2',
    client_id: 'c2',
    courtier_id: 'court1',
    type_contrat: 'RC Professionnelle',
    compagnie: 'AXA',
    numero_contrat: 'AXA-RCP-00112',
    statut: 'valide',
    date_effet: '2023-06-01',
    date_echeance: '2024-06-01',
    prime_annuelle: 1450,
    source: 'Apporteur',
    created_at: new Date().toISOString()
  },
  {
    id: 'con3',
    client_id: 'c3',
    courtier_id: 'court1',
    type_contrat: 'MRH',
    compagnie: 'GENERALI',
    numero_contrat: 'GEN-MRH-44551',
    statut: 'valide',
    date_effet: '2024-01-15',
    date_echeance: '2025-01-15',
    prime_annuelle: 420,
    prime_annuelle_ht: 350,
    adresse_risque: '12 Rue du Louvre, 75001 Paris',
    is_missing_docs: false,
    source: 'Tally Public',
    amendments: [
      { date: '2024-09-01', label: 'Changement d\'adresse du risque', deltaCommission: -8.2, ancienne_adresse_risque: '8 Rue de la Paix, 75002 Paris' },
    ],
    created_at: new Date().toISOString()
  },
  {
    id: 'con3b',
    client_id: 'c3',
    courtier_id: 'court1',
    type_contrat: 'Automobile',
    compagnie: 'AXA',
    numero_contrat: 'AXA-AUTO-77234',
    statut: 'valide',
    date_effet: '2024-03-01',
    date_echeance: '2025-03-01',
    prime_annuelle: 680,
    prime_annuelle_ht: 567,
    immatriculation: 'AB-123-CD',
    is_missing_docs: true,
    source: 'Apporteur',
    created_at: new Date().toISOString()
  },
  {
    id: 'con3c',
    client_id: 'c3',
    courtier_id: 'court1',
    type_contrat: 'Protection Juridique',
    compagnie: 'MMA',
    numero_contrat: 'MMA-PJ-99123',
    statut: 'valide',
    date_effet: '2024-02-01',
    date_echeance: '2025-02-01',
    prime_annuelle: 145,
    prime_annuelle_ht: 121,
    is_missing_docs: false,
    source: 'Cabinet',
    created_at: new Date().toISOString()
  },
  {
    id: 'con3d',
    client_id: 'c3',
    courtier_id: 'court1',
    type_contrat: 'GAV',
    compagnie: 'GROUPAMA',
    numero_contrat: 'GRP-GAV-33456',
    statut: 'valide',
    date_effet: '2024-01-01',
    date_echeance: '2025-01-01',
    prime_annuelle: 89,
    prime_annuelle_ht: 74,
    source: 'Tally Public',
    is_missing_docs: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'con4',
    client_id: 'c4',
    courtier_id: 'court1',
    type_contrat: 'Multirisque Pro',
    compagnie: 'MMA',
    numero_contrat: 'MMA-MRP-77889',
    statut: 'en_attente',
    date_effet: '2024-05-01',
    date_echeance: '2025-05-01',
    prime_annuelle: 2800,
    source: 'Cabinet',
    created_at: new Date().toISOString()
  },
  {
    id: 'con5',
    client_id: 'c5',
    courtier_id: 'court1',
    type_contrat: 'Complémentaire Santé',
    compagnie: 'SWISSLIFE',
    numero_contrat: 'SWL-SAN-00123',
    statut: 'brouillon',
    date_effet: '2024-06-01',
    date_echeance: '2025-06-01',
    prime_annuelle: 680,
    source: 'Tally Public',
    created_at: new Date().toISOString()
  }
];

export const mockDocuments: Document[] = [
  {
    id: 'doc1',
    client_id: 'c1',
    contrat_id: 'con1',
    type_document: 'Carte Verte',
    file_url: '#',
    statut: 'conforme',
    uploaded_by: 'u1',
    created_at: new Date().toISOString()
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'a1',
    user_id: 'u1',
    action: 'CREATE_PROSPECT',
    entity: 'PROSPECT',
    entity_id: 'p1',
    timestamp: new Date().toISOString()
  }
];

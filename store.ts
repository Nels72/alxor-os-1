
import { create } from 'zustand';
import { Prospect, Client, Contrat, User, AISuggestion, DocumentGED, Reclamation } from './types';
import { mockUser, mockProspects, mockClients, mockContracts } from './mockData';
import { WORKFLOW_DOCUMENTS } from './lib/preDevisDocuments';

const EMPTY_DOCS: string[] = [];

interface AppState {
  user: User | null;
  prospects: Prospect[];
  clients: Client[];
  contracts: Contrat[];
  prospectDocuments: Record<string, string[]>;
  documentsGed: DocumentGED[];
  isAuthenticated: boolean;
  lastConvertedClientId: string | null;
  clearLastConvertedClientId: () => void;
  clientNotes: Record<string, string>;
  setClientNotes: (clientId: string, notes: string) => void;
  reclamations: Reclamation[];
  addReclamation: (r: Omit<Reclamation, 'id' | 'created_at'>) => void;
  updateReclamation: (id: string, updates: Partial<Reclamation>) => void;
  login: () => void;
  logout: () => void;
  addProspect: (prospect: Prospect) => void;
  updateProspect: (id: string, updates: Partial<Prospect>) => void;
  uploadDoc: (prospectId: string, docType: string) => Promise<void>;
  runIAAnalysis: (prospectId: string) => void;
  convertProspectToClient: (prospectId: string, company: string, premium: number) => string | null;
  handleConversion: (prospectId: string) => string | null;
  simulateIAExtraction: (prospect: Prospect) => { numero_contrat: string; prime_ttc: number; prime_ht: number; date_effet: string; date_echeance: string };
  updateContrat: (contratId: string, updates: Partial<Contrat>) => void;
  getProspectDocs: (id: string) => string[];
  generateFicheConseil: (prospectId: string) => void;
  validateManualSignature: (prospectId: string) => void;
  validateFinalContractSignature: (prospectId: string) => void;
  playNewLeadSound: () => void;
  calculateAndSetGES: (prospectId: string) => void;
  mergeProspectsFromAirtable: (incoming: Prospect[]) => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: mockUser,
  prospects: mockProspects,
  clients: mockClients,
  contracts: mockContracts,
  prospectDocuments: {},
  documentsGed: [],
  isAuthenticated: true,
  lastConvertedClientId: null,
  clientNotes: {},
  reclamations: [
    { id: 'rec1', date_reception: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], client_id: 'c1', client_nom: 'Jean-Pierre Bernard', objet: 'Contestation majoration prime', statut: 'ar_a_envoyer', created_at: new Date().toISOString() },
    { id: 'rec2', date_reception: new Date(Date.now() - 50 * 86400000).toISOString().split('T')[0], client_id: 'c2', client_nom: 'SARL Multi-Services', objet: 'Retard indemnisation sinistre', statut: 'en_cours', created_at: new Date().toISOString() },
  ],

  clearLastConvertedClientId: () => set({ lastConvertedClientId: null }),
  setClientNotes: (clientId, notes) => set((s) => ({ clientNotes: { ...s.clientNotes, [clientId]: notes } })),
  addReclamation: (r) => set((s) => ({
    reclamations: [{ ...r, id: `rec-${Math.random().toString(36).slice(2, 9)}`, created_at: new Date().toISOString() }, ...s.reclamations],
  })),
  updateReclamation: (id, updates) => set((s) => ({
    reclamations: s.reclamations.map((r) => (r.id === id ? { ...r, ...updates } : r)),
  })),

  simulateIAExtraction: (prospect) => {
    const primeTtc = prospect.ai_suggestion?.tarif_estime ?? 1000;
    const primeHt = Math.round(primeTtc / 1.2);
    const now = new Date();
    const dateEffet = now.toISOString().split('T')[0];
    const nextYear = new Date(now);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const dateEcheance = nextYear.toISOString().split('T')[0];
    return { numero_contrat: `POL-${Math.random().toString(36).slice(2, 10).toUpperCase()}`, prime_ttc: primeTtc, prime_ht: primeHt, date_effet: dateEffet, date_echeance: dateEcheance };
  },
  updateContrat: (contratId, updates) => set((state) => ({
    contracts: state.contracts.map((c) => (c.id === contratId ? { ...c, ...updates } : c))
  })),

  login: () => set({ isAuthenticated: true, user: mockUser }),
  logout: () => set({ isAuthenticated: false, user: null }),

  playNewLeadSound: () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.play().catch(() => console.log("Audio bloqué"));
  },

  addProspect: (prospect) => {
    set((state) => ({ prospects: [prospect, ...state.prospects] }));
    get().playNewLeadSound();
    get().calculateAndSetGES(prospect.id);
  },

  updateProspect: (id, updates) => {
    set((state) => ({
      prospects: state.prospects.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
    get().calculateAndSetGES(id);
  },

  calculateAndSetGES: (id) => {
    const state = get();
    const prospect = state.prospects.find(p => p.id === id);
    if (!prospect || prospect.statut === 'converti') return;

    const docs = state.getProspectDocs(id);
    const productKey = prospect.type_contrat_demande?.toLowerCase().replace(/\s+/g, '_') || 'auto';
    const config = WORKFLOW_DOCUMENTS[productKey] || WORKFLOW_DOCUMENTS['auto'];
    
    const phase1Required = config.filter(d => d.phase === 1 && d.obligatoire).map(d => d.type);
    const phase2Required = config.filter(d => d.phase === 2 && d.obligatoire).map(d => d.type);
    
    const phase1Complete = phase1Required.every(t => docs.includes(t));
    const phase2Complete = phase2Required.every(t => docs.includes(t));
    const hasProvisoire = prospect.documents_provisoires && Object.keys(prospect.documents_provisoires).length > 0;
    const periodeIncompleteRI = !!prospect.periode_incomplete_ri;

    let score = 0;
    if (phase1Complete) score = 60;
    if (prospect.statut === 'devis_envoye') { if (score < 70) score = 70; }
    if (prospect.signature_manuelle_validee) score = 80;
    if (phase2Complete && prospect.signature_manuelle_validee) score = 90;
    if (prospect.contrat_definitif_signe && !hasProvisoire && !periodeIncompleteRI) score = 100;
    else if (prospect.contrat_definitif_signe && (hasProvisoire || periodeIncompleteRI)) score = Math.min(score, 90);
    if (periodeIncompleteRI) score = Math.min(score, 90);

    set((state) => ({
      prospects: state.prospects.map(p => p.id === id ? { ...p, ges_score: score } : p)
    }));
  },

  generateFicheConseil: (id) => {
    set((state) => ({
      prospects: state.prospects.map(p => p.id === id ? { ...p, fiche_conseil_generee: true } : p)
    }));
  },

  validateManualSignature: (id) => {
    set((state) => ({
      prospects: state.prospects.map(p => p.id === id ? { ...p, signature_manuelle_validee: true } : p)
    }));
    get().calculateAndSetGES(id);
  },

  validateFinalContractSignature: (id) => {
    set((state) => ({
      prospects: state.prospects.map(p => p.id === id ? { ...p, contrat_definitif_signe: true } : p)
    }));
    get().calculateAndSetGES(id);
  },

  uploadDoc: async (prospectId, docType) => {
    const prospect = get().prospects.find(p => p.id === prospectId);
    if (!prospect) return;

    // Simulation Scan IA si Phase 1
    const config = WORKFLOW_DOCUMENTS[prospect.type_contrat_demande.toLowerCase()] || WORKFLOW_DOCUMENTS['auto'];
    const isPhase1 = config.find(d => d.type === docType)?.phase === 1;

    if (isPhase1) {
       // Déclencher un état de scan visuel si nécessaire (pourrait être géré via documentsGed.statut)
    }

    const newDocGed: DocumentGED = {
      id: Math.random().toString(36).substr(2, 9),
      sollicitation_id: prospectId,
      type_document: docType,
      storage_url: `https://supabase-storage.alxor.os/${prospectId}/${docType}.pdf`,
      statut: 'conforme',
      created_at: new Date().toISOString()
    };

    set((state) => ({
      documentsGed: [...state.documentsGed, newDocGed],
      prospectDocuments: { 
        ...state.prospectDocuments, 
        [prospectId]: [...(state.prospectDocuments[prospectId] || []), docType] 
      }
    }));
    
    get().calculateAndSetGES(prospectId);
  },

  runIAAnalysis: (prospectId) => {
    set((state) => ({
      prospects: state.prospects.map(p => p.id === prospectId ? {
        ...p,
        ia_analysis_done: true,
        statut: 'en_analyse',
        ai_suggestions: [
          {
            compagnie: 'ALLIANZ',
            score: 96,
            tarif_estime: 1120,
            franchise: '380€ (Fixe)',
            garanties: 'Tous Risques Excellence, Panne 0km, Contenu du véhicule 2000€',
            justification: ['Meilleur rapport Qualité/Prix', 'Franchise réduite', 'Assistance Premium'],
            appetence_technique: 94,
            competitivite_marche: 91
          },
          {
            compagnie: 'AXA',
            score: 89,
            tarif_estime: 1195,
            franchise: '450€',
            garanties: 'Tous Risques Classique, Protection Juridique',
            justification: ['Réseau de garages agréés', 'Option Zéro Franchise bris de glace'],
            appetence_technique: 87,
            competitivite_marche: 85
          },
          {
            compagnie: 'THELEM',
            score: 84,
            tarif_estime: 1040,
            franchise: '550€',
            garanties: 'Tiers Étendu +, Vol, Incendie',
            justification: ['Tarif ultra-compétitif', 'Relation de proximité'],
            appetence_technique: 82,
            competitivite_marche: 88
          }
        ]
      } : p)
    }));
    get().calculateAndSetGES(prospectId);
  },

  convertProspectToClient: (prospectId, company, premium) => {
    const state = get();
    const prospect = state.prospects.find(p => p.id === prospectId);
    if (!prospect) return null;
    const extracted = get().simulateIAExtraction(prospect);
    const primeTtc = premium ?? extracted.prime_ttc;
    const newClientId = `c-${Math.random().toString(36).substr(2, 5)}`;
    const newClient: Client = {
      id: newClientId,
      courtier_id: 'court1',
      type: 'PRO',
      nom: prospect.nom,
      prenom: prospect.prenom,
      email: prospect.email,
      telephone: prospect.telephone,
      created_at: new Date().toISOString(),
      ges_score: 100
    };
    const newContrat: Contrat = {
      id: `con-${Math.random().toString(36).substr(2, 5)}`,
      client_id: newClientId,
      courtier_id: 'court1',
      type_contrat: prospect.type_contrat_demande,
      compagnie: company || 'ALLIANZ',
      statut: 'valide',
      numero_contrat: extracted.numero_contrat,
      date_effet: extracted.date_effet,
      date_echeance: extracted.date_echeance,
      prime_annuelle: primeTtc,
      prime_annuelle_ht: extracted.prime_ht,
      created_at: new Date().toISOString()
    };
    set((s) => ({
      clients: [newClient, ...s.clients],
      contracts: [newContrat, ...s.contracts],
      prospects: s.prospects.filter(p => p.id !== prospectId),
      lastConvertedClientId: newClientId
    }));
    return newClientId;
  },

  handleConversion: (prospectId) => {
    const state = get();
    const prospect = state.prospects.find(p => p.id === prospectId);
    if (!prospect) return null;
    const company = prospect.ai_suggestion?.compagnie || 'ALLIANZ';
    const premium = prospect.ai_suggestion?.tarif_estime ?? 1000;
    return get().convertProspectToClient(prospectId, company, premium);
  },

  getProspectDocs: (id) => get().prospectDocuments[id] || EMPTY_DOCS,

  mergeProspectsFromAirtable: (incoming) =>
    set((s) => {
      const ids = new Set(incoming.map((p) => p.id));
      return {
        prospects: [
          ...incoming,
          ...s.prospects.filter((p) => !ids.has(p.id)),
        ],
      };
    }),
}));

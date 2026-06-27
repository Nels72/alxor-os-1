
import { create } from 'zustand';
import { Prospect, Client, Contrat, User, AISuggestion, DocumentGED, Reclamation } from './types';
import { mockUser, mockProspects, mockClients, mockContracts } from './mockData';
import { WORKFLOW_DOCUMENTS } from './lib/preDevisDocuments';
import { uploadDocumentCabinet, qualifyDocument, fetchDocumentsForDossier } from './services/documentUpload';
import type { AirtableDocument } from './services/airtable';
import { hasMatchingAirtableDoc } from './services/airtable';
import { saveDDAPropositions, saveDDAChoixFinal } from './services/ddaService';
import { runVehiculeMatching } from './lib/matchingEngine';
import { VEHICULE_CODES } from './lib/prospectProductData';
import type { CompagnieVehiculeRule } from './lib/compagnieRules';
import { COMPAGNIES_VEHICULE } from './lib/compagnieRules';
import { fetchVehiculeRules } from './services/produitsAirtable';
import type { Collaborateur } from './services/collaborateursAirtable';

const EMPTY_DOCS: string[] = [];

const COLLAB_STORAGE_KEY = 'alxor_current_collaborateur';

function loadStoredCollaborateur(): Collaborateur | null {
  try {
    const raw = localStorage.getItem(COLLAB_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Collaborateur) : null;
  } catch {
    return null;
  }
}

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
  login: (collab?: Collaborateur) => void;
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
  airtableDocuments: Record<string, AirtableDocument[]>;
  loadDocumentsForDossier: (dossierId: string) => Promise<void>;
  uploadDocReal: (dossierId: string, docType: string, label: string, file: File, contactId?: string, idDossier?: string) => Promise<void>;
  qualifyDocReal: (documentId: string, dossierId: string, statut: 'Valide' | 'Provisoire', dateEcheance?: string) => Promise<void>;
  vehiculeRules: CompagnieVehiculeRule[];
  loadVehiculeRules: () => Promise<void>;
  /** Collaborateur sélectionné via le sélecteur de profil (V1) — Admin voit tout */
  currentCollaborateur: Collaborateur | null;
  setCurrentCollaborateur: (c: Collaborateur | null) => void;
  /** Portée d'affichage de la file de production */
  viewScope: 'mes_dossiers' | 'tous';
  setViewScope: (scope: 'mes_dossiers' | 'tous') => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: mockUser,
  prospects: mockProspects,
  clients: mockClients,
  contracts: mockContracts,
  prospectDocuments: {},
  documentsGed: [],
  airtableDocuments: {},
  isAuthenticated: true,
  vehiculeRules: COMPAGNIES_VEHICULE,
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

  login: (collab?: Collaborateur) => {
    if (collab) {
      const [prenom, ...rest] = collab.nom.split(' ');
      const userFromCollab: User = {
        ...mockUser,
        id: collab.id,
        first_name: collab.prenom || prenom || collab.nom,
        last_name: collab.nomFamille || rest.join(' ') || '',
        email: collab.email || mockUser.email,
      };
      try {
        localStorage.setItem('alxor_current_collaborateur', JSON.stringify(collab));
      } catch { /* navigation privée */ }
      set({ isAuthenticated: true, user: userFromCollab, currentCollaborateur: collab });
    } else {
      set({ isAuthenticated: true, user: mockUser });
    }
  },
  logout: () => set({ isAuthenticated: false, user: null }),

  currentCollaborateur: loadStoredCollaborateur(),
  setCurrentCollaborateur: (c) => {
    try {
      if (c) localStorage.setItem(COLLAB_STORAGE_KEY, JSON.stringify(c));
      else localStorage.removeItem(COLLAB_STORAGE_KEY);
    } catch {
      // stockage indisponible (navigation privée) — état mémoire uniquement
    }
    set({ currentCollaborateur: c, viewScope: 'mes_dossiers' });
  },
  viewScope: 'mes_dossiers',
  setViewScope: (scope) => set({ viewScope: scope }),

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

    const uploadedDocs = state.getProspectDocs(id);
    const airtableDocs = state.airtableDocuments[id] || [];
    const hasDoc = (workflowKey: string) =>
      uploadedDocs.includes(workflowKey) || hasMatchingAirtableDoc(workflowKey, airtableDocs);

    const rawKey = prospect.type_contrat_demande || 'AUT';
    const productKey = WORKFLOW_DOCUMENTS[rawKey] ? rawKey : rawKey.toLowerCase().replace(/\s+/g, '_');
    const config = WORKFLOW_DOCUMENTS[productKey] || WORKFLOW_DOCUMENTS['AUT'];

    const bloquants = config.filter(d => d.phase === 1 && d.bloquant);
    const obligatoiresP1 = config.filter(d => d.phase === 1 && d.obligatoire);
    const phase2Required = config.filter(d => d.phase === 2 && d.obligatoire).map(d => d.type);

    let phase1Score = 0;
    if (bloquants.length > 0) {
      const bloquantsFournis = bloquants.filter(d => hasDoc(d.type));
      phase1Score = Math.round((bloquantsFournis.length / bloquants.length) * 60);
    } else if (obligatoiresP1.length > 0) {
      const obligatoiresFournis = obligatoiresP1.filter(d => hasDoc(d.type));
      phase1Score = Math.round((obligatoiresFournis.length / obligatoiresP1.length) * 60);
    } else {
      phase1Score = 60;
    }

    const allBloquantsFournis = bloquants.length === 0 || bloquants.every(d => hasDoc(d.type));
    const phase2Complete = phase2Required.every(t => hasDoc(t));
    const hasProvisoire = prospect.documents_provisoires && Object.keys(prospect.documents_provisoires).length > 0;
    const periodeIncompleteRI = !!prospect.periode_incomplete_ri;

    let score = phase1Score;
    if (prospect.statut === 'devis_envoye' && allBloquantsFournis) { if (score < 70) score = 70; }
    if (prospect.signature_manuelle_validee && allBloquantsFournis) score = 80;
    if (phase2Complete && prospect.signature_manuelle_validee && allBloquantsFournis) score = 90;
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
    const rawKey2 = prospect.type_contrat_demande || 'AUT';
    const pKey2 = WORKFLOW_DOCUMENTS[rawKey2] ? rawKey2 : rawKey2.toLowerCase().replace(/\s+/g, '_');
    const config = WORKFLOW_DOCUMENTS[pKey2] || WORKFLOW_DOCUMENTS['AUT'];
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
    const prospect = get().prospects.find(p => p.id === prospectId);
    if (!prospect) return;

    // Scoring réel pour Auto / Moto, mock de fallback pour les autres produits
    const isVehicule = VEHICULE_CODES.some(
      code => prospect.type_contrat_demande?.toUpperCase() === code
    );

    const suggestions: AISuggestion[] = isVehicule
      ? runVehiculeMatching(prospect, get().vehiculeRules)
      : [
          // Fallback générique pour produits hors périmètre véhicule
          {
            compagnie: 'Compagnie A',
            score: 85,
            tarif_estime: 0,
            franchise: '—',
            garanties: 'À définir selon le produit',
            justification: ['Scoring produit en cours de déploiement'],
            appetence_technique: 80,
            competitivite_marche: 75,
          },
        ];

    set((state) => ({
      prospects: state.prospects.map(p => p.id === prospectId ? {
        ...p,
        ia_analysis_done: true,
        statut: 'en_analyse',
        ai_suggestions: suggestions,
      } : p)
    }));
    get().calculateAndSetGES(prospectId);

    // Sauvegarder les propositions DDA dans Airtable (conformité ACPR)
    if (prospectId.startsWith('rec') && suggestions.length > 0) {
      saveDDAPropositions(prospectId, { suggestions }).catch(
        (err) => console.error('Erreur sauvegarde DDA:', err)
      );
    }
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

  loadDocumentsForDossier: async (dossierId) => {
    try {
      const docs = await fetchDocumentsForDossier(dossierId);
      set((s) => ({
        airtableDocuments: { ...s.airtableDocuments, [dossierId]: docs },
      }));
      get().calculateAndSetGES(dossierId);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
    }
  },

  uploadDocReal: async (dossierId, docType, label, file, contactId, idDossier) => {
    const doc = await uploadDocumentCabinet({ file, dossierId, workflowDocType: docType, label, contactId, idDossier });
    set((s) => ({
      airtableDocuments: {
        ...s.airtableDocuments,
        [dossierId]: [...(s.airtableDocuments[dossierId] || []), doc],
      },
      prospectDocuments: {
        ...s.prospectDocuments,
        [dossierId]: [...(s.prospectDocuments[dossierId] || []), docType],
      },
    }));
    get().calculateAndSetGES(dossierId);
  },

  qualifyDocReal: async (documentId, dossierId, statut, dateEcheance) => {
    const updated = await qualifyDocument({
      documentId,
      statut,
      conforme: statut === 'Valide',
      dateEcheanceProvisoire: dateEcheance,
    });
    set((s) => ({
      airtableDocuments: {
        ...s.airtableDocuments,
        [dossierId]: (s.airtableDocuments[dossierId] || []).map((d) =>
          d.id === documentId ? updated : d
        ),
      },
    }));
  },

  loadVehiculeRules: async () => {
    try {
      const rules = await fetchVehiculeRules();
      if (rules) {
        set({ vehiculeRules: rules });
        console.log(`[matching] ${rules.length} règles chargées depuis Airtable Produits_CIE`);
      }
      // Si null → champs pas encore créés → on garde COMPAGNIES_VEHICULE (état initial)
    } catch (err) {
      console.warn('[matching] Impossible de charger Produits_CIE, fallback règles locales:', err);
    }
  },
}));

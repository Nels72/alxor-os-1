// Update Menu Conformité v2
import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { 
  Users, 
  UserPlus, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  FileText,
  ShieldCheck,
  Download,
  Mail,
  MoreVertical,
  Settings as SettingsIcon,
  Trash2,
  CheckCircle2,
  Info,
  Calendar,
  AlertCircle,
  X,
  Zap,
  ExternalLink,
  Target,
  CheckCircle,
  Phone,
  Building2,
  User as UserIcon,
  Copy,
  FolderOpen,
  PenLine,
  RotateCw,
  Shield,
  Plus,
  Pencil,
  Save,
  FileArchive,
} from 'lucide-react';
import { useStore } from '../store';
import { getProductLabel } from '../lib/productCatalog';
import { PriorityLevel, Client, Contrat, Amendment, Prospect } from '../types';
import {
  listDossierRecords,
  mapDossiersBatch,
  collectMissingDocumentLabels,
} from '../services/dossiersAirtable';
import { resetRateLimiter } from '../services/airtable';
import {
  PipelineStage,
  STAGE_LABELS,
  getPipelineStage,
  getComputedPriority,
  getAlerts,
  sortByPriority,
  groupByStage,
  isDdaDone,
  getAgeJours,
  getInactiviteJours,
  getSourceLabel,
  getApporteurName,
  SEUIL_INACTIVITE_J,
} from '../lib/pipeline';
import {
  listCollaborateurs,
  reprendreDossier,
  createCollaborateur,
  updateCollaborateur,
  Collaborateur,
  CollaborateurRole,
  CollaborateurStatut,
} from '../services/collaborateursAirtable';
import {
  listDocumentsCabinet,
  createDocumentCabinet,
  deleteDocumentCabinet,
  DocumentCabinet,
  DocCabinetCategorie,
} from '../services/documentsCabinetAirtable';
import {
  listApporteurs,
  updateApporteur,
  fetchDossiersApporteur,
  Apporteur,
  ApporteurDossier,
  ApporteurStatut,
  ActivationFormulaire,
} from '../services/apporteursAirtable';

/** Cache Dashboard : évite de recharger Airtable à chaque navigation */
let dashboardCache: { data: import('../types').Prospect[]; ts: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

function isContractResigned(con: Contrat): boolean {
  return con.statut === 'resilie';
}

function getCompanyAbbrev(compagnie: string): string {
  const c = compagnie.toUpperCase();
  if (c.includes('ALLIANZ')) return 'ALZ';
  if (c.includes('AXA')) return 'AXA';
  if (c.includes('THELEM') || c.includes('THÉLEM')) return 'THM';
  return compagnie.slice(0, 3).toUpperCase();
}

/** Format strict JJ-MM-AAAA pour Date AN */
function formatDateAN(isoDate: string | undefined): string {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  if (!d || !m || !y) return isoDate;
  return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
}

/** Format 01-MM pour Date Échéance (MM = mois de la Date AN / date_effet) */
function formatDateEcheance(dateEffet: string | undefined): string {
  if (!dateEffet) return '—';
  const [, m] = dateEffet.split('-');
  if (!m) return '—';
  return `01-${m.padStart(2, '0')}`;
}

/** Timeline avenants : ligne verticale + mini-cartes (date, libellé, delta commission) */
function AmendmentTimeline({
  amendments,
  contractId,
  pulseAmendmentIndex,
}: {
  amendments: Amendment[];
  contractId: string;
  pulseAmendmentIndex?: number | null;
}) {
  if (!amendments.length) return null;
  return (
    <div className="flex items-stretch gap-0 min-w-0" style={{ marginLeft: 24 }}>
      <div className="w-px flex-shrink-0 bg-slate-300 self-stretch min-h-[24px]" aria-hidden />
      <div className="flex-1 min-w-0 pl-2 space-y-1 py-0.5">
        {amendments.map((am, i) => {
          const pulse = pulseAmendmentIndex === i;
          return (
            <div
              key={i}
              id={`amendment-${contractId}-${i}`}
              className={`rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] leading-snug ${pulse ? 'animate-pulse-highlight' : ''}`}
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              <span className="text-slate-500 tabular-nums font-medium">{formatDateAN(am.date)}</span>
              <span className="text-slate-400 mx-1">·</span>
              <span className="font-semibold text-slate-700">{am.label}</span>
              {am.deltaCommission != null && (
                <>
                  <span className="text-slate-400 mx-1">·</span>
                  <span className={`tabular-nums font-bold ${am.deltaCommission >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {am.deltaCommission >= 0 ? '+' : ''}{am.deltaCommission.toFixed(2)}€
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normalizeContractType(typeContrat: string): 'AUTO' | 'MRH' | 'MRP' | 'PJ' | 'GAV' | null {
  const t = (typeContrat || '').toUpperCase();
  if (t.includes('AUTO') || t === 'AUTOMOBILE') return 'AUTO';
  if (t.includes('MRH') || t.includes('HABITATION') || t.includes('MULTIRISQUE HABITATION')) return 'MRH';
  if (t.includes('MRP') || t.includes('MULTIRISQUE PRO')) return 'MRP';
  if (t.includes('PJ') || t.includes('PROTECTION JURIDIQUE')) return 'PJ';
  if (t.includes('GAV') || t.includes('GARANTIE ACCIDENTS')) return 'GAV';
  return null;
}

/** Libellé vignette : MRH → Habitation */
function getContractVignetteLabel(typeContrat: string): string {
  const t = (typeContrat || '').toUpperCase();
  if (t.includes('MRH') || t.includes('HABITATION') || t.includes('MULTIRISQUE HABITATION')) return 'Habitation';
  return typeContrat || 'Contrat';
}

/** Pastille vignette : Habitation=Bleu, Auto=Gris, Santé=Vert, Prévoyance=Indigo (pas orange/rouge) */
function getContractPillColor(typeContrat: string): string {
  const t = (typeContrat || '').toUpperCase();
  if (t.includes('MRH') || t.includes('HABITATION') || t.includes('MULTIRISQUE HABITATION')) return 'bg-blue-500';
  if (t.includes('AUTO') || t === 'AUTOMOBILE') return 'bg-slate-400';
  if (t.includes('SANTÉ') || t.includes('SANTE') || t.includes('COMPLÉMENTAIRE')) return 'bg-emerald-500';
  if (t.includes('PRÉVOYANCE') || t.includes('PREVOYANCE') || t.includes('PJ') || t.includes('GAV') || t.includes('MRP')) return 'bg-indigo-500';
  return 'bg-slate-400';
}


const PRIORITY_BADGE: Record<PriorityLevel, string> = {
  Critique: 'bg-red-50 text-red-600 border-red-100',
  Haute: 'bg-orange-50 text-orange-600 border-orange-100',
  Moyenne: 'bg-blue-50 text-blue-600 border-blue-100',
  Basse: 'bg-slate-50 text-slate-400 border-slate-100',
};

/** Commission simulée : (TTC/1.2)*0.15 */
function getCommission(primeTtc: number): number {
  return Math.round((primeTtc / 1.2) * 0.15);
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const prospects = useStore(state => state.prospects);
  const mergeProspectsFromAirtable = useStore(
    (state) => state.mergeProspectsFromAirtable
  );
  const clients = useStore(state => state.clients);
  const contracts = useStore(state => state.contracts);
  const lastConvertedClientId = useStore(state => state.lastConvertedClientId);
  const clearLastConvertedClientId = useStore(state => state.clearLastConvertedClientId);
  const clientNotes = useStore(state => state.clientNotes);
  const setClientNotes = useStore(state => state.setClientNotes);
  const currentCollaborateur = useStore(state => state.currentCollaborateur);
  const viewScope = useStore(state => state.viewScope);
  const setViewScope = useStore(state => state.setViewScope);

  const [airtableLoading, setAirtableLoading] = useState(false);
  const [airtableError, setAirtableError] = useState<string | null>(null);
  const airtableConfigured =
    !!(process.env.REACT_APP_AIRTABLE_BASE_ID && (
      process.env.REACT_APP_AIRTABLE_TOKEN ||
      process.env.REACT_APP_AIRTABLE_PAT ||
      process.env.REACT_APP_AIRTABLE_API_KEY
    ));

  useEffect(() => {
    if (tab !== 'prospects' && tab !== 'overview') return;
    if (!airtableConfigured) return;

    // Si le cache est encore frais, on l'utilise directement (0 appel API)
    if (dashboardCache && Date.now() - dashboardCache.ts < CACHE_TTL_MS) {
      mergeProspectsFromAirtable(dashboardCache.data);
      return;
    }

    const abortCtrl = new AbortController();
    setAirtableLoading(true);
    setAirtableError(null);
    (async () => {
      try {
        const rows = await listDossierRecords();
        if (abortCtrl.signal.aborted) return;
        if (rows.length === 0) {
          setAirtableLoading(false);
          return;
        }
        const mapped = await mapDossiersBatch(rows, abortCtrl.signal);
        if (!abortCtrl.signal.aborted) {
          dashboardCache = { data: mapped, ts: Date.now() };
          mergeProspectsFromAirtable(mapped);
          setAirtableLoading(false);
        }
      } catch (err) {
        if (!abortCtrl.signal.aborted) {
          const detail = err instanceof Error ? err.message : String(err);
          const tokenMissing = !process.env.REACT_APP_AIRTABLE_TOKEN && !process.env.REACT_APP_AIRTABLE_PAT && !process.env.REACT_APP_AIRTABLE_API_KEY;
          console.error('[Airtable] Échec chargement Dossiers:', err);
          setAirtableError(
            tokenMissing
              ? 'Token Airtable absent au runtime. Redémarrez le serveur Vite (npm run dev) après modification du .env.'
              : `Erreur lors du chargement Airtable (${detail}). Vérifiez token/base ID puis redémarrez Vite.`
          );
          setAirtableLoading(false);
        }
      }
    })();
    return () => {
      abortCtrl.abort();
      resetRateLimiter(); // Libère la file d'attente pour les prochaines requêtes
    };
  }, [tab, mergeProspectsFromAirtable, airtableConfigured]);

  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [searchHighlight, setSearchHighlight] = useState<{ clientId: string; contractId?: string; avenantIndex?: number; phase: 'avenant' | 'contract' } | null>(null);

  useEffect(() => {
    if (!lastConvertedClientId) return;
    const t = setTimeout(clearLastConvertedClientId, 3000);
    return () => clearTimeout(t);
  }, [lastConvertedClientId, clearLastConvertedClientId]);

  const countProvisoires = useMemo(() => prospects.filter(p => p.documents_provisoires && Object.keys(p.documents_provisoires).length > 0).length, [prospects]);
  const gesMoyen = useMemo(() => prospects.length ? Math.round(prospects.reduce((s, p) => s + p.ges_score, 0) / prospects.length) : 0, [prospects]);

  // ----- File de production : sous-onglets par étape du pipeline -----
  const [stageTab, setStageTab] = useState<PipelineStage>('a_traiter');
  const [prospectSearch, setProspectSearch] = useState('');
  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([]);
  const [reprendreEnCours, setReprendreEnCours] = useState<string | null>(null);

  // ----- Documents Cabinet -----
  const [docsCabinet, setDocsCabinet] = useState<DocumentCabinet[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [docsTableMissing, setDocsTableMissing] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDoc, setNewDoc] = useState<{ nom: string; categorie: DocCabinetCategorie; url: string; notes: string; date_expiration: string }>({
    nom: '', categorie: 'Autre', url: '', notes: '', date_expiration: '',
  });
  const [docSaving, setDocSaving] = useState(false);

  // ----- Administration Cabinet -----
  const [adminCollab, setAdminCollab] = useState<Collaborateur[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [editingCollabId, setEditingCollabId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ statut: CollaborateurStatut; role: CollaborateurRole; mdpProv: string }>({ statut: 'Actif', role: 'Commercial', mdpProv: '' });
  const [showAddCollab, setShowAddCollab] = useState(false);
  const [newCollab, setNewCollab] = useState<{ prenom: string; nom: string; email: string; role: CollaborateurRole; mdpProv: string }>({
    prenom: '', nom: '', email: '', role: 'Commercial', mdpProv: '',
  });
  const [collabSaving, setCollabSaving] = useState(false);

  // ----- Apporteurs -----
  const [apporteurs, setApporteurs] = useState<Apporteur[]>([]);
  const [apporteursLoading, setApporteursLoading] = useState(false);
  const [expandedApporteurId, setExpandedApporteurId] = useState<string | null>(null);
  const [apporteurDossiers, setApporteurDossiers] = useState<Record<string, ApporteurDossier[]>>({});
  const [apporteurDossiersLoading, setApporteurDossiersLoading] = useState<string | null>(null);
  const [editingApporteurId, setEditingApporteurId] = useState<string | null>(null);
  const [editApporteurFields, setEditApporteurFields] = useState<{
    statut: ApporteurStatut;
    activationFormulaire: ActivationFormulaire;
    commissionDefaut: string;
    collaborateurIds: string[];
    notes: string;
  }>({ statut: 'Actif', activationFormulaire: 'Actif', commissionDefaut: '', collaborateurIds: [], notes: '' });
  const [apporteurSaving, setApporteurSaving] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState<'collaborateurs' | 'apporteurs'>('collaborateurs');

  const isAdmin = currentCollaborateur?.role === 'Admin';

  useEffect(() => {
    listCollaborateurs()
      .then((list) => { setCollaborateurs(list); setAdminCollab(list); })
      .catch((err) => console.error('[Collaborateurs] Échec chargement:', err));
  }, []);

  useEffect(() => {
    if (tab !== 'docs') return;
    setDocsLoading(true);
    setDocsError(null);
    listDocumentsCabinet()
      .then((docs) => { setDocsCabinet(docs); setDocsTableMissing(false); })
      .catch((err) => {
        const msg = String(err);
        if (msg.includes('404') || msg.includes('422')) setDocsTableMissing(true);
        else setDocsError('Erreur chargement documents. Vérifiez la configuration Airtable.');
      })
      .finally(() => setDocsLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'settings' && tab !== 'admin') return;
    if (adminCollab.length === 0) {
      setAdminLoading(true);
      listCollaborateurs()
        .then((list) => setAdminCollab(list))
        .catch((err) => console.error('[Admin] Échec chargement collabs:', err))
        .finally(() => setAdminLoading(false));
    }
    if (apporteurs.length === 0) {
      setApporteursLoading(true);
      listApporteurs()
        .then(setApporteurs)
        .catch((err) => console.error('[Admin] Échec chargement apporteurs:', err))
        .finally(() => setApporteursLoading(false));
    }
  }, [tab, adminCollab.length, apporteurs.length]);

  /** Titulaire (premier collaborateur assigné) d'un dossier */
  const getTitulaire = (p: Prospect): Collaborateur | null => {
    const id = p.collaborateur_ids?.[0];
    if (!id) return null;
    return collaborateurs.find((c) => c.id === id) || null;
  };

  /** Dossiers du flux (les convertis GES 100 sortent vers le Portefeuille Client) */
  const fluxProspects = useMemo(
    () => prospects.filter((p) => getPipelineStage(p).stage !== 'converti'),
    [prospects]
  );

  /** Visibilité : Admin (ou pas de profil choisi) = tout ; sinon « Mes dossiers » par défaut */
  const isFilteredView =
    !!currentCollaborateur &&
    currentCollaborateur.role !== 'Admin' &&
    viewScope === 'mes_dossiers';

  const scopedFlux = useMemo(() => {
    if (!isFilteredView || !currentCollaborateur) return fluxProspects;
    return fluxProspects.filter((p) =>
      (p.collaborateur_ids || []).includes(currentCollaborateur.id)
    );
  }, [fluxProspects, isFilteredView, currentCollaborateur]);

  const searchedFlux = useMemo(() => {
    const q = prospectSearch.trim().toLowerCase();
    if (q.length < 2) return scopedFlux;
    return scopedFlux.filter((p) =>
      `${p.prenom} ${p.nom}`.toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.telephone || '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    );
  }, [scopedFlux, prospectSearch]);

  /** Reprise d'un dossier dont le titulaire est absent */
  const handleReprendre = async (
    e: React.MouseEvent,
    p: Prospect,
    titulaire: Collaborateur | null
  ) => {
    e.stopPropagation();
    if (!currentCollaborateur) return;
    const ok = window.confirm(
      `Reprendre le dossier de ${p.prenom} ${p.nom}` +
        (titulaire ? ` (titulaire actuel : ${titulaire.nom}, absent)` : '') +
        ' ?\nLe dossier vous sera réassigné et le changement sera tracé.'
    );
    if (!ok) return;
    setReprendreEnCours(p.id);
    try {
      const historique = String(p.airtable_dossier_fields?.['Historique_Assignation'] || '');
      await reprendreDossier(p.id, currentCollaborateur, titulaire, historique);
      dashboardCache = null;
      mergeProspectsFromAirtable([
        {
          ...p,
          collaborateur_ids: [currentCollaborateur.id],
          airtable_dossier_fields: {
            ...p.airtable_dossier_fields,
            Collaborateurs_Cabinet_Client: [currentCollaborateur.id],
          },
        },
      ]);
    } catch (err) {
      console.error('[Reprendre] Échec:', err);
      window.alert('La reprise du dossier a échoué — réessayez ou vérifiez Airtable.');
    } finally {
      setReprendreEnCours(null);
    }
  };

  const stageGroups = useMemo(() => groupByStage(searchedFlux), [searchedFlux]);

  const visibleFlux = useMemo(
    () => sortByPriority(stageGroups[stageTab] || []),
    [stageGroups, stageTab]
  );

  const dashboardAlerts = useMemo(() => getAlerts(fluxProspects), [fluxProspects]);

  /** Top 5 priorités tous sous-onglets confondus (liste condensée overview) */
  const topPriorites = useMemo(
    () => sortByPriority(fluxProspects.filter((p) => getPipelineStage(p).stage !== 'sans_suite')).slice(0, 5),
    [fluxProspects]
  );

  const stats = useMemo(() => [
    { label: "Dossiers en cours", val: fluxProspects.length, icon: UserPlus, color: "#4F7CFF" },
    { label: "Clients", val: clients.length, icon: Users, color: "#10B981" },
    { label: "GES Moyen", val: gesMoyen > 0 ? `${gesMoyen}%` : '—', icon: TrendingUp, color: "#F59E0B" },
    { label: "Alertes actives", val: dashboardAlerts.length > 0 ? dashboardAlerts.length : '—', icon: AlertCircle, color: dashboardAlerts.length > 0 ? "#EF4444" : "#94a3b8" },
  ], [fluxProspects.length, clients.length, gesMoyen, dashboardAlerts.length]);

  const getGesColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const renderOverview = () => (
    <>
      {dashboardAlerts.length > 0 && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-red-100 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <h3 className="text-sm font-black text-red-700 uppercase tracking-wider">
              {dashboardAlerts.length} alerte{dashboardAlerts.length > 1 ? 's' : ''} — action requise
            </h3>
          </div>
          <ul className="divide-y divide-red-100">
            {dashboardAlerts.slice(0, 6).map((a, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => navigate(`/prospects/${a.prospectId}`)}
                  className="w-full text-left px-5 py-2.5 text-xs font-bold text-red-800 hover:bg-red-100/60 transition-colors flex items-center justify-between gap-3"
                >
                  <span className="truncate">{a.message}</span>
                  <ChevronRight size={14} className="shrink-0 text-red-400" />
                </button>
              </li>
            ))}
            {dashboardAlerts.length > 6 && (
              <li className="px-5 py-2 text-[10px] font-black text-red-400 uppercase tracking-widest">
                + {dashboardAlerts.length - 6} autre{dashboardAlerts.length - 6 > 1 ? 's' : ''}
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon size={24} />
              </div>
            </div>
            <p className="text-slate-500 text-sm mb-1 font-medium">{stat.label}</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-900">{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 md:p-8 rounded-2xl shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Performance financière</h3>
          <div className="h-[250px] md:h-[300px] flex items-center justify-center">
            <div className="text-center">
              <TrendingUp size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">Données non disponibles</p>
              <p className="text-xs text-slate-300 mt-1">Intégration comptable à venir</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {countProvisoires > 0 && (
            <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Santé du Portefeuille</h3>
                  <p className="text-sm font-bold text-orange-700 mt-0.5">
                    {countProvisoires} dossier{countProvisoires > 1 ? 's' : ''} provisoire{countProvisoires > 1 ? 's' : ''} en attente de régularisation
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">GES plafonné à 90%</p>
                </div>
              </div>
            </div>
          )}

        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-sm">
          <h3 className="text-xl font-bold mb-6 text-slate-900 tracking-tight">Activité cabinet</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-600">Dossiers en cours</span>
              <span className="text-xl font-black text-slate-900">{fluxProspects.length}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-600">À traiter aujourd'hui</span>
              <span className={`text-xl font-black ${topPriorites.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {topPriorites.length || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-600">Alertes actives</span>
              <span className={`text-xl font-black ${dashboardAlerts.length > 0 ? 'text-orange-500' : 'text-slate-400'}`}>
                {dashboardAlerts.length > 0 ? dashboardAlerts.length : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-slate-600">GES Moyen</span>
              <span className="text-xl font-black text-slate-900">{gesMoyen > 0 ? `${gesMoyen}%` : '—'}</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">À traiter aujourd'hui</h3>
          <Link
            to="/dashboard?tab=prospects"
            className="text-[10px] font-black text-[#4F7CFF] uppercase tracking-widest hover:underline flex items-center gap-1"
          >
            Voir la file complète <ChevronRight size={12} />
          </Link>
        </div>
        {topPriorites.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm font-bold text-slate-300">Rien d'urgent — la file est à jour.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {topPriorites.map((p) => {
              const prio = getComputedPriority(p);
              const stageInfo = getPipelineStage(p);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/prospects/${p.id}`)}
                    className="w-full text-left px-6 py-3 hover:bg-slate-50 transition-colors flex items-center gap-4"
                  >
                    <span className={`text-[9px] font-black px-2 py-1 rounded uppercase border whitespace-nowrap shrink-0 ${PRIORITY_BADGE[prio.level]}`}>
                      {prio.level}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 truncate shrink-0 min-w-[140px]">
                      {p.prenom} {p.nom}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 whitespace-nowrap shrink-0">
                      {stageInfo.label}
                    </span>
                    <span className="text-xs font-medium text-slate-500 truncate flex-1">{prio.reason}</span>
                    <ChevronRight size={14} className="text-slate-300 shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  const renderProspectsList = () => (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {!airtableConfigured && (
        <div className="flex items-start gap-3 px-6 py-4 bg-amber-50 border-b border-amber-200">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Connexion Airtable non configurée</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Créez un fichier <code className="bg-amber-100 px-1 rounded font-mono">.env</code> à la racine avec{' '}
              <code className="bg-amber-100 px-1 rounded font-mono">REACT_APP_AIRTABLE_BASE_ID</code> et{' '}
              <code className="bg-amber-100 px-1 rounded font-mono">REACT_APP_AIRTABLE_TOKEN</code> pour charger vos dossiers. Les données affichées sont des exemples.
            </p>
          </div>
        </div>
      )}
      {airtableConfigured && airtableError && (
        <div className="flex items-start gap-3 px-6 py-4 bg-red-50 border-b border-red-200">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-red-700">{airtableError}</p>
        </div>
      )}
      {airtableConfigured && airtableLoading && (
        <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-xs font-bold text-blue-700">Synchronisation Airtable en cours…</p>
        </div>
      )}
      <div className="p-6 md:p-8 border-b border-slate-200 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Flux de Production</h3>
            {currentCollaborateur && currentCollaborateur.role !== 'Admin' && (
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[10px] font-black uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setViewScope('mes_dossiers')}
                  className={`px-3 py-1.5 transition-colors ${viewScope === 'mes_dossiers' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                >
                  Mes dossiers
                </button>
                <button
                  type="button"
                  onClick={() => setViewScope('tous')}
                  className={`px-3 py-1.5 transition-colors ${viewScope === 'tous' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                >
                  Tous
                </button>
              </div>
            )}
          </div>
          <div className="relative w-full md:w-auto md:min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={prospectSearch}
              onChange={(e) => setProspectSearch(e.target.value)}
              placeholder="Nom, email, téléphone…"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-[#4F7CFF] transition-all text-sm text-slate-700 font-medium"
            />
            {prospectSearch && (
              <button
                type="button"
                onClick={() => setProspectSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600"
                aria-label="Effacer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['a_traiter', 'en_etude', 'signature', 'a_regulariser', 'sans_suite'] as PipelineStage[]).map((stage) => {
            const count = (stageGroups[stage] || []).length;
            const active = stageTab === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setStageTab(stage)}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {STAGE_LABELS[stage]}
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] tabular-nums ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-200 bg-slate-50/50">
              <th className="px-6 py-4">Prospect / Canal</th>
              <th className="px-6 py-4">Produit</th>
              <th className="px-6 py-4">Sous-état</th>
              <th className="px-6 py-4">Complétude</th>
              <th className="px-6 py-4 text-center">DDA</th>
              <th className="px-6 py-4">Ancienneté</th>
              <th className="px-6 py-4">Priorité</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleFlux.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm font-bold text-slate-300">
                  Aucun dossier dans « {STAGE_LABELS[stageTab]} »{prospectSearch ? ' pour cette recherche' : ''}.
                </td>
              </tr>
            )}
            {visibleFlux.map((p) => renderFluxRow(p))}
          </tbody>
        </table>
      </div>
    </div>
  );

  /** Ligne de la file de production — clic = navigation vers la fiche prospect */
  function renderFluxRow(p: Prospect) {
    const stageInfo = getPipelineStage(p);
    const prio = getComputedPriority(p);
    const age = getAgeJours(p);
    const inactif = getInactiviteJours(p);
    const missingDocs = p.airtable_dossier_fields
      ? collectMissingDocumentLabels(p.airtable_dossier_fields)
      : [];
    const apporteur = getApporteurName(p);
    const titulaire = getTitulaire(p);
    const titulaireAbsent = titulaire?.statutActivite === 'Absent';
    const peutReprendre =
      titulaireAbsent && !!currentCollaborateur && currentCollaborateur.id !== titulaire?.id;

    return (
      <tr
        key={p.id}
        onClick={() => navigate(`/prospects/${p.id}`)}
        className="group hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-400 shrink-0 text-xs relative">
              {(p.prenom?.[0] || '?').toUpperCase()}{(p.nom?.[0] || '?').toUpperCase()}
              {prio.level === 'Critique' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-900 truncate">{p.prenom} {p.nom}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase bg-slate-100 text-slate-500 border border-slate-200">
                  {getSourceLabel(p)}
                </span>
                {apporteur && (
                  <span className="text-[9px] font-bold text-slate-400 truncate">{apporteur}</span>
                )}
                {titulaireAbsent && (
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase bg-orange-50 text-orange-600 border border-orange-200"
                    title={`Titulaire : ${titulaire?.nom} (absent)`}
                  >
                    Titulaire absent
                  </span>
                )}
                {peutReprendre && (
                  <button
                    type="button"
                    disabled={reprendreEnCours === p.id}
                    onClick={(e) => handleReprendre(e, p, titulaire)}
                    className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-[#4F7CFF] text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {reprendreEnCours === p.id ? 'Reprise…' : 'Reprendre'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-[#4F7CFF] shrink-0" />
            <span className="text-xs font-medium text-slate-700">{getProductLabel(p.type_contrat_demande)}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap bg-blue-50 text-blue-600 border border-blue-100">
            {stageInfo.label}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-col gap-1 min-w-[110px]">
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${p.ges_score}%`, backgroundColor: getGesColor(p.ges_score) }}
                />
              </div>
              <span className="text-[10px] font-black text-slate-400 tabular-nums">{p.ges_score}%</span>
            </div>
            {missingDocs.length > 0 && (
              <span className="text-[9px] font-bold text-orange-500 truncate" title={missingDocs.join(', ')}>
                Manque : {missingDocs.slice(0, 2).join(', ')}{missingDocs.length > 2 ? '…' : ''}
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          {isDdaDone(p) ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#10B981]" title="Analyse DDA réalisée — Top 3 dans la fiche">
              <CheckCircle size={13} /> Fait
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-300">—</span>
          )}
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-700 tabular-nums">{age != null ? `${age} j` : '—'}</span>
            {inactif != null && inactif > SEUIL_INACTIVITE_J && (
              <span className="text-[9px] font-bold text-orange-500">inactif {inactif} j</span>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <span
            className={`text-[9px] font-black px-2 py-1 rounded uppercase border whitespace-nowrap ${PRIORITY_BADGE[prio.level]}`}
            title={prio.reason}
          >
            {prio.level}
          </span>
        </td>
      </tr>
    );
  }

  /** Acronyme métier pour identification contrat (MRH, AUTO, MRP, PJ, GAV...) */
  function getContractAcronym(typeContrat: string): string {
    const t = (typeContrat || '').toUpperCase();
    if (t.includes('MRH') || t.includes('HABITATION')) return 'MRH';
    if (t.includes('AUTO') || t === 'AUTOMOBILE') return 'AUTO';
    if (t.includes('MRP') || (t.includes('PRO') && t.includes('MULTIRISQUE'))) return 'MRP';
    if (t.includes('PJ') || t.includes('PROTECTION JURIDIQUE')) return 'PJ';
    if (t.includes('GAV')) return 'GAV';
    if (t.includes('SANTÉ') || t.includes('SANTE') || t.includes('COMPLÉMENTAIRE')) return 'SANTE';
    return (typeContrat || 'XXX').slice(0, 4).toUpperCase();
  }

  const renderContractTitle = (con: Contrat) => {
    const acro = getContractAcronym(con.type_contrat);
    const abrev = getCompanyAbbrev(con.compagnie);
    const num = (con.numero_contrat || '—').replace(/\s/g, '');
    return `${acro} ${abrev} ${num}`;
  };

  /** GES < 100% → orange ; GES = 100% → vert */
  function getGesCircleColor(score: number | undefined): string {
    if (score == null) return 'border-slate-300 text-slate-500';
    if (score === 100) return 'border-emerald-500 text-emerald-600';
    return 'border-orange-500 text-orange-600';
  }

  const renderExpandedClientContent = (c: Client, clientContracts: Contrat[]) => {
    const activeContracts = clientContracts.filter((con) => !isContractResigned(con));
    const resignedContracts = clientContracts.filter((con) => isContractResigned(con));

    const renderContractBlock = (con: Contrat, index: number) => {
      const commission = getCommission(con.prime_annuelle || 0);
      const gesScore = c.ges_score;
      const isEven = index % 2 === 0;
      const isRes = isContractResigned(con);
      const amendmentsList: Amendment[] =
        con.amendments && con.amendments.length > 0
          ? con.amendments
          : (con.avenants || []).map((av) => ({
              date: av.date,
              label: av.motif,
              ancienne_immat: av.ancienne_immat,
              ancienne_adresse_risque: av.ancienne_adresse_risque,
            }));
      const pulseContract = searchHighlight?.clientId === c.id && searchHighlight?.contractId === con.id && searchHighlight.phase === 'contract';
      const pulseAmendment =
        searchHighlight?.contractId === con.id && searchHighlight?.phase === 'avenant' ? searchHighlight.avenantIndex ?? null : null;

      return (
        <div key={con.id} className="space-y-0" id={`contract-${con.id}`}>
          <div
            className={`rounded border overflow-hidden flex flex-col ${isRes ? 'opacity-60' : ''} ${isEven ? 'bg-white border-slate-200' : 'bg-slate-200/60 border-slate-300'} ${pulseContract ? 'animate-pulse-highlight' : ''}`}
            style={{ marginLeft: 24, fontFamily: 'Open Sans, sans-serif' }}
          >
            {isRes && (
              <div className="px-2 py-1 border-b border-slate-300 bg-slate-200/90 text-[9px] font-semibold text-slate-600">
                Résilié le {formatDateAN(con.resignationDate)} - Motif : {con.resignationReason || '—'}
              </div>
            )}
            <div className="flex items-stretch min-h-[3.5rem]">
              <div className={`flex flex-col justify-center px-3 py-1.5 border-r border-slate-200/80 min-w-[200px] shrink-0 ${isRes ? 'grayscale opacity-90' : ''}`}>
                <p className="text-[11px] font-semibold text-black" style={{ fontFamily: 'Open Sans, sans-serif' }}>{renderContractTitle(con)}</p>
                <p className="text-[11px] font-medium text-black mt-0.5" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  {normalizeContractType(con.type_contrat) === 'AUTO' && con.immatriculation ? con.immatriculation : ((con.type_contrat || '').toUpperCase().includes('MRH') || (con.type_contrat || '').toUpperCase().includes('MRP')) && con.adresse_risque ? con.adresse_risque : '—'}
                </p>
              </div>
              <div className="flex flex-1 items-stretch min-h-[3.5rem]">
                <div className="flex flex-1 items-center">
                  <div className="flex flex-1 items-stretch justify-around gap-0 px-2 py-1">
                    <div className="flex flex-col items-center justify-center min-w-0 flex-1">
                      <p className="text-[8px] font-semibold uppercase tracking-widest mb-0.5 text-slate-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>Date AN</p>
                      <p className="text-[12px] font-bold tabular-nums text-black" style={{ fontFamily: 'Open Sans, sans-serif' }}>{formatDateAN(con.date_effet)}</p>
                    </div>
                    <div className="w-px self-stretch flex-shrink-0 opacity-40" style={{ backgroundColor: '#9CA3AF' }} aria-hidden />
                    <div className="flex flex-col items-center justify-center min-w-0 flex-1">
                      <p className="text-[8px] font-semibold uppercase tracking-widest mb-0.5 text-slate-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>Échéance</p>
                      <p className="text-[12px] font-bold tabular-nums text-black" style={{ fontFamily: 'Open Sans, sans-serif' }}>{formatDateEcheance(con.date_effet)}</p>
                    </div>
                    <div className="w-px self-stretch flex-shrink-0 opacity-40" style={{ backgroundColor: '#9CA3AF' }} aria-hidden />
                    <div className="flex flex-col items-center justify-center min-w-0 flex-1">
                      <p className="text-[8px] font-semibold uppercase tracking-widest mb-0.5 text-slate-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>Pr_Ann</p>
                      <p className={`text-[12px] font-bold tabular-nums text-black ${isRes ? 'line-through decoration-slate-500 text-slate-500' : ''}`} style={{ fontFamily: 'Open Sans, sans-serif' }}>{con.prime_annuelle != null ? `${con.prime_annuelle} €` : '—'}</p>
                    </div>
                    <div className="w-px self-stretch flex-shrink-0 opacity-40" style={{ backgroundColor: '#9CA3AF' }} aria-hidden />
                    <div className="flex flex-col items-center justify-center min-w-0 flex-1">
                      <p className="text-[8px] font-semibold uppercase tracking-widest mb-0.5 text-slate-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>Com_Ann</p>
                      <p className={`text-[12px] font-bold tabular-nums text-black ${isRes ? 'line-through decoration-slate-500 text-slate-500' : ''}`} style={{ fontFamily: 'Open Sans, sans-serif' }}>{commission} €</p>
                    </div>
                    <div className="w-px self-stretch flex-shrink-0 opacity-40" style={{ backgroundColor: '#9CA3AF' }} aria-hidden />
                    <div className="flex flex-col items-center justify-center min-w-0 flex-1">
                      <p className="text-[8px] font-semibold uppercase tracking-widest mb-0.5 text-slate-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>Gestionnaire</p>
                      <p className="text-[12px] font-bold text-black" style={{ fontFamily: 'Open Sans, sans-serif' }}>{con.gestionnaire || 'J.-M. Dupont'}</p>
                    </div>
                    <div className="w-px self-stretch flex-shrink-0 opacity-40" style={{ backgroundColor: '#9CA3AF' }} aria-hidden />
                    <div className="flex flex-col items-center justify-center min-w-0 flex-1">
                      <p className="text-[8px] font-medium uppercase tracking-widest mb-0.5" style={{ color: '#9CA3AF' }}>GES</p>
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${getGesCircleColor(gesScore)}`}>
                        <span className="text-[9px] font-bold tabular-nums">{gesScore != null ? `${gesScore}%` : '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`flex flex-col items-end justify-center gap-1 px-3 py-1.5 border-l border-slate-200/80 shrink-0 ${isRes ? 'grayscale opacity-80' : ''}`}>
                <p className="text-[9px] font-medium" style={{ color: '#9CA3AF' }}>SOURCE : {con.source ?? 'Cabinet'}</p>
                <button
                  type="button"
                  disabled={isRes}
                  onClick={(e) => { e.stopPropagation(); }}
                  title={isRes ? 'Contrat résilié' : con.is_missing_docs ? 'Documents obligatoires manquants' : undefined}
                  className={
                    isRes
                      ? 'inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-400 text-[10px] font-bold border-2 border-slate-200 cursor-not-allowed'
                      : gesScore === 100
                        ? 'inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white text-black text-[10px] font-bold border-2 border-emerald-500 hover:bg-emerald-50 transition-all'
                        : 'inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white text-black text-[10px] font-bold border-2 border-orange-500 hover:bg-orange-50 transition-all'
                  }
                >
                  <FolderOpen size={12} strokeWidth={2} className={isRes ? 'text-slate-400 shrink-0' : gesScore === 100 ? 'text-emerald-600 shrink-0' : 'text-orange-500 shrink-0'} /> Accès GED
                </button>
              </div>
            </div>
          </div>
          <AmendmentTimeline amendments={amendmentsList} contractId={con.id} pulseAmendmentIndex={pulseAmendment} />
        </div>
      );
    };

    return (
      <div className="px-6 py-2 border-t border-slate-200/80" style={{ fontFamily: 'Open Sans, sans-serif' }}>
        <div className="py-1.5 text-[11px] text-black" style={{ fontFamily: 'Open Sans, sans-serif' }}>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">ADRESSE : </span>
          {c.adresse || '—'}
          {c.type === 'PRO' && (c.siret || c.code_ape) && (
            <>
              <span className="mx-2" style={{ color: '#d1d5db' }}>|</span>
              {c.siret && <><span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">SIRET : </span>{c.siret}</>}
              {c.siret && c.code_ape && <span className="mx-2 text-slate-300">|</span>}
              {c.code_ape && <><span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">CODE APE : </span>{c.code_ape}</>}
            </>
          )}
        </div>
        {clientContracts.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            {activeContracts.map((con, i) => renderContractBlock(con, i))}
            {resignedContracts.length > 0 && (
              <>
                <div className="flex items-center gap-3 my-4 ml-6" style={{ marginLeft: 24 }}>
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 shrink-0 px-2">Historique & Contrats Clos</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                {resignedContracts.map((con, i) => renderContractBlock(con, activeContracts.length + i))}
              </>
            )}
          </div>
        ) : (
          <div className="py-1.5 text-slate-500 font-bold text-xs">Aucun contrat pour ce client.</div>
        )}
        <div className="mt-2 pt-2 border-t border-slate-200/80">
          <label className="block text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>Notes Internes</label>
          <textarea value={clientNotes[c.id] ?? ''} onChange={(e) => setClientNotes(c.id, e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Vie du contrat, suivi" rows={3} className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs font-medium placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#4F7CFF]/30 focus:border-[#4F7CFF] resize-none" style={{ color: '#1e293b', fontFamily: 'Open Sans, sans-serif' }} />
        </div>
      </div>
    );
  };

  type SearchSuggestion = { type: string; label: string; clientId: string; contractId?: string; avenantIndex?: number };
  const clientSearchSuggestions = useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (q.length < 3) return [];
    const out: SearchSuggestion[] = [];
    clients.forEach((c) => {
      const name = c.type === 'PRO' ? (c.raison_sociale || `${c.prenom} ${c.nom}`) : `${c.prenom} ${c.nom}`;
      if (name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q)) || (c.telephone && c.telephone.replace(/\s/g, '').includes(q.replace(/\s/g, '')))) {
        out.push({ type: 'Client', label: name, clientId: c.id });
      }
    });
    contracts.forEach((con) => {
      const client = clients.find(cc => cc.id === con.client_id);
      const name = client ? (client.type === 'PRO' ? (client.raison_sociale || `${client.prenom} ${client.nom}`) : `${client.prenom} ${client.nom}`) : '';
      if (con.immatriculation && con.immatriculation.toLowerCase().includes(q)) {
        out.push({ type: 'Immatriculation', label: `${name} — ${con.immatriculation}`, clientId: con.client_id, contractId: con.id });
      } else if (con.numero_contrat && con.numero_contrat.toLowerCase().includes(q)) {
        out.push({ type: 'N° Police', label: `${name} — ${con.numero_contrat}`, clientId: con.client_id, contractId: con.id });
      } else if (con.adresse_risque && con.adresse_risque.toLowerCase().includes(q)) {
        out.push({ type: 'Adresse risque', label: `${name} — ${con.adresse_risque}`, clientId: con.client_id, contractId: con.id });
      }
      (con.amendments || []).forEach((am, i) => {
        if (
          (am.ancienne_immat && am.ancienne_immat.toLowerCase().includes(q)) ||
          (am.ancienne_adresse_risque && am.ancienne_adresse_risque.toLowerCase().includes(q)) ||
          (am.label && am.label.toLowerCase().includes(q))
        ) {
          const sub =
            am.ancienne_immat && am.ancienne_immat.toLowerCase().includes(q)
              ? am.ancienne_immat
              : am.ancienne_adresse_risque && am.ancienne_adresse_risque.toLowerCase().includes(q)
                ? am.ancienne_adresse_risque
                : am.label;
          out.push({ type: 'Avenant', label: `${name} — ${am.label} (${sub})`, clientId: con.client_id, contractId: con.id, avenantIndex: i });
        }
      });
      if (!(con.amendments && con.amendments.length)) {
        (con.avenants || []).forEach((av, i) => {
          if ((av.ancienne_immat && av.ancienne_immat.toLowerCase().includes(q)) || (av.ancienne_adresse_risque && av.ancienne_adresse_risque.toLowerCase().includes(q))) {
            const sub = av.ancienne_immat && av.ancienne_immat.toLowerCase().includes(q) ? av.ancienne_immat : (av.ancienne_adresse_risque || '');
            out.push({ type: 'Avenant', label: `${name} — ${av.motif} (${sub})`, clientId: con.client_id, contractId: con.id, avenantIndex: i });
          }
        });
      }
    });
    return out.slice(0, 10);
  }, [clientSearchQuery, clients, contracts]);

  const filteredClients = useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (q.length < 3) return clients;
    const matchIds = new Set(clientSearchSuggestions.map(s => s.clientId));
    return clients.filter(c => matchIds.has(c.id));
  }, [clients, clientSearchQuery, clientSearchSuggestions]);

  const handleSearchReset = () => {
    setClientSearchQuery('');
    setExpandedClientId(null);
    setSearchHighlight(null);
  };

  useEffect(() => {
    if (!searchHighlight?.contractId) return;
    const t = setTimeout(() => {
      if (searchHighlight.phase === 'avenant' && searchHighlight.avenantIndex != null) {
        const el = document.getElementById(`amendment-${searchHighlight.contractId}-${searchHighlight.avenantIndex}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        const el = document.getElementById(`contract-${searchHighlight.contractId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [searchHighlight]);

  useEffect(() => {
    if (!searchHighlight) return;
    const phase = searchHighlight.phase;
    const delay = phase === 'avenant' ? 2000 : 2000;
    const id = setTimeout(() => {
      if (phase === 'avenant' && searchHighlight.avenantIndex != null) {
        setSearchHighlight(prev => prev ? { ...prev, phase: 'contract' } : null);
      } else {
        setSearchHighlight(null);
      }
    }, delay);
    return () => clearTimeout(id);
  }, [searchHighlight?.phase, searchHighlight?.avenantIndex]);

  const renderClientsList = () => (
    <div>
      <h1 className="text-xl font-black text-slate-900 tracking-tight mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>Portefeuille Client</h1>
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0 max-w-md relative">
          <div className="relative">
            <input
              type="text"
              placeholder="Recherche Client, Immatriculation, N° Police (3 caractères min.)"
              value={clientSearchQuery}
              onChange={(e) => setClientSearchQuery(e.target.value)}
              className="dashboard-search-input w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#4F7CFF]/30 focus:border-slate-200"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            />
            {clientSearchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={handleSearchReset}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Réinitialiser la recherche"
                aria-label="Réinitialiser"
              >
                <RotateCw size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0 ml-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 font-semibold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">
            <Download size={14} /> Exporter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">
            <UserPlus size={14} /> Nouveau Client
          </button>
        </div>
      </div>

      <div className="dashboard-clients-table overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100 bg-slate-50/30">
              <th className="px-6 py-2 w-10"></th>
              <th className="px-6 py-2">Client / Type</th>
              <th className="px-6 py-2">Coordonnées</th>
              <th className="px-6 py-2">Contrats Actifs</th>
              <th className="px-6 py-2 text-center">Valeur Cabinet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredClients.map((c: Client) => {
              const clientContracts = contracts.filter(con => con.client_id === c.id);
              const isNewConverted = c.id === lastConvertedClientId;
              const isExpanded = expandedClientId === c.id;
              const firstContract = clientContracts[0];
              return (
                <React.Fragment key={c.id}>
                  <tr
                    onClick={() => setExpandedClientId(isExpanded ? null : c.id)}
                    className={`group transition-all duration-300 ease-in-out cursor-pointer select-none ${expandedClientId && !isExpanded ? 'opacity-50 blur-[2px] pointer-events-none' : ''} ${isNewConverted ? 'bg-emerald-50/90 animate-pulse border-l-4 border-[#10B981]' : ''} ${isExpanded ? 'bg-emerald-50 [&>td]:border-t [&>td]:border-b [&>td]:border-blue-600 [&>td:last-child]:border-r' : 'bg-white hover:bg-slate-50'}`}
                  >
                    <td className={`px-3 py-2 w-10 text-slate-400 transition-all duration-300 ease-in-out ${isExpanded ? 'border-l-4 border-blue-600' : ''}`}>
                      {clientContracts.length > 0 ? (isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />) : null}
                    </td>
                    <td className="px-6 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-blue-500 bg-white text-blue-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {c.type === 'PRO' ? <Building2 size={18} className="text-blue-600" /> : <UserIcon size={18} className="text-blue-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 leading-tight" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                            {c.type === 'PRO' ? (c.raison_sociale || `${c.prenom} ${c.nom}`) : `${c.prenom} ${c.nom}`}
                          </p>
                          <p className="text-[9px] font-medium uppercase tracking-widest mt-0.5 text-blue-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                            {c.type === 'PRO' ? `GÉRANT : ${c.prenom} ${c.nom}` : 'PARTICULIER'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#4F7CFF]" onClick={(e) => e.stopPropagation()}>
                          <Mail size={12} className="text-slate-400 shrink-0" />{c.email}
                        </a>
                        <a href={`tel:${c.telephone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#4F7CFF]" onClick={(e) => e.stopPropagation()}>
                          <Phone size={12} className="text-slate-400 shrink-0" />{c.telephone}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {clientContracts.length > 0 ? (
                          <>
                            {clientContracts.slice(0, 2).map((con, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                                {getContractVignetteLabel(con.type_contrat)}
                              </span>
                            ))}
                            {clientContracts.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">+{clientContracts.length - 2}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 italic">Aucun contrat actif</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <span className="text-xs font-bold text-slate-700 tabular-nums" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        {clientContracts.reduce((sum, con) => sum + getCommission(con.prime_annuelle || 0), 0)} €
                      </span>
                    </td>
                  </tr>
                  <AnimatePresence>
                    {isExpanded && (
                      <tr className="bg-white transition-all duration-300 ease-in-out">
                        <td colSpan={5} className="p-0 align-top border-l-4 border-blue-600">
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }} className="overflow-hidden bg-white shadow-md border-t border-slate-200">
                            {renderExpandedClientContent(c, clientContracts)}
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );

  const DOC_CATEGORIES: DocCabinetCategorie[] = ['ORIAS', 'RCP', 'Mandat', 'DDA', 'Convention', 'Administratif', 'Légal', 'Protocole', 'Modèle', 'Autre'];

  const handleAddDoc = async () => {
    if (!newDoc.nom.trim()) return;
    setDocSaving(true);
    try {
      const created = await createDocumentCabinet({
        nom: newDoc.nom.trim(),
        categorie: newDoc.categorie,
        url: newDoc.url.trim() || undefined,
        notes: newDoc.notes.trim() || undefined,
        date_expiration: newDoc.date_expiration || undefined,
      });
      setDocsCabinet((prev) => [...prev, created]);
      setNewDoc({ nom: '', categorie: 'Autre', url: '', notes: '', date_expiration: '' });
      setShowAddDoc(false);
    } catch (err) {
      alert('Erreur lors de la création : ' + String(err));
    } finally {
      setDocSaving(false);
    }
  };

  const handleDeleteDoc = async (id: string, nom: string) => {
    if (!window.confirm(`Supprimer « ${nom} » ?`)) return;
    try {
      await deleteDocumentCabinet(id);
      setDocsCabinet((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert('Erreur suppression : ' + String(err));
    }
  };

  const getExpirationStatus = (dateExp?: string): 'ok' | 'soon' | 'expired' | null => {
    if (!dateExp) return null;
    const exp = new Date(dateExp);
    const now = new Date();
    const diffJ = Math.round((exp.getTime() - now.getTime()) / 86400000);
    if (diffJ < 0) return 'expired';
    if (diffJ <= 30) return 'soon';
    return 'ok';
  };

  const renderDocumentsCabinet = () => {
    if (docsLoading) return (
      <div className="flex items-center gap-3 py-16 justify-center text-slate-400">
        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Chargement des documents…</span>
      </div>
    );
    if (docsTableMissing) return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-sm font-bold text-red-700">Table <code className="bg-red-100 px-1 rounded font-mono">Documents_Cabinet</code> non configurée dans Airtable.</p>
        <p className="text-xs text-red-500 mt-2">Créez la table avec les champs : Nom, Categorie, URL, Notes, Date_Upload, Date_Expiration.</p>
      </div>
    );
    if (docsError) return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-sm font-bold text-red-700">{docsError}</p>
      </div>
    );

    const grouped = DOC_CATEGORIES.reduce<Record<string, DocumentCabinet[]>>((acc, cat) => {
      const items = docsCabinet.filter((d) => d.categorie === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-500">{docsCabinet.length} document{docsCabinet.length !== 1 ? 's' : ''} cabinet</p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddDoc((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
            >
              <Plus size={14} /> Ajouter un document
            </button>
          )}
        </div>

        {showAddDoc && isAdmin && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Nouveau document</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Nom *</label>
                <input type="text" value={newDoc.nom} onChange={(e) => setNewDoc((p) => ({ ...p, nom: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F7CFF]" placeholder="Ex : ORIAS 2025" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Catégorie</label>
                <select value={newDoc.categorie} onChange={(e) => setNewDoc((p) => ({ ...p, categorie: e.target.value as DocCabinetCategorie }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F7CFF] bg-white">
                  {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">URL Dropbox</label>
                <input type="url" value={newDoc.url} onChange={(e) => setNewDoc((p) => ({ ...p, url: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F7CFF]" placeholder="https://dropbox.com/..." />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Date d'expiration</label>
                <input type="date" value={newDoc.date_expiration} onChange={(e) => setNewDoc((p) => ({ ...p, date_expiration: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F7CFF]" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Notes</label>
                <input type="text" value={newDoc.notes} onChange={(e) => setNewDoc((p) => ({ ...p, notes: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F7CFF]" placeholder="Remarques, numéro…" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowAddDoc(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100">Annuler</button>
              <button type="button" onClick={handleAddDoc} disabled={docSaving || !newDoc.nom.trim()} className="px-6 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
                {docSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {docsCabinet.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <FileArchive size={40} className="text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400">Aucun document cabinet enregistré.</p>
            {isAdmin && <p className="text-xs text-slate-300 mt-1">Cliquez sur « Ajouter un document » pour commencer.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, docs]) => (
              <div key={cat} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">{cat}</h4>
                </div>
                <ul className="divide-y divide-slate-100">
                  {docs.map((doc) => {
                    const expStatus = getExpirationStatus(doc.date_expiration);
                    return (
                      <li key={doc.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                        <FileText size={16} className="text-slate-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{doc.nom}</p>
                          {doc.notes && <p className="text-xs text-slate-400 truncate mt-0.5">{doc.notes}</p>}
                        </div>
                        {doc.date_expiration && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${
                            expStatus === 'expired' ? 'bg-red-50 text-red-600 border-red-100' :
                            expStatus === 'soon' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            {expStatus === 'expired' ? 'Expiré' : expStatus === 'soon' ? 'Bientôt' : ''} {doc.date_expiration}
                          </span>
                        )}
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 shrink-0">
                            <ExternalLink size={12} /> Ouvrir
                          </a>
                        )}
                        {isAdmin && (
                          <button type="button" onClick={() => handleDeleteDoc(doc.id, doc.nom)} className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleSaveCollab = async (collab: Collaborateur) => {
    setCollabSaving(true);
    try {
      await updateCollaborateur(collab.id, {
        statut: editFields.statut,
        role: editFields.role,
        mdpProv: editFields.mdpProv || undefined,
      });
      setAdminCollab((prev) => prev.map((c) =>
        c.id === collab.id ? { ...c, statutActivite: editFields.statut, role: editFields.role } : c
      ));
      setEditingCollabId(null);
    } catch (err) {
      alert('Erreur mise à jour : ' + String(err));
    } finally {
      setCollabSaving(false);
    }
  };

  const handleAddCollab = async () => {
    if (!newCollab.prenom.trim() || !newCollab.nom.trim() || !newCollab.email.trim()) return;
    setCollabSaving(true);
    try {
      const created = await createCollaborateur({
        prenom: newCollab.prenom.trim(),
        nom: newCollab.nom.trim(),
        email: newCollab.email.trim(),
        role: newCollab.role,
        statut: 'Actif',
        mdpProv: newCollab.mdpProv.trim() || undefined,
      });
      setAdminCollab((prev) => [...prev, created]);
      setNewCollab({ prenom: '', nom: '', email: '', role: 'Commercial', mdpProv: '' });
      setShowAddCollab(false);
    } catch (err) {
      alert('Erreur création collaborateur : ' + String(err));
    } finally {
      setCollabSaving(false);
    }
  };

  const handleToggleApporteur = async (apporteur: Apporteur) => {
    if (expandedApporteurId === apporteur.id) {
      setExpandedApporteurId(null);
      return;
    }
    setExpandedApporteurId(apporteur.id);
    if (apporteurDossiers[apporteur.id] !== undefined) return; // déjà chargé
    if (apporteur.dossierIds.length === 0) {
      setApporteurDossiers((p) => ({ ...p, [apporteur.id]: [] }));
      return;
    }
    setApporteurDossiersLoading(apporteur.id);
    try {
      const dossiers = await fetchDossiersApporteur(apporteur.dossierIds);
      setApporteurDossiers((p) => ({ ...p, [apporteur.id]: dossiers }));
    } catch (err) {
      console.error('[Apporteur dossiers] Erreur:', err);
      setApporteurDossiers((p) => ({ ...p, [apporteur.id]: [] }));
    } finally {
      setApporteurDossiersLoading(null);
    }
  };

  const handleSaveApporteur = async (apporteur: Apporteur) => {
    setApporteurSaving(true);
    try {
      const updated = await updateApporteur(apporteur.id, {
        statut: editApporteurFields.statut,
        activationFormulaire: editApporteurFields.activationFormulaire,
        commissionDefaut: editApporteurFields.commissionDefaut !== '' ? parseFloat(editApporteurFields.commissionDefaut) / 100 : undefined,
        collaborateurIds: editApporteurFields.collaborateurIds,
        notes: editApporteurFields.notes || undefined,
      });
      setApporteurs((prev) => prev.map((a) => (a.id === apporteur.id ? updated : a)));
      setEditingApporteurId(null);
    } catch (err) {
      alert('Erreur mise à jour apporteur : ' + String(err));
    } finally {
      setApporteurSaving(false);
    }
  };

  const renderAdmin = () => (
    <div className="space-y-6">
      {/* Sous-onglets */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { key: 'collaborateurs', label: 'Collaborateurs', count: adminCollab.length },
          { key: 'apporteurs', label: 'Apporteurs', count: apporteurs.length },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setAdminSubTab(key)}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
              adminSubTab === key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {label}
            {count > 0 && (
              <span className="ml-2 text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Collaborateurs ─────────────────────────────────────────────── */}
      {adminSubTab === 'collaborateurs' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-slate-400" />
              <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Collaborateurs</h3>
            </div>
            {isAdmin && (
              <button type="button" onClick={() => setShowAddCollab((v) => !v)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors">
                <Plus size={14} /> Nouveau
              </button>
            )}
          </div>

          {!isAdmin && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-xs font-bold text-amber-700">
              Lecture seule — seul un Admin peut modifier les collaborateurs.
            </div>
          )}

          {showAddCollab && isAdmin && (
            <div className="p-6 bg-slate-50 border-b border-slate-200 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Nouveau collaborateur</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Prénom *</label>
                  <input type="text" value={newCollab.prenom} onChange={(e) => setNewCollab((p) => ({ ...p, prenom: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F7CFF]" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Nom *</label>
                  <input type="text" value={newCollab.nom} onChange={(e) => setNewCollab((p) => ({ ...p, nom: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F7CFF]" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Email Pro *</label>
                  <input type="email" value={newCollab.email} onChange={(e) => setNewCollab((p) => ({ ...p, email: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F7CFF]" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Rôle</label>
                  <select value={newCollab.role} onChange={(e) => setNewCollab((p) => ({ ...p, role: e.target.value as CollaborateurRole }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F7CFF] bg-white">
                    {(['Admin', 'Commercial', 'Assistant', 'Stagiaire'] as CollaborateurRole[]).map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">MDP provisoire</label>
                  <input type="text" value={newCollab.mdpProv} onChange={(e) => setNewCollab((p) => ({ ...p, mdpProv: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F7CFF] font-mono" placeholder="Optionnel" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAddCollab(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100">Annuler</button>
                <button type="button" onClick={handleAddCollab} disabled={collabSaving || !newCollab.prenom.trim() || !newCollab.nom.trim() || !newCollab.email.trim()} className="px-6 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
                  {collabSaving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </div>
          )}

          {adminLoading ? (
            <div className="flex items-center gap-3 px-6 py-8 text-slate-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {adminCollab.map((c) => {
                const isEditing = editingCollabId === c.id;
                const apporteursAssignes = apporteurs.filter((a) => a.collaborateurIds.includes(c.id));
                return (
                  <li key={c.id} className="px-6 py-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black text-slate-600 shrink-0">
                        {c.nom.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{c.nom}</p>
                        <p className="text-xs text-slate-400">{c.email || '—'}</p>
                        {apporteursAssignes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {apporteursAssignes.map((a) => (
                              <span key={a.id} className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">
                                {a.nom}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {!isEditing && (
                        <>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.statutActivite === 'Actif' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                            {c.statutActivite}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{c.role}</span>
                          {isAdmin && (
                            <button type="button" onClick={() => { setEditingCollabId(c.id); setEditFields({ statut: c.statutActivite, role: c.role, mdpProv: '' }); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                              <Pencil size={14} />
                            </button>
                          )}
                        </>
                      )}
                      {isEditing && isAdmin && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <select value={editFields.statut} onChange={(e) => setEditFields((p) => ({ ...p, statut: e.target.value as CollaborateurStatut }))} className="border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#4F7CFF] bg-white">
                            {(['Actif', 'Absent'] as CollaborateurStatut[]).map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select value={editFields.role} onChange={(e) => setEditFields((p) => ({ ...p, role: e.target.value as CollaborateurRole }))} className="border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#4F7CFF] bg-white">
                            {(['Admin', 'Commercial', 'Assistant', 'Stagiaire'] as CollaborateurRole[]).map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <input type="text" value={editFields.mdpProv} onChange={(e) => setEditFields((p) => ({ ...p, mdpProv: e.target.value }))} placeholder="Nouveau MDP (optionnel)" className="border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#4F7CFF] font-mono w-40" />
                          <button type="button" onClick={() => handleSaveCollab(c)} disabled={collabSaving} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50">
                            <Save size={12} /> {collabSaving ? '…' : 'Sauver'}
                          </button>
                          <button type="button" onClick={() => setEditingCollabId(null)} className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100">✕</button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── Apporteurs ─────────────────────────────────────────────────── */}
      {adminSubTab === 'apporteurs' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <Building2 size={18} className="text-slate-400" />
            <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Apporteurs</h3>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{apporteurs.length}</span>
          </div>

          {!isAdmin && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-xs font-bold text-amber-700">
              Lecture seule — seul un Admin peut modifier les apporteurs.
            </div>
          )}

          {apporteursLoading ? (
            <div className="flex items-center gap-3 px-6 py-8 text-slate-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {apporteurs.map((a) => {
                const isEditing = editingApporteurId === a.id;
                const collabsAssignes = adminCollab.filter((c) => a.collaborateurIds.includes(c.id));
                return (
                  <li key={a.id} className="px-6 py-4">
                    <div className="flex items-start gap-4 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleToggleApporteur(a)}
                        className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-sm font-black text-blue-600 shrink-0 hover:bg-blue-100 transition-colors"
                      >
                        {expandedApporteurId === a.id ? <ChevronUp size={16} /> : a.nom.slice(0, 1).toUpperCase()}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleApporteur(a)}
                            className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                          >
                            {a.nom}
                          </button>
                          {a.raisonSociale && a.raisonSociale !== a.nom && (
                            <span className="text-xs text-slate-400">({a.raisonSociale})</span>
                          )}
                          {a.type && (
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wide">{a.type}</span>
                          )}
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                            {a.dossierIds.length} dossier{a.dossierIds.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-400">
                          {a.email && <span>{a.email}</span>}
                          {a.telephone && <span>· {a.telephone}</span>}
                          {a.commissionDefaut !== undefined && (
                            <span>· Comm. {(a.commissionDefaut * 100).toFixed(0)}%</span>
                          )}
                          {a.cumulReverseApporteur != null && a.cumulReverseApporteur > 0 && (
                            <span className="text-emerald-600 font-bold">· Versé : {a.cumulReverseApporteur.toFixed(2)} €</span>
                          )}
                          {a.totalEnAttente != null && a.totalEnAttente > 0 && (
                            <span className="text-orange-500 font-bold">· En attente : {a.totalEnAttente.toFixed(2)} €</span>
                          )}
                        </div>
                        {collabsAssignes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Suivi par</span>
                            {collabsAssignes.map((c) => (
                              <span key={c.id} className="text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">
                                {c.nom}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Encart dossiers — visible si expanded */}
                        {expandedApporteurId === a.id && (
                          <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
                            {apporteurDossiersLoading === a.id ? (
                              <div className="flex items-center gap-2 px-4 py-3 text-slate-400 text-xs">
                                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                Chargement des dossiers…
                              </div>
                            ) : (apporteurDossiers[a.id] || []).length === 0 ? (
                              <div className="px-4 py-4 text-center">
                                <p className="text-xs font-bold text-slate-300">Aucun dossier lié pour l'instant.</p>
                                {a.lienAlex && (
                                  <a href={a.lienAlex} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-blue-600 hover:underline">
                                    <ExternalLink size={10} /> Lien formulaire Alex
                                  </a>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-4 px-4 py-2 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                  <span>Dossier</span><span>Statut</span><span>Prime</span><span>Commission</span>
                                </div>
                                <ul className="divide-y divide-slate-100">
                                  {(apporteurDossiers[a.id] || []).map((d) => (
                                    <li key={d.id} className="grid grid-cols-4 px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors">
                                      <button
                                        type="button"
                                        onClick={() => navigate(`/prospects/${d.id}`)}
                                        className="font-mono font-bold text-blue-600 hover:underline text-left"
                                      >
                                        {d.idDossier}
                                      </button>
                                      <span className="text-slate-600 truncate">{d.statut}</span>
                                      <span className="text-slate-700 font-medium tabular-nums">
                                        {d.primeAnnuelle != null ? `${d.primeAnnuelle.toFixed(0)} €` : '—'}
                                      </span>
                                      <div className="flex flex-col">
                                        {d.totalReverseApporteur != null && d.totalReverseApporteur > 0 && (
                                          <span className="text-emerald-600 font-bold tabular-nums">{d.totalReverseApporteur.toFixed(2)} € versé</span>
                                        )}
                                        {d.commsEnAttente != null && d.commsEnAttente > 0 && (
                                          <span className="text-orange-500 font-medium tabular-nums">{d.commsEnAttente.toFixed(2)} € att.</span>
                                        )}
                                        {(!d.totalReverseApporteur && !d.commsEnAttente) && (
                                          <span className="text-slate-300">—</span>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex gap-6 text-[10px] font-bold">
                                  {a.cumulReverseApporteur != null && (
                                    <span className="text-emerald-600">Total versé : {a.cumulReverseApporteur.toFixed(2)} €</span>
                                  )}
                                  {a.totalEnAttente != null && (
                                    <span className="text-orange-500">En attente : {a.totalEnAttente.toFixed(2)} €</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            a.statut === 'Actif' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            a.statut === 'Suspendu' ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            {a.statut}
                          </span>
                          {a.activationFormulaire && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              a.activationFormulaire === 'Actif' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              a.activationFormulaire === 'Révoqué' ? 'bg-red-50 text-red-600 border-red-100' :
                              'bg-slate-50 text-slate-400 border-slate-100'
                            }`}>
                              Form. {a.activationFormulaire}
                            </span>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingApporteurId(a.id);
                                setEditApporteurFields({
                                  statut: a.statut,
                                  activationFormulaire: a.activationFormulaire || 'Inactif',
                                  commissionDefaut: a.commissionDefaut !== undefined ? (a.commissionDefaut * 100).toFixed(0) : '',
                                  collaborateurIds: [...a.collaborateurIds],
                                  notes: a.notes || '',
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                        </div>
                      )}

                      {isEditing && isAdmin && (
                        <div className="w-full mt-3 border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Statut</label>
                              <select value={editApporteurFields.statut} onChange={(e) => setEditApporteurFields((p) => ({ ...p, statut: e.target.value as ApporteurStatut }))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#4F7CFF] bg-white">
                                {(['Actif', 'Inactif', 'Suspendu'] as ApporteurStatut[]).map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Formulaire</label>
                              <select value={editApporteurFields.activationFormulaire} onChange={(e) => setEditApporteurFields((p) => ({ ...p, activationFormulaire: e.target.value as ActivationFormulaire }))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#4F7CFF] bg-white">
                                {(['Actif', 'Inactif', 'Révoqué'] as ActivationFormulaire[]).map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Commission %</label>
                              <input type="number" min="0" max="100" step="0.5" value={editApporteurFields.commissionDefaut} onChange={(e) => setEditApporteurFields((p) => ({ ...p, commissionDefaut: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#4F7CFF]" placeholder="Ex : 15" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Collaborateurs assignés</label>
                            <div className="flex flex-wrap gap-2">
                              {adminCollab.map((c) => {
                                const checked = editApporteurFields.collaborateurIds.includes(c.id);
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setEditApporteurFields((p) => ({
                                      ...p,
                                      collaborateurIds: checked
                                        ? p.collaborateurIds.filter((id) => id !== c.id)
                                        : [...p.collaborateurIds, c.id],
                                    }))}
                                    className={`text-xs font-bold px-3 py-1 rounded-lg border transition-colors ${
                                      checked ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                    }`}
                                  >
                                    {c.nom}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Notes</label>
                            <input type="text" value={editApporteurFields.notes} onChange={(e) => setEditApporteurFields((p) => ({ ...p, notes: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#4F7CFF]" placeholder="Remarques…" />
                          </div>
                          <div className="flex gap-3 justify-end pt-1">
                            <button type="button" onClick={() => setEditingApporteurId(null)} className="px-4 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100">Annuler</button>
                            <button type="button" onClick={() => handleSaveApporteur(a)} disabled={apporteurSaving} className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
                              <Save size={13} /> {apporteurSaving ? '…' : 'Sauvegarder'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Compagnies — placeholder V1 */}
      {adminSubTab === 'collaborateurs' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <ShieldCheck size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">Compagnies & Partenariats</p>
          <p className="text-xs text-slate-300 mt-1">Prochainement</p>
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="p-4 md:p-10 max-w-[1600px] mx-auto">
        {tab !== 'clients' && (
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
              <h1 className="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tighter">
                {tab === 'overview' && "Pilotage Stratégique"}
                {tab === 'prospects' && "Projets en cours"}
                {tab === 'docs' && "Documents Cabinet"}
                {(tab === 'settings' || tab === 'admin') && "Administration Cabinet"}
              </h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                OS métier • {currentCollaborateur?.nom ?? 'Cabinet ECA'}
              </p>
            </div>
            {tab !== 'clients' && (
              <button onClick={() => navigate('/prospects/new')} className="w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-primary text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl shadow-blue-500/20">
                <UserPlus size={20} /> Nouvelle demande
              </button>
            )}
          </header>
        )}

        {tab === 'overview' && renderOverview()}
        {tab === 'prospects' && renderProspectsList()}
        {tab === 'clients' && renderClientsList()}
        {tab === 'docs' && renderDocumentsCabinet()}
        {(tab === 'settings' || tab === 'admin') && renderAdmin()}
      </div>
    </Layout>
  );
};

export default Dashboard;


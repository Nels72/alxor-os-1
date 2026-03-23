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
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
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
  Award,
  CheckCircle,
  Phone,
  Building2,
  User as UserIcon,
  Copy,
  FolderOpen,
  PenLine,
  RotateCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../store';
import { PriorityLevel, Client, Contrat, Amendment } from '../types';

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

const CHART_DATA = [
  { name: 'Jan', val: 8000 },
  { name: 'Fév', val: 9500 },
  { name: 'Mar', val: 12000 },
  { name: 'Avr', val: 11000 },
  { name: 'Mai', val: 14500 },
];

const STATUS_COLORS: Record<string, string> = {
  nouveau: 'bg-blue-50 text-blue-500 border border-blue-100',
  en_analyse: 'bg-orange-50 text-orange-500 border border-orange-100',
  devis_envoye: 'bg-cyan-50 text-cyan-500 border border-cyan-100',
  converti: 'bg-green-50 text-green-500 border border-green-100',
};

const STATUS_LABELS: Record<string, string> = {
  nouveau: 'NOUVEAU',
  en_analyse: 'EN ANALYSE',
  devis_envoye: 'ATTENTE RETOUR SIGNÉ',
  converti: 'CONVERTI',
};

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
  const clients = useStore(state => state.clients);
  const contracts = useStore(state => state.contracts);
  const generateFicheConseil = useStore(state => state.generateFicheConseil);
  const lastConvertedClientId = useStore(state => state.lastConvertedClientId);
  const clearLastConvertedClientId = useStore(state => state.clearLastConvertedClientId);
  const clientNotes = useStore(state => state.clientNotes);
  const setClientNotes = useStore(state => state.setClientNotes);
  const updateContrat = useStore(state => state.updateContrat);

  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [searchHighlight, setSearchHighlight] = useState<{ clientId: string; contractId?: string; avenantIndex?: number; phase: 'avenant' | 'contract' } | null>(null);

  /** Extraction IA Phase 3 à l'ouverture (AUTO → Immatriculation, MRH/MRP → Adresse du Risque) */
  useEffect(() => {
    if (!expandedClientId) return;
    const clientCon = contracts.filter((c) => c.client_id === expandedClientId);
    clientCon.forEach((con) => {
      const t = (con.type_contrat || '').toUpperCase();
      const isAUTO = t.includes('AUTO') || t === 'AUTOMOBILE';
      const isMRHMRP = t.includes('MRH') || t.includes('MRP') || t.includes('HABITATION') || (t.includes('PRO') && t.includes('MULTIRISQUE'));
      if (isAUTO && !con.immatriculation) {
        updateContrat(con.id, { immatriculation: `AB-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 4).toUpperCase()}` });
      }
      if (isMRHMRP && !con.adresse_risque) {
        updateContrat(con.id, { adresse_risque: '12 Rue du Louvre, 75001 Paris' });
      }
    });
  }, [expandedClientId, contracts, updateContrat]);

  useEffect(() => {
    if (!lastConvertedClientId) return;
    const t = setTimeout(clearLastConvertedClientId, 3000);
    return () => clearTimeout(t);
  }, [lastConvertedClientId, clearLastConvertedClientId]);

  const countProvisoires = useMemo(() => prospects.filter(p => p.documents_provisoires && Object.keys(p.documents_provisoires).length > 0).length, [prospects]);
  const gesMoyen = useMemo(() => prospects.length ? Math.round(prospects.reduce((s, p) => s + p.ges_score, 0) / prospects.length) : 0, [prospects]);

  const stats = useMemo(() => [
    { label: "Prospects Actifs", val: prospects.length, icon: UserPlus, color: "#4F7CFF", trend: "+12%" },
    { label: "Clients Totaux", val: clients.length, icon: Users, color: "#10B981", trend: "+3%" },
    { label: "Comm. du Mois", val: "14,500 €", icon: DollarSign, color: "#2ED3B7", trend: "+24%" },
    { label: "GES Moyen", val: `${gesMoyen}%`, icon: TrendingUp, color: "#F59E0B", trend: "+5%" },
  ], [prospects.length, clients.length, gesMoyen]);

  const getGesColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const renderOverview = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon size={24} />
              </div>
              <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded">
                {stat.trend}
              </span>
            </div>
            <p className="text-slate-500 text-sm mb-1 font-medium">{stat.label}</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-900">{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 md:p-8 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900">Performance financière</h3>
            <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase outline-none text-slate-600 tracking-widest">
              <option>Derniers 6 mois</option>
            </select>
          </div>
          <div className="h-[250px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F7CFF" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4F7CFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="val" stroke="#4F7CFF" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
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
          <h3 className="text-xl font-bold mb-8 text-slate-900 tracking-tight">Capacité Collaborateur</h3>
          <div className="flex flex-col items-center justify-center h-[200px]">
            <div className="relative w-36 h-36 md:w-40 md:h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                <circle 
                  cx="80" cy="80" r="70" stroke="#4F7CFF" strokeWidth="12" fill="transparent"
                  strokeDasharray="440" strokeDashoffset={440 - (440 * 65 / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900">65%</span>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Charge</span>
              </div>
            </div>
          </div>
          <div className="mt-8 p-5 bg-blue-50 border border-blue-100 rounded-2xl">
            <div className="flex gap-4">
              <Clock className="text-[#4F7CFF] shrink-0" size={20} />
              <div>
                <p className="text-[11px] font-black text-[#4F7CFF] uppercase tracking-wider">Collaborateur OS</p>
                <p className="text-xs text-blue-700 font-bold mt-1">Automatisation : <span className="font-black">140h/mois</span> libérées.</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {renderProspectsList()}
    </>
  );

  const renderProspectsList = () => (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-6 md:p-8 border-b border-slate-200 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Flux de Production (Supabase Table: solicitations)</h3>
        <div className="flex gap-2 md:gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-[#4F7CFF] transition-all text-sm text-slate-700 font-medium"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shrink-0">
            <Filter size={18} className="text-slate-500" />
          </button>
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-200 bg-slate-50/50">
              <th className="px-8 py-4">Prospect / Priorité</th>
              <th className="px-8 py-4">Nature & Matching DDA</th>
              <th className="px-8 py-4 text-center">Score GES</th>
              <th className="px-8 py-4">Statut</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {prospects.map((p) => (
              <tr 
                key={p.id} 
                className="group hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <td className="px-8 py-5" onClick={() => navigate(`/prospects/${p.id}`)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 shrink-0 text-xs relative">
                       {p.nom[0]}{p.prenom[0]}
                       {p.priority === 'Critique' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{p.prenom} {p.nom}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase border ${p.priority ? PRIORITY_BADGE[p.priority] : 'bg-slate-50 text-slate-400'}`}>
                          {p.priority || 'Normale'}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5" onClick={() => navigate(`/prospects/${p.id}`)}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Target size={14} className="text-[#4F7CFF]" />
                      <span className="text-xs font-bold text-slate-700">{p.type_contrat_demande}</span>
                    </div>
                    {p.ia_analysis_done && p.ai_suggestions && (
                      <div className="flex gap-1">
                        {p.ai_suggestions.slice(0, 3).map((s, idx) => (
                          <div key={idx} className="flex flex-col items-center bg-white border border-slate-100 rounded-lg p-1 min-w-[50px] shadow-sm">
                            <span className="text-[8px] font-black text-slate-400">{s.compagnie}</span>
                            <span className="text-[10px] font-black text-[#4F7CFF]">{s.score}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5" onClick={() => navigate(`/prospects/${p.id}`)}>
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5 shadow-inner">
                      <div 
                        className="h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${p.ges_score}%`, backgroundColor: getGesColor(p.ges_score) }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400">{p.ges_score}%</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm border ${STATUS_COLORS[p.statut]}`}>
                      {STATUS_LABELS[p.statut]}
                    </span>
                    {p.fiche_conseil_generee && (
                      <span className="flex items-center gap-1 text-[8px] font-black text-[#10B981] uppercase tracking-widest px-1">
                        <CheckCircle size={10} /> Fiche Conseil Prête
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    {!p.fiche_conseil_generee ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); generateFicheConseil(p.id); }}
                        className="px-3 py-1.5 bg-[#4F7CFF] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2"
                      >
                        <Award size={14} /> FIC / DDC
                      </button>
                    ) : (
                      <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                        <MoreHorizontal size={20} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

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
                          <p className="text-sm font-black text-slate-900 leading-tight" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                            {c.type === 'PRO' ? (c.raison_sociale || `${c.prenom} ${c.nom}`) : `${c.prenom} ${c.nom}`}
                          </p>
                          <p className="text-[9px] font-black uppercase tracking-widest mt-0.5 text-blue-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>
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

  return (
    <Layout>
      <div className="p-4 md:p-10 max-w-[1600px] mx-auto">
        {tab !== 'clients' && (
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
              <h1 className="text-2xl md:text-4xl font-black mb-2 text-slate-900 tracking-tighter">
                {tab === 'overview' && "Pilotage Stratégique"}
                {tab === 'prospects' && "Flux Production"}
                {tab === 'docs' && "Archives GED"}
                {tab === 'settings' && "Paramètres"}
              </h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">OS métier • Jean-Marc Dupont</p>
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
        {tab === 'docs' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
            <h3 className="text-slate-400 font-bold">Archives GED (Supabase Table: documents)</h3>
            <p className="text-slate-300 text-sm mt-2">Simulation de l'archivage sécurisé des pièces.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;


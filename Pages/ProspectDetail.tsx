
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { 
  User, Edit, Clock, Zap, FileText, Upload, 
  CheckCircle, Circle, Brain, ArrowLeft, AlertCircle,
  ChevronRight, ShieldCheck, DollarSign, X, MapPin, Mail, Phone,
  History, Info, ExternalLink, PenTool, Check, Award, Loader2, Handshake,
  Target, AlertTriangle, Eye, Download, Send, Search, Sparkles, TrendingUp,
  CreditCard
} from 'lucide-react';
import { useStore } from '../store';
import { WORKFLOW_DOCUMENTS } from '../lib/preDevisDocuments';
import { AISuggestion, PriorityLevel } from '../types';

const STATUS_LABELS: Record<string, string> = {
  nouveau: 'NOUVEAU',
  en_analyse: 'EN ANALYSE',
  devis_envoye: 'ATTENTE RETOUR SIGNÉ',
  converti: 'CONVERTI',
};

const STATUS_COLORS: Record<string, string> = {
  nouveau: 'bg-blue-50 text-blue-500 border border-blue-100',
  en_analyse: 'bg-orange-50 text-orange-500 border border-orange-100',
  devis_envoye: 'bg-cyan-50 text-cyan-500 border border-cyan-100',
  converti: 'bg-green-50 text-green-500 border border-green-100',
};

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  Critique: 'bg-red-500 text-white',
  Haute: 'bg-orange-500 text-white',
  Moyenne: 'bg-blue-500 text-white',
  Basse: 'bg-slate-400 text-white',
};

const ProspectDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const prospect = useStore(state => state.prospects.find(p => p.id === id));
  const docsUploaded = useStore(state => id ? state.getProspectDocs(id) : []);
  
  const uploadDoc = useStore(state => state.uploadDoc);
  const updateProspect = useStore(state => state.updateProspect);
  const runIAAnalysis = useStore(state => state.runIAAnalysis);
  const validateManualSignature = useStore(state => state.validateManualSignature);
  const validateFinalContractSignature = useStore(state => state.validateFinalContractSignature);
  const handleConversion = useStore(state => state.handleConversion);

  const [activeTab, setActiveTab] = useState<'docs' | 'info'>('info');
  const [showConversionSuccessModal, setShowConversionSuccessModal] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [previewingDoc, setPreviewingDoc] = useState<string | null>(null);
  const [isValidatingSignature, setIsValidatingSignature] = useState(false);
  const [isValidatingFinalSignature, setIsValidatingFinalSignature] = useState(false);
  const [isScanning, setIsScanning] = useState<string | null>(null);
  
  const [quoteData, setQuoteData] = useState({
    compagnie: '',
    prime: '',
    franchise: '',
    garanties_summary: '',
  });
  const [editingArbitrageFor, setEditingArbitrageFor] = useState<string | null>(null);
  const [draftNoteExpertise, setDraftNoteExpertise] = useState('');
  const [editingProvisoireFor, setEditingProvisoireFor] = useState<string | null>(null);
  const [draftDateEcheance, setDraftDateEcheance] = useState('');

  // Sélection par défaut de l'offre la plus élevée lors de l'analyse
  useEffect(() => {
    if (prospect?.ia_analysis_done && prospect?.ai_suggestions && !prospect.ai_suggestion) {
      const sorted = [...prospect.ai_suggestions].sort((a, b) => b.score - a.score);
      updateProspect(prospect.id, { ai_suggestion: sorted[0] });
    }
  }, [prospect?.ia_analysis_done, prospect?.ai_suggestions]);

  useEffect(() => {
    if (prospect?.ai_suggestion) {
      setQuoteData({
        compagnie: prospect.ai_suggestion.compagnie || '',
        prime: prospect.ai_suggestion.tarif_estime?.toString() || '',
        franchise: prospect.ai_suggestion.franchise || '',
        garanties_summary: prospect.ai_suggestion.garanties || '',
      });
    }
  }, [prospect?.ai_suggestion]);

  useEffect(() => {
    if (prospect?.ges_score === 100 && prospect?.statut !== 'converti') setShowConversionSuccessModal(true);
  }, [prospect?.ges_score, prospect?.statut]);

  const bestSuggComp = useMemo(() => {
    if (!prospect?.ai_suggestions) return null;
    return [...prospect.ai_suggestions].sort((a, b) => b.score - a.score)[0].compagnie;
  }, [prospect?.ai_suggestions]);

  const productKey = prospect?.type_contrat_demande?.toLowerCase().replace(/\s+/g, '_') || 'auto';
  const configDocs = useMemo(() => WORKFLOW_DOCUMENTS[productKey] || WORKFLOW_DOCUMENTS['auto'], [productKey]);

  const phase1Docs = configDocs.filter(d => d.phase === 1);
  const phase2Docs = configDocs.filter(d => d.phase === 2);
  const phase3Docs = configDocs.filter(d => d.phase === 3);

  const phase1Complete = phase1Docs
    .filter((d) => d.obligatoire)
    .every(
      (d) =>
        docsUploaded.includes(d.type) ||
        (prospect?.airtable_attachments?.[d.type]?.length ?? 0) > 0
    );
  const phase2Complete = phase2Docs
    .filter((d) => d.obligatoire)
    .every(
      (d) =>
        docsUploaded.includes(d.type) ||
        (prospect?.airtable_attachments?.[d.type]?.length ?? 0) > 0
    );
  const hasProvisoire = prospect?.documents_provisoires && Object.keys(prospect.documents_provisoires).length > 0;
  
  const signatureDevisValidee = prospect?.signature_manuelle_validee;
  const signatureContratValidee = prospect?.contrat_definitif_signe;

  const handleDownloadFile = (fileName: string) => {
    alert(`Téléchargement de : ${fileName}.pdf`);
  };

  const handleEstablishQuote = () => {
    if (id && prospect) {
      updateProspect(id, { 
        statut: 'devis_envoye',
        ai_suggestion: {
          ...prospect.ai_suggestion!,
          compagnie: quoteData.compagnie,
          tarif_estime: parseInt(quoteData.prime) || 0,
          franchise: quoteData.franchise,
          garanties: quoteData.garanties_summary
        }
      });
      setIsQuoteModalOpen(false);
    }
  };

  const handleSendFinalContract = () => {
    if (id) {
      updateProspect(id, { contrat_definitif_envoye: true });
      setIsContractModalOpen(false);
    }
  };

  const handleManualSignatureValidation = async () => {
    if (id) {
      setIsValidatingSignature(true);
      // Simulation d'un délai réseau pour le feedback visuel
      await new Promise(resolve => setTimeout(resolve, 600));
      validateManualSignature(id);
      setIsValidatingSignature(false);
    }
  };

  const handleFinalSignatureValidation = async () => {
    if (id) {
      setIsValidatingFinalSignature(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      validateFinalContractSignature(id);
      setIsValidatingFinalSignature(false);
    }
  };

  const confirmConversionAndRedirect = () => {
    if (!id || !prospect) return;
    setShowConversionSuccessModal(false);
    handleConversion(id);
    navigate('/dashboard?tab=clients');
  };

  const triggerFileUpload = (type: string, phase: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e: any) => {
      if (e.target.files && e.target.files[0] && id) {
        if (phase === 1) {
          setIsScanning(type);
          await new Promise(resolve => setTimeout(resolve, 1500)); 
          setIsScanning(null);
        }
        uploadDoc(id, type);
      }
    };
    input.click();
  };

  if (!prospect) return <Layout><div className="p-10 text-slate-900 font-bold text-center text-xl">Dossier introuvable...</div></Layout>;

  return (
    <Layout>
      <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-6">
        
        {/* BANDEAU ALERTE DYNAMIQUE */}
        {prospect.statut !== 'converti' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${prospect.ges_score >= 60 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} border-2 p-4 md:p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between shadow-lg gap-4 transition-all`}
          >
            <div className="flex items-center gap-5 w-full">
              <div className={`w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border ${prospect.ges_score >= 60 ? 'text-green-500 border-green-100' : 'text-orange-500 border-orange-100'} shrink-0`}>
                {prospect.ges_score >= 60 ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">{prospect.ges_score >= 60 ? "Dossier Phase 1 complet" : "Action Requise"}</h4>
                <p className="text-sm text-slate-600 font-bold">
                  {prospect.ges_score >= 60 ? "Lancer Matching et Analyse" : "Dossier incomplet. Téléversez les pièces de Phase 1."}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('docs')} 
              disabled={prospect.ges_score >= 60}
              className={`w-full md:w-auto px-6 py-3 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                prospect.ges_score >= 60 
                  ? 'bg-[#10B981] text-white cursor-default' 
                  : 'bg-slate-900 text-white hover:scale-105 shadow-slate-900/10'
              }`}
            >
              {prospect.ges_score >= 60 ? <><Check size={14} /> Phase 1 Complétée</> : "Gérer la GED"}
            </button>
          </motion.div>
        )}

        {/* NAVIGATION & ACTIONS RAPIDES */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={() => navigate('/dashboard?tab=prospects')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-colors w-fit">
            <ArrowLeft size={16} /> Flux Opérationnel
          </button>
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('info')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'info' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Infos</button>
            <button onClick={() => setActiveTab('docs')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'docs' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Documents</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            
            {activeTab === 'info' && (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
                <div className="flex justify-between items-start mb-8">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-4">
                    <User className="text-[#4F7CFF]" size={28} /> Profil Prospect
                  </h3>
                  <button className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all border border-slate-100"><Edit size={20}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nature Demande</p>
                      <div className="px-4 py-2 bg-blue-50 text-[#4F7CFF] rounded-xl border border-blue-100 flex items-center gap-2 font-black text-[11px] uppercase tracking-wider w-fit">
                        <Target size={14} /> {prospect.type_contrat_demande}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Identité</p>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-[#4F7CFF] flex items-center justify-center font-black text-sm shrink-0">
                          {prospect.prenom?.[0] || '?'}{prospect.nom?.[0] || '?'}
                        </div>
                        <p className="text-lg font-black text-slate-900 truncate">{prospect.prenom} {prospect.nom}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Coordonnées</p>
                      <div className="space-y-3">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <Mail size={18} className="text-[#4F7CFF] shrink-0" />
                          <p className="text-sm font-bold text-slate-700 truncate">{prospect.email}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <Phone size={18} className="text-[#4F7CFF] shrink-0" />
                          <p className="text-sm font-bold text-slate-700">{prospect.telephone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="space-y-8">
                {/* Phase 1 */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                         <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#4F7CFF] flex items-center justify-center font-black text-xs border border-blue-100 shrink-0">1</span>
                         <h3 className="text-xl md:text-2xl font-black text-slate-900">Phase 1 : Tarification</h3>
                      </div>
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Collecte IA & Conformité Initiale</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {phase1Docs.map(doc => {
                      const airtableFiles = prospect.airtable_attachments?.[doc.type];
                      const isUploaded =
                        docsUploaded.includes(doc.type) ||
                        (airtableFiles?.length ?? 0) > 0;
                      const isScanningThis = isScanning === doc.type;
                      const isProvisoire = doc.peut_etre_provisoire && prospect?.documents_provisoires?.[doc.type];
                      const showProvisoireOption = doc.peut_etre_provisoire && isUploaded;
                      return (
                        <div key={doc.type} className={`flex flex-col gap-4 p-5 rounded-3xl border transition-all ${isUploaded ? (isProvisoire ? 'bg-orange-50/50 border-orange-200' : 'bg-slate-50 border-slate-100') : 'bg-white border-slate-200 shadow-sm'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-5">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shrink-0 ${isProvisoire ? 'bg-orange-100 border-orange-200 text-orange-600' : isUploaded ? 'bg-green-50 border-green-200 text-green-500' : isScanningThis ? 'bg-blue-50 border-blue-200 text-blue-500 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-200'}`}>
                                 {isUploaded ? (isProvisoire ? <AlertTriangle size={24} /> : <CheckCircle size={24} />) : isScanningThis ? <Brain size={24} className="animate-spin" /> : <FileText size={24} />}
                              </div>
                              <div>
                                <p className="text-base font-bold text-slate-900">{doc.label}</p>
                                <p className="text-[11px] text-slate-400 font-bold uppercase">{isScanningThis ? "Extraction IA en cours..." : doc.description}</p>
                                {isProvisoire && <p className="text-[10px] font-bold text-orange-600 mt-0.5">Document provisoire • Échéance : {prospect.documents_provisoires?.[doc.type]?.date_echeance}</p>}
                                {airtableFiles && airtableFiles.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    <p className="text-[9px] font-black text-[#4F7CFF] uppercase tracking-wider">Fichiers client (Airtable)</p>
                                    {airtableFiles.map((att, idx) => (
                                      <a
                                        key={`${att.url}-${idx}`}
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-[11px] font-bold text-[#4F7CFF] hover:underline"
                                      >
                                        <Download size={14} />
                                        {att.filename || `Pièce ${idx + 1}`}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isUploaded && <button onClick={() => setPreviewingDoc(doc.label)} className="p-3 text-[#4F7CFF] hover:bg-blue-100 rounded-xl transition-all"><Eye size={20} /></button>}
                              {!isUploaded && !isScanningThis ? (
                                <button onClick={() => triggerFileUpload(doc.type, 1)} className="px-6 py-3 bg-white border-2 border-[#4F7CFF]/40 rounded-xl text-[10px] font-black text-[#4F7CFF] uppercase tracking-widest hover:bg-[#4F7CFF]/5 transition-all flex items-center gap-2"><Upload size={14} /> Joindre</button>
                              ) : !isUploaded && isScanningThis ? (
                                <span className="px-4 py-2 text-blue-500 font-black text-[9px] uppercase tracking-widest">Analyse...</span>
                              ) : (
                                <span className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-black text-[9px] uppercase border border-green-100">Scanné</span>
                              )}
                            </div>
                          </div>
                          {showProvisoireOption && (
                            <div className="pt-4 border-t border-slate-100">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={!!isProvisoire || editingProvisoireFor === doc.type}
                                  onChange={(e) => {
                                    if (!id || !prospect) return;
                                    if (e.target.checked) { setEditingProvisoireFor(doc.type); setDraftDateEcheance(prospect.documents_provisoires?.[doc.type]?.date_echeance || new Date(Date.now() + 90*24*60*60*1000).toISOString().slice(0,10)); }
                                    else { setEditingProvisoireFor(null); const { [doc.type]: _, ...rest } = prospect.documents_provisoires || {}; updateProspect(id, { documents_provisoires: Object.keys(rest).length ? rest : undefined }); }
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                                <span className="text-sm font-bold text-slate-700">Document Provisoire</span>
                              </label>
                              {editingProvisoireFor === doc.type && (
                                <div className="mt-3 flex gap-2 items-end">
                                  <div className="flex-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date d&apos;échéance du provisoire</label>
                                    <input type="date" value={draftDateEcheance} onChange={e => setDraftDateEcheance(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-900" />
                                  </div>
                                  <button onClick={() => { updateProspect(prospect.id, { documents_provisoires: { ...prospect.documents_provisoires, [doc.type]: { date_echeance: draftDateEcheance } } }); setEditingProvisoireFor(null); }} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase">OK</button>
                                  <button onClick={() => setEditingProvisoireFor(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-bold">Annuler</button>
                                </div>
                              )}
                              {isProvisoire && editingProvisoireFor !== doc.type && (
                                <button onClick={() => { setEditingProvisoireFor(doc.type); setDraftDateEcheance(prospect.documents_provisoires?.[doc.type]?.date_echeance || ''); }} className="mt-2 text-[10px] font-bold text-orange-600 hover:underline">Modifier la date</button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-10 pt-8 border-t border-slate-100">
                    <button 
                      onClick={() => runIAAnalysis(prospect.id)} 
                      disabled={!phase1Complete || prospect.ia_analysis_done} 
                      className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all ${
                        prospect.ia_analysis_done 
                          ? 'bg-[#10B981] text-white cursor-default shadow-lg' 
                          : phase1Complete ? 'bg-[#4F7CFF] text-white hover:scale-[1.01] shadow-xl shadow-blue-500/25' : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      {prospect.ia_analysis_done ? (
                        <><CheckCircle size={22} /> Matching Terminé !</>
                      ) : (
                        <><Brain size={22} /> Calculer le Matching</>
                      )}
                    </button>
                  </div>
                </div>

                {/* RECOMMANDATIONS IA */}
                <AnimatePresence>
                  {prospect.ia_analysis_done && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-4 px-4">
                        <Award className="text-[#10B981]" size={28} /> Recommandations IA
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {prospect.ai_suggestions?.map((sugg, i) => {
                          const isSelected = prospect.ai_suggestion?.compagnie === sugg.compagnie;
                          const isBest = sugg.compagnie === bestSuggComp;
                          return (
                            <motion.div 
                              key={i} 
                              whileHover={{ y: -5 }}
                              className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between relative overflow-hidden ${isSelected ? 'bg-white border-[#10B981] shadow-2xl ring-4 ring-green-50' : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'}`}
                            >
                              <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-[1.5rem] font-black text-sm tracking-widest ${isSelected ? 'bg-[#10B981] text-white' : 'bg-slate-100 text-slate-600'}`}>
                                {sugg.score}% MATCH
                              </div>

                              <div className="mt-4">
                                <div className="flex items-center gap-3 mb-1">
                                  {isBest ? <Target size={18} className="text-[#4F7CFF]" /> : <Sparkles size={18} className="text-[#F59E0B]" />}
                                  <h4 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{sugg.compagnie}</h4>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {sugg.appetence_technique != null && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                                      <ShieldCheck size={10} /> Appétence {sugg.appetence_technique}%
                                    </span>
                                  )}
                                  {sugg.competitivite_marche != null && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 border border-slate-100">
                                      <TrendingUp size={10} /> Marché {sugg.competitivite_marche}%
                                    </span>
                                  )}
                                </div>
                                <p className="text-3xl font-black text-[#4F7CFF] mb-6">{sugg.tarif_estime}€ <span className="text-[12px] text-slate-400 font-bold uppercase tracking-widest">TTC / an</span></p>
                                
                                <div className="space-y-3 mb-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-50">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                                    <Brain size={12} /> Analyse des bénéfices
                                  </p>
                                  {sugg.justification.map((arg, idx) => (
                                    <div key={idx} className="flex items-start gap-2.5">
                                      <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <Check size={10} className="text-[#10B981] stroke-[4]" />
                                      </div>
                                      <span className="text-[11px] font-bold text-slate-600 leading-snug">{arg}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="grid grid-cols-1 gap-3 mb-8">
                                  <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-center h-20">
                                    <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                      <ShieldCheck size={11} className="text-[#10B981] shrink-0" /> Couverture
                                    </p>
                                    <p className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{sugg.garanties || "Garanties standards"}</p>
                                  </div>
                                  <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-center h-20">
                                    <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                      <AlertTriangle size={11} className="text-orange-400 shrink-0" /> Franchise
                                    </p>
                                    <p className="text-[11px] font-bold text-slate-800 leading-tight">{sugg.franchise || "300 €"}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2">
                                <button 
                                  onClick={() => updateProspect(prospect.id, { ai_suggestion: sugg })} 
                                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all shadow-md flex items-center justify-center gap-2 ${
                                    isSelected ? 'bg-[#10B981] text-white shadow-lg' : 'bg-slate-900 text-white hover:bg-slate-800'
                                  }`}
                                >
                                  {isSelected ? (
                                    <><Check size={16} /> Offre sélectionnée</>
                                  ) : (
                                    'Choisir cette offre'
                                  )}
                                </button>
                                {isSelected && (
                                  <>
                                    <button 
                                      onClick={() => { setEditingArbitrageFor(sugg.compagnie); setDraftNoteExpertise(sugg.note_expertise_courtier || ''); }}
                                      className="w-full py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest border-2 border-slate-200 text-slate-600 hover:border-[#4F7CFF] hover:text-[#4F7CFF] transition-all flex items-center justify-center gap-2"
                                    >
                                      <PenTool size={14} /> Ajuster l&apos;arbitrage
                                    </button>
                                    {editingArbitrageFor === sugg.compagnie && (
                                      <div className="mt-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Note d&apos;expertise du courtier</label>
                                        <textarea 
                                          value={draftNoteExpertise}
                                          onChange={e => setDraftNoteExpertise(e.target.value)}
                                          placeholder="Privilégié pour la qualité de gestion sinistre"
                                          rows={3}
                                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-300 outline-none focus:ring-2 focus:ring-[#4F7CFF]/30 focus:border-[#4F7CFF] resize-none"
                                        />
                                        <div className="flex gap-2 mt-3">
                                          <button 
                                            onClick={() => {
                                              updateProspect(prospect.id, { ai_suggestion: { ...sugg, note_expertise_courtier: draftNoteExpertise } });
                                              setEditingArbitrageFor(null);
                                            }}
                                            className="flex-1 py-2 rounded-xl bg-[#10B981] text-white text-[10px] font-black uppercase tracking-widest"
                                          >
                                            Enregistrer
                                          </button>
                                          <button 
                                            onClick={() => { setEditingArbitrageFor(null); setDraftNoteExpertise(''); }}
                                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-bold uppercase"
                                          >
                                            Annuler
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* BOUTON ÉDITER DEVIS & FIC */}
                      {prospect.statut !== 'converti' && !signatureDevisValidee && (
                        <div className="mt-10">
                          <button 
                            onClick={() => setIsQuoteModalOpen(true)}
                            className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-xl bg-slate-900 text-white hover:scale-[1.01]"
                          >
                            <FileText size={22} />
                            {prospect.statut === 'devis_envoye' ? 'Devis & FIC édités et en signature' : 'Editer devis & FIC'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phase 2 : Pré-contractualisation */}
                <div className={`bg-white border rounded-[2.5rem] p-6 md:p-10 shadow-sm transition-all ${!prospect.ia_analysis_done ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
                   <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                         <span className="w-8 h-8 rounded-lg bg-green-50 text-[#10B981] flex items-center justify-center font-black text-xs border border-green-100 shrink-0">2</span>
                         <h3 className="text-xl md:text-2xl font-black text-slate-900">Phase 2 : Pré-contractualisation</h3>
                      </div>
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Devis & FIC • RIB</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-3xl border transition-all gap-4 ${signatureDevisValidee ? 'bg-green-50 border-green-200' : (prospect.statut === 'devis_envoye' ? 'bg-blue-50 border-blue-100 shadow-sm' : 'bg-slate-50 border-slate-100')}`}>
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shrink-0 ${signatureDevisValidee ? 'bg-white border-green-200 text-[#10B981]' : 'bg-white border-blue-100 text-[#4F7CFF]'}`}>
                          <PenTool size={24} />
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900">Devis & FIC</p>
                          <p className="text-[11px] text-slate-400 font-bold uppercase">{signatureDevisValidee ? 'Signé & Reçu' : 'Upload manuel ou lien Yousign'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={handleManualSignatureValidation} disabled={signatureDevisValidee || isValidatingSignature} className={`px-6 py-2.5 text-[9px] font-black uppercase rounded-xl shadow-lg flex items-center gap-2 transition-all ${signatureDevisValidee ? 'bg-[#10B981] text-white cursor-default' : 'bg-slate-900 text-white hover:scale-105'}`}>
                          {isValidatingSignature ? <Loader2 size={14} className="animate-spin" /> : signatureDevisValidee ? <Check size={14} /> : <Handshake size={14} />}
                          {signatureDevisValidee ? "Signé & Reçu" : "Valider Signature Manuelle (80%)"}
                        </button>
                      </div>
                    </div>

                    {phase2Docs.some(d => d.type === 'rib_iban') && (() => {
                      const ribDoc = phase2Docs.find(d => d.type === 'rib_iban');
                      const ribAirtable = prospect.airtable_attachments?.['rib_iban'];
                      const ribUploaded =
                        docsUploaded.includes('rib_iban') ||
                        (ribAirtable?.length ?? 0) > 0;
                      return (
                        <div className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-3xl border transition-all gap-4 ${ribUploaded ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                          <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shrink-0 ${ribUploaded ? 'bg-white border-green-200 text-[#10B981]' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                              <CreditCard size={24} />
                            </div>
                            <div>
                              <p className="text-base font-bold text-slate-900">{ribDoc?.label || 'RIB'}</p>
                              <p className="text-[11px] text-slate-400 font-bold uppercase">{ribDoc?.description || 'Pour le prélèvement automatique'}</p>
                              {ribAirtable && ribAirtable.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-[9px] font-black text-[#4F7CFF] uppercase tracking-wider">Fichiers client (Airtable)</p>
                                  {ribAirtable.map((att, idx) => (
                                    <a
                                      key={`${att.url}-${idx}`}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-[11px] font-bold text-[#4F7CFF] hover:underline"
                                    >
                                      <Download size={14} />
                                      {att.filename || `RIB ${idx + 1}`}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {ribUploaded ? (
                              <><button onClick={() => setPreviewingDoc(ribDoc?.label || 'RIB')} className="p-3 text-[#4F7CFF] hover:bg-blue-100 rounded-xl transition-all"><Eye size={20} /></button>
                              <span className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-black text-[10px] uppercase border border-green-100">Reçu</span></>
                            ) : (
                              <button onClick={() => triggerFileUpload('rib_iban', 2)} className="px-6 py-3 bg-white border-2 border-[#4F7CFF]/40 rounded-xl text-[10px] font-black text-[#4F7CFF] uppercase tracking-widest hover:bg-[#4F7CFF]/5 transition-all flex items-center gap-2"><Upload size={14} /> Joindre</button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {phase2Docs.filter(d => d.type !== 'signature_devis_fic' && d.type !== 'rib_iban').map(doc => {
                      const atFiles = prospect.airtable_attachments?.[doc.type];
                      const isUploaded =
                        docsUploaded.includes(doc.type) ||
                        (atFiles?.length ?? 0) > 0;
                      return (
                        <div key={doc.type} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-3xl border transition-all gap-4 ${isUploaded ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}>
                          <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shrink-0 ${isUploaded ? 'bg-green-50 border-green-200 text-green-500' : 'bg-slate-50 border-slate-100 text-slate-200'}`}>
                               {isUploaded ? <CheckCircle size={24} /> : <FileText size={24} />}
                            </div>
                            <div>
                              <p className="text-base font-bold text-slate-900">{doc.label}</p>
                              <p className="text-[11px] text-slate-400 font-bold uppercase">{doc.description}</p>
                              {atFiles && atFiles.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-[9px] font-black text-[#4F7CFF] uppercase tracking-wider">Fichiers client (Airtable)</p>
                                  {atFiles.map((att, idx) => (
                                    <a
                                      key={`${att.url}-${idx}`}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-[11px] font-bold text-[#4F7CFF] hover:underline"
                                    >
                                      <Download size={14} />
                                      {att.filename || `Fichier ${idx + 1}`}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isUploaded && <button onClick={() => setPreviewingDoc(doc.label)} className="p-3 text-[#4F7CFF] hover:bg-blue-100 rounded-xl transition-all"><Eye size={20} /></button>}
                            {!isUploaded ? <button onClick={() => triggerFileUpload(doc.type, 2)} className="px-6 py-3 bg-white border-2 border-[#4F7CFF]/40 rounded-xl text-[10px] font-black text-[#4F7CFF] uppercase tracking-widest hover:bg-[#4F7CFF]/5 transition-all flex items-center gap-2"><Upload size={14} /> Joindre</button> : <span className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-black text-[10px] uppercase border border-green-100">Reçu</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Phase 3 : Finalisation */}
                {phase3Docs.length > 0 && (
                  <div className={`bg-white border rounded-[2.5rem] p-6 md:p-10 shadow-sm transition-all ${!prospect.ia_analysis_done ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                           <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">3</span>
                           <h3 className="text-xl md:text-2xl font-black text-slate-900">Phase 3 : Finalisation</h3>
                        </div>
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Contrat Final • Upload extranet compagnie</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {phase3Docs.map(doc => {
                        const contratEnvoye = prospect.contrat_definitif_envoye;
                        const isProvisoire = doc.peut_etre_provisoire && prospect?.documents_provisoires?.[doc.type];
                        const showProvisoireOption = doc.peut_etre_provisoire && (contratEnvoye || signatureContratValidee);
                        return (
                          <div key={doc.type} className={`flex flex-col gap-4 p-5 rounded-3xl border transition-all ${signatureContratValidee ? 'bg-green-50 border-green-200' : (contratEnvoye ? 'bg-blue-50 border-blue-100 shadow-sm' : 'bg-white border-slate-200 shadow-sm')} ${isProvisoire ? 'border-orange-300 bg-orange-50/50' : ''}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shrink-0 ${signatureContratValidee ? 'bg-white border-green-200 text-[#10B981]' : isProvisoire ? 'bg-orange-100 border-orange-200 text-orange-600' : 'bg-white border-blue-100 text-[#4F7CFF]'}`}>
                                  <ShieldCheck size={24} />
                                </div>
                                <div>
                                  <p className="text-base font-bold text-slate-900">{doc.label}</p>
                                  <p className="text-[11px] text-slate-400 font-bold uppercase">{signatureContratValidee ? 'Signé' : contratEnvoye ? 'En attente de signature' : 'Charger depuis extranet compagnie'}</p>
                                  {isProvisoire && prospect.documents_provisoires?.[doc.type] && <p className="text-[10px] font-bold text-orange-600 mt-1">Provisoire • Échéance : {prospect.documents_provisoires[doc.type].date_echeance}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {signatureDevisValidee && !signatureContratValidee && !contratEnvoye && (
                                  <button onClick={() => setIsContractModalOpen(true)} className="px-6 py-2.5 bg-slate-900 text-white text-[9px] font-black uppercase rounded-xl shadow-lg flex items-center gap-2 hover:scale-105 transition-all"><Upload size={14} /> Charger Contrat</button>
                                )}
                                {!signatureContratValidee && contratEnvoye && (
                                  <button onClick={handleFinalSignatureValidation} disabled={isValidatingFinalSignature} className="px-6 py-2.5 bg-[#10B981] text-white text-[9px] font-black uppercase rounded-xl shadow-lg flex items-center gap-2">
                                    {isValidatingFinalSignature ? <Loader2 size={14} className="animate-spin" /> : <Handshake size={14} />}
                                    Valider Retour Signé (100%)
                                  </button>
                                )}
                                {signatureContratValidee && <span className="text-green-600 font-black text-[10px] uppercase flex items-center gap-2"><CheckCircle size={16}/> Police active</span>}
                              </div>
                            </div>
                            {showProvisoireOption && (
                              <div className="pt-4 border-t border-slate-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input type="checkbox" checked={!!isProvisoire || editingProvisoireFor === doc.type}
                                    onChange={(e) => {
                                      if (!id || !prospect) return;
                                      if (e.target.checked) { setEditingProvisoireFor(doc.type); setDraftDateEcheance(prospect.documents_provisoires?.[doc.type]?.date_echeance || new Date(Date.now() + 90*24*60*60*1000).toISOString().slice(0,10)); }
                                      else { setEditingProvisoireFor(null); const { [doc.type]: _, ...rest } = prospect.documents_provisoires || {}; updateProspect(id, { documents_provisoires: Object.keys(rest).length ? rest : undefined }); }
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                                  <span className="text-sm font-bold text-slate-700">Document Provisoire</span>
                                </label>
                                {editingProvisoireFor === doc.type && (
                                  <div className="mt-3 flex gap-2 items-end">
                                    <div className="flex-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date d&apos;échéance</label>
                                    <input type="date" value={draftDateEcheance} onChange={e => setDraftDateEcheance(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm" /></div>
                                    <button onClick={() => { updateProspect(prospect.id, { documents_provisoires: { ...prospect.documents_provisoires, [doc.type]: { date_echeance: draftDateEcheance } } }); setEditingProvisoireFor(null); }} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-[10px] font-black">OK</button>
                                    <button onClick={() => setEditingProvisoireFor(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-bold">Annuler</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 relative h-full">
            <div className="sticky top-10 space-y-8">
              {/* Indice de Sécurité du CA */}
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 text-center">Indice de Sécurité du CA</h3>
                <div className="space-y-6">
                  {/* Bouclier 1 : Conformité DDA */}
                  <div className={`p-4 rounded-2xl border-2 ${phase1Complete ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${phase1Complete ? 'bg-green-100 text-[#10B981]' : 'bg-slate-200 text-slate-400'}`}>
                        <ShieldCheck size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Bouclier 1 : Conformité DDA</p>
                        <p className={`text-sm font-bold ${phase1Complete ? 'text-green-700' : 'text-slate-500'}`}>
                          {phase1Complete ? 'Validé - Documents & KYC complets' : 'En attente - Documents requis'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Bouclier 2 : Conformité Souscription */}
                  <div className={`p-4 rounded-2xl border-2 ${
                    prospect.conformite_limitrophe 
                      ? 'bg-orange-50 border-orange-200' 
                      : prospect.ia_analysis_done && prospect.ai_suggestion 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        prospect.conformite_limitrophe 
                          ? 'bg-orange-100 text-orange-600' 
                          : prospect.ia_analysis_done && prospect.ai_suggestion 
                            ? 'bg-green-100 text-[#10B981]' 
                            : 'bg-slate-200 text-slate-400'
                      }`}>
                        <ShieldCheck size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Bouclier 2 : Conformité Souscription</p>
                        <p className={`text-sm font-bold ${
                          prospect.conformite_limitrophe 
                            ? 'text-orange-600' 
                            : prospect.ia_analysis_done && prospect.ai_suggestion 
                              ? 'text-green-700' 
                              : 'text-slate-500'
                        }`}>
                          {prospect.conformite_limitrophe 
                            ? 'Vérification experte requise' 
                            : prospect.ia_analysis_done && prospect.ai_suggestion 
                              ? 'Vérifié - Adéquation règles compagnie' 
                              : 'En attente - Analyse tarification'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* GES conservé en discret pour le workflow */}
                <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GES</span>
                  <p className="text-xl font-black text-slate-900">{prospect.ges_score}%</p>
                </div>
              </div>

              {/* Timeline Dossier */}
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                    <History className="text-[#4F7CFF]" size={20} /> Timeline Dossier
                  </h3>
                  <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${STATUS_COLORS[prospect.statut]}`}>
                    {STATUS_LABELS[prospect.statut]}
                  </div>
                </div>

                <div className="space-y-8 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-100">
                  {[
                    { title: "Activation Portefeuille", desc: "Dossier validé à 100%. Statut : Client.", date: "À l'instant", icon: ShieldCheck, color: "#10B981", active: signatureContratValidee },
                    { title: "Signature Devis & FIC", desc: "Accord client validé manuellement (80%).", date: "Aujourd'hui, 11:20", icon: PenTool, color: "#10B981", active: signatureDevisValidee },
                    { title: "Matching IA Terminé", desc: "Analyse des solutions de tarification.", date: "Hier, 16:30", icon: Brain, color: "#4F7CFF", active: prospect.ia_analysis_done },
                    { title: "Phase 1 Complétée", desc: "Éligibilité tarification confirmée (60%).", date: "Hier, 15:00", icon: CheckCircle, color: "#4F7CFF", active: phase1Complete },
                  ].filter(e => e.active).map((event, i) => (
                    <div key={i} className="relative pl-10 group">
                      <div className="absolute left-0 top-0 w-8 h-8 rounded-xl text-white shadow-sm flex items-center justify-center z-10" style={{backgroundColor: event.color}}>
                        <event.icon size={16} />
                      </div>
                      <div>
                        <div className="flex justify-between items-start mb-0.5">
                          <p className="font-black text-slate-900 text-[11px] leading-tight">{event.title}</p>
                          <span className="text-[8px] font-black text-slate-400 uppercase whitespace-nowrap">{event.date}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-snug">{event.desc}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Action finale si applicable */}
                  {signatureDevisValidee && !prospect.contrat_definitif_envoye && !signatureContratValidee && (
                    <div className="pt-4 mt-4 border-t border-slate-50">
                      <button 
                        onClick={() => setIsContractModalOpen(true)} 
                        className="w-full py-4 rounded-xl bg-gradient-primary text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-all"
                      >
                        <ShieldCheck size={16} /> Charger Contrat
                      </button>
                    </div>
                  )}

                  {prospect.contrat_definitif_envoye && !signatureContratValidee && (
                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                        <p className="text-[9px] font-black text-blue-400 uppercase mb-2">Attente Signature Finale</p>
                        <button className="w-full py-2 bg-white border border-blue-200 text-blue-600 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">Relancer Client</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PRÉVISUALISATION */}
      <AnimatePresence>
        {previewingDoc && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreviewingDoc(null)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-4xl bg-white rounded-[2rem] overflow-hidden shadow-2xl h-[80vh] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white"><h3 className="text-xl font-black text-slate-900">Aperçu : {previewingDoc}</h3><button onClick={() => setPreviewingDoc(null)} className="p-3 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-all"><X size={24}/></button></div>
              <div className="flex-1 bg-slate-200 flex items-center justify-center p-10"><div className="bg-white w-full h-full shadow-2xl rounded-lg flex flex-col items-center justify-center p-20 text-center"><FileText size={100} className="text-slate-200 mb-6" /><p className="text-xl font-black text-slate-400">Génération PDF en cours...</p></div></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConversionSuccessModal && prospect && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 text-[#10B981] flex items-center justify-center mx-auto mb-6"><Award size={32} /></div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Dossier 100% Conforme</h3>
              <p className="text-sm font-bold text-slate-600 mb-8">Transformation en Client en cours...</p>
              <button onClick={confirmConversionAndRedirect} className="w-full py-4 rounded-xl bg-[#10B981] text-white font-black text-sm uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg">Voir le portefeuille clients</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP 1 : DOSSIER DEVIS & FIC */}
      <AnimatePresence>
        {isQuoteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsQuoteModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-6 md:p-12 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] no-scrollbar">
              <button onClick={() => setIsQuoteModalOpen(false)} className="absolute top-6 md:top-10 right-6 md:right-10 p-3 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-all"><X size={24}/></button>
              <div className="mb-10 flex items-center gap-4">
                <div className="p-4 bg-blue-100 text-[#4F7CFF] rounded-2xl"><FileText size={32} /></div>
                <div><h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Dossier Devis & FIC</h3><p className="text-slate-500 text-sm font-medium">Acceptation de la proposition commerciale (70% GES).</p></div>
              </div>
              <div className="space-y-8">
                <div className="p-8 bg-blue-50 border-2 border-dashed border-blue-200 rounded-[2rem] text-center cursor-pointer hover:bg-blue-100/50 transition-all"><div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#4F7CFF] shadow-sm"><ExternalLink size={32} /></div><h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Charger Devis Compagnie (PDF)</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assureur sélectionné</label><input type="text" value={quoteData.compagnie} onChange={e => setQuoteData({...quoteData, compagnie: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none font-black text-slate-900" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prime Annuelle (€)</label><input type="number" value={quoteData.prime} onChange={e => setQuoteData({...quoteData, prime: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none font-black text-slate-900" /></div>
                </div>
                <button onClick={handleEstablishQuote} className="w-full py-5 bg-green-600 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-4"><Zap size={20} className="fill-white"/> Envoyer en signature (70%)</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP 2 : CONTRAT DÉFINITIF */}
      <AnimatePresence>
        {isContractModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsContractModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-6 md:p-12 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] no-scrollbar">
              <button onClick={() => setIsContractModalOpen(false)} className="absolute top-6 md:top-10 right-6 md:right-10 p-3 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-all"><X size={24}/></button>
              <div className="mb-10 flex items-center gap-4">
                <div className="p-4 bg-slate-900 text-white rounded-2xl"><ShieldCheck size={32} /></div>
                <div><h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Charger Contrat Final</h3><p className="text-slate-500 text-sm font-medium">Upload depuis extranet compagnie (90% GES).</p></div>
              </div>
              <div className="space-y-8">
                <div className="p-8 bg-blue-50 border-2 border-dashed border-blue-200 rounded-[2rem] text-center"><div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#4F7CFF] shadow-sm"><ShieldCheck size={32} /></div><h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Conditions Particulières & Mandat SEPA</h4><p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Généré via Flux API Compagnie</p></div>
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Récapitulatif de l'offre validée</p>
                   <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3"><span className="text-sm font-bold text-slate-600">Compagnie</span><span className="text-sm font-black text-slate-900">{prospect.ai_suggestion?.compagnie}</span></div>
                   <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600">Tarif Définitif</span><span className="text-sm font-black text-[#10B981]">{prospect.ai_suggestion?.tarif_estime}€ TTC</span></div>
                </div>
                <button onClick={handleSendFinalContract} className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-4"><PenTool size={20}/> Lancer Signature Finale</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default ProspectDetail;

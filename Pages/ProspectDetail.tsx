
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { 
  User, Edit, Clock, Zap, FileText, Upload, 
  CheckCircle, Circle, Brain, ArrowLeft, AlertCircle,
  ChevronRight, ShieldCheck, DollarSign, X, MapPin, Mail, Phone,
  History, Info, ExternalLink, PenTool, Check, Award, Loader2, Handshake,
  Target, AlertTriangle, Eye, Download, Send, Search, Sparkles, TrendingUp,
  CreditCard, RefreshCw, Plus
} from 'lucide-react';
import { useStore } from '../store';
import { WORKFLOW_DOCUMENTS } from '../lib/preDevisDocuments';
import { getProductLabel } from '../lib/productCatalog';
import { AISuggestion, PriorityLevel } from '../types';
import { getDossierById, getContactById, mapDossierToProspect, mapDocTypeToAirtable, updateDossierMessageInitial, updateContact, type AirtableDocument } from '../services/airtable';
import { saveDDAChoixFinal } from '../services/ddaService';
import FicheTarification from '../components/FicheTarification';
import FicFormModal from '../components/FicFormModal';
import { extractDevisData, type DevisExtrait } from '../services/devisExtraction';
import { extractRIData, type RIExtrait } from '../services/extractionRI';
import { uploadFicPdf } from '../services/documentUpload';
import { sendDevisForSignature } from '../services/yousignService';
import { hydrateAutoProductData, isVehiculeProduct, calcAge, calcAnciennetePermis, permisAvantAgeMinimum, AGE_MIN_PERMIS, type AutoProductData } from '../lib/prospectProductData';
import { Lock } from 'lucide-react';

const EMPTY_AT_DOCS: AirtableDocument[] = [];

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
  const addProspect = useStore(state => state.addProspect);
  const docsUploaded = useStore(state => id ? state.getProspectDocs(id) : []);
  const [airtableLoading, setAirtableLoading] = useState(false);
  const [airtableError, setAirtableError] = useState<string | null>(null);

  useEffect(() => {
    if (!prospect && id?.startsWith('rec')) {
      setAirtableLoading(true);
      getDossierById(id)
        .then(async (dossier) => {
          let contact = null;
          const contactIds = dossier.fields.Contact;
          if (contactIds?.length) {
            contact = await getContactById(contactIds[0]).catch(() => null);
          }
          const mapped = mapDossierToProspect(dossier, contact);
          addProspect({
            ...mapped,
            ges_score: mapped.ges_score ?? 0,
            statut: (mapped.statut as any) || 'nouveau',
            created_at: mapped.created_at || new Date().toISOString(),
            type_contrat_demande: mapped.type_contrat_demande || 'AUT',
          } as any);
        })
        .catch((err) => setAirtableError(err instanceof Error ? err.message : 'Dossier introuvable'))
        .finally(() => setAirtableLoading(false));
    }
  }, [id, prospect]);

  const uploadDoc = useStore(state => state.uploadDoc);
  const uploadDocReal = useStore(state => state.uploadDocReal);
  const loadDocumentsForDossier = useStore(state => state.loadDocumentsForDossier);
  const qualifyDocReal = useStore(state => state.qualifyDocReal);
  const airtableDocs = useStore(state => id ? state.airtableDocuments[id] : undefined) ?? EMPTY_AT_DOCS;
  const updateProspect = useStore(state => state.updateProspect);
  const runIAAnalysis = useStore(state => state.runIAAnalysis);
  const validateManualSignature = useStore(state => state.validateManualSignature);
  const validateFinalContractSignature = useStore(state => state.validateFinalContractSignature);
  const handleConversion = useStore(state => state.handleConversion);

  useEffect(() => {
    if (id?.startsWith('rec')) {
      loadDocumentsForDossier(id);
    }
  }, [id]);

  const [activeTab, setActiveTab] = useState<'docs' | 'info'>('info');
  const [isRefreshingDocs, setIsRefreshingDocs] = useState(false);
  const tabInitialised = useRef(false);
  useEffect(() => {
    if (!prospect || tabInitialised.current) return;
    tabInitialised.current = true;
    if (prospect.source === 'Alex Apporteur' || prospect.source === 'Alex Web Public') {
      setActiveTab('docs');
    }
  }, [prospect?.id]);

  const matchingRef = useRef<HTMLDivElement>(null);
  const goToMatching = () => {
    setActiveTab('docs');
    setTimeout(() => matchingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const [showConversionSuccessModal, setShowConversionSuccessModal] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [previewingDoc, setPreviewingDoc] = useState<{ label: string; url?: string } | null>(null);
  const [isValidatingSignature, setIsValidatingSignature] = useState(false);
  const [isSendingYousign, setIsSendingYousign] = useState(false);
  const [yousignError, setYousignError] = useState<string | null>(null);
  const [isValidatingFinalSignature, setIsValidatingFinalSignature] = useState(false);
  const [isScanning, setIsScanning] = useState<string | null>(null);
  
  const [quoteData, setQuoteData] = useState({
    compagnie: '',
    prime: '',
    franchise: '',
    garanties_summary: '',
  });
  const [showFicheTarification, setShowFicheTarification] = useState(false);
  const [showFicModal, setShowFicModal] = useState(false);
  const [devisExtrait, setDevisExtrait] = useState<DevisExtrait | null>(null);
  const [isExtractingDevis, setIsExtractingDevis] = useState(false);
  const [devisExtractionError, setDevisExtractionError] = useState<string | null>(null);
  const [ficGenerated, setFicGenerated] = useState(false);
  const [riExtrait, setRiExtrait] = useState<RIExtrait | null>(null);
  const [isExtractingRI, setIsExtractingRI] = useState(false);
  const [riExtractionError, setRiExtractionError] = useState<string | null>(null);
  const [editingArbitrageFor, setEditingArbitrageFor] = useState<string | null>(null);
  const [draftNoteExpertise, setDraftNoteExpertise] = useState('');
  const [editingProvisoireFor, setEditingProvisoireFor] = useState<string | null>(null);
  const [draftDateEcheance, setDraftDateEcheance] = useState('');
  const [besoinsAttentes, setBesoinsAttentes] = useState('');
  const [isSavingBesoins, setIsSavingBesoins] = useState(false);

  // Initialisation "Besoins et attentes" depuis les données prospect
  useEffect(() => {
    if (prospect) {
      const initial = prospect.descriptif_projet
        || (prospect.airtable_dossier_fields?.Message_Initial as string)
        || '';
      setBesoinsAttentes(initial);
    }
  }, [prospect?.id]);

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

  const productKey = prospect?.type_contrat_demande || 'AUT';
  const configDocs = useMemo(() => {
    // Essayer le code brut (AUT, MRP, RCD...) puis lowercase, puis fallback
    return WORKFLOW_DOCUMENTS[productKey] || WORKFLOW_DOCUMENTS[productKey.toLowerCase()] || WORKFLOW_DOCUMENTS['auto'] || [];
  }, [productKey]);

  // Préfixes de fichiers Make connus (fallback quand Type_Document absent = Renommage pas encore passé)
  const DOC_FILENAME_PREFIXES: Record<string, string[]> = {
    carte_grise:         ['cgb_', 'cg_', 'carte_grise', 'cartegrise'],
    permis_conduire:     ['pc_', 'permis_', 'permis de'],
    releve_information:  ['ri_', 'relevé_', 'releve_'],
    carte_identite:      ['ci_', 'cni_', 'identite_', 'piece_id'],
    justificatif_domicile: ['jd_', 'domicile_', 'justif_dom'],
  };

  const findAirtableDoc = (workflowType: string): AirtableDocument | undefined => {
    const airtableType = mapDocTypeToAirtable(workflowType);
    // Types spécifiques → match par Type_Document en priorité
    // carte_grise accepte les deux variantes (CGB provisoire ou CG définitive)
    const acceptedTypes: string[] = airtableType !== 'Autre' && airtableType !== 'Questionnaire'
      ? workflowType === 'carte_grise'
        ? ['Carte Grise Barrée', 'Carte Grise Définitive']
        : [airtableType]
      : [];
    if (acceptedTypes.length > 0) {
      const byType = airtableDocs.find(d => acceptedTypes.includes(d.fields.Type_Document || ''));
      if (byType) return byType;
    }
    // Fallback : match par préfixe Nom_Fichier (Make n'a pas encore renommé / posé Type_Document)
    const prefixes = DOC_FILENAME_PREFIXES[workflowType];
    if (prefixes) {
      const byName = airtableDocs.find(d => {
        const fn = d.fields.Nom_Fichier?.toLowerCase() || '';
        return prefixes.some(p => fn.startsWith(p));
      });
      if (byName) return byName;
    }
    // Types génériques ('Autre') → match par le label du doc config
    const docConfig = configDocs.find(d => d.type === workflowType);
    if (docConfig) {
      const labelLower = docConfig.label.toLowerCase();
      return airtableDocs.find(d =>
        d.fields.Nom_Fichier?.toLowerCase().startsWith(labelLower)
      );
    }
    return undefined;
  };

  const phase1Docs = configDocs.filter(d => d.phase === 1);
  const phase2Docs = configDocs.filter(d => d.phase === 2);
  const phase3Docs = configDocs.filter(d => d.phase === 3);

  // Conducteur sans antécédents (non assuré 36 mois) → le RI n'est pas requis (logique chatbot étape 10)
  const sansAntecedents = prospect?.product_data?.type === 'vehicule' && prospect.product_data.sans_antecedents === true;

  // Docs bloquants Phase 1 : TOUS doivent être fournis pour avancer
  const bloquantsPhase1 = phase1Docs.filter(d => d.bloquant && !(sansAntecedents && d.type === 'releve_information'));
  const bloquantsMissing = bloquantsPhase1.filter(d => {
    if (d.type === 'releve_information' && prospect?.airtable_dossier_fields?.RI_Traité) return false;
    return !docsUploaded.includes(d.type) && !(prospect?.airtable_attachments?.[d.type]?.length) && !findAirtableDoc(d.type);
  });
  const allBloquantsFournis = bloquantsMissing.length === 0;

  // Phase 1 complète : soit tous les bloquants fournis (si bloquants existent),
  // soit tous les obligatoires fournis (si pas de bloquants)
  const phase1Complete = bloquantsPhase1.length > 0
    ? allBloquantsFournis
    : phase1Docs.filter(d => d.obligatoire).every(
        d => docsUploaded.includes(d.type) || (prospect?.airtable_attachments?.[d.type]?.length ?? 0) > 0
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
      await new Promise(resolve => setTimeout(resolve, 600));
      validateManualSignature(id);
      setIsValidatingSignature(false);
    }
  };

  const handleSendYousignSignature = async () => {
    if (!prospect || !id) return;
    const contactId = (prospect.airtable_dossier_fields?.Contact as string[] | undefined)?.[0];
    if (!contactId) {
      setYousignError('Contact Airtable introuvable pour ce dossier.');
      return;
    }
    setIsSendingYousign(true);
    setYousignError(null);
    try {
      await sendDevisForSignature(id, contactId);
      updateProspect(id, {
        airtable_dossier_fields: {
          ...prospect.airtable_dossier_fields,
          Statut_Signature: 'En attente signature devis',
        },
      });
    } catch (err: any) {
      setYousignError(err.message || 'Erreur lors de l\'envoi en signature');
    } finally {
      setIsSendingYousign(false);
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

  /**
   * Extraction IA du Relevé d'Information à partir d'un fichier PDF.
   * Réutilisée à la fois par l'upload automatique du document RI et par
   * le bouton de relance manuelle. Hydrate product_data + champs Airtable.
   */
  const runRIExtraction = async (file: File) => {
    if (!id || !prospect) return;
    if (!prospect.id.startsWith('rec')) {
      setRiExtractionError('Prospect non synchronisé avec Airtable — sauvegardez d\'abord le dossier.');
      return;
    }
    setIsExtractingRI(true);
    setRiExtractionError(null);
    try {
      const result = await extractRIData(prospect.id, file);
      setRiExtrait(result);
      const newDossierFields = {
        ...(prospect.airtable_dossier_fields || {}),
        ...result.airtableFields,
      };
      let riJsonParsed: Record<string, unknown> = {};
      try {
        if (result.airtableFields?.RI_JSON) {
          riJsonParsed = JSON.parse(result.airtableFields.RI_JSON as string);
        }
      } catch {}
      if (!riJsonParsed.vehicule_marque && result.vehicule_marque) {
        riJsonParsed = {
          ...riJsonParsed,
          vehicule_marque: result.vehicule_marque,
          vehicule_modele: result.vehicule_modele,
          vehicule_usage: result.usage_vehicule,
          vehicule_categorie: result.vehicule_categorie,
          bm_nb_annees_050: result.annees_bonus_050,
          date_releve: result.date_releve,
          date_effet_contrat: result.date_effet_contrat,
          nb_mois: result.nb_mois,
          date_echeance: result.bm_date_echeance ?? result.date_echeance,
          formule_actuelle: result.formule_actuelle,
          sinistres: result.sinistres,
        };
      }
      const productData = hydrateAutoProductData(
        newDossierFields,
        riJsonParsed,
        prospect.product_data?.type === 'vehicule' ? prospect.product_data : undefined
      );
      updateProspect(prospect.id, {
        airtable_dossier_fields: newDossierFields,
        product_data: productData,
      });
    } catch (err) {
      setRiExtractionError(err instanceof Error ? err.message : 'Erreur extraction RI');
    } finally {
      setIsExtractingRI(false);
    }
  };

  const triggerFileUpload = (type: string, phase: number, labelOverride?: string) => {
    const docConfig = configDocs.find(d => d.type === type);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.webp';
    input.onchange = async (e: any) => {
      if (e.target.files && e.target.files[0] && id) {
        const file = e.target.files[0] as File;
        if (phase === 1) {
          setIsScanning(type);
        }
        try {
          if (id.startsWith('rec')) {
            await uploadDocReal(id, type, labelOverride || docConfig?.label || type, file);
          } else {
            uploadDoc(id, type);
          }
          // Auto-extraction RI dès le chargement du document Relevé d'Information
          // (produits véhicule). Le fichier est déjà en mémoire → pas de 2e upload.
          if (
            type === 'releve_information' &&
            file.type === 'application/pdf' &&
            isVehiculeProduct(prospect?.type_contrat_demande || '')
          ) {
            runRIExtraction(file).catch(console.error);
          }
        } catch (err) {
          console.error('Erreur upload:', err);
        } finally {
          setIsScanning(null);
        }
      }
    };
    input.click();
  };

  if (airtableLoading) return <Layout><div className="p-10 text-slate-900 font-bold text-center text-xl flex items-center justify-center gap-3"><Loader2 className="animate-spin" size={24} /> Chargement du dossier...</div></Layout>;
  if (airtableError) return <Layout><div className="p-10 text-red-600 font-bold text-center text-xl">{airtableError}</div></Layout>;
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
            {prospect.ges_score >= 60 && (
              <button
                onClick={goToMatching}
                className="w-full md:w-auto px-6 py-3 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-2 bg-[#10B981] text-white hover:scale-105 shadow-green-500/20"
              >
                Passer au matching <ChevronRight size={14} />
              </button>
            )}
          </motion.div>
        )}

        {/* NAVIGATION & ACTIONS RAPIDES */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => navigate('/dashboard?tab=prospects')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-colors">
              <ArrowLeft size={16} /> Flux Opérationnel
            </button>
            {/* Réf dossier */}
            {((prospect.airtable_dossier_fields?.ID_Dossier as string) || prospect.id?.startsWith('rec')) && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 font-mono text-[10px] font-bold border border-slate-200 tracking-wider select-all">
                {(prospect.airtable_dossier_fields?.ID_Dossier as string) || prospect.id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto no-scrollbar">
              <button onClick={() => setActiveTab('info')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'info' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Infos</button>
              <button onClick={() => setActiveTab('docs')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'docs' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Documents</button>
            </div>
            {activeTab === 'docs' && id?.startsWith('rec') && (
              <button
                onClick={async () => { setIsRefreshingDocs(true); await loadDocumentsForDossier(id); setIsRefreshingDocs(false); }}
                disabled={isRefreshingDocs}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
                title="Rafraîchir les documents"
              >
                <RefreshCw size={14} className={isRefreshingDocs ? 'animate-spin' : ''} />
              </button>
            )}
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
                        <Target size={14} /> {getProductLabel(prospect.type_contrat_demande)}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Identité</p>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-[#4F7CFF] flex items-center justify-center font-black text-sm shrink-0">
                          {prospect.prenom?.[0] || '?'}{prospect.nom?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {(['M.', 'Mme'] as const).map(civ => (
                              <button
                                key={civ}
                                onClick={async () => {
                                  if (!id) return;
                                  updateProspect(id, { civilite: civ });
                                  const contactId = (prospect.airtable_dossier_fields?.Contact as string[] | undefined)?.[0];
                                  if (contactId) {
                                    await updateContact(contactId, { Civilite: civ }).catch(console.error);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                                  prospect.civilite === civ
                                    ? 'bg-[#4F7CFF] text-white border-[#4F7CFF]'
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-[#4F7CFF]/50'
                                }`}
                              >
                                {civ}
                              </button>
                            ))}
                          </div>
                          <p className="text-lg font-black text-slate-900 truncate">{prospect.prenom} {prospect.nom}</p>
                        </div>
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

                {/* Besoins et attentes */}
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <FileText size={12} className="text-[#4F7CFF]" /> Besoins et attentes du client
                  </p>
                  <textarea
                    value={besoinsAttentes}
                    onChange={(e) => setBesoinsAttentes(e.target.value)}
                    onBlur={async () => {
                      if (!id) return;
                      // Sauvegarde locale
                      updateProspect(id, { descriptif_projet: besoinsAttentes });
                      // Sauvegarde Airtable si dossier réel
                      if (id.startsWith('rec')) {
                        setIsSavingBesoins(true);
                        try {
                          await updateDossierMessageInitial(id, besoinsAttentes);
                        } catch (err) {
                          console.error('Erreur sauvegarde besoins:', err);
                        } finally {
                          setIsSavingBesoins(false);
                        }
                      }
                    }}
                    placeholder="Décrivez les besoins et attentes du client..."
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 placeholder-slate-300 outline-none focus:ring-2 focus:ring-[#4F7CFF]/30 focus:border-[#4F7CFF] resize-none transition-all"
                  />
                  {isSavingBesoins && (
                    <p className="text-[10px] text-[#4F7CFF] font-bold mt-1 flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> Sauvegarde en cours...
                    </p>
                  )}
                </div>

                {/* ── Données de Tarification (Auto / Moto uniquement) ── */}
                {isVehiculeProduct(prospect.type_contrat_demande) && (() => {
                  const pd = prospect.product_data?.type === 'vehicule' ? prospect.product_data : null;
                  const ageConducteur = calcAge(prospect.date_naissance);
                  const hasRIData = !!(pd?.bonus_malus !== undefined || pd?.immatriculation);

                  return (
                    <div className="mt-8 pt-8 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Target size={12} className="text-[#4F7CFF]" /> Données de Tarification
                      </p>

                      {!hasRIData && (
                        <div className="mb-4 p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-3">
                          <Search size={18} className="text-blue-400 shrink-0" />
                          <p className="text-xs font-bold text-blue-700">Chargez le RI dans l'onglet Documents pour pré-remplir automatiquement les données tarifantes.</p>
                        </div>
                      )}

                      {/* Bloc véhicule (lecture seule) */}
                      {(pd?.immatriculation_a_assurer || pd?.immatriculation || pd?.vehicule_marque) && (
                        <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Lock size={10} /> Véhicule à assurer</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {/* Immatriculation : saisie courtier en priorité, RI en fallback */}
                            <div>
                              <span className="text-slate-400 font-black uppercase text-[9px]">Immat.</span>
                              <p className="font-bold text-slate-900 font-mono tracking-wider">
                                {pd?.immatriculation_a_assurer || pd?.immatriculation || '—'}
                              </p>
                              {pd?.immatriculation_a_assurer && pd?.immatriculation && pd.immatriculation_a_assurer !== pd.immatriculation && (
                                <p className="text-[8px] text-slate-400 mt-0.5">RI : {pd.immatriculation}</p>
                              )}
                            </div>
                            {pd?.vehicule_marque && <div><span className="text-slate-400 font-black uppercase text-[9px]">Marque</span><p className="font-bold text-slate-900">{pd.vehicule_marque}</p></div>}
                            {pd?.vehicule_modele && <div><span className="text-slate-400 font-black uppercase text-[9px]">Modèle</span><p className="font-bold text-slate-900">{pd.vehicule_modele}</p></div>}
                            {pd?.vehicule_usage && <div><span className="text-slate-400 font-black uppercase text-[9px]">Usage</span><p className="font-bold text-slate-900">{pd.vehicule_usage}</p></div>}
                            {pd?.vehicule_energie && <div><span className="text-slate-400 font-black uppercase text-[9px]">Énergie</span><p className="font-bold text-slate-900">{pd.vehicule_energie}</p></div>}
                          </div>
                        </div>
                      )}

                      {/* Bloc permis + conducteur (lecture seule) */}
                      {(pd?.date_permis || prospect.date_naissance) && (
                        <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Lock size={10} /> Conducteur</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {prospect.date_naissance && <div><span className="text-slate-400 font-black uppercase text-[9px]">Date naissance</span><p className="font-bold text-slate-900">{prospect.date_naissance}{ageConducteur ? ` (${ageConducteur} ans)` : ''}</p></div>}
                            {pd?.date_permis && <div><span className="text-slate-400 font-black uppercase text-[9px]">Date permis</span><p className="font-bold text-slate-900">{pd.date_permis}{pd.anciennete_permis_mois ? ` (${Math.floor(pd.anciennete_permis_mois / 12)} ans)` : ''}</p></div>}
                          </div>
                        </div>
                      )}

                      {/* Bloc antécédents (lecture seule) */}
                      {pd?.bonus_malus !== undefined && (
                        <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Lock size={10} /> Antécédents Assurance (depuis RI)</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 font-black uppercase text-[9px]">Bonus/Malus</span>
                              <p className={`font-bold ${(pd.bonus_malus || 0) > 1 ? 'text-orange-600' : 'text-green-600'}`}>{pd.bonus_malus?.toFixed(2)}</p>
                            </div>
                            {pd.nb_mois != null && (
                              <div><span className="text-slate-400 font-black uppercase text-[9px]">Mois cumulés</span><p className="font-bold text-slate-900">{pd.nb_mois} mois</p></div>
                            )}
                            {pd.bm_nb_annees_050 != null && (
                              <div><span className="text-slate-400 font-black uppercase text-[9px]">Coeff. ≤ 0.50</span><p className="font-bold text-slate-900">{pd.bm_nb_annees_050} ans</p></div>
                            )}
                            {pd.nb_sinistres_36m !== undefined && (
                              <div>
                                <span className="text-slate-400 font-black uppercase text-[9px]">Sinistres 36m</span>
                                <p className={`font-bold ${(pd.nb_sinistres_36m || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>{pd.nb_sinistres_36m}</p>
                              </div>
                            )}
                            {pd.type_sinistres && <div><span className="text-slate-400 font-black uppercase text-[9px]">Type sinistres</span><p className="font-bold text-slate-900">{pd.type_sinistres}</p></div>}
                            {pd.compagnie_precedente && <div><span className="text-slate-400 font-black uppercase text-[9px]">Compagnie préc.</span><p className="font-bold text-slate-900">{pd.compagnie_precedente}</p></div>}
                            <div>
                              <span className="text-slate-400 font-black uppercase text-[9px]">Résilié</span>
                              <p className={`font-bold ${pd.resilie ? 'text-red-600' : 'text-green-600'}`}>{pd.resilie ? 'OUI' : 'NON'}</p>
                            </div>
                            {pd.resilie && pd.motif_resiliation && <div className="col-span-2"><span className="text-slate-400 font-black uppercase text-[9px]">Motif</span><p className="font-bold text-red-700">{pd.motif_resiliation}</p></div>}
                          </div>
                        </div>
                      )}

                      {/* Champs éditables courtier */}
                      <div className="p-4 rounded-2xl border border-slate-200 space-y-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Saisie courtier</p>
                        {/* Immatriculation — masquée si RI déjà extrait (immatriculation disponible dans le bloc Véhicule) */}
                        {!hasRIData && (
                          <div>
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">
                              Immatriculation du véhicule à assurer
                            </label>
                            <input
                              type="text"
                              value={pd?.immatriculation_a_assurer || ''}
                              onChange={e => updateProspect(id!, { product_data: { ...(pd || { type: 'vehicule' as const }), immatriculation_a_assurer: e.target.value.toUpperCase() } })}
                              placeholder="Ex : AB-123-CD"
                              maxLength={9}
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 w-full font-mono tracking-widest focus:border-[#4F7CFF] outline-none transition-colors"
                            />
                          </div>
                        )}
                        {/* Formule souhaitée */}
                        <div>
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Formule souhaitée</p>
                          <div className="flex gap-2 flex-wrap">
                            {(['RC', 'Tiers Étendu', 'Tous Risques'] as const).map(f => (
                              <button
                                key={f}
                                onClick={() => updateProspect(id!, { product_data: { ...(pd || { type: 'vehicule' as const }), formule_souhaitee: f } })}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                  pd?.formule_souhaitee === f
                                    ? 'bg-[#4F7CFF] text-white border-[#4F7CFF]'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-[#4F7CFF]/50'
                                }`}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Conducteur secondaire */}
                        <div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!pd?.conducteur_secondaire}
                              onChange={e => updateProspect(id!, { product_data: { ...(pd || { type: 'vehicule' as const }), conducteur_secondaire: e.target.checked } })}
                              className="w-4 h-4 rounded border-slate-300 text-[#4F7CFF]"
                            />
                            <span className="text-sm font-bold text-slate-700">Conducteur secondaire</span>
                          </label>
                          {pd?.conducteur_secondaire && (
                            <div className="mt-3 ml-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nom</label>
                                <input type="text" value={pd.nom_conducteur_secondaire || ''}
                                  onChange={e => updateProspect(id!, { product_data: { ...pd, nom_conducteur_secondaire: e.target.value } })}
                                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-900 w-full" />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Prénom</label>
                                <input type="text" value={pd.prenom_conducteur_secondaire || ''}
                                  onChange={e => updateProspect(id!, { product_data: { ...pd, prenom_conducteur_secondaire: e.target.value } })}
                                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-900 w-full" />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date de naissance</label>
                                <input type="date" value={pd.date_naissance_conducteur_secondaire || ''}
                                  onChange={e => updateProspect(id!, { product_data: { ...pd, date_naissance_conducteur_secondaire: e.target.value } })}
                                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-900 w-full" />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date de permis</label>
                                <input type="date" value={pd.date_permis_conducteur_secondaire || ''}
                                  onChange={e => updateProspect(id!, { product_data: { ...pd, date_permis_conducteur_secondaire: e.target.value } })}
                                  className={`bg-white border rounded-xl px-3 py-1.5 text-sm font-medium text-slate-900 w-full ${permisAvantAgeMinimum(pd.date_naissance_conducteur_secondaire, pd.date_permis_conducteur_secondaire) ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-200'}`} />
                                {permisAvantAgeMinimum(pd.date_naissance_conducteur_secondaire, pd.date_permis_conducteur_secondaire) && (
                                  <p className="text-[10px] font-bold text-red-600 mt-1">Permis incohérent : âge minimum {AGE_MIN_PERMIS} ans à la date du permis.</p>
                                )}
                              </div>
                              <div className="sm:col-span-2">
                                <button
                                  type="button"
                                  onClick={() => triggerFileUpload('permis_secondaire', 1, 'Permis Conducteur Secondaire')}
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[#4F7CFF]/40 bg-white text-[#4F7CFF] text-[10px] font-black uppercase tracking-widest hover:bg-[#4F7CFF]/5 transition-all"
                                >
                                  <Upload size={14} /> Permis CDR Secondaire
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sans antécédents — masqué si RI déjà extrait (non pertinent) */}
                        {!hasRIData && (
                          <div className="pt-3 border-t border-slate-100">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!pd?.sans_antecedents}
                                onChange={e => updateProspect(id!, { product_data: {
                                  ...(pd || { type: 'vehicule' as const }),
                                  sans_antecedents: e.target.checked,
                                  ...(e.target.checked && (pd?.bonus_malus == null) ? { bonus_malus: 1.0 } : {}),
                                } })}
                                className="w-4 h-4 rounded border-slate-300 text-[#4F7CFF]"
                              />
                              <span className="text-sm font-bold text-slate-700">Conducteur sans antécédents <span className="text-slate-400 font-medium">(non assuré sur 36 mois — RI non requis)</span></span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* CTA navigation → écran Documents */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Étape 1/2 · Informations</p>
                  <button
                    onClick={() => setActiveTab('docs')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#4F7CFF] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#4F7CFF]/25 hover:bg-[#3b66e6] transition-all"
                  >
                    Passer aux documents <ChevronRight size={16} />
                  </button>
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
                      const atDoc = findAirtableDoc(doc.type);
                      // Pour le RI : considéré reçu si RI_Traité = true dans Airtable (extrait par n8n)
                      const riTraite = doc.type === 'releve_information' && !!prospect.airtable_dossier_fields?.RI_Traité;
                      const isUploaded =
                        riTraite ||
                        docsUploaded.includes(doc.type) ||
                        (airtableFiles?.length ?? 0) > 0 ||
                        !!atDoc;
                      const isScanningThis = isScanning === doc.type;
                      const isProvisoire = atDoc?.fields.Statut_Document === 'Provisoire' || (doc.peut_etre_provisoire && prospect?.documents_provisoires?.[doc.type]);
                      const provisoireEcheance = atDoc?.fields.Date_Echeance_Provisoire || prospect?.documents_provisoires?.[doc.type]?.date_echeance;
                      const showProvisoireOption = doc.peut_etre_provisoire && isUploaded;
                      // Badge orange : échéance dépassée pour docs provisoires
                      const isEcheanceDepassee = (() => {
                        if (!isProvisoire) return false;
                        const typeDoc = atDoc?.fields.Type_Document || '';
                        let echeanceDate: Date | null = null;
                        if (typeDoc === 'Carte Grise Barrée' && atDoc?.fields.Date_Upload) {
                          echeanceDate = new Date(atDoc.fields.Date_Upload);
                          echeanceDate.setDate(echeanceDate.getDate() + 30);
                        } else if (provisoireEcheance) {
                          echeanceDate = new Date(provisoireEcheance);
                        }
                        if (!echeanceDate) return false;
                        return echeanceDate < new Date();
                      })();
                      return (
                        <div key={doc.type} className={`flex flex-col gap-4 p-5 rounded-3xl border transition-all ${isUploaded ? (isProvisoire ? 'bg-orange-50/50 border-orange-200' : 'bg-slate-50 border-slate-100') : 'bg-white border-slate-200 shadow-sm'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-5">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shrink-0 ${isProvisoire ? 'bg-orange-100 border-orange-200 text-orange-600' : isUploaded ? 'bg-green-50 border-green-200 text-green-500' : isScanningThis ? 'bg-blue-50 border-blue-200 text-blue-500 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-200'}`}>
                                 {isUploaded ? (isProvisoire ? <AlertTriangle size={24} /> : <CheckCircle size={24} />) : isScanningThis ? <Brain size={24} className="animate-spin" /> : <FileText size={24} />}
                              </div>
                              <div>
                                <p className="text-base font-bold text-slate-900">{doc.label}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-[11px] text-slate-400 font-bold uppercase">
                                    {isScanningThis ? 'Téléversement en cours...' : riTraite ? 'Extrait et traité par n8n' : doc.description}
                                  </p>
                                  {!isUploaded && doc.phase === 1 && (() => {
                                    // RI non requis si conducteur sans antécédents
                                    const riNonRequis = sansAntecedents && doc.type === 'releve_information';
                                    if (doc.bloquant && !riNonRequis) {
                                      return <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-red-100 text-red-600 border border-red-200">Requis</span>;
                                    }
                                    if (doc.obligatoire && !riNonRequis) {
                                      return <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-orange-100 text-orange-600 border border-orange-200">Recommandé</span>;
                                    }
                                    return <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200">{riNonRequis ? 'Non requis' : 'Facultatif'}</span>;
                                  })()}
                                </div>
                                {isProvisoire && <p className="text-[10px] font-bold text-orange-600 mt-0.5">Document provisoire {provisoireEcheance ? `• Échéance : ${provisoireEcheance}` : ''}</p>}
                                {isEcheanceDepassee && (
                                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white border border-orange-600 animate-pulse">
                                    <AlertTriangle size={10} /> Échéance dépassée
                                  </span>
                                )}
                                {atDoc && (
                                  <div className="mt-1">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${atDoc.fields.Statut_Document === 'Valide' ? 'bg-green-50 text-green-600 border border-green-100' : atDoc.fields.Statut_Document === 'Provisoire' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                      {atDoc.fields.Document_Conforme ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                      {atDoc.fields.Statut_Document || 'En attente'}
                                    </span>
                                    <span className="text-[9px] text-slate-400 ml-2">{atDoc.fields.Nom_Fichier}</span>
                                  </div>
                                )}
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
                              {isUploaded && <button onClick={() => {
                                const url = atDoc?.fields.Dropbox_URL || airtableFiles?.[0]?.url;
                                setPreviewingDoc({ label: doc.label, url });
                              }} className="p-3 text-[#4F7CFF] hover:bg-blue-100 rounded-xl transition-all"><Eye size={20} /></button>}
                              {!isUploaded && !isScanningThis ? (
                                <button onClick={() => triggerFileUpload(doc.type, 1)} className="px-6 py-3 bg-white border-2 border-[#4F7CFF]/40 rounded-xl text-[10px] font-black text-[#4F7CFF] uppercase tracking-widest hover:bg-[#4F7CFF]/5 transition-all flex items-center gap-2"><Upload size={14} /> Joindre</button>
                              ) : !isUploaded && isScanningThis ? (
                                <span className="px-4 py-2 text-blue-500 font-black text-[9px] uppercase tracking-widest">Analyse...</span>
                              ) : (
                                <>
                                  <span className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-black text-[9px] uppercase border border-green-100">Reçu</span>
                                  {(doc.max_files ?? 1) > 1 && (
                                    <button onClick={() => triggerFileUpload(doc.type, 1)} title="Ajouter le verso" className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest hover:border-[#4F7CFF]/40 hover:text-[#4F7CFF] transition-all flex items-center gap-1"><Plus size={11} /> Verso</button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {showProvisoireOption && (
                            <div className="pt-4 border-t border-slate-100">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={!!isProvisoire || editingProvisoireFor === doc.type}
                                  onChange={(e) => {
                                    if (!id || !prospect) return;
                                    if (e.target.checked) {
                                      setEditingProvisoireFor(doc.type);
                                      setDraftDateEcheance(provisoireEcheance || new Date(Date.now() + (doc.delai_provisoire_jours ?? 90)*24*60*60*1000).toISOString().slice(0,10));
                                    } else {
                                      setEditingProvisoireFor(null);
                                      if (atDoc) {
                                        qualifyDocReal(atDoc.id, id, 'Valide');
                                      }
                                      const { [doc.type]: _, ...rest } = prospect.documents_provisoires || {};
                                      updateProspect(id, { documents_provisoires: Object.keys(rest).length ? rest : undefined });
                                    }
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
                                  <button onClick={() => {
                                    if (atDoc) {
                                      qualifyDocReal(atDoc.id, id!, 'Provisoire', draftDateEcheance);
                                    }
                                    updateProspect(prospect.id, { documents_provisoires: { ...prospect.documents_provisoires, [doc.type]: { date_echeance: draftDateEcheance } } });
                                    setEditingProvisoireFor(null);
                                  }} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase">OK</button>
                                  <button onClick={() => setEditingProvisoireFor(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-bold">Annuler</button>
                                </div>
                              )}
                              {isProvisoire && editingProvisoireFor !== doc.type && (
                                <button onClick={() => { setEditingProvisoireFor(doc.type); setDraftDateEcheance(provisoireEcheance || ''); }} className="mt-2 text-[10px] font-bold text-orange-600 hover:underline">Modifier la date</button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Extraction RI — uniquement pour produits auto/moto/flotte */}
                  {/^(AUT|MOT|CYCLO|FLO_AUT|auto|moto|cyclo|flotte)/i.test(productKey) && (() => {
                    const pd = prospect.product_data?.type === 'vehicule' ? prospect.product_data : null;
                    // RI déjà traité par n8n (chargé depuis Airtable) ou par upload en session
                    const riFromAirtable = !!prospect.airtable_dossier_fields?.RI_Traité && pd?.bonus_malus !== undefined;
                    return sansAntecedents ? (
                      <div className="mt-6 p-4 rounded-2xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 flex items-center gap-2">
                        <Info size={14} /> Relevé d'Information non requis — conducteur sans antécédents (non assuré sur 36 mois).
                      </div>
                    ) : (
                      <div className={`mt-6 p-5 rounded-2xl border-2 ${riFromAirtable || riExtrait ? 'border-green-200 bg-green-50/30' : 'border-dashed border-indigo-200 bg-indigo-50/30'}`}>
                        <div className="flex items-center gap-4 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${riFromAirtable || riExtrait ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {riFromAirtable || riExtrait ? <CheckCircle size={20} /> : <Search size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">Extraction Relevé d'Information</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {riFromAirtable ? 'Extrait par n8n · Données disponibles' : 'IA Gemini • Lancée automatiquement au chargement du RI'}
                            </p>
                          </div>
                          {(riFromAirtable || riExtrait) && !isExtractingRI && (
                            <span className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg bg-green-100 text-green-700 text-[10px] font-black uppercase">
                              <CheckCircle size={12} /> RI Extrait
                            </span>
                          )}
                          {isExtractingRI && (
                            <span className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase">
                              <Loader2 size={12} className="animate-spin" /> Analyse IA…
                            </span>
                          )}
                        </div>
                        {riExtractionError && (
                          <p className="text-xs text-red-500 font-bold mb-3">{riExtractionError}</p>
                        )}
                        {riExtrait ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Bonus/Malus</span>
                              <span className={`font-bold ${(riExtrait.bonus_malus || 0) > 1 ? 'text-orange-600' : 'text-green-600'}`}>{riExtrait.bonus_malus}</span>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Compagnie</span>
                              <span className="font-bold text-slate-900">{riExtrait.compagnie_precedente || '—'}</span>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Sinistres 36m</span>
                              <span className={`font-bold ${(riExtrait.nb_sinistres_36m || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>{riExtrait.nb_sinistres_36m}</span>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Résilié</span>
                              <span className={`font-bold ${riExtrait.resilie ? 'text-red-600' : 'text-green-600'}`}>{riExtrait.resilie ? 'OUI' : 'NON'}</span>
                            </div>
                          </div>
                        ) : riFromAirtable && pd ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Bonus/Malus</span>
                              <span className={`font-bold ${(pd.bonus_malus || 0) > 1 ? 'text-orange-600' : 'text-green-600'}`}>{pd.bonus_malus?.toFixed(2)}</span>
                            </div>
                            {pd.nb_mois != null && (
                              <div className="bg-white rounded-lg p-2 border border-slate-100">
                                <span className="text-[9px] text-slate-400 font-black uppercase block">Mois cumulés</span>
                                <span className="font-bold text-slate-900">{pd.nb_mois} mois</span>
                              </div>
                            )}
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Compagnie</span>
                              <span className="font-bold text-slate-900">{pd.compagnie_precedente || '—'}</span>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Sinistres 36m</span>
                              <span className={`font-bold ${(pd.nb_sinistres_36m || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>{pd.nb_sinistres_36m ?? '—'}</span>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Résilié</span>
                              <span className={`font-bold ${pd.resilie ? 'text-red-600' : 'text-green-600'}`}>{pd.resilie ? 'OUI' : 'NON'}</span>
                            </div>
                          </div>
                        ) : isExtractingRI ? (
                          <div className="flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-indigo-300 bg-indigo-100 text-indigo-600">
                            <Loader2 size={18} className="animate-spin" /> Extraction IA en cours…
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 font-medium">
                            {riExtractionError
                              ? 'L\'analyse a échoué. Rechargez le document « Relevé(s) d\'Information 36 mois » ci-dessus pour relancer.'
                              : 'Chargez le document « Relevé(s) d\'Information 36 mois » ci-dessus : l\'analyse IA se lance automatiquement.'}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <div ref={matchingRef} className="mt-10 pt-8 border-t border-slate-100 scroll-mt-6">
                    {/* Alerte docs bloquants manquants */}
                    {bloquantsMissing.length > 0 && !prospect.ia_analysis_done && (
                      <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-red-700 uppercase tracking-wider">Documents requis manquants</p>
                          <p className="text-xs text-red-600 font-bold mt-1">
                            {bloquantsMissing.map(d => d.label).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Warning docs obligatoires manquants (non bloquant) */}
                    {allBloquantsFournis && !prospect.ia_analysis_done && phase1Docs.some(d => d.obligatoire && !d.bloquant && !docsUploaded.includes(d.type) && !(prospect?.airtable_attachments?.[d.type]?.length) && !findAirtableDoc(d.type)) && (
                      <div className="mb-4 p-4 rounded-2xl bg-orange-50 border border-orange-200 flex items-start gap-3">
                        <AlertCircle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-orange-700">Des documents recommandés sont manquants, mais vous pouvez lancer l'analyse.</p>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => runIAAnalysis(prospect.id)}
                      disabled={!phase1Complete || prospect.ia_analysis_done}
                      title={bloquantsMissing.length > 0 ? `Documents requis manquants : ${bloquantsMissing.map(d => d.label).join(', ')}` : undefined}
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
                                <p className="text-sm font-black text-[#4F7CFF] mb-6 flex items-center gap-2">
                                  <Handshake size={18} className="shrink-0" /> Compagnie susceptible d&apos;accepter ce profil
                                </p>

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
                                  onClick={() => {
                                    updateProspect(prospect.id, { ai_suggestion: sugg });
                                    if (prospect.id.startsWith('rec')) {
                                      saveDDAChoixFinal(prospect.id, sugg.compagnie, sugg.note_expertise_courtier || `Score ${sugg.score}% — ${sugg.justification[0] || ''}`).catch(
                                        (err) => console.error('Erreur DDA choix:', err)
                                      );
                                    }
                                  }}
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

                      {/* BOUTON FICHE TARIFICATION */}
                      {prospect.ai_suggestion && (
                        <div className="mt-6">
                          <button
                            onClick={() => setShowFicheTarification(true)}
                            className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all border-2 border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                          >
                            <FileText size={20} /> Fiche Tarification Extranet
                          </button>
                        </div>
                      )}

                      {/* BOUTON CHARGER DEVIS COMPAGNIE */}
                      {prospect.ai_suggestion && prospect.statut !== 'converti' && (
                        <div className="mt-4 space-y-3">
                          <label className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all border-2 cursor-pointer
                            ${devisExtrait ? 'border-green-200 bg-green-50 text-green-600' : isExtractingDevis ? 'border-orange-200 bg-orange-50 text-orange-600' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}">
                            {isExtractingDevis ? (
                              <><Loader2 size={18} className="animate-spin" /> Extraction IA en cours…</>
                            ) : devisExtrait ? (
                              <><Check size={18} /> Devis chargé — {devisExtrait.compagnie} — {devisExtrait.primeAnnuelleTTC}€ TTC</>
                            ) : (
                              <><Upload size={18} /> Charger Devis Compagnie (PDF)</>
                            )}
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !prospect.id) return;
                                if (!prospect.id.startsWith('rec')) {
                                  setDevisExtractionError('Prospect non synchronisé avec Airtable — sauvegardez d\'abord le dossier.');
                                  e.target.value = '';
                                  return;
                                }
                                setIsExtractingDevis(true);
                                setDevisExtractionError(null);
                                try {
                                  const result = await extractDevisData(prospect.id, file);
                                  setDevisExtrait(result);
                                } catch (err: any) {
                                  setDevisExtractionError(err.message || 'Erreur d\'extraction');
                                } finally {
                                  setIsExtractingDevis(false);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>
                          {devisExtractionError && (
                            <p className="text-xs text-red-500 font-medium px-2">{devisExtractionError}</p>
                          )}

                          {/* BOUTON GÉNÉRER FIC */}
                          {devisExtrait && (
                            <button
                              onClick={() => setShowFicModal(true)}
                              className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-xl hover:scale-[1.01]
                                ${ficGenerated ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'}`}
                            >
                              {ficGenerated ? (
                                <><Check size={22} /> FIC générée</>
                              ) : (
                                <><FileText size={22} /> Générer FIC</>
                              )}
                            </button>
                          )}
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
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Engagement & Pièces contractuelles</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {phase2Docs.some(d => d.type === 'signature_devis_fic') && (() => {
                      const statutSig = prospect.airtable_dossier_fields?.Statut_Signature as string | undefined;
                      const isDevisSigne = statutSig === 'Devis signé' || signatureDevisValidee;
                      const isEnAttente = statutSig === 'En attente signature devis';
                      const isRefuse = statutSig === 'Refusé';
                      const isExpire = statutSig === 'Expiré';
                      const canResend = isRefuse || isExpire;
                      const isRecId = prospect.id.startsWith('rec');

                      let cardBg = 'bg-slate-50 border-slate-100';
                      let iconStyle = 'bg-white border-blue-100 text-[#4F7CFF]';
                      let subtitle = 'Signature électronique via Yousign';
                      if (isDevisSigne) { cardBg = 'bg-green-50 border-green-200'; iconStyle = 'bg-white border-green-200 text-[#10B981]'; subtitle = 'Devis & FIC signés'; }
                      else if (isEnAttente) { cardBg = 'bg-amber-50 border-amber-200'; iconStyle = 'bg-white border-amber-200 text-amber-500'; subtitle = 'En attente de signature client'; }
                      else if (isRefuse) { cardBg = 'bg-red-50 border-red-200'; iconStyle = 'bg-white border-red-200 text-red-500'; subtitle = 'Signature refusée par le client'; }
                      else if (isExpire) { cardBg = 'bg-red-50 border-red-200'; iconStyle = 'bg-white border-red-200 text-red-500'; subtitle = 'Demande de signature expirée'; }

                      return (
                      <div className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-3xl border transition-all gap-4 ${cardBg}`}>
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shrink-0 ${iconStyle}`}>
                            <PenTool size={24} />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900">Devis & FIC</p>
                            <p className="text-[11px] text-slate-400 font-bold uppercase">{subtitle}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {isDevisSigne ? (
                            <span className="px-6 py-2.5 text-[9px] font-black uppercase rounded-xl bg-[#10B981] text-white flex items-center gap-2">
                              <Check size={14} /> Signé & Reçu
                            </span>
                          ) : isEnAttente ? (
                            <span className="px-6 py-2.5 text-[9px] font-black uppercase rounded-xl bg-amber-500 text-white flex items-center gap-2">
                              <Loader2 size={14} className="animate-spin" /> Signature en cours...
                            </span>
                          ) : (
                            <button
                              onClick={handleSendYousignSignature}
                              disabled={isSendingYousign || !isRecId}
                              className="px-6 py-2.5 text-[9px] font-black uppercase rounded-xl shadow-lg flex items-center gap-2 transition-all bg-[#4F7CFF] text-white hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                            >
                              {isSendingYousign ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                              {canResend ? 'Renvoyer en Signature' : 'Envoyer en Signature'}
                            </button>
                          )}
                          {!isDevisSigne && !isEnAttente && (
                            <button
                              onClick={handleManualSignatureValidation}
                              disabled={isValidatingSignature}
                              className="text-[9px] text-slate-400 hover:text-slate-600 underline font-medium transition-colors"
                            >
                              {isValidatingSignature ? 'Validation...' : 'Valider signature manuelle'}
                            </button>
                          )}
                          {yousignError && <p className="text-[10px] text-red-500 font-medium max-w-[250px] text-right">{yousignError}</p>}
                        </div>
                      </div>
                      );
                    })()}

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
                              <><button onClick={() => setPreviewingDoc({ label: 'RIB', url: undefined })} className="p-3 text-[#4F7CFF] hover:bg-blue-100 rounded-xl transition-all"><Eye size={20} /></button>
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
                            {isUploaded && <button onClick={() => {
                              const atd = findAirtableDoc(doc.type);
                              setPreviewingDoc({ label: doc.label, url: atd?.fields.Dropbox_URL || undefined });
                            }} className="p-3 text-[#4F7CFF] hover:bg-blue-100 rounded-xl transition-all"><Eye size={20} /></button>}
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
                        // Badge orange : échéance dépassée pour docs provisoires Phase 3
                        const isEcheanceDepasseeP3 = (() => {
                          if (!isProvisoire) return false;
                          const echeanceStr = prospect?.documents_provisoires?.[doc.type]?.date_echeance;
                          if (!echeanceStr) return false;
                          return new Date(echeanceStr) < new Date();
                        })();
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
                                  {isEcheanceDepasseeP3 && (
                                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white border border-orange-600 animate-pulse">
                                      <AlertTriangle size={10} /> Échéance dépassée
                                    </span>
                                  )}
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
                                      if (e.target.checked) { setEditingProvisoireFor(doc.type); setDraftDateEcheance(prospect.documents_provisoires?.[doc.type]?.date_echeance || new Date(Date.now() + (doc.delai_provisoire_jours ?? 90)*24*60*60*1000).toISOString().slice(0,10)); }
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
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <h3 className="text-xl font-black text-slate-900">Aperçu : {previewingDoc.label}</h3>
                <div className="flex items-center gap-2">
                  {previewingDoc.url && (
                    <a href={previewingDoc.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-[#4F7CFF] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all">
                      <ExternalLink size={14} /> Ouvrir
                    </a>
                  )}
                  <button onClick={() => setPreviewingDoc(null)} className="p-3 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-all"><X size={24}/></button>
                </div>
              </div>
              <div className="flex-1 bg-slate-50 flex items-center justify-center p-10">
                <div className="bg-white w-full h-full shadow-sm rounded-2xl flex flex-col items-center justify-center p-10 text-center gap-6 border border-slate-100">
                  <div className="w-20 h-20 rounded-2xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
                    <FileText size={36} className="text-[#4F7CFF]" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 mb-1">{previewingDoc.label}</p>
                    {previewingDoc.url ? (
                      <p className="text-sm text-slate-400 font-bold">Stocké dans la GED (Dropbox).<br/>Cliquez pour ouvrir et vérifier le document.</p>
                    ) : (
                      <p className="text-sm text-slate-400 font-bold">Document reçu — traitement GED en cours.</p>
                    )}
                  </div>
                  {previewingDoc.url && (
                    <a
                      href={previewingDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-8 py-4 rounded-2xl bg-[#4F7CFF] text-white font-black text-sm flex items-center gap-3 hover:bg-blue-600 transition-all shadow-md"
                    >
                      <Eye size={18} /> Ouvrir le document
                    </a>
                  )}
                </div>
              </div>
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

      {/* FICHE TARIFICATION EXTRANET */}
      <AnimatePresence>
        {showFicheTarification && prospect.ai_suggestion && (
          <FicheTarification
            prospect={prospect}
            suggestion={prospect.ai_suggestion}
            onClose={() => setShowFicheTarification(false)}
          />
        )}
      </AnimatePresence>

      {/* FIC — FICHE D'INFORMATION ET DE CONSEIL */}
      <AnimatePresence>
        {showFicModal && prospect.ai_suggestion && (
          <FicFormModal
            prospect={prospect}
            suggestion={prospect.ai_suggestion}
            devisExtrait={devisExtrait}
            onClose={() => setShowFicModal(false)}
            onGenerated={async (blob) => {
              try {
                const dossierId = prospect.id;
                const ficType = (prospect.type_contrat_demande || 'auto').toLowerCase();
                await uploadFicPdf(dossierId, blob, ficType, `${prospect.nom}_${prospect.prenom}`);
                setFicGenerated(true);
                updateProspect(prospect.id, { fiche_conseil_generee: true });
              } catch (err) {
                console.error('Erreur archivage FIC:', err);
              }
            }}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default ProspectDetail;

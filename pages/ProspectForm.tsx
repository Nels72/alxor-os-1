
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  ArrowLeft, 
  Upload, 
  CheckCircle2, 
  ChevronRight, 
  Zap, 
  Info,
  MapPin,
  X,
  Loader2,
  Brain,
  Sparkles,
  Phone
} from 'lucide-react';
import { useStore } from '../store';
import { WORKFLOW_DOCUMENTS } from '../lib/preDevisDocuments';

interface AddressSuggestion {
  label: string;
  postcode: string;
  city: string;
}

const ProspectForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpertMode = searchParams.get('mode') === 'expert';
  
  const addProspect = useStore(state => state.addProspect);
  const uploadDoc = useStore(state => state.uploadDoc);
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    code_produit: 'auto',
    commentaires: ''
  });

  const [scanningStatus, setScanningStatus] = useState<Record<string, 'idle' | 'scanning' | 'done'>>({});
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Validation : Vérifie si l'étape actuelle est valide
  const isStepValid = useMemo(() => {
    if (isExpertMode) {
      return (
        formData.nom.trim() !== '' &&
        formData.prenom.trim() !== '' &&
        formData.email.trim() !== '' &&
        formData.telephone.trim() !== '' &&
        formData.adresse.trim() !== ''
      );
    }

    switch (step) {
      case 1:
        return (
          formData.nom.trim() !== '' &&
          formData.prenom.trim() !== '' &&
          formData.email.trim() !== '' &&
          formData.telephone.trim() !== '' &&
          formData.adresse.trim() !== ''
        );
      case 2:
        return formData.code_produit !== '';
      case 3:
        return true; // Les docs peuvent être optionnels au moment du clic final mais recommandés
      default:
        return false;
    }
  }, [formData, step, isExpertMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAddress = async () => {
      if (addressQuery.length < 5) {
        setSuggestions([]);
        return;
      }
      setIsLoadingAddress(true);
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addressQuery)}&limit=5`);
        const data = await res.json();
        const results = (data.features || []).map((f: any) => ({
          label: f.properties.label,
          postcode: f.properties.postcode,
          city: f.properties.city
        }));
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        setSuggestions([]);
      } finally {
        setIsLoadingAddress(false);
      }
    };
    const timer = setTimeout(fetchAddress, 400);
    return () => clearTimeout(timer);
  }, [addressQuery]);

  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const currentDocs = useMemo(() => {
    return WORKFLOW_DOCUMENTS[formData.code_produit] || WORKFLOW_DOCUMENTS['auto'];
  }, [formData.code_produit]);

  const phase1Docs = useMemo(() => {
    return currentDocs.filter(d => d.phase === 1);
  }, [currentDocs]);

  const handleNext = () => {
    if (isStepValid) setStep(prev => Math.min(prev + 1, 3));
  };
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

  const simulateAIScan = async (type: string) => {
    setScanningStatus(prev => ({ ...prev, [type]: 'scanning' }));
    await new Promise(resolve => setTimeout(resolve, 2000));
    setScanningStatus(prev => ({ ...prev, [type]: 'done' }));
  };

  const handleFileChange = async (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFiles(prev => ({ ...prev, [type]: file }));
      await simulateAIScan(type);
    }
  };

  const removeFile = (type: string) => {
    const newFiles = { ...uploadedFiles };
    delete newFiles[type];
    setUploadedFiles(newFiles);
    setScanningStatus(prev => ({ ...prev, [type]: 'idle' }));
  };

  const handleSelectSuggestion = (s: AddressSuggestion) => {
    setFormData({ ...formData, adresse: s.label });
    setAddressQuery(s.label);
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (!isStepValid) return;
    setIsAnalyzing(true);
    const prospectId = Math.random().toString(36).substr(2, 9);
    
    setTimeout(() => {
      const newProspect = {
        id: prospectId,
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        adresse: formData.adresse,
        type_contrat_demande: formData.code_produit,
        statut: 'nouveau' as const,
        ges_score: 0,
        created_at: new Date().toISOString(),
        priority: 'Moyenne' as const
      };
      
      addProspect(newProspect);
      Object.keys(uploadedFiles).forEach((type) => {
        uploadDoc(prospectId, type);
      });

      setIsAnalyzing(false);
      navigate(`/prospects/${prospectId}`);
    }, 1500);
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-[#4F7CFF]/5 transition-all placeholder:text-slate-400 text-slate-900 font-bold shadow-sm";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 md:p-12">
        <div className="flex justify-between items-center mb-10">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 text-slate-400 hover:text-[#4F7CFF] transition-all font-bold text-xs uppercase tracking-widest">
            <ArrowLeft size={18} /> Retour
          </button>
          {isExpertMode && (
            <div className="bg-[#4F7CFF]/10 text-[#4F7CFF] px-4 py-2 rounded-full border border-[#4F7CFF]/20 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
              <Sparkles size={14} /> Mode Courtier Expert Actif
            </div>
          )}
        </div>

        <div className="mb-14">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 tracking-tight">Nouvelle Sollicitation</h1>
          <p className="text-slate-500 font-bold text-lg">Collecte assistée par Collaborateur OS.</p>
        </div>

        {!isExpertMode && (
          <div className="flex items-center gap-6 mb-16">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${
                  step === s ? 'bg-[#4F7CFF] text-white shadow-xl shadow-blue-500/30' : 
                  step > s ? 'bg-[#10B981] text-white' : 'bg-white border border-slate-200 text-slate-300'
                }`}>
                  {step > s ? <CheckCircle2 size={20} /> : s}
                </div>
                {s < 3 && <div className="w-12 h-0.5 bg-slate-200" />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-slate-200 p-8 md:p-12 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="space-y-10">
            {/* LÉGENDE DES CHAMPS OBLIGATOIRES */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <Info size={18} className="text-[#4F7CFF] mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                Afin de traiter votre dossier avec la plus grande précision, nous vous prions de bien vouloir renseigner les champs marqués d'un astérisque (<span className="text-red-500 font-black">*</span>).
              </p>
            </div>

            {/* BLOC IDENTITE */}
            {(step === 1 || isExpertMode) && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Prénom <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} placeholder="Alice" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Nom <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} placeholder="Lemoine" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>E-mail <span className="text-red-500">*</span></label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="contact@email.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Téléphone <span className="text-red-500">*</span></label>
                    <input type="tel" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} placeholder="06 12 34 56 78" className={inputClass} />
                  </div>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <label className={labelClass}>Adresse du risque <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.adresse} 
                      onChange={e => {
                        setFormData({...formData, adresse: e.target.value});
                        setAddressQuery(e.target.value);
                      }} 
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Saisissez l'adresse..." 
                      className={`${inputClass} pr-12`} 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isLoadingAddress && <Loader2 size={18} className="animate-spin text-slate-400" />}
                      <MapPin size={18} className={formData.adresse ? 'text-[#4F7CFF]' : 'text-slate-300'} />
                    </div>
                  </div>

                  {/* Dropdown Suggestions */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSuggestion(s)}
                          className="w-full px-6 py-4 flex items-center gap-4 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-[#4F7CFF] shrink-0">
                            <MapPin size={16} />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-slate-900 truncate">{s.label}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{s.postcode} {s.city}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BLOC PRODUIT */}
            {(step === 2 || isExpertMode) && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <label className={labelClass}>Risque à couvrir <span className="text-red-500">*</span></label>
                  <select value={formData.code_produit} onChange={e => setFormData({...formData, code_produit: e.target.value})} className={inputClass}>
                    {Object.keys(WORKFLOW_DOCUMENTS).map(key => (
                      <option key={key} value={key}>{key.toUpperCase().replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* BLOC DOCUMENTS */}
            {(step === 3 || isExpertMode) && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Upload size={14} className="text-[#4F7CFF]" /> Pièces justificatives (Phase 1)
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {phase1Docs.map(doc => {
                    const status = scanningStatus[doc.type] || 'idle';
                    return (
                      <div key={doc.type} className={`p-5 rounded-2xl border transition-all ${
                        status === 'done' ? 'bg-green-50 border-green-200' : 
                        status === 'scanning' ? 'bg-blue-50 border-blue-200 animate-pulse' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              status === 'done' ? 'bg-green-500 text-white' : 
                              status === 'scanning' ? 'bg-[#4F7CFF] text-white' : 'bg-white text-slate-300 border border-slate-100'
                            }`}>
                              {status === 'done' ? <CheckCircle2 size={24} /> : status === 'scanning' ? <Brain size={24} className="animate-spin" /> : <Upload size={24} />}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{doc.label}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{status === 'scanning' ? "Extraction des données par l'IA..." : doc.description}</p>
                            </div>
                          </div>
                          {!uploadedFiles[doc.type] ? (
                            <label className="cursor-pointer px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-900 uppercase tracking-widest hover:border-[#4F7CFF] transition-all">
                              Joindre <input type="file" className="hidden" onChange={e => handleFileChange(doc.type, e)} />
                            </label>
                          ) : (
                            <button onClick={() => removeFile(doc.type)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
                          )}
                        </div>
                        {status === 'scanning' && (
                          <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#4F7CFF] w-1/2 animate-[loading_2s_ease-in-out_infinite]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between mt-12 pt-8 border-t border-slate-100">
              {!isExpertMode ? (
                <>
                  <button onClick={handleBack} className={`px-8 py-3 rounded-xl border font-bold text-slate-400 ${step === 1 ? 'invisible' : ''}`}>Retour</button>
                  {step < 3 ? (
                    <button 
                      onClick={handleNext} 
                      disabled={!isStepValid}
                      className={`px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all ${
                        isStepValid ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      Suivant <ChevronRight size={18}/>
                    </button>
                  ) : (
                    <button 
                      onClick={handleSubmit} 
                      disabled={isAnalyzing || !isStepValid} 
                      className={`px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${
                        isStepValid ? 'bg-gradient-primary text-white shadow-xl' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      {isAnalyzing ? "Scan global..." : <><Zap size={18}/> Créer Sollicitation</>}
                    </button>
                  )}
                </>
              ) : (
                <button 
                  onClick={handleSubmit} 
                  disabled={isAnalyzing || !isStepValid} 
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-4 transition-all ${
                    isStepValid ? 'bg-gradient-primary text-white shadow-2xl shadow-blue-500/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" /> : <><Zap size={22}/> Enregistrer Sollicitation Expert</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProspectForm;

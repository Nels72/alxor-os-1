
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
import { createCabinetProspect, CABINET_TENANT } from '../services/airtable';
import { Building2, User, Users } from 'lucide-react';

interface AddressSuggestion {
  label: string;
  postcode: string;
  city: string;
}

interface SiretResult {
  raison_sociale: string;
  forme_juridique: string;
  adresse_siege: string;
  activite_naf: string;
  etat: string;
}

/* ── Helpers de validation & formatage ── */

/** Capitalise : première lettre majuscule, reste minuscule (gère les tirets) */
function capitalizeField(value: string): string {
  return value
    .split(/(-|\s)/)
    .map(part => (/[-\s]/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
    .join('');
}

/** Normalise le téléphone vers +33XXXXXXXXX */
function formatPhoneE164(raw: string): string {
  const digits = raw.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+33')) return '+33' + digits.slice(3).replace(/\D/g, '');
  if (digits.startsWith('0033')) return '+33' + digits.slice(4).replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length >= 10) return '+33' + digits.slice(1);
  return digits.startsWith('+') ? digits : raw;
}

/** Affiche +33XXXXXXXXX sous forme lisible : +33 X XX XX XX XX */
function displayPhone(e164: string): string {
  if (!e164.startsWith('+33') || e164.length !== 12) return e164;
  const n = e164.slice(3); // 9 digits
  return `+33 ${n[0]} ${n.slice(1,3)} ${n.slice(3,5)} ${n.slice(5,7)} ${n.slice(7,9)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  const e164 = formatPhoneE164(phone);
  return /^\+33\d{9}$/.test(e164);
}

function isValidName(name: string): boolean {
  return name.trim().length >= 2 && /^[A-Za-zÀ-ÿ\s'-]+$/.test(name.trim());
}

function isValidSiret(siret: string): boolean {
  return /^\d{14}$/.test(siret.replace(/\s/g, ''));
}

function isValidDateNaissance(date: string): boolean {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const age = (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return age >= 16 && age <= 120;
}

const ProspectForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpertMode = searchParams.get('mode') === 'expert';
  
  const addProspect = useStore(state => state.addProspect);
  const uploadDoc = useStore(state => state.uploadDoc);
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type_client: '' as '' | 'Particulier' | 'Professionnel' | 'Entreprise',
    civilite: '' as '' | 'M.' | 'Mme',
    nom: '',
    prenom: '',
    date_naissance: '',
    email: '',
    telephone: '',
    adresse: '',
    siret: '',
    raison_sociale: '',
    code_produit: 'auto',
    commentaires: ''
  });

  // SIRET lookup state
  const [siretResult, setSiretResult] = useState<SiretResult | null>(null);
  const [isLoadingSiret, setIsLoadingSiret] = useState(false);
  const [siretError, setSiretError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [scanningStatus, setScanningStatus] = useState<Record<string, 'idle' | 'scanning' | 'done'>>({});
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isPro = formData.type_client === 'Professionnel' || formData.type_client === 'Entreprise';

  /** Valide les champs identité et retourne les erreurs */
  const validateIdentity = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!formData.type_client) errors.type_client = 'Type de client requis';
    if (!formData.civilite) errors.civilite = 'Civilité requise';
    if (!isValidName(formData.prenom)) errors.prenom = 'Prénom invalide (min. 2 caractères, lettres uniquement)';
    if (!isValidName(formData.nom)) errors.nom = 'Nom invalide (min. 2 caractères, lettres uniquement)';
    if (!isValidDateNaissance(formData.date_naissance)) errors.date_naissance = 'Date de naissance invalide (âge entre 16 et 120 ans)';
    if (!isValidEmail(formData.email)) errors.email = 'Format email invalide';
    if (!isValidPhone(formData.telephone)) errors.telephone = 'Format attendu : 06 12 34 56 78 ou +33612345678';
    if (formData.adresse.trim().length < 5) errors.adresse = 'Adresse requise';
    if (isPro) {
      if (!isValidSiret(formData.siret)) errors.siret = 'SIRET invalide (14 chiffres)';
      if (!formData.raison_sociale.trim()) errors.raison_sociale = 'Raison sociale requise';
    }
    return errors;
  };

  // Validation : Vérifie si l'étape actuelle est valide
  const isStepValid = useMemo(() => {
    const baseIdentityOk =
      !!formData.type_client &&
      !!formData.civilite &&
      isValidName(formData.nom) &&
      isValidName(formData.prenom) &&
      isValidDateNaissance(formData.date_naissance) &&
      isValidEmail(formData.email) &&
      isValidPhone(formData.telephone) &&
      formData.adresse.trim().length >= 5;

    const proOk = isPro
      ? isValidSiret(formData.siret) && formData.raison_sociale.trim().length > 0
      : true;

    const identityOk = baseIdentityOk && proOk;

    if (isExpertMode) return identityOk;

    switch (step) {
      case 1: return identityOk;
      case 2: return formData.code_produit !== '';
      case 3: return true;
      default: return false;
    }
  }, [formData, step, isExpertMode, isPro]);

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

  // SIRET auto-lookup via API Recherche Entreprises
  useEffect(() => {
    const cleanSiret = formData.siret.replace(/\s/g, '');
    if (!isPro || cleanSiret.length !== 14 || !/^\d{14}$/.test(cleanSiret)) {
      setSiretResult(null);
      setSiretError(null);
      return;
    }

    const controller = new AbortController();
    const fetchSiret = async () => {
      setIsLoadingSiret(true);
      setSiretError(null);
      try {
        const res = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?q=${cleanSiret}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        const results = data.results || [];
        if (results.length === 0) {
          setSiretError('Aucune entreprise trouvée pour ce SIRET');
          setSiretResult(null);
          return;
        }
        const ent = results[0];
        const siege = ent.siege || {};
        const adresseParts = [siege.numero_voie, siege.type_voie, siege.libelle_voie, siege.code_postal, siege.libelle_commune].filter(Boolean);
        const result: SiretResult = {
          raison_sociale: ent.nom_complet || ent.nom_raison_sociale || '',
          forme_juridique: ent.nature_juridique || '',
          adresse_siege: adresseParts.join(' '),
          activite_naf: ent.activite_principale ? `${ent.activite_principale} — ${siege.libelle_activite_principale || ''}` : '',
          etat: ent.etat_administratif === 'A' ? 'Active' : 'Fermée',
        };
        setSiretResult(result);
        // Pré-remplir raison sociale
        if (result.raison_sociale) {
          setFormData(prev => ({ ...prev, raison_sociale: result.raison_sociale }));
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setSiretError('Erreur lors de la recherche SIRET');
        }
      } finally {
        setIsLoadingSiret(false);
      }
    };

    const timer = setTimeout(fetchSiret, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [formData.siret, isPro]);

  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentDocs = useMemo(() => {
    return WORKFLOW_DOCUMENTS[formData.code_produit] || WORKFLOW_DOCUMENTS['auto'];
  }, [formData.code_produit]);

  const phase1Docs = useMemo(() => {
    return currentDocs.filter(d => d.phase === 1);
  }, [currentDocs]);

  const handleNext = () => {
    if (step === 1) {
      const errors = validateIdentity();
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }
    if (isStepValid) setStep(prev => Math.min(prev + 1, 3));
  };
  const handleBack = () => { setFieldErrors({}); setStep(prev => Math.max(prev - 1, 1)); };

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
    // Validation finale
    const errors = validateIdentity();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!isStepValid) return;

    setIsAnalyzing(true);
    setSubmitError(null);

    // Formatage des données
    const cleanNom = capitalizeField(formData.nom.trim());
    const cleanPrenom = capitalizeField(formData.prenom.trim());
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanTel = formatPhoneE164(formData.telephone);

    try {
      const { dossier } = await createCabinetProspect({
        nom: cleanNom,
        prenom: cleanPrenom,
        email: cleanEmail,
        telephone: cleanTel,
        adresse: formData.adresse.trim(),
        code_produit: formData.code_produit,
        commentaires: formData.commentaires,
        civilite: formData.civilite as 'M.' | 'Mme',
        date_naissance: formData.date_naissance,
        type_client: formData.type_client as 'Particulier' | 'Professionnel' | 'Entreprise',
        siret: isPro ? formData.siret.replace(/\s/g, '') : undefined,
        raison_sociale: isPro ? formData.raison_sociale.trim() : undefined,
      });

      const newProspect = {
        id: dossier.id,
        nom: cleanNom,
        prenom: cleanPrenom,
        email: cleanEmail,
        telephone: cleanTel,
        adresse: formData.adresse.trim(),
        civilite: formData.civilite as 'M.' | 'Mme',
        date_naissance: formData.date_naissance,
        type_client: formData.type_client as 'Particulier' | 'Professionnel' | 'Entreprise',
        type_contrat_demande: formData.code_produit,
        statut: 'nouveau' as const,
        ges_score: 0,
        created_at: new Date().toISOString(),
        priority: 'Moyenne' as const
      };

      addProspect(newProspect);

      Object.keys(uploadedFiles).forEach((type) => {
        uploadDoc(dossier.id, type);
      });

      navigate(`/prospects/${dossier.id}`);
    } catch (error) {
      console.error('Erreur création prospect:', error);
      setSubmitError(error instanceof Error ? error.message : 'Erreur lors de la création du prospect');
    } finally {
      setIsAnalyzing(false);
    }
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

                {/* 1. TYPE CLIENT — premier champ */}
                <div>
                  <label className={labelClass}>Type de client <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'Particulier', icon: User, label: 'Particulier' },
                      { value: 'Professionnel', icon: Building2, label: 'Professionnel' },
                      { value: 'Entreprise', icon: Users, label: 'Entreprise' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setFormData(prev => ({ ...prev, type_client: opt.value, ...(opt.value === 'Particulier' ? { siret: '', raison_sociale: '' } : {}) })); setSiretResult(null); setSiretError(null); setFieldErrors(prev => { const n = { ...prev }; delete n.type_client; return n; }); }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all font-bold text-xs uppercase tracking-widest ${
                          formData.type_client === opt.value
                            ? 'border-[#4F7CFF] bg-[#4F7CFF]/5 text-[#4F7CFF] shadow-lg shadow-blue-500/10'
                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <opt.icon size={22} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {fieldErrors.type_client && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{fieldErrors.type_client}</p>}
                </div>

                {/* 2. BLOC SIRET — visible si Pro/Entreprise */}
                {isPro && (
                  <div className="space-y-4 p-6 bg-blue-50/50 border border-blue-100 rounded-2xl">
                    <div>
                      <label className={labelClass}>SIRET <span className="text-red-500">*</span> <span className="text-slate-300 normal-case tracking-normal font-medium">(14 chiffres)</span></label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.siret}
                          onChange={e => { setFormData({ ...formData, siret: e.target.value }); setFieldErrors(prev => { const n = { ...prev }; delete n.siret; return n; }); }}
                          placeholder="12345678901234"
                          maxLength={14}
                          className={`${inputClass} pr-12 ${fieldErrors.siret ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {isLoadingSiret && <Loader2 size={18} className="animate-spin text-[#4F7CFF]" />}
                          {siretResult && !isLoadingSiret && <CheckCircle2 size={18} className="text-green-500" />}
                        </div>
                      </div>
                      {fieldErrors.siret && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{fieldErrors.siret}</p>}
                      {siretError && <p className="text-[10px] text-orange-500 font-bold mt-1.5 ml-1">{siretError}</p>}
                    </div>

                    {/* Résultat lookup SIRET */}
                    {siretResult && (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase tracking-widest">
                          <CheckCircle2 size={12} /> Entreprise trouvée
                          {siretResult.etat !== 'Active' && <span className="text-red-500 ml-2">({siretResult.etat})</span>}
                        </div>
                        <div>
                          <label className={labelClass}>Raison sociale <span className="text-red-500">*</span></label>
                          <input type="text" value={formData.raison_sociale} onChange={e => { setFormData({ ...formData, raison_sociale: e.target.value }); setFieldErrors(prev => { const n = { ...prev }; delete n.raison_sociale; return n; }); }} className={`${inputClass} ${fieldErrors.raison_sociale ? 'border-red-400' : ''}`} />
                          {fieldErrors.raison_sociale && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{fieldErrors.raison_sociale}</p>}
                        </div>
                        {siretResult.forme_juridique && (
                          <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                            <div><span className="font-bold text-slate-700">Forme :</span> {siretResult.forme_juridique}</div>
                            <div><span className="font-bold text-slate-700">NAF :</span> {siretResult.activite_naf}</div>
                          </div>
                        )}
                        {siretResult.adresse_siege && (
                          <p className="text-xs text-slate-500"><span className="font-bold text-slate-700">Siège :</span> {siretResult.adresse_siege}</p>
                        )}
                      </div>
                    )}

                    {/* Raison sociale manuelle si pas de résultat SIRET */}
                    {!siretResult && isValidSiret(formData.siret) && !isLoadingSiret && (
                      <div>
                        <label className={labelClass}>Raison sociale <span className="text-red-500">*</span></label>
                        <input type="text" value={formData.raison_sociale} onChange={e => { setFormData({ ...formData, raison_sociale: e.target.value }); setFieldErrors(prev => { const n = { ...prev }; delete n.raison_sociale; return n; }); }} placeholder="Nom de l'entreprise" className={`${inputClass} ${fieldErrors.raison_sociale ? 'border-red-400' : ''}`} />
                        {fieldErrors.raison_sociale && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{fieldErrors.raison_sociale}</p>}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. CIVILITÉ */}
                <div>
                  <label className={labelClass}>Civilité <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-3 max-w-xs">
                    {(['M.', 'Mme'] as const).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setFormData(prev => ({ ...prev, civilite: c })); setFieldErrors(prev => { const n = { ...prev }; delete n.civilite; return n; }); }}
                        className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                          formData.civilite === c
                            ? 'border-[#4F7CFF] bg-[#4F7CFF]/5 text-[#4F7CFF]'
                            : 'border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {c === 'M.' ? 'Monsieur' : 'Madame'}
                      </button>
                    ))}
                  </div>
                  {fieldErrors.civilite && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{fieldErrors.civilite}</p>}
                </div>

                {/* 4. NOM / PRÉNOM */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Prénom <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.prenom} onChange={e => { setFormData({...formData, prenom: e.target.value}); setFieldErrors(prev => { const n = {...prev}; delete n.prenom; return n; }); }} onBlur={() => setFormData(prev => ({...prev, prenom: capitalizeField(prev.prenom.trim())}))} placeholder="Alice" className={`${inputClass} ${fieldErrors.prenom ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                    {fieldErrors.prenom && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{fieldErrors.prenom}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Nom <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.nom} onChange={e => { setFormData({...formData, nom: e.target.value}); setFieldErrors(prev => { const n = {...prev}; delete n.nom; return n; }); }} onBlur={() => setFormData(prev => ({...prev, nom: capitalizeField(prev.nom.trim())}))} placeholder="Lemoine" className={`${inputClass} ${fieldErrors.nom ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                    {fieldErrors.nom && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{fieldErrors.nom}</p>}
                  </div>
                </div>

                {/* 5. DATE DE NAISSANCE */}
                <div className="max-w-xs">
                  <label className={labelClass}>Date de naissance <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.date_naissance} onChange={e => { setFormData({...formData, date_naissance: e.target.value}); setFieldErrors(prev => { const n = {...prev}; delete n.date_naissance; return n; }); }} className={`${inputClass} ${fieldErrors.date_naissance ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                  {fieldErrors.date_naissance && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{fieldErrors.date_naissance}</p>}
                </div>

                {/* 6. EMAIL / TÉLÉPHONE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>E-mail <span className="text-red-500">*</span></label>
                    <input type="email" value={formData.email} onChange={e => { setFormData({...formData, email: e.target.value}); setFieldErrors(prev => { const n = {...prev}; delete n.email; return n; }); }} onBlur={() => setFormData(prev => ({...prev, email: prev.email.trim().toLowerCase()}))} placeholder="contact@email.com" className={`${inputClass} ${fieldErrors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                    {fieldErrors.email && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{fieldErrors.email}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Téléphone <span className="text-red-500">*</span> <span className="text-slate-300 normal-case tracking-normal font-medium">(+33XXXXXXXXX)</span></label>
                    <input type="tel" value={formData.telephone} onChange={e => { setFormData({...formData, telephone: e.target.value}); setFieldErrors(prev => { const n = {...prev}; delete n.telephone; return n; }); }} onBlur={() => { const formatted = formatPhoneE164(formData.telephone); setFormData(prev => ({...prev, telephone: formatted.startsWith('+33') ? displayPhone(formatted) : prev.telephone})); }} placeholder="+33 6 12 34 56 78" className={`${inputClass} ${fieldErrors.telephone ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                    {fieldErrors.telephone && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{fieldErrors.telephone}</p>}
                  </div>
                </div>

                {/* 7. ADRESSE DU RISQUE */}
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

            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-medium">
                {submitError}
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

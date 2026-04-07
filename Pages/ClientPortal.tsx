import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  ShieldCheck, 
  Download, 
  ChevronRight, 
  HelpCircle,
  Clock,
  LogOut,
  User,
  Mail,
  X,
  CheckCircle,
  Phone,
  FileSearch,
  Calendar,
  CreditCard
} from 'lucide-react';
import { useStore } from '../store';
import { Contrat } from '../types';
import Logo from '../components/Logo';
import {
  readClientSession,
  clearClientSession,
  initialsFromName,
  type ClientUserSession,
} from '../lib/clientSession';
import {
  fetchDossierById,
  collectMissingDocumentLabels,
  isRibMissing,
  getInsuranceTypeLabel,
  getBrokerDisplayName,
  uploadRIBToAirtable,
} from '../services/dossiersAirtable';

const ClientPortal: React.FC = () => {
  const navigate = useNavigate();
  const logout = useStore(state => state.logout);

  const [session, setSession] = useState<ClientUserSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const s = readClientSession();
    setSession(s);
    setSessionReady(true);
    if (!s) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contrat | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [demoToast, setDemoToast] = useState(false);
  const [dossierFields, setDossierFields] = useState<Record<string, unknown>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session?.dossier?.fields || typeof session.dossier.fields !== 'object') return;
    setDossierFields(session.dossier.fields as Record<string, unknown>);
  }, [session?.dossier?.fields]);

  useEffect(() => {
    if (!session?.dossierId) return;
    let cancelled = false;
    (async () => {
      const { record } = await fetchDossierById(session.dossierId);
      if (cancelled || !record?.fields) return;
      setDossierFields(record.fields as Record<string, unknown>);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.dossierId]);

  const handleLogout = () => {
    clearClientSession();
    logout();
    navigate('/login');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setIsUploading(true);
    setUploadSuccess(false);
    setDemoToast(false);
    try {
      const result = await uploadRIBToAirtable(session.dossierId, file);
      if (!result.ok) {
        window.alert(result.error || "Envoi impossible.");
        return;
      }
      setUploadSuccess(true);
      if (result.demo) {
        setDemoToast(true);
        setTimeout(() => setDemoToast(false), 5000);
      }
      const { record } = await fetchDossierById(session.dossierId);
      if (record?.fields) {
        setDossierFields(record.fields as Record<string, unknown>);
      }
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadSuccess(false), 4000);
    }
    e.target.value = "";
  };

  const handleContactBroker = () => {
    const raw =
      dossierFields["Email courtier"] ??
      dossierFields["Email Courtier"] ??
      dossierFields["Courtier Email"];
    const to =
      typeof raw === "string" && raw.includes("@")
        ? raw
        : "jean.marc@dupont-assur.fr";
    window.location.href = `mailto:${to}?subject=${encodeURIComponent("Demande client ALXOR Portal")}`;
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500 font-medium">
        Chargement...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const avatarLabel = initialsFromName(session.clientName);
  const portalContracts: Contrat[] = [];
  const missingDocs = collectMissingDocumentLabels(dossierFields);
  const ribMissing = isRibMissing(dossierFields);
  const otherMissing = missingDocs.filter((m) => m !== "RIB");
  const hasActions = missingDocs.length > 0;
  const brokerName =
    getBrokerDisplayName(dossierFields) || "Jean-Marc Dupont";
  const brokerInitials = initialsFromName(brokerName);
  const cabinetLabel =
    typeof dossierFields["Cabinet"] === "string" && dossierFields["Cabinet"].trim()
      ? String(dossierFields["Cabinet"]).trim()
      : "Cabinet Dupont & Associés";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      {/* Top Nav (Sticky) */}
      <nav className="border-b border-slate-200 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Logo className="h-8 w-auto" />
          </div>
          
          <div className="flex items-center gap-6">
            <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <HelpCircle size={22} />
            </button>
            
            {/* Avatar / Profil Menu */}
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-10 h-10 rounded-full bg-[#4F7CFF] flex items-center justify-center font-black text-white text-xs hover:ring-4 hover:ring-blue-100 transition-all shadow-md"
              >
                {avatarLabel}
              </button>
              
              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-64 bg-white border border-slate-200 rounded-3xl shadow-2xl z-20 overflow-hidden"
                    >
                      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <p className="font-black text-slate-900">{session.clientName}</p>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">{session.clientEmail}</p>
                      </div>
                      <div className="p-3 space-y-1">
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-colors">
                          <User size={18} className="text-slate-400" /> Mon Profil
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-colors">
                          <CreditCard size={18} className="text-slate-400" /> Mes Coordonnées Bancaires
                        </button>
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
                        >
                          <LogOut size={18} /> Déconnexion
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        <header className="mb-16">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-slate-900"
          >
            Bienvenue dans votre espace client
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-2xl md:text-3xl font-black text-[#4F7CFF] tracking-tight mb-4"
          >
            {session.clientName}
          </motion.p>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500 font-medium"
          >
            Gérez vos contrats et documents d'assurance en toute simplicité.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900">
                <FileText className="text-[#4F7CFF]" size={28} />
                Résumé de ma demande
              </h2>
              {hasActions ? (
                <span className="px-3 py-1 bg-[#4F7CFF]/10 text-[#4F7CFF] border border-[#4F7CFF]/25 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Action requise
                </span>
              ) : (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                  À jour
                </span>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Identifiant dossier
                </p>
                <p className="font-mono text-sm text-slate-800 break-all">
                  {session.dossierId}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Type d&apos;assurance demandé
                </p>
                <p className="text-xl font-black text-slate-900">
                  {getInsuranceTypeLabel(dossierFields)}
                </p>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed pt-2 border-t border-slate-100">
                Vos contrats souscrits apparaîtront ici lorsque votre courtier les aura rattachés à ce dossier.
              </p>
            </div>

            <div className="space-y-6">
              {portalContracts.map((c, i) => (
                <motion.div 
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.01, borderColor: '#4F7CFF50' }}
                  onClick={() => setSelectedContract(c)}
                  className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all group cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">{c.compagnie}</p>
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-[#4F7CFF] transition-colors">{c.type_contrat}</h3>
                      <p className="text-sm text-slate-500 font-bold mt-1 tracking-tight">Police Nº {c.numero_contrat}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-slate-900">{c.prime_annuelle.toLocaleString()} €</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Prime Annuelle</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-8 border-t border-slate-100">
                    <div className="flex gap-6">
                      <button className="flex items-center gap-2 text-xs font-black text-[#4F7CFF] uppercase tracking-widest hover:underline transition-all">
                        <Download size={16} /> Attestation
                      </button>
                      <button className="flex items-center gap-2 text-xs font-black text-[#4F7CFF] uppercase tracking-widest hover:underline transition-all">
                        <FileText size={16} /> Documents
                      </button>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:bg-[#4F7CFF] transition-all">
                      <ChevronRight size={22} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar / Actions */}
          <div className="space-y-10">
            <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-[2.5rem] p-10 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                <Clock size={80} />
              </div>
              <h3 className="text-xl font-black mb-6 text-slate-900">Action Requise</h3>

              {!hasActions && (
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                  Votre dossier est à jour sur les pièces suivies pour le moment.
                </p>
              )}

              {ribMissing && (
                <div className="flex gap-5 mb-6">
                  <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                    <Clock size={28} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-base mb-1">RIB manquant</p>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      Veuillez nous transmettre votre RIB pour assurer le prélèvement de vos primes.
                    </p>
                  </div>
                </div>
              )}

              {otherMissing.length > 0 && (
                <div className="mb-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Autres pièces à fournir
                  </p>
                  <ul className="text-sm text-slate-600 font-medium space-y-2 list-disc pl-5">
                    {otherMissing.map((label) => (
                      <li key={label}>
                        <span className="font-black text-slate-800">{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {demoToast && (
                <p className="text-xs font-bold text-[#4F7CFF] mb-4">
                  Mode démo : fichier reçu. Pour enregistrer le RIB dans Airtable, configurez Cloudinary
                  (REACT_APP_CLOUDINARY_CLOUD_NAME + REACT_APP_CLOUDINARY_UPLOAD_PRESET) dans .env.local.
                </p>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,.pdf"
              />

              {ribMissing && (
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl ${
                    uploadSuccess
                      ? "bg-green-500 text-white shadow-green-500/20"
                      : "bg-[#4F7CFF] text-white hover:scale-105 shadow-blue-500/20"
                  }`}
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : uploadSuccess ? (
                    <>
                      <CheckCircle size={20} /> Succès — fichier transmis
                    </>
                  ) : (
                    <>
                      <Upload size={20} /> Téléverser mon RIB
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Support Courtier */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
              <h3 className="text-xl font-black mb-8 text-slate-900">Support Courtier</h3>
              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-[#4F7CFF]/10 text-[#4F7CFF] flex items-center justify-center font-black shadow-inner text-lg border border-[#4F7CFF]/20">
                  {brokerInitials}
                </div>
                <div>
                  <p className="font-black text-slate-900 text-lg">{brokerName}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">
                    {cabinetLabel}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleContactBroker}
                  className="w-full py-4 rounded-2xl bg-white border-2 border-[#4F7CFF]/30 text-[#4F7CFF] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#4F7CFF]/5 hover:border-[#4F7CFF]/50 transition-all flex items-center justify-center gap-3"
                >
                  <Mail size={18} /> Contacter par e-mail
                </button>
                <button
                  type="button"
                  className="w-full py-4 rounded-2xl bg-white border-2 border-[#4F7CFF]/30 text-[#4F7CFF] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#4F7CFF]/5 hover:border-[#4F7CFF]/50 transition-all flex items-center justify-center gap-3"
                >
                  <Phone size={18} /> Rappel immédiat
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Demo Disclaimer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-200">
         <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="px-4 py-1 bg-blue-50 text-[#4F7CFF] text-[9px] font-black uppercase tracking-widest rounded-full">
              Mode Démonstration - ALXOR OS
            </div>
            <p className="text-slate-400 text-xs font-medium max-w-lg">
              Ceci est un aperçu de l'interface que vos clients utiliseront. En tant que courtier, vous pouvez personnaliser les logos, les couleurs et les documents disponibles.
            </p>
         </div>
      </footer>

      {/* Modal Détails Contrat */}
      <AnimatePresence>
        {selectedContract && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedContract(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-10 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-[#4F7CFF] uppercase tracking-[0.3em]">Fiche Technique Contrat</span>
                  <h3 className="text-3xl font-black text-slate-900 mt-2">{selectedContract.type_contrat}</h3>
                  <p className="text-sm text-slate-400 font-bold mt-1">Police Nº {selectedContract.numero_contrat}</p>
                </div>
                <button 
                  onClick={() => setSelectedContract(null)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-10 space-y-10">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={14} className="text-[#10B981]" /> Compagnie
                    </p>
                    <p className="text-lg font-black text-slate-800">{selectedContract.compagnie}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={14} className="text-[#4F7CFF]" /> Date d'échéance
                    </p>
                    <p className="text-lg font-black text-slate-800">{new Date(selectedContract.date_echeance).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <CreditCard size={14} className="text-[#F59E0B]" /> Paiement
                    </p>
                    <p className="text-lg font-black text-slate-800">Mensuel • Prélèvement</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <FileSearch size={14} className="text-[#2ED3B7]" /> Statut Gestion
                    </p>
                    <span className="px-3 py-1 bg-blue-50 text-[#4F7CFF] text-[10px] font-black uppercase rounded-lg">Actif</span>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Garanties & Plafonds</h4>
                  <div className="space-y-4">
                    {[
                      { l: 'Hospitalisation', v: 'Frais Réels' },
                      { l: 'Médecine Douce', v: '200 € / an' },
                      { l: 'Optique', v: 'Forfait 400 €' },
                    ].map((g, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-slate-200/50 last:border-0">
                        <span className="text-sm font-bold text-slate-500">{g.l}</span>
                        <span className="text-sm font-black text-slate-900">{g.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button className="flex-1 py-4 bg-gradient-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2">
                    <Download size={18} /> Télécharger le contrat
                  </button>
                  <button className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-500 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">
                    Demander avenant
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientPortal;

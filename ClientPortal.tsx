
import React, { useState, useRef } from 'react';
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

const ClientPortal: React.FC = () => {
  const navigate = useNavigate();
  const clients = useStore(state => state.clients);
  const contracts = useStore(state => state.contracts);
  const logout = useStore(state => state.logout);
  const client = clients[0]; // Simulation pour la démo (Pierre Dubois)

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contrat | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      // Simulation d'upload
      setTimeout(() => {
        setIsUploading(false);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }, 1500);
    }
  };

  const handleContactBroker = () => {
    window.location.href = "mailto:jean.marc@dupont-assur.fr?subject=Demande client ALXOR Portal";
  };

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
                PD
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
                        <p className="font-black text-slate-900">{client.prenom} {client.nom}</p>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">{client.email}</p>
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
            Bonjour, {client.prenom} !
          </motion.h1>
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
          {/* Section Contrats */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between mb-2">
               <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900">
                <ShieldCheck className="text-[#10B981]" size={28} /> 
                Mes Contrats Actifs
              </h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                À jour
              </span>
            </div>
            
            <div className="space-y-6">
              {contracts.filter(c => c.client_id === client.id).map((c, i) => (
                <motion.div 
                  key={i}
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
            {/* Carte Alerte */}
            <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-[2.5rem] p-10 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                <Clock size={80} />
              </div>
              <h3 className="text-xl font-black mb-6 text-slate-900">Action Requise</h3>
              <div className="flex gap-5 mb-10">
                <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                  <Clock size={28} />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-base mb-1">RIB Manquant</p>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Veuillez nous transmettre votre nouveau RIB pour assurer le prélèvement de vos primes.
                  </p>
                </div>
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              
              <button 
                onClick={handleUploadClick}
                disabled={isUploading}
                className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl ${
                  uploadSuccess 
                  ? 'bg-green-500 text-white shadow-green-500/20' 
                  : 'bg-[#4F7CFF] text-white hover:scale-105 shadow-blue-500/20'
                }`}
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : uploadSuccess ? (
                  <><CheckCircle size={20} /> Transmis avec succès</>
                ) : (
                  <><Upload size={20} /> Téléverser mon RIB</>
                )}
              </button>
            </div>

            {/* Support Courtier */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
              <h3 className="text-xl font-black mb-8 text-slate-900">Support Courtier</h3>
              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-slate-100 flex items-center justify-center font-black text-slate-400 shadow-inner text-xl">
                  JD
                </div>
                <div>
                  <p className="font-black text-slate-900 text-lg">Jean-Marc Dupont</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Cabinet Dupont & Associés</p>
                </div>
              </div>
              <div className="space-y-4">
                <button 
                  onClick={handleContactBroker}
                  className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-3"
                >
                  <Mail size={18} /> Contacter par e-mail
                </button>
                <button className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-3">
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

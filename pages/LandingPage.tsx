
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Clock, 
  PieChart, 
  FileCheck, 
  Brain, 
  PenTool, 
  TrendingUp,
  ArrowRight,
  X,
  CheckCircle2,
  Search,
  Sparkles,
  Zap
} from 'lucide-react';
import { useStore } from '../store';
import Logo from '../components/Logo';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useStore(state => state.login);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const headlines = ["portefeuille", "conformité", "productivité"];

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % headlines.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const workflowCards = [
    { 
      icon: Search, 
      title: "Nouvelle Sollicitation", 
      badge: "Fillout intégré", 
      desc: "Le courtier reçoit la sollicitation et valide les informations.", 
      color: "#4F7CFF",
      details: [
        "Capture de leads omnicanale (API Fillout, Formulaires web)",
        "Dédoublonnage intelligent par matching SIRET / Email",
        "Affectation automatique au collaborateur disponible",
        "Tracking de l'origine du prospect (SEO, Apporteur, Referral)"
      ]
    },
    { 
      icon: Brain, 
      title: "Analyse IA", 
      badge: "Collaborateur augmenté", 
      desc: "L'IA analyse les documents et suggère le contrat optimal.", 
      color: "#2ED3B7",
      details: [
        "Lecture OCR de pièces complexes (KBIS, Bilans, Avis d'impôt)",
        "Extraction automatisée de 40+ points de données",
        "Contrôle de conformité et validité des pièces",
        "Scoring de risque et pré-remplissage questionnaire santé"
      ]
    },
    { 
      icon: Sparkles, 
      title: "Intervention Courtier", 
      badge: "Conseil expert", 
      desc: "Le courtier valide ou ajuste la proposition de l'IA.", 
      color: "#4F7CFF",
      details: [
        "Tableau de bord de révision assistée par IA",
        "Accès direct aux extranets compagnies via API",
        "Génération en 1 clic du Devoir de Conseil (DDC)",
        "Comparatif technique multicompagnies instantané"
      ]
    },
    { 
      icon: PenTool, 
      title: "Signature Électronique", 
      badge: "Zéro Papier", 
      desc: "Envoi séquencé et relances automatiques.", 
      color: "#2ED3B7",
      details: [
        "Envoi sécurisé multi-signataires (Yousign/DocuSign)",
        "Relances automatiques par SMS et Email personnalisés",
        "Horodatage certifié conforme eIDAS",
        "Notification push dès signature effective"
      ]
    },
    { 
      icon: TrendingUp, 
      title: "GES Score", 
      badge: "Suivi Live", 
      desc: "Visualisation temps réel du taux de complétude du dossier.", 
      color: "#10B981",
      details: [
        "Indice Global Enrollment Score (GES) dynamique",
        "Détection proactive des freins à la conversion",
        "Dashboard de performance par collaborateur",
        "Alerte de péremption de pièces justificatives"
      ]
    },
    { 
      icon: Zap, 
      title: "Conversion Client", 
      badge: "Multi-équipement", 
      desc: "Passage automatique en portefeuille client.", 
      color: "#F59E0B",
      details: [
        "Migration data transparente Prospect -> Client",
        "Ouverture automatique des accès portail client",
        "Initialisation des opportunités de cross-sell",
        "Génération de l'export EDI pour la comptabilité"
      ]
    },
  ];

  return (
    <div className="relative selection:bg-[#4F7CFF]/30 bg-[#f8fafc]">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center"
          >
            <Logo className="h-8 md:h-10 w-auto" />
          </motion.div>
          <div className="flex items-center gap-3 md:gap-6">
            <button 
              onClick={() => { login(); navigate('/dashboard'); }}
              className="px-6 py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl shadow-slate-900/10"
            >
              DEMO COURTIER
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 md:pt-48 pb-20 md:pb-32 px-4 md:px-6 text-center">
        <div className="max-w-6xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl md:text-8xl font-black mb-10 leading-[1.05] tracking-tight text-slate-900"
          >
            L'IA au service de votre <br />
            <div className="h-14 sm:h-20 md:h-24 mt-2 md:mt-4 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={headlineIndex}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.5, ease: "circOut" }}
                  className="text-gradient block w-full"
                >
                  {headlines[headlineIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-3xl text-slate-600 mb-14 max-w-5xl mx-auto leading-tight"
          >
            <span className="text-slate-900 font-black">ALXOR OS</span>, l'outil de production et gestion qui <br className="hidden md:block" />
            <span className="text-[#4F7CFF] font-bold underline decoration-4 decoration-[#2ED3B7] underline-offset-8">automatise le flux de travail</span> pour <span className="text-slate-900 font-black">doubler votre capacité business</span>... <br className="hidden md:block" />
            <span className="text-slate-400 font-medium italic">sans recruter.</span>
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6"
          >
            <button 
              onClick={() => { login(); navigate('/dashboard'); }}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-primary text-white text-xl font-black hover:scale-105 transition-all shadow-2xl shadow-blue-500/40 flex items-center justify-center gap-3"
            >
              Demander une démo <ArrowRight size={22} />
            </button>
            <p className="text-sm text-slate-500 font-bold bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
              Prêt en 10 minutes
            </p>
          </motion.div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-24 md:py-32 bg-white relative border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center mb-20 text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-slate-900 tracking-tight">Le cycle automatisé Alxor</h2>
            <p className="text-slate-500 text-lg max-w-2xl">Votre collaborateur virtuel silencieux, un ETP augmenté agissant 24h/24.</p>
            <div className="w-24 h-1.5 bg-gradient-primary rounded-full mt-6"></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {workflowCards.map((card, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -10, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.05)' }}
                onClick={() => setSelectedCard(idx)}
                className="group relative p-8 md:p-10 rounded-3xl bg-[#fdfdfd] border border-slate-100 hover:border-[#4F7CFF]/50 transition-all duration-300 cursor-pointer shadow-sm overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                  <card.icon size={100} />
                </div>
                <div className="w-14 h-14 rounded-2xl mb-8 flex items-center justify-center shadow-inner" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                  <card.icon size={30} />
                </div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl md:text-2xl font-black group-hover:text-[#4F7CFF] transition-colors text-slate-900 leading-tight">{card.title}</h3>
                </div>
                <p className="text-slate-500 leading-relaxed font-medium mb-6">{card.desc}</p>
                <div className="flex items-center gap-2 text-[#4F7CFF] font-black text-sm">
                  Détails du flux <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCard !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-200"
            >
              <button 
                onClick={() => setSelectedCard(null)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={28} />
              </button>
              
              <div className="w-20 h-20 rounded-3xl mb-8 flex items-center justify-center shadow-inner" style={{ backgroundColor: `${workflowCards[selectedCard].color}15`, color: workflowCards[selectedCard].color }}>
                {React.createElement(workflowCards[selectedCard].icon, { size: 40 })}
              </div>
              
              <h3 className="text-3xl font-black mb-4 text-slate-900 leading-tight">{workflowCards[selectedCard].title}</h3>
              <p className="text-slate-500 text-lg mb-10 font-medium">{workflowCards[selectedCard].desc}</p>
              
              <div className="space-y-5 mb-10">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Processus automatisés :</p>
                {workflowCards[selectedCard].details.map((detail, i) => (
                  <motion.div 
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="flex items-start gap-4"
                  >
                    <CheckCircle2 size={22} className="text-[#10B981] mt-0.5 shrink-0" />
                    <span className="text-slate-800 font-bold leading-tight">{detail}</span>
                  </motion.div>
                ))}
              </div>
              
              <button 
                onClick={() => { login(); navigate('/dashboard'); }}
                className="w-full py-5 rounded-2xl bg-gradient-primary text-white font-black text-lg hover:scale-[1.02] transition-all shadow-xl shadow-blue-500/20"
              >
                Activer ce module
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Section */}
      <section className="py-24 md:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24 items-center">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl md:text-6xl font-black mb-10 leading-tight text-slate-900 tracking-tight">
                Pilotage <br/><span className="text-gradient">Augmenté.</span>
              </h2>
              <div className="space-y-6 md:space-y-8">
                {[
                  { label: "Volume Commissions", val: "+145%", icon: TrendingUp, color: "#4F7CFF" },
                  { label: "Dossiers Complétés", val: "94%", icon: FileCheck, color: "#10B981" },
                  { label: "Temps Productif", val: "140h par mois", icon: Clock, color: "#2ED3B7" },
                ].map((stat, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="flex items-center gap-6 p-6 rounded-3xl bg-white border border-slate-200 hover:border-[#4F7CFF]/50 transition-all cursor-default shadow-sm"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                      <stat.icon size={32} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm md:text-base text-slate-400 font-black uppercase tracking-wider">{stat.label}</p>
                      <p className="text-2xl md:text-4xl font-black text-slate-900 leading-none mt-1">{stat.val}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative bg-white border border-slate-200 rounded-[3rem] p-8 md:p-12 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-12">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Projection cabinet Dupont</p>
                    <p className="text-3xl md:text-4xl font-black text-slate-900">1.2M€ CA</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[#2ED3B7]/10 flex items-center justify-center">
                    <PieChart className="text-[#2ED3B7]" size={28} />
                  </div>
                </div>
                <div className="space-y-6 mb-12">
                  {[85, 60, 95].map((w, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex justify-between text-xs font-black text-slate-500 uppercase tracking-wider">
                        <span>Production Auto {i+1}</span>
                        <span>{w}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${w}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                          className="h-full bg-gradient-primary"
                        ></motion.div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 italic text-slate-600 text-lg leading-relaxed font-medium">
                  "ALXOR OS agit comme un <span className="text-slate-900 font-black">collaborateur silencieux</span>. Notre capacité de production a littéralement doublé."
                  <div className="mt-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 border-4 border-white shadow-sm"></div>
                    <div>
                      <p className="text-base font-black text-slate-900">Marc L.</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gérant Assur-Pro</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto px-4 md:px-6"
        >
          <div className="bg-gradient-primary rounded-[3rem] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(79,124,255,0.4)]">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl"></div>
            <h2 className="text-4xl md:text-7xl font-black mb-10 relative z-10 tracking-tight">Capacité Doublée. <br/>Dès aujourd'hui.</h2>
            <p className="text-xl md:text-2xl mb-14 opacity-95 max-w-3xl mx-auto relative z-10 font-medium">
              Découvrez la puissance d'un OS métier conçu pour la croissance de votre cabinet de proximité.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
              <button 
                onClick={() => { login(); navigate('/dashboard'); }}
                className="w-full sm:w-auto px-12 py-6 rounded-2xl bg-white text-slate-900 text-xl font-black hover:scale-105 transition-all shadow-2xl"
              >
                Planifier une démo personnalisée
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-16 mb-20 text-slate-600">
            <div className="col-span-1 sm:col-span-2 md:col-span-1">
              <div className="flex items-center mb-8">
                <Logo className="h-10 w-auto" />
              </div>
              <p className="text-slate-400 text-base leading-relaxed font-medium">
                Le collaborateur virtuel des courtiers de proximité. Augmentez votre productivité sans recruter.
              </p>
            </div>
            <div>
              <h4 className="text-slate-900 font-black mb-8 uppercase tracking-widest text-xs">Produit</h4>
              <ul className="space-y-5 text-base font-bold">
                <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Automatisation IA</a></li>
                <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Signature Yousign</a></li>
                <li><Link to="/client" className="hover:text-[#4F7CFF] transition-colors">Portail Client</Link></li>
                <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Dashboard métier</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-900 font-black mb-8 uppercase tracking-widest text-xs">Compagnie</h4>
              <ul className="space-y-5 text-base font-bold">
                <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Tarifs</a></li>
                <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Sécurité Cloud</a></li>
                <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Partenaires</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-900 font-black mb-8 uppercase tracking-widest text-xs">Légal</h4>
              <ul className="space-y-5 text-base font-bold">
                <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Mentions</a></li>
                <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">RGPD / ACPR</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-12 border-t border-slate-100">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">© 2026 Alxor Labs. Production Augmentée.</p>
            <div className="flex gap-8">
              <Zap size={20} className="text-slate-300 hover:text-[#4F7CFF] transition-colors cursor-pointer" />
              <Zap size={20} className="text-slate-300 hover:text-[#4F7CFF] transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

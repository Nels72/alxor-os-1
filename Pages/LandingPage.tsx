
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
  Zap,
  User
} from 'lucide-react';
import { useStore } from '../store';
import Logo from '../components/Logo';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useStore(state => state.login);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const headlines = ["conseil", "conformité", "productivité"];

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % headlines.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const revealUp = {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 as const },
    transition: { duration: 0.55, ease: 'easeOut' as const },
  };

  const labelCapsClass = "font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.1em] uppercase";

  const workflowCards = [
    { 
      icon: Search, 
      title: "Collecte Intelligente",
      cta: "Lancer l'analyse IA →",
      badge: "Fillout intégré", 
      desc: "Le courtier reçoit la sollicitation et valide les informations.", 
      color: "#4F7CFF",
      isAi: false,
      details: [
        "Capture de leads omnicanale (API Fillout, Formulaires web)",
        "Dédoublonnage intelligent par matching SIRET / Email",
        "Affectation automatique au collaborateur disponible",
        "Tracking de l'origine du prospect (SEO, Apporteur, Referral)"
      ]
    },
    { 
      icon: Brain, 
      title: "Extraction du Risque",
      cta: "Vérifier la conformité →",
      badge: "Collaborateur augmenté", 
      desc: "L'IA analyse les documents et suggère le contrat optimal.", 
      color: "#2ED3B7",
      isAi: true,
      details: [
        "Lecture OCR de pièces complexes (KBIS, Bilans, Avis d'impôt)",
        "Extraction automatisée de 40+ points de données",
        "Contrôle de conformité et validité des pièces",
        "Scoring de risque et pré-remplissage questionnaire santé"
      ]
    },
    { 
      icon: Sparkles, 
      title: "Validation Expert",
      cta: "Sécuriser l'accord →",
      badge: "Conseil expert", 
      desc: "Le courtier valide ou ajuste la proposition de l'IA.", 
      color: "#4F7CFF",
      isAi: true,
      details: [
        "Tableau de bord de révision assistée par IA",
        "Accès direct aux extranets partenaires via API",
        "Génération en 1 clic du Devoir de Conseil (DDC)",
        "Comparatif technique multicompagnies instantané"
      ]
    },
    { 
      icon: PenTool, 
      title: "Contractualisation Zen",
      cta: "Suivre la complétude →",
      badge: "Zéro Papier", 
      desc: "Envoi séquencé et relances automatiques.", 
      color: "#2ED3B7",
      isAi: false,
      details: [
        "Envoi sécurisé multi-signataires (Yousign/DocuSign)",
        "Relances automatiques par SMS et Email personnalisés",
        "Horodatage certifié conforme eIDAS",
        "Notification push dès signature effective"
      ]
    },
    { 
      icon: TrendingUp, 
      title: "Score de Complétude",
      cta: "Finaliser le dossier →",
      badge: "Suivi Live", 
      desc: "Visualisation temps réel du taux de complétude du dossier.", 
      color: "#10B981",
      isAi: false,
      details: [
        "Indice Global Enrollment Score (GES) dynamique",
        "Détection proactive des freins à la conversion",
        "Dashboard de performance par collaborateur",
        "Alerte de péremption de pièces justificatives"
      ]
    },
    { 
      icon: Zap, 
      title: "Activation Portefeuille",
      cta: "Prêt à scaler ?",
      badge: "Multi-équipement", 
      desc: "Passage automatique en portefeuille client.", 
      color: "#F59E0B",
      isAi: false,
      details: [
        "Migration data transparente Prospect -> Client",
        "Ouverture automatique des accès portail client",
        "Initialisation des opportunités de cross-sell",
        "Génération de l'export EDI pour la comptabilité"
      ]
    },
  ];

  const handleNext = () => {
    if (selectedCard === null) return;
    if (selectedCard < workflowCards.length - 1) {
      setSelectedCard(selectedCard + 1);
      return;
    }
    setSelectedCard(null);
    requestAnimationFrame(() => {
      document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="relative selection:bg-[#6B30E5]/30 bg-[#121127] text-slate-100">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121127]/80 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center"
          >
            <Logo className="h-10 md:h-12 w-auto" />
          </motion.div>
          <div className="flex items-center gap-3 md:gap-6">
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 rounded-[4px] border border-white/20 bg-transparent text-white hover:bg-white/10 transition-all font-medium tracking-wide text-[11px] md:text-xs flex items-center gap-2"
            >
              <User size={14} />
              Se connecter
            </button>
            <button 
              onClick={() => navigate('/login-admin')}
              className={`px-6 py-2.5 rounded-[4px] bg-[#0F5B4B] text-white hover:bg-[#126d59] transition-all text-[10px] md:text-xs shadow-xl shadow-[#90d4bf]/20 ${labelCapsClass}`}
            >
              DEMO COURTIER
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        {...revealUp}
        className="pt-32 md:pt-48 pb-24 md:pb-36 px-4 md:px-6 text-center"
      >
        <div className="max-w-6xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl md:text-8xl font-semibold mb-10 leading-[1.1] tracking-tight text-white"
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
            className="text-lg md:text-3xl text-slate-100/90 mb-14 max-w-5xl mx-auto leading-[1.35]"
          >
            <span className="text-white font-semibold">ALXOR OS</span>, l'outil de production et gestion qui <br className="hidden md:block" />
            <span className="text-[#90d4bf] font-semibold underline decoration-2 decoration-[#90d4bf] underline-offset-8 italic">automatise le flux de travail</span> pour <span className="text-white font-semibold">doubler votre capacité business</span>... <br className="hidden md:block" />
            <span className="text-slate-200/90 font-medium italic">sans recruter !</span>
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6"
          >
            <button 
              onClick={() => { login(); navigate('/dashboard'); }}
              className="w-full sm:w-auto px-10 py-5 rounded-[4px] bg-[#0F5B4B] text-white text-xl font-medium hover:bg-[#126d59] hover:scale-105 transition-all shadow-2xl shadow-[#90d4bf]/25 flex items-center justify-center gap-3"
            >
              Demander une démo <ArrowRight size={22} />
            </button>
            <p className="text-sm text-slate-100/90 font-medium bg-white/10 px-4 py-2 rounded-[4px] border border-white/20 backdrop-blur-xl">
              Prêt en 10 minutes
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Workflow Section */}
      <motion.section
        {...revealUp}
        className="py-40 bg-[#151338] relative border-y border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <motion.div {...revealUp} className="flex flex-col items-center mb-20 text-center">
            <h2 className="text-3xl md:text-5xl font-semibold mb-4 text-white tracking-tight leading-[1.2]">Le cycle automatisé Alxor</h2>
            <p className="text-slate-100/85 text-lg max-w-2xl leading-[1.5]">Votre collaborateur virtuel silencieux, un ETP augmenté agissant 24h/24.</p>
            <div className="w-24 h-1.5 bg-[#90d4bf] rounded-full mt-6"></div>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {workflowCards.map((card, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: idx * 0.08, ease: 'easeOut' }}
                whileHover={{ y: -8, scale: 1.01, boxShadow: '0 24px 50px -24px rgba(144,212,191,0.35)' }}
                onClick={() => setSelectedCard(idx)}
                className="group relative p-8 md:p-10 rounded-[12px] bg-white/12 border border-white/20 backdrop-blur-[30px] hover:border-[#90d4bf]/55 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl overflow-hidden"
              >
                {card.isAi && (
                  <>
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-[#6B30E5]/25 blur-3xl"
                      animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
                      transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute -right-12 -bottom-14 h-36 w-36 rounded-full bg-[#cfbcff]/20 blur-3xl"
                      animate={{ scale: [1.02, 0.95, 1.02], opacity: [0.25, 0.45, 0.25] }}
                      transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </>
                )}
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform text-white">
                  <card.icon size={100} />
                </div>
                <div className="w-14 h-14 rounded-[12px] mb-8 flex items-center justify-center shadow-inner border border-white/15" style={{ backgroundColor: `${card.isAi ? '#cfbcff' : '#90d4bf'}20`, color: card.isAi ? '#cfbcff' : '#90d4bf' }}>
                  <card.icon size={30} />
                </div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl md:text-2xl font-semibold group-hover:text-[#90d4bf] transition-colors text-white leading-[1.25]">{card.title}</h3>
                </div>
                <p className="text-slate-100/85 leading-[1.6] font-medium mb-6">{card.desc}</p>
                <div className={`flex items-center gap-2 text-sm text-[#90d4bf] ${labelCapsClass}`}>
                  Détails du flux <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCard !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              className="absolute inset-0 bg-[#0b0a18]/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-xl bg-white/12 rounded-[12px] p-10 shadow-2xl border border-white/20 backdrop-blur-[36px] overflow-hidden"
            >
              {workflowCards[selectedCard].isAi && (
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(107,48,229,0.28),transparent_45%)]" />
              )}
              <button 
                onClick={() => setSelectedCard(null)}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-[4px] text-slate-300 hover:text-white transition-colors"
              >
                <X size={28} />
              </button>

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCard}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <div className="w-20 h-20 rounded-3xl mb-8 flex items-center justify-center shadow-inner" style={{ backgroundColor: `${workflowCards[selectedCard].color}15`, color: workflowCards[selectedCard].color }}>
                    {React.createElement(workflowCards[selectedCard].icon, { size: 40 })}
                  </div>

                  <h3 className="text-3xl font-semibold mb-4 text-white leading-[1.2]">{workflowCards[selectedCard].title}</h3>
                  <p className="text-slate-100/90 text-lg mb-10 font-medium leading-[1.5]">{workflowCards[selectedCard].desc}</p>

                  <div className="space-y-5 mb-10">
                    <p className={`${labelCapsClass} text-slate-200/90 border-b border-white/15 pb-2`}>Processus automatisés :</p>
                    {workflowCards[selectedCard].details.map((detail, i) => (
                      <motion.div
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className="flex items-start gap-4"
                      >
                        <CheckCircle2 size={22} className="text-[#90d4bf] mt-0.5 shrink-0" />
                        <span className="text-slate-50 font-medium leading-[1.5]">{detail}</span>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    onClick={handleNext}
                    className="w-full py-5 rounded-[4px] bg-[#6B30E5] text-white font-medium text-lg hover:bg-[#5b26c7] hover:scale-[1.02] transition-all shadow-[0_0_22px_rgba(107,48,229,0.35)]"
                  >
                    {workflowCards[selectedCard].cta}
                  </button>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Section */}
      <motion.section
        {...revealUp}
        className="py-40 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24 items-center">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl md:text-6xl font-semibold mb-10 leading-[1.15] text-white tracking-tight">
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
                    className="flex items-center gap-6 p-6 rounded-[12px] bg-white/12 border border-white/20 backdrop-blur-[24px] hover:border-[#90d4bf]/55 transition-all cursor-default shadow-sm"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                      <stat.icon size={32} />
                    </div>
                    <div className="text-left">
                      <p className={`${labelCapsClass} text-slate-200/90`}>{stat.label}</p>
                      <p className="text-2xl md:text-4xl font-semibold text-white leading-none mt-1">{stat.val}</p>
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
                className="relative bg-white/12 border border-white/20 backdrop-blur-[28px] rounded-[12px] p-8 md:p-12 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-12">
                  <div className="space-y-1">
                    <p className={`${labelCapsClass} text-slate-200/90`}>Projection cabinet Dupont</p>
                    <p className="text-3xl md:text-4xl font-semibold text-white">1.2M€ CA</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[#2ED3B7]/10 flex items-center justify-center">
                    <PieChart className="text-[#2ED3B7]" size={28} />
                  </div>
                </div>
                <div className="space-y-6 mb-12">
                  {[85, 60, 95].map((w, i) => (
                    <div key={i} className="space-y-3">
                      <div className={`flex justify-between text-slate-200/90 ${labelCapsClass}`}>
                        <span>Production Auto {i+1}</span>
                        <span>{w}%</span>
                      </div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${w}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                          className="h-full bg-[#90d4bf]"
                        ></motion.div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-8 rounded-[12px] bg-white/10 border border-white/15 italic text-slate-100/90 text-lg leading-[1.6] font-medium">
                  "ALXOR OS agit comme un <span className="text-white font-semibold">collaborateur silencieux</span>. Notre capacité de production a littéralement doublé."
                  <div className="mt-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 border-4 border-white shadow-sm"></div>
                    <div>
                      <p className="text-base font-semibold text-white">Marc L.</p>
                      <p className={`${labelCapsClass} text-slate-200/85`}>Gérant Assur-Pro</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        {...revealUp}
        className="py-40"
      >
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto px-4 md:px-6"
        >
          <div className="bg-white/12 border border-white/20 backdrop-blur-[26px] rounded-[12px] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(107,48,229,0.35)]">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-[#6B30E5]/20 rounded-full blur-3xl"></div>
            <h2 className="text-4xl md:text-7xl font-semibold mb-10 relative z-10 tracking-tight leading-[1.15]">Capacité Doublée. <br/>Dès aujourd'hui.</h2>
            <p className="text-xl md:text-2xl mb-14 opacity-95 max-w-3xl mx-auto relative z-10 font-medium">
              Découvrez la puissance d'un OS métier conçu pour la croissance de votre cabinet de proximité.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
              <button 
                onClick={() => { login(); navigate('/dashboard'); }}
                className="w-full sm:w-auto px-12 py-6 rounded-[4px] bg-[#0F5B4B] text-white text-xl font-medium hover:bg-[#126d59] hover:scale-105 transition-all shadow-2xl shadow-[#90d4bf]/30"
              >
                Planifier une démo personnalisée
              </button>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        id="contact-section"
        {...revealUp}
        className="py-40 border-t border-white/10 bg-[#141230]"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-16 mb-20 text-slate-100/90">
            <div className="col-span-1 sm:col-span-2 md:col-span-1">
              <div className="flex items-center mb-8">
                <Logo className="h-10 w-auto" />
              </div>
              <p className="text-slate-200/90 text-base leading-[1.6] font-medium">
                Le collaborateur virtuel des courtiers de proximité. Augmentez votre productivité sans recruter.
              </p>
            </div>
            <div>
              <h4 className={`${labelCapsClass} text-white mb-8`}>Produit</h4>
              <ul className="space-y-5 text-base font-bold">
                <li><a href="#" className="hover:text-[#90d4bf] transition-colors">Automatisation IA</a></li>
                <li><a href="#" className="hover:text-[#90d4bf] transition-colors">Signature Yousign</a></li>
                <li><Link to="/client" className="hover:text-[#90d4bf] transition-colors">Portail Client</Link></li>
                <li><a href="#" className="hover:text-[#90d4bf] transition-colors">Dashboard métier</a></li>
              </ul>
            </div>
            <div>
              <h4 className={`${labelCapsClass} text-white mb-8`}>Compagnie</h4>
              <ul className="space-y-5 text-base font-bold">
                <li><a href="#" className="hover:text-[#90d4bf] transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-[#90d4bf] transition-colors">Tarifs</a></li>
                <li><a href="#" className="hover:text-[#90d4bf] transition-colors">Sécurité Cloud</a></li>
                <li><a href="#" className="hover:text-[#90d4bf] transition-colors">Partenaires</a></li>
              </ul>
            </div>
            <div>
              <h4 className={`${labelCapsClass} text-white mb-8`}>Légal</h4>
              <ul className="space-y-5 text-base font-bold">
                <li><a href="#" className="hover:text-[#90d4bf] transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-[#90d4bf] transition-colors">Mentions</a></li>
                <li><a href="#" className="hover:text-[#90d4bf] transition-colors">RGPD / ACPR</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-12 border-t border-white/10">
            <p className={`${labelCapsClass} text-slate-200/85`}>© 2026 Alxor Labs. Production Augmentée.</p>
            <div className="flex gap-8">
              <Zap size={20} className="text-slate-300 hover:text-[#90d4bf] transition-colors cursor-pointer" />
              <Zap size={20} className="text-slate-300 hover:text-[#90d4bf] transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default LandingPage;

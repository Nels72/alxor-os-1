import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import {
  FileWarning,
  ClipboardList,
  ShieldAlert,
  Plus,
  Download,
  FileText,
  X,
  CheckCircle,
} from 'lucide-react';
import { useStore } from '../store';
import { Reclamation } from '../types';

const DELAI_ACPR_JOURS = 60;
const DELAI_AR_JOURS = 10;

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / 86400000);
}

function joursRestants(dateReception: string): number {
  return DELAI_ACPR_JOURS - daysSince(dateReception);
}

/** Couleur de l’arc Indice de Sérénité : vert ≥80%, orange 50–79%, rouge <50% */
function getIndiceSereniteColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

const Conformite: React.FC = () => {
  const prospects = useStore((s) => s.prospects);
  const clients = useStore((s) => s.clients);
  const clientNotes = useStore((s) => s.clientNotes);
  const reclamations = useStore((s) => s.reclamations);
  const addReclamation = useStore((s) => s.addReclamation);
  const updateReclamation = useStore((s) => s.updateReclamation);

  const [modalReclamation, setModalReclamation] = useState(false);
  const [formReclamation, setFormReclamation] = useState({ client_nom: '', objet: '' });
  const [arGenereId, setArGenereId] = useState<string | null>(null);

  const ddaAlerts = useMemo(() => {
    const alerts: { id: string; type: 'prospect' | 'client'; nom: string; libelle: string; critique: boolean }[] = [];
    prospects.forEach((p) => {
      if (p.statut === 'converti') return;
      const inPhase3 = !!(p.contrat_definitif_signe || p.contrat_definitif_envoye);
      if (!p.fiche_conseil_generee) {
        alerts.push({ id: p.id, type: 'prospect', nom: `${p.prenom} ${p.nom}`, libelle: 'FIC manquante', critique: inPhase3 });
      }
      if (p.periode_incomplete_ri) {
        alerts.push({ id: p.id, type: 'prospect', nom: `${p.prenom} ${p.nom}`, libelle: 'Période RI incomplète', critique: inPhase3 });
      }
    });
    clients.forEach((c) => {
      const nom = c.type === 'PRO' ? (c.raison_sociale || `${c.prenom} ${c.nom}`) : `${c.prenom} ${c.nom}`;
      if (!(clientNotes[c.id]?.trim())) {
        alerts.push({ id: c.id, type: 'client', nom, libelle: 'Notes Courtier non saisies', critique: false });
      }
    });
    return alerts;
  }, [prospects, clients, clientNotes]);

  const alertesCritiquesCount = useMemo(() => ddaAlerts.filter((a) => a.critique).length, [ddaAlerts]);

  const reclamationsNonConformes = useMemo(() => reclamations.filter((r) => {
    const j = daysSince(r.date_reception);
    return (r.statut === 'ar_a_envoyer' && j >= DELAI_AR_JOURS) || (j > 45 && r.statut !== 'reponse_envoyee');
  }).length, [reclamations]);

  const totalPilotage = useMemo(() => {
    const dossiers = prospects.filter((p) => p.statut !== 'converti').length + clients.length;
    return dossiers + reclamations.length;
  }, [prospects, clients, reclamations]);
  const conformesPilotage = useMemo(() => {
    const dossiers = prospects.filter((p) => p.statut !== 'converti').length + clients.length;
    const dossiersConformes = Math.max(0, dossiers - ddaAlerts.length);
    const recConformes = reclamations.length - reclamationsNonConformes;
    return dossiersConformes + recConformes;
  }, [prospects, clients, ddaAlerts.length, reclamations.length, reclamationsNonConformes]);
  const indiceSerenite = totalPilotage > 0 ? Math.round((conformesPilotage / totalPilotage) * 100) : 100;

  const provisoiresList = useMemo(() => {
    const out: { id: string; libelle: string; date_echeance: string; prospect_nom: string }[] = [];
    prospects.forEach((p) => {
      const prov = p.documents_provisoires;
      if (!prov) return;
      Object.entries(prov).forEach(([type, { date_echeance }]) => {
        const libelle = type === 'carte_grise' ? 'Carte grise (CPI)' : type === 'permis_conduire' ? 'Permis provisoire' : type;
        out.push({ id: `${p.id}-${type}`, libelle, date_echeance, prospect_nom: `${p.prenom} ${p.nom}` });
      });
    });
    return out.sort((a, b) => a.date_echeance.localeCompare(b.date_echeance));
  }, [prospects]);

  const handleDeclarerReclamation = () => {
    if (!formReclamation.client_nom.trim() || !formReclamation.objet.trim()) return;
    addReclamation({
      date_reception: new Date().toISOString().split('T')[0],
      client_id: 'inconnu',
      client_nom: formReclamation.client_nom.trim(),
      objet: formReclamation.objet.trim(),
      statut: 'ar_a_envoyer',
    });
    setFormReclamation({ client_nom: '', objet: '' });
    setModalReclamation(false);
  };

  const genererARConforme = (r: Reclamation) => {
    const texte = `Accusé de réception de réclamation
Référence : ${r.id}
Client : ${r.client_nom}
Objet : ${r.objet}
Date de réception : ${r.date_reception}

Conformément à la norme ACPR, nous accusons réception de votre réclamation et nous nous engageons à vous apporter une réponse dans le délai légal de 60 jours à compter de la date de réception.

Cabinet ALXOR OS - Conformité DDA & ACPR`;
    navigator.clipboard.writeText(texte);
    setArGenereId(r.id);
    setTimeout(() => setArGenereId(null), 2000);
  };

  const exporterRegistre = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const header = 'Date Réception;Client;Objet;Statut;Jours restants\n';
      const rows = reclamations.map((r) => `${r.date_reception};${r.client_nom};${r.objet};${r.statut};${joursRestants(r.date_reception)}`).join('\n');
      const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registre-reclamations-acpr-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('Export PDF : simulation. Intégrer une librairie (ex. jsPDF) pour génération réelle.');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900">
        <div className="p-6 md:p-10 max-w-[1800px] mx-auto space-y-8">
          <header>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Dashboard de Conformité</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">DDA & ACPR</p>
          </header>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[200px] hover:shadow-md transition-shadow overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: '#9CA3AF', fontFamily: 'Open Sans, sans-serif' }}>Indice de Sérénité du Cabinet</p>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative w-32 h-20">
                  <svg viewBox="0 0 120 80" className="w-full h-full">
                    <path d="M 10 70 A 50 50 0 0 1 110 70" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
                    <motion.path
                      d="M 10 70 A 50 50 0 0 1 110 70"
                      fill="none"
                      stroke={getIndiceSereniteColor(indiceSerenite)}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray="157"
                      initial={{ strokeDashoffset: 157 }}
                      animate={{ strokeDashoffset: 157 - (indiceSerenite / 100) * 157 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </svg>
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-2xl font-black text-slate-900">{indiceSerenite}%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">{conformesPilotage}/{totalPilotage} conformes</p>
              </div>
            </div>
            <div className="kpi-card-alertes bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[200px] hover:shadow-md transition-shadow overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: '#9CA3AF', fontFamily: 'Open Sans, sans-serif' }}>Alertes DDA Critiques</p>
              <div className="flex-1 flex items-center justify-center">
                <motion.span key={alertesCritiquesCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-4xl font-black text-red-500">
                  {alertesCritiquesCount}
                </motion.span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 shrink-0">Phase 3 avec non-conformité</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[200px] hover:shadow-md transition-shadow overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: '#9CA3AF', fontFamily: 'Open Sans, sans-serif' }}>Statut Formation Continue</p>
              <div className="flex-1 flex items-center justify-center">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-[#10B981] border border-green-100 text-sm font-bold">
                  <CheckCircle size={16} /> Certification 15h : Conforme
                </span>
              </div>
            </div>
          </div>

          {/* 3 colonnes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Section A : Audit DDA */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50/50">
                <ShieldAlert size={20} className="text-amber-500" />
                <h2 className="font-black text-slate-900 text-sm uppercase tracking-wider">Audit Devoir de Conseil (DDA)</h2>
              </div>
              <div className="scrollbar-conformite-v p-4 max-h-[400px] overflow-y-auto space-y-2">
                {ddaAlerts.length === 0 ? (
                  <p className="text-slate-500 text-sm font-medium py-4">Aucune alerte DDA.</p>
                ) : (
                  ddaAlerts.map((a) => (
                    <div key={`${a.type}-${a.id}`} className={`p-3 rounded-xl border ${a.critique ? 'bg-red-50 border-red-200' : 'bg-slate-50/50 border-slate-200'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{a.nom}</p>
                          <p className="text-xs text-slate-500">{a.libelle}</p>
                        </div>
                        {a.critique && (
                          <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-black bg-red-50 text-red-600 border border-red-200">🔴 Critique</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section B : Registre Réclamations ACPR */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <ClipboardList size={20} className="text-[#4F7CFF]" />
                  <h2 className="font-black text-slate-900 text-sm uppercase tracking-wider">Registre des Réclamations (ACPR)</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => exporterRegistre('csv')} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors">
                    <Download size={14} /> CSV
                  </button>
                  <button onClick={() => exporterRegistre('pdf')} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors">
                    <Download size={14} /> PDF
                  </button>
                  <button onClick={() => setModalReclamation(true)} className="px-3 py-1.5 rounded-lg bg-[#4F7CFF] text-white hover:bg-blue-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-sm">
                    <Plus size={14} /> Déclarer une réclamation
                  </button>
                </div>
              </div>
              <div className="scrollbar-conformite-h overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase font-black tracking-widest border-b border-slate-200 bg-slate-50/50">
                      <th className="px-4 py-3">Date Réception</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Objet</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Délai restant</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reclamations.map((r) => {
                      const j = daysSince(r.date_reception);
                      const restants = joursRestants(r.date_reception);
                      const besoinAR = r.statut === 'ar_a_envoyer' && j < DELAI_AR_JOURS;
                      const urgenceReponse = j > 45 && r.statut !== 'reponse_envoyee';
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-700">{r.date_reception}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{r.client_nom}</td>
                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{r.objet}</td>
                          <td className="px-4 py-3">
                            <select
                              value={r.statut}
                              onChange={(e) => updateReclamation(r.id, { statut: e.target.value as Reclamation['statut'] })}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 focus:ring-2 focus:ring-[#4F7CFF]/30 focus:border-[#4F7CFF] outline-none"
                            >
                              <option value="ar_a_envoyer">AR à envoyer</option>
                              <option value="en_cours">En cours</option>
                              <option value="reponse_envoyee">Réponse envoyée</option>
                            </select>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {besoinAR && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">🟡 Accusé de réception à envoyer</span>
                              )}
                              {urgenceReponse && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">🔴 Réponse finale urgente</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={restants <= 0 ? 'text-red-600 font-bold' : restants <= 15 ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                              {restants > 0 ? `${restants} j` : `+${-restants} j`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => genererARConforme(r)} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold flex items-center gap-1 ml-auto transition-colors">
                              {arGenereId === r.id ? <CheckCircle size={12} className="text-[#10B981]" /> : <FileText size={12} />}
                              {arGenereId === r.id ? 'Copié' : 'Générer AR Conforme'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section C : Vigilance Pièces & Provisoires */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50/50">
              <FileWarning size={20} className="text-amber-500" />
              <h2 className="font-black text-slate-900 text-sm uppercase tracking-wider">Vigilance Pièces & Provisoires</h2>
            </div>
            <div className="p-4 max-h-[280px] overflow-y-auto">
              {provisoiresList.length === 0 ? (
                <p className="text-slate-500 text-sm font-medium py-4">Aucun document provisoire en cours</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase font-black tracking-widest border-b border-slate-200">
                      <th className="py-2 text-left">Type / Dossier</th>
                      <th className="py-2 text-right">Échéance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {provisoiresList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3">
                          <p className="font-medium text-slate-800">{item.libelle}</p>
                          <p className="text-xs text-slate-500">{item.prospect_nom}</p>
                        </td>
                        <td className="py-3 text-right font-mono text-slate-600">{item.date_echeance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modale Déclarer une réclamation */}
      <AnimatePresence>
        {modalReclamation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setModalReclamation(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-900">Déclarer une réclamation</h3>
                <button onClick={() => setModalReclamation(false)} className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Client</label>
                  <input type="text" value={formReclamation.client_nom} onChange={(e) => setFormReclamation((f) => ({ ...f, client_nom: e.target.value }))} placeholder="Nom du client" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#4F7CFF]/30 focus:border-[#4F7CFF]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Objet</label>
                  <input type="text" value={formReclamation.objet} onChange={(e) => setFormReclamation((f) => ({ ...f, objet: e.target.value }))} placeholder="Objet de la réclamation" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#4F7CFF]/30 focus:border-[#4F7CFF]" />
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <button onClick={() => setModalReclamation(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Annuler</button>
                <button onClick={handleDeclarerReclamation} className="px-4 py-2 rounded-xl bg-[#4F7CFF] text-white font-bold text-sm hover:bg-blue-600 transition-colors shadow-sm">Enregistrer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Conformite;

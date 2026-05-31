import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X, Copy, Check, ExternalLink, User, Car, ShieldCheck,
  FileText, AlertTriangle, Calendar, CreditCard, Hash, MapPin,
  Phone, Mail, Printer
} from 'lucide-react';
import type { Prospect, AISuggestion } from '../types';

interface FicheTarificationProps {
  prospect: Prospect;
  suggestion: AISuggestion;
  onClose: () => void;
  extranets?: { nom: string; url: string }[];
}

interface BlockData {
  label: string;
  value: string | number | undefined;
  icon?: React.ReactNode;
  highlight?: boolean;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1.5 rounded-lg hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-600"
      title="Copier"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  );
};

const InfoRow: React.FC<{ label: string; value: string | number | undefined | null; copiable?: boolean; highlight?: boolean }> = ({ label, value, copiable = true, highlight = false }) => {
  const displayValue = value ?? '—';
  const strValue = String(displayValue);
  return (
    <div className={`flex items-center justify-between py-2.5 px-4 rounded-xl ${highlight ? 'bg-orange-50 border border-orange-100' : 'hover:bg-slate-50'} transition-all`}>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold ${highlight ? 'text-orange-600' : value ? 'text-slate-900' : 'text-slate-300'}`}>{strValue}</span>
        {copiable && value && <CopyButton text={strValue} />}
      </div>
    </div>
  );
};

const FicheTarification: React.FC<FicheTarificationProps> = ({ prospect, suggestion, onClose, extranets }) => {
  const ficheRef = useRef<HTMLDivElement>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const dossierFields = prospect.airtable_dossier_fields || {};
  const typeContrat = (prospect.type_contrat_demande || 'auto').toLowerCase();
  const isAuto = /auto|véhicule|vehicule|automobile|flotte|moto/i.test(typeContrat);
  const isPro = /mrp|rc_pro|pro|multirisque/i.test(typeContrat);

  const souscripteur: BlockData[] = [
    { label: 'Nom', value: prospect.nom },
    { label: 'Prénom', value: prospect.prenom },
    { label: 'Email', value: prospect.email },
    { label: 'Téléphone', value: prospect.telephone },
    { label: 'Adresse', value: prospect.adresse },
  ];

  const vehicule: BlockData[] = isAuto ? [
    { label: 'Immatriculation', value: dossierFields.Immatriculation_Véhicule as string },
    { label: 'Date Permis', value: dossierFields.Date_Permis_De_Conduire as string },
  ] : [];

  const antecedents: BlockData[] = isAuto ? [
    { label: 'Compagnie Précédente', value: dossierFields.RI_Compagnie_Précédente as string },
    { label: 'Bonus/Malus', value: dossierFields.RI_Bonus_Malus as number, highlight: (dossierFields.RI_Bonus_Malus as number) > 1 },
    { label: 'Nb Sinistres', value: dossierFields.RI_Nb_Sinistres as number, highlight: (dossierFields.RI_Nb_Sinistres as number) > 0 },
    { label: 'Type Sinistres', value: dossierFields.Type_Sinistres as string },
    { label: 'Résilié', value: (dossierFields['RI_Résilié'] as boolean) ? 'OUI' : 'NON', highlight: dossierFields['RI_Résilié'] as boolean },
    { label: 'Motif Résiliation', value: dossierFields.Motif_Resiliation_RI as string },
  ] : [];

  const offreSelectionnee: BlockData[] = [
    { label: 'Compagnie', value: suggestion.compagnie },
    { label: 'Score Matching', value: `${suggestion.score}%` },
    { label: 'Prime Estimée', value: `${suggestion.tarif_estime}€ TTC/an` },
    { label: 'Franchise', value: suggestion.franchise },
    { label: 'Garanties', value: suggestion.garanties },
  ];

  const handleCopyAll = () => {
    const lines = [
      `=== FICHE TARIFICATION — ${suggestion.compagnie} ===`,
      `Date: ${new Date().toLocaleDateString('fr-FR')}`,
      '',
      '--- SOUSCRIPTEUR ---',
      ...souscripteur.map(b => `${b.label}: ${b.value || '—'}`),
    ];
    if (vehicule.length > 0) {
      lines.push('', '--- VÉHICULE / PERMIS ---', ...vehicule.map(b => `${b.label}: ${b.value || '—'}`));
    }
    if (antecedents.length > 0) {
      lines.push('', '--- ANTÉCÉDENTS ---', ...antecedents.map(b => `${b.label}: ${b.value || '—'}`));
    }
    lines.push('', '--- OFFRE SÉLECTIONNÉE ---', ...offreSelectionnee.map(b => `${b.label}: ${b.value || '—'}`));
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handlePrint = () => {
    const printContent = ficheRef.current;
    if (!printContent) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Fiche Tarification - ${prospect.nom} ${prospect.prenom}</title>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #64748b; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 2px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
        .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
        .value { font-size: 13px; font-weight: 700; }
        .highlight { color: #ea580c; }
        .header { border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 24px; }
        .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
      </style></head><body>
      <div class="header">
        <h1>Fiche Tarification — ${suggestion.compagnie}</h1>
        <p style="color:#64748b;font-size:12px">${prospect.prenom} ${prospect.nom} • ${prospect.type_contrat_demande?.toUpperCase()} • ${new Date().toLocaleDateString('fr-FR')}</p>
      </div>
      <h2>Souscripteur</h2>
      ${souscripteur.map(b => `<div class="row"><span class="label">${b.label}</span><span class="value">${b.value || '—'}</span></div>`).join('')}
      ${vehicule.length > 0 ? `<h2>Véhicule / Permis</h2>${vehicule.map(b => `<div class="row"><span class="label">${b.label}</span><span class="value">${b.value || '—'}</span></div>`).join('')}` : ''}
      ${antecedents.length > 0 ? `<h2>Antécédents Assurance</h2>${antecedents.map(b => `<div class="row"><span class="label">${b.label}</span><span class="value ${b.highlight ? 'highlight' : ''}">${b.value || '—'}</span></div>`).join('')}` : ''}
      <h2>Offre Sélectionnée</h2>
      ${offreSelectionnee.map(b => `<div class="row"><span class="label">${b.label}</span><span class="value">${b.value || '—'}</span></div>`).join('')}
      <div class="footer">Alxor OS — Fiche tarification générée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const defaultExtranets = extranets || [
    { nom: 'ALLIANZ', url: 'https://www.allianz.fr/espace-pro' },
    { nom: 'AXA', url: 'https://www.axa.fr/pro/espace-courtier' },
    { nom: 'THELEM', url: 'https://www.thelem-assurances.fr/espace-courtier' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 text-white rounded-2xl"><FileText size={24} /></div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900">Fiche Tarification</h3>
              <p className="text-sm text-slate-400 font-bold">{suggestion.compagnie} — {prospect.prenom} {prospect.nom}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopyAll} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${copiedAll ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'}`}>
              {copiedAll ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier tout</>}
            </button>
            <button onClick={handlePrint} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Printer size={14} /> Imprimer
            </button>
            <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-all"><X size={24} /></button>
          </div>
        </div>

        {/* Content */}
        <div ref={ficheRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Liens extranet */}
          <div className="flex flex-wrap gap-2">
            {defaultExtranets.map(ext => (
              <a
                key={ext.nom}
                href={ext.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${
                  ext.nom.toUpperCase() === suggestion.compagnie.toUpperCase()
                    ? 'bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-100'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                <ExternalLink size={12} /> {ext.nom}
              </a>
            ))}
          </div>

          {/* Bloc Souscripteur */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><User size={14} className="text-blue-500" /> Souscripteur</h4>
            <div className="space-y-1">
              {souscripteur.map(b => <InfoRow key={b.label} label={b.label} value={b.value} />)}
            </div>
          </div>

          {/* Bloc Véhicule / Permis (auto uniquement) */}
          {vehicule.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Car size={14} className="text-blue-500" /> Véhicule / Permis</h4>
              <div className="space-y-1">
                {vehicule.map(b => <InfoRow key={b.label} label={b.label} value={b.value} highlight={!b.value} />)}
              </div>
            </div>
          )}

          {/* Bloc Antécédents (auto uniquement) */}
          {antecedents.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><AlertTriangle size={14} className="text-orange-500" /> Antécédents Assurance</h4>
              <div className="space-y-1">
                {antecedents.map(b => <InfoRow key={b.label} label={b.label} value={b.value} highlight={b.highlight} />)}
              </div>
            </div>
          )}

          {/* Bloc Offre */}
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5">
            <h4 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><ShieldCheck size={14} /> Offre Sélectionnée</h4>
            <div className="space-y-1">
              {offreSelectionnee.map(b => <InfoRow key={b.label} label={b.label} value={b.value} />)}
            </div>
          </div>

          {/* Note expertise courtier */}
          {suggestion.note_expertise_courtier && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Note d&apos;expertise courtier</h4>
              <p className="text-sm text-slate-700 font-medium">{suggestion.note_expertise_courtier}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FicheTarification;

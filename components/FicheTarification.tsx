import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X, Copy, Check, ExternalLink, User, Car, ShieldCheck,
  FileText, AlertTriangle, Calendar, CreditCard, Hash, MapPin,
  Phone, Mail, Printer
} from 'lucide-react';
import type { Prospect, AISuggestion } from '../types';
import { calcAge, calcAnciennetePermis, isVehiculeProduct, type AutoProductData } from '../lib/prospectProductData';
import { useStore } from '../store';

/** Formate une ancienneté en mois → "X ans Y mois" */
function formatAnciennete(mois: number | null | undefined): string | undefined {
  if (mois === null || mois === undefined) return undefined;
  const ans = Math.floor(mois / 12);
  const reste = mois % 12;
  if (ans === 0) return `${reste} mois`;
  if (reste === 0) return `${ans} an${ans > 1 ? 's' : ''}`;
  return `${ans} an${ans > 1 ? 's' : ''} ${reste} mois`;
}

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
  const vehiculeRules = useStore((s) => s.vehiculeRules);

  const dossierFields = prospect.airtable_dossier_fields || {};
  const typeContrat = (prospect.type_contrat_demande || 'auto').toLowerCase();
  const isAuto = isVehiculeProduct(prospect.type_contrat_demande || 'auto')
    || /auto|véhicule|vehicule|automobile|flotte|moto/i.test(typeContrat);

  // Données tarifantes structurées (préférées) avec fallback champs Airtable bruts
  const pd: Partial<AutoProductData> =
    prospect.product_data?.type === 'vehicule' ? prospect.product_data : {};

  const ageConducteur = calcAge(prospect.date_naissance);
  const anciennetePermisMois =
    pd.anciennete_permis_mois ?? calcAnciennetePermis((pd.date_permis as string) ?? (dossierFields.Date_Permis_De_Conduire as string));

  const bonusMalus = pd.bonus_malus ?? (dossierFields.RI_Bonus_Malus as number | undefined);
  const nbSinistres = pd.nb_sinistres_36m ?? (dossierFields.RI_Nb_Sinistres as number | undefined);
  const resilie = pd.resilie ?? (dossierFields['RI_Résilié'] as boolean | undefined);

  const souscripteur: BlockData[] = [
    { label: 'Nom', value: prospect.nom },
    { label: 'Prénom', value: prospect.prenom },
    { label: 'Date de Naissance', value: prospect.date_naissance },
    { label: 'Âge', value: ageConducteur !== null ? `${ageConducteur} ans` : undefined },
    { label: 'Email', value: prospect.email },
    { label: 'Téléphone', value: prospect.telephone },
    { label: 'Adresse', value: prospect.adresse },
  ];

  // Helpers de formatage (sinistres + dates)
  const prettyNature = (n?: string | null): string => {
    if (!n) return '—';
    const map: Record<string, string> = {
      responsable: 'Responsable',
      non_responsable: 'Non responsable',
      partielle: 'Responsabilité partagée',
    };
    return map[n.toLowerCase()] || n;
  };
  const prettyType = (t?: string | null): string => {
    if (!t) return '—';
    const map: Record<string, string> = {
      corporel: 'Corporel',
      materiel: 'Matériel',
      bris_de_glace: 'Bris de glace',
      vol: 'Vol',
      autre: 'Autre',
    };
    return map[t.toLowerCase()] || t;
  };
  const fmtSinistreDate = (d?: string | null): string => {
    if (!d) return '—';
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
  };

  const vehicule: BlockData[] = isAuto ? [
    { label: 'Immatriculation', value: (pd.immatriculation as string) ?? (dossierFields.Immatriculation_Véhicule as string) },
    { label: 'Marque', value: pd.vehicule_marque as string },
    { label: 'Modèle', value: pd.vehicule_modele as string },
    { label: 'Usage', value: pd.vehicule_usage as string },
    { label: 'Énergie', value: pd.vehicule_energie as string },
    { label: 'Date Permis', value: (pd.date_permis as string) ?? (dossierFields.Date_Permis_De_Conduire as string) },
    { label: 'Ancienneté Permis', value: formatAnciennete(anciennetePermisMois) },
  ] : [];

  const antecedents: BlockData[] = isAuto ? [
    { label: 'Compagnie Précédente', value: (pd.compagnie_precedente as string) ?? (dossierFields.RI_Compagnie_Précédente as string) },
    { label: "Date d'effet", value: ((pd.date_effet_contrat as string) ?? (dossierFields.Date_Effet_Contrat_RI as string)) ? fmtSinistreDate((pd.date_effet_contrat as string) ?? (dossierFields.Date_Effet_Contrat_RI as string)) : undefined },
    { label: "Date d'échéance", value: pd.bm_date_echeance ? fmtSinistreDate(pd.bm_date_echeance as string) : undefined },
    { label: "Mois d'assurance", value: pd.nb_mois != null ? formatAnciennete(pd.nb_mois) : undefined },
    { label: 'Bonus/Malus', value: bonusMalus, highlight: (bonusMalus ?? 0) > 1 },
    { label: 'Nb Sinistres 36m', value: nbSinistres, highlight: (nbSinistres ?? 0) > 0 },
    { label: 'Coefficient Nb Mois', value: (pd.bm_nb_annees_050 as number) ?? (dossierFields.bm_nb_annees_050 as number) },
    { label: 'Résilié', value: resilie ? 'OUI' : 'NON', highlight: !!resilie },
    { label: 'Motif Résiliation', value: (pd.motif_resiliation as string) ?? (dossierFields.Motif_Resiliation_RI as string) },
  ] : [];

  // Sinistres détaillés (nature + responsabilité)
  const sinistres = (isAuto && Array.isArray(pd.sinistres)) ? pd.sinistres : [];

  const formule: BlockData[] = isAuto ? [
    { label: 'Formule Souhaitée', value: pd.formule_souhaitee, highlight: true },
    ...(pd.conducteur_secondaire
      ? [
          { label: 'Conducteur Secondaire', value: 'Oui' },
          ...(pd.nom_conducteur_secondaire || pd.prenom_conducteur_secondaire
            ? [{ label: 'CDR Sec. — Nom/Prénom', value: `${pd.prenom_conducteur_secondaire || ''} ${pd.nom_conducteur_secondaire || ''}`.trim() }]
            : []),
          ...(pd.date_naissance_conducteur_secondaire
            ? [{ label: 'CDR Sec. — Naissance', value: fmtSinistreDate(pd.date_naissance_conducteur_secondaire) }]
            : []),
          ...(pd.date_permis_conducteur_secondaire
            ? [{ label: 'CDR Sec. — Date permis', value: fmtSinistreDate(pd.date_permis_conducteur_secondaire) }]
            : []),
        ]
      : []),
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
      lines.push('', '--- ANTÉCÉDENTS ---', ...antecedents.map(b => `${b.label}: ${b.value ?? '—'}`));
    }
    if (sinistres.length > 0) {
      lines.push('', '--- DÉTAIL SINISTRES ---', ...sinistres.map(s => `${fmtSinistreDate(s.date)} · ${prettyNature(s.nature)} · ${prettyType(s.type)}`));
    }
    if (formule.length > 0) {
      lines.push('', '--- FORMULE SOUHAITÉE ---', ...formule.map(b => `${b.label}: ${b.value ?? '—'}`));
    }
    lines.push('', '--- OFFRE SÉLECTIONNÉE ---', ...offreSelectionnee.map(b => `${b.label}: ${b.value ?? '—'}`));
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
      ${antecedents.length > 0 ? `<h2>Antécédents Assurance</h2>${antecedents.map(b => `<div class="row"><span class="label">${b.label}</span><span class="value ${b.highlight ? 'highlight' : ''}">${b.value ?? '—'}</span></div>`).join('')}` : ''}
      ${sinistres.length > 0 ? `<h2>Détail Sinistres</h2>${sinistres.map(s => `<div class="row"><span class="label">${fmtSinistreDate(s.date)}</span><span class="value">${prettyNature(s.nature)} — ${prettyType(s.type)}</span></div>`).join('')}` : ''}
      ${formule.length > 0 ? `<h2>Formule Souhaitée</h2>${formule.map(b => `<div class="row"><span class="label">${b.label}</span><span class="value">${b.value ?? '—'}</span></div>`).join('')}` : ''}
      <h2>Offre Sélectionnée</h2>
      ${offreSelectionnee.map(b => `<div class="row"><span class="label">${b.label}</span><span class="value">${b.value || '—'}</span></div>`).join('')}
      <div class="footer">Alxor OS — Fiche tarification générée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  // Liens extranet : ceux fournis par le parent (compagnies éligibles du matching),
  // sinon dérivés dynamiquement de la base de connaissance véhicule.
  const defaultExtranets = extranets || (
    isAuto
      ? vehiculeRules.map(c => ({ nom: c.compagnie, url: c.extranet_url }))
      : []
  );

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
                {vehicule.map(b => <InfoRow key={b.label} label={b.label} value={b.value} />)}
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

              {/* Détail des sinistres : nature + responsabilité */}
              {sinistres.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Détail des sinistres</p>
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Responsabilité</th>
                          <th className="px-3 py-2">Nature</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sinistres.map((s, i) => (
                          <tr key={i} className="border-t border-slate-100 text-xs">
                            <td className="px-3 py-2 font-bold text-slate-700">{fmtSinistreDate(s.date)}</td>
                            <td className={`px-3 py-2 font-bold ${(s.nature || '').toLowerCase() === 'responsable' ? 'text-red-600' : (s.nature || '').toLowerCase() === 'partielle' ? 'text-orange-600' : 'text-slate-700'}`}>{prettyNature(s.nature)}</td>
                            <td className="px-3 py-2 font-medium text-slate-600">{prettyType(s.type)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bloc Formule souhaitée (auto uniquement) */}
          {formule.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><ShieldCheck size={14} className="text-blue-500" /> Formule Souhaitée</h4>
              <div className="space-y-1">
                {formule.map(b => <InfoRow key={b.label} label={b.label} value={b.value} highlight={b.highlight} />)}
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

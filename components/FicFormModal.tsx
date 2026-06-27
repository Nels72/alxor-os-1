import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X, Eye, Download, Upload, FileText, Check, Send, Printer,
  ShieldCheck, AlertTriangle, Euro, Loader2,
} from 'lucide-react';
import type { Prospect, AISuggestion } from '../types';
import type { DevisExtrait, FicBrouillon } from '../services/devisExtraction';
import {
  buildFicData,
  FIC_TITLES,
  type FicData,
} from '../lib/ficTemplates';
import {
  generateFicPdf,
  openFicHtmlPreview,
  downloadFicPdf,
} from '../lib/ficPdfGenerator';

interface FicFormModalProps {
  prospect: Prospect;
  suggestion: AISuggestion;
  devisExtrait: DevisExtrait | null;
  ficBrouillon?: FicBrouillon;
  onClose: () => void;
  onGenerated?: (blob: Blob) => void;
  onValidateAndSign?: (pdfBase64: string, fraisDossier: number, recommandation: string) => Promise<void>;
  onManualSign?: (fraisDossier: number, recommandation: string) => Promise<void>;
}

const FicFormModal: React.FC<FicFormModalProps> = ({
  prospect,
  suggestion,
  devisExtrait,
  ficBrouillon,
  onClose,
  onGenerated,
  onValidateAndSign,
  onManualSign,
}) => {
  const [fraisDossier, setFraisDossier] = useState(ficBrouillon?.frais_dossier_ttc || 0);
  const [recommandation, setRecommandation] = useState(
    ficBrouillon?.recommandation_courtier || suggestion.note_expertise_courtier || suggestion.justification?.join('. ') || ''
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [validated, setValidated] = useState(false);
  const [manualSigned, setManualSigned] = useState(false);

  const ficData = useMemo<FicData>(() => {
    const data = buildFicData(prospect, suggestion, devisExtrait, fraisDossier);
    const merged = { ...data, recommandation } as FicData;

    if (ficBrouillon) {
      if (ficBrouillon.souscripteur?.adresse && !merged.souscripteur.adresse) {
        merged.souscripteur.adresse = ficBrouillon.souscripteur.adresse;
      }
      if (ficBrouillon.souscripteur?.telephone && !merged.souscripteur.telephone) {
        merged.souscripteur.telephone = ficBrouillon.souscripteur.telephone;
      }
      if (ficBrouillon.souscripteur?.email && !merged.souscripteur.email) {
        merged.souscripteur.email = ficBrouillon.souscripteur.email;
      }
      if (ficBrouillon.contrat?.compagnie && !merged.compagnie) {
        merged.compagnie = ficBrouillon.contrat.compagnie;
      }
      if (ficBrouillon.contrat?.formule && !merged.formuleProposee) {
        merged.formuleProposee = ficBrouillon.contrat.formule;
      }
      if (ficBrouillon.contrat?.prime_annuelle_ttc && !merged.primeAnnuelleTTC) {
        merged.primeAnnuelleTTC = ficBrouillon.contrat.prime_annuelle_ttc;
      }
      if (ficBrouillon.garanties?.length && !merged.garanties.length) {
        merged.garanties = ficBrouillon.garanties;
      }
      if (ficBrouillon.options?.length && !merged.options.length) {
        merged.options = ficBrouillon.options;
      }
      if ('type' in merged && merged.type === 'auto' && ficBrouillon.vehicule) {
        const auto = merged as FicData & { vehicule: Record<string, string> };
        if (ficBrouillon.vehicule.marque && !auto.vehicule.marque) auto.vehicule.marque = ficBrouillon.vehicule.marque;
        if (ficBrouillon.vehicule.modele && !auto.vehicule.modele) auto.vehicule.modele = ficBrouillon.vehicule.modele;
        if (ficBrouillon.vehicule.immatriculation && !auto.vehicule.immatriculation) auto.vehicule.immatriculation = ficBrouillon.vehicule.immatriculation;
      }
    }

    return merged;
  }, [prospect, suggestion, devisExtrait, ficBrouillon, fraisDossier, recommandation]);

  const productTitle = FIC_TITLES[ficData.type] || ficData.type.toUpperCase();

  const handlePreview = () => {
    openFicHtmlPreview({ ...ficData, fraisDossierTTC: fraisDossier, recommandation } as FicData);
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await downloadFicPdf({ ...ficData, fraisDossierTTC: fraisDossier, recommandation } as FicData);
      setGenerated(true);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAndArchive = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateFicPdf({ ...ficData, fraisDossierTTC: fraisDossier, recommandation } as FicData);
      setGenerated(true);
      onGenerated?.(blob);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleValidateAndSign = async () => {
    if (!onValidateAndSign) return;
    setIsValidating(true);
    try {
      const blob = await generateFicPdf({ ...ficData, fraisDossierTTC: fraisDossier, recommandation } as FicData);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await onValidateAndSign(base64, fraisDossier, recommandation);
      setValidated(true);
      setGenerated(true);
    } catch (err) {
      console.error('Erreur validation FIC:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleManualSign = async () => {
    if (!onManualSign) return;
    setIsPrinting(true);
    try {
      await downloadFicPdf({ ...ficData, fraisDossierTTC: fraisDossier, recommandation } as FicData);
      await onManualSign(fraisDossier, recommandation);
      setManualSigned(true);
      setGenerated(true);
    } catch (err) {
      console.error('Erreur signature manuscrite:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900">
                Fiche d&apos;Information et de Conseil
              </h3>
              <p className="text-sm text-slate-400 font-bold">
                {productTitle} — {prospect.prenom} {prospect.nom}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Résumé données extraites */}
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5">
            <h4 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <ShieldCheck size={14} /> Données pré-remplies
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ReadOnlyField label="Souscripteur" value={`${prospect.prenom} ${prospect.nom}`} />
              <ReadOnlyField label="Adresse" value={prospect.adresse} />
              <ReadOnlyField label="Téléphone" value={prospect.telephone} />
              <ReadOnlyField label="Email" value={prospect.email} />
              <ReadOnlyField label="Compagnie" value={ficData.compagnie} highlight />
              <ReadOnlyField label="Formule" value={ficData.formuleProposee} />
              <ReadOnlyField label="Prime annuelle TTC" value={`${ficData.primeAnnuelleTTC} €`} highlight />
              {devisExtrait?.dateEffet && (
                <ReadOnlyField label="Date d'effet" value={devisExtrait.dateEffet} />
              )}
            </div>
          </div>

          {/* Garanties extraites */}
          {ficData.garanties.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <ShieldCheck size={14} className="text-blue-500" /> Garanties extraites du devis
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ficData.garanties.map((g, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm ${
                      g.inclus ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    <span>{g.inclus ? '☑' : '☐'}</span>
                    <span className="font-medium">{g.nom}</span>
                    {g.plafond && (
                      <span className="ml-auto text-xs text-slate-500">{g.plafond}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Options extraites */}
          {ficData.options.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                Options
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ficData.options.map((o, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm ${
                      o.inclus ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    <span>{o.inclus ? '☑' : '☐'}</span>
                    <span className="font-medium">{o.nom}</span>
                    {o.supplement && (
                      <span className="ml-auto text-xs text-slate-500">{o.supplement}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Champs éditables */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5">
            <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <AlertTriangle size={14} /> Saisie courtier
            </h4>

            {/* Frais de dossier */}
            <div className="mb-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Frais de dossier TTC (€)
              </label>
              <div className="relative">
                <Euro size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={fraisDossier}
                  onChange={(e) => setFraisDossier(Number(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-orange-200 bg-white text-slate-900 font-bold text-lg focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Total TTC : {ficData.primeAnnuelleTTC + fraisDossier} €
              </p>
            </div>

            {/* Recommandation courtier */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Recommandation du courtier
              </label>
              <textarea
                value={recommandation}
                onChange={(e) => setRecommandation(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                placeholder="Justification du conseil courtier…"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 md:p-8 border-t border-slate-100 bg-white shrink-0 space-y-4">
          {/* Ligne 1 : Aperçu + Générer */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handlePreview}
              className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <Eye size={16} /> Aperçu
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Générer PDF
            </button>
            {onGenerated && (
              <button
                onClick={handleGenerateAndArchive}
                disabled={isGenerating}
                className="px-5 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Générer &amp; Archiver
              </button>
            )}
          </div>

          {/* Ligne 2 : Signature — deux options */}
          {(onValidateAndSign || onManualSign) && !validated && !manualSigned && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Signature :</span>
              {onValidateAndSign && (
                <button
                  onClick={handleValidateAndSign}
                  disabled={isValidating || isGenerating || isPrinting}
                  className="px-5 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isValidating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Signature électronique
                </button>
              )}
              {onManualSign && (
                <button
                  onClick={handleManualSign}
                  disabled={isPrinting || isValidating || isGenerating}
                  className="px-5 py-3 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                  Imprimer &amp; Signature manuscrite
                </button>
              )}
            </div>
          )}

          {/* Indicateurs de statut */}
          {validated && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold pt-2">
              <Check size={16} /> FIC validée — Signature électronique en cours
            </div>
          )}
          {manualSigned && (
            <div className="flex items-center gap-2 text-amber-600 text-sm font-bold pt-2">
              <Check size={16} /> FIC téléchargée — Signature manuscrite validée
            </div>
          )}
          {generated && !validated && !manualSigned && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
              <Check size={16} /> FIC générée
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ============================
// Sous-composant champ lecture seule
// ============================

const ReadOnlyField: React.FC<{
  label: string;
  value: string | number | undefined | null;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <div className={`py-2 px-3 rounded-xl ${highlight ? 'bg-green-100' : 'bg-white'}`}>
    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
      {label}
    </span>
    <span className={`text-sm font-bold ${highlight ? 'text-green-700' : value ? 'text-slate-900' : 'text-slate-300'}`}>
      {value ?? '—'}
    </span>
  </div>
);

export default FicFormModal;

/**
 * Pipeline de production — dérivation des étapes, priorités et alertes
 * à partir des champs bruts Airtable du Dossier (Prospect.airtable_dossier_fields).
 *
 * Modèle validé 2026-06-12 :
 *   À traiter → En étude → Signature (4 sous-états) → À régulariser → sortie (client)
 *   + Sans suite (Suspendu / Résilié / Refusé / Expiré)
 */

import { Prospect, PriorityLevel } from '../types';

// ---------------------------------------------------------------------------
// SLA et seuils (heures / jours) — décisions cabinet 2026-06-12
// ---------------------------------------------------------------------------

/** Premier contact d'un nouveau lead */
export const SLA_PREMIER_CONTACT_H = 24;
/** Relance signature du devis / QDR / FIC */
export const SLA_SIGNATURE_DEVIS_H = 24;
/** Relance signature du contrat final (J+1 — document contractuel) */
export const SLA_SIGNATURE_CONTRAT_H = 24;
/** Devis signé mais contrat pas encore envoyé en signature (étape interne) */
export const SEUIL_CONTRAT_A_EMETTRE_H = 48;
/** Date d'effet du devis au-delà de ce délai → projet à échéance (attente client) */
export const SEUIL_PROJET_ECHEANCE_J = 15;
/** Relance avant la date d'effet pour un projet à échéance */
export const RELANCE_AVANT_EFFET_J = 7;
/** Dossier en étude sans activité au-delà de ce délai → signalé inactif */
export const SEUIL_INACTIVITE_J = 7;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PipelineStage =
  | 'a_traiter'
  | 'en_etude'
  | 'signature'
  | 'a_regulariser'
  | 'sans_suite'
  | 'converti';

export type SignatureSubState =
  | 'attente_signature_devis'
  | 'attente_client'
  | 'contrat_a_emettre'
  | 'attente_signature_contrat';

export interface StageInfo {
  stage: PipelineStage;
  subState?: SignatureSubState;
  /** Libellé court affiché dans la liste */
  label: string;
}

export interface PriorityInfo {
  level: PriorityLevel;
  /** Raison principale, affichable en tooltip/badge */
  reason: string;
}

export interface Alert {
  type:
    | 'devis_non_signe'
    | 'contrat_non_signe'
    | 'contrat_a_emettre'
    | 'rappel_client_echu'
    | 'lead_sla_depasse';
  prospectId: string;
  prospectName: string;
  message: string;
}

export const STAGE_LABELS: Record<PipelineStage, string> = {
  a_traiter: 'À traiter',
  en_etude: 'En étude',
  signature: 'Signature',
  a_regulariser: 'À régulariser',
  sans_suite: 'Sans suite',
  converti: 'Converti',
};

// ---------------------------------------------------------------------------
// Lecture des champs bruts Airtable
// ---------------------------------------------------------------------------

function raw(p: Prospect): Record<string, unknown> {
  return p.airtable_dossier_fields || {};
}

function str(f: Record<string, unknown>, key: string): string {
  const v = f[key];
  return typeof v === 'string' ? v : '';
}

function dateField(f: Record<string, unknown>, key: string): Date | null {
  const v = f[key];
  if (typeof v !== 'string' || !v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function hoursSince(d: Date | null, now: Date): number | null {
  if (!d) return null;
  return (now.getTime() - d.getTime()) / 3_600_000;
}

function daysUntil(d: Date | null, now: Date): number | null {
  if (!d) return null;
  return (d.getTime() - now.getTime()) / 86_400_000;
}

/** Date de création du dossier (champ mappé created_at, fallback Airtable) */
function createdAt(p: Prospect): Date | null {
  const f = raw(p);
  return dateField(f, 'Date_Création') || (p.created_at ? new Date(p.created_at) : null);
}

function lastActivity(p: Prospect): Date | null {
  return dateField(raw(p), 'Dernière_Activité');
}

/** L'analyse DDA (Top 3) a-t-elle été réalisée ? */
export function isDdaDone(p: Prospect): boolean {
  const f = raw(p);
  return !!(str(f, 'DDA_Proposition_1_Compagnie') || dateField(f, 'DDA_Date_Analyse'));
}

/** Le dossier est-il en « attente retour client » (projet à échéance) ? */
export function getAttenteClientInfo(
  p: Prospect,
  now: Date
): { active: boolean; echue: boolean; rappelLe: Date | null } {
  const f = raw(p);
  const rappel = dateField(f, 'Date_Rappel_Client');
  if (rappel) {
    const echue = rappel.getTime() <= now.getTime();
    return { active: !echue, echue, rappelLe: rappel };
  }
  // Fallback : date d'effet du devis éloignée → projet à échéance,
  // réveil à J-RELANCE_AVANT_EFFET_J avant la date d'effet
  const effet = dateField(f, 'Devis_Date_Effet');
  const jours = daysUntil(effet, now);
  if (jours != null && jours > SEUIL_PROJET_ECHEANCE_J) {
    return { active: true, echue: false, rappelLe: new Date(effet!.getTime() - RELANCE_AVANT_EFFET_J * 86_400_000) };
  }
  if (jours != null && jours > RELANCE_AVANT_EFFET_J) {
    return { active: true, echue: false, rappelLe: new Date(effet!.getTime() - RELANCE_AVANT_EFFET_J * 86_400_000) };
  }
  return { active: false, echue: false, rappelLe: null };
}

// ---------------------------------------------------------------------------
// Étape du pipeline
// ---------------------------------------------------------------------------

export function getPipelineStage(p: Prospect, now: Date = new Date()): StageInfo {
  const f = raw(p);
  const statutDossier = str(f, 'Statut_Dossier');
  const statutSignature = str(f, 'Statut_Signature');

  // Sans suite — états terminaux non convertis
  if (/suspendu|résilié|resilie/i.test(statutDossier)) {
    return { stage: 'sans_suite', label: statutDossier || 'Sans suite' };
  }
  if (/refus|expir/i.test(statutSignature)) {
    return { stage: 'sans_suite', label: statutSignature };
  }

  // Contrat signé → converti (GES 100) ou à régulariser (GES < 100)
  const contratSigne =
    /contrat sign/i.test(statutSignature) || !!dateField(f, 'Date_Signature_Contrat');
  if (contratSigne || /en cours/i.test(statutDossier)) {
    if (p.ges_score >= 100) {
      return { stage: 'converti', label: 'Converti' };
    }
    return { stage: 'a_regulariser', label: 'Docs à régulariser' };
  }

  // Tunnel de signature
  if (/en attente signature contrat/i.test(statutSignature)) {
    return { stage: 'signature', subState: 'attente_signature_contrat', label: 'Contrat en signature' };
  }
  if (/devis sign/i.test(statutSignature) || dateField(f, 'Date_Signature_Devis')) {
    return { stage: 'signature', subState: 'contrat_a_emettre', label: 'Contrat à émettre' };
  }
  if (/en attente signature devis/i.test(statutSignature)) {
    const attente = getAttenteClientInfo(p, now);
    if (attente.active) {
      return { stage: 'signature', subState: 'attente_client', label: 'En attente client' };
    }
    return { stage: 'signature', subState: 'attente_signature_devis', label: 'Devis en signature' };
  }

  // Lead entrant
  if (/nouveau/i.test(statutDossier)) {
    return { stage: 'a_traiter', label: 'Nouveau lead' };
  }

  // Par défaut : en étude (Contacté / En étude / statut vide)
  return { stage: 'en_etude', label: statutDossier || 'En étude' };
}

// ---------------------------------------------------------------------------
// Priorité calculée
// ---------------------------------------------------------------------------

export function getComputedPriority(p: Prospect, now: Date = new Date()): PriorityInfo {
  const info = getPipelineStage(p, now);
  const f = raw(p);

  // --- Critique : un SLA dépassé ---
  if (info.stage === 'a_traiter') {
    const h = hoursSince(createdAt(p), now);
    if (h != null && h > SLA_PREMIER_CONTACT_H) {
      return { level: 'Critique', reason: `Lead non traité depuis ${Math.floor(h)}h (SLA ${SLA_PREMIER_CONTACT_H}h)` };
    }
    return { level: 'Haute', reason: 'Nouveau lead — premier contact sous 24h' };
  }

  if (info.subState === 'attente_signature_devis') {
    const attente = getAttenteClientInfo(p, now);
    if (attente.echue) {
      return { level: 'Critique', reason: `Rappel client échu le ${attente.rappelLe!.toLocaleDateString('fr-FR')} — recontacter` };
    }
    const envoi = dateField(f, 'Dernière_Activité');
    const h = hoursSince(envoi, now);
    if (h != null && h > SLA_SIGNATURE_DEVIS_H) {
      return { level: 'Critique', reason: `Devis non signé depuis ${Math.floor(h)}h — relancer` };
    }
    return { level: 'Moyenne', reason: 'Devis envoyé — signature attendue' };
  }

  if (info.subState === 'attente_signature_contrat') {
    const envoi = dateField(f, 'Date_Signature_Devis') || lastActivity(p);
    const h = hoursSince(envoi, now);
    if (h != null && h > SLA_SIGNATURE_CONTRAT_H) {
      return { level: 'Critique', reason: `Contrat non signé depuis ${Math.floor(h)}h — relance J+1` };
    }
    return { level: 'Haute', reason: 'Contrat en signature — document contractuel' };
  }

  if (info.subState === 'attente_client') {
    const attente = getAttenteClientInfo(p, now);
    if (attente.echue) {
      return { level: 'Critique', reason: 'Date de rappel client échue — recontacter' };
    }
    return { level: 'Basse', reason: attente.rappelLe ? `En attente client — rappel le ${attente.rappelLe.toLocaleDateString('fr-FR')}` : 'En attente client' };
  }

  // --- Haute ---
  if (info.subState === 'contrat_a_emettre') {
    const signeLe = dateField(f, 'Date_Signature_Devis');
    const h = hoursSince(signeLe, now);
    if (h != null && h > SEUIL_CONTRAT_A_EMETTRE_H) {
      return { level: 'Critique', reason: `Contrat à émettre depuis ${Math.floor(h / 24)}j — étape interne en retard` };
    }
    return { level: 'Haute', reason: 'Devis signé — émettre le contrat' };
  }

  if (info.stage === 'en_etude' && p.ges_score >= 100 && !isDdaDone(p)) {
    return { level: 'Haute', reason: 'Dossier complet — analyse DDA à lancer' };
  }

  if (info.stage === 'a_regulariser') {
    return { level: 'Haute', reason: 'Contrat actif avec documents à régulariser' };
  }

  // --- Moyenne / Basse ---
  if (info.stage === 'en_etude') {
    const inactiveJ = hoursSince(lastActivity(p), now);
    if (inactiveJ != null && inactiveJ > SEUIL_INACTIVITE_J * 24) {
      return { level: 'Moyenne', reason: `Inactif depuis ${Math.floor(inactiveJ / 24)}j` };
    }
    return { level: 'Moyenne', reason: 'Dossier en cours d\'étude' };
  }

  return { level: 'Basse', reason: '' };
}

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  Critique: 0,
  Haute: 1,
  Moyenne: 2,
  Basse: 3,
};

/** Tri : priorité décroissante puis ancienneté (plus vieux d'abord) */
export function sortByPriority(prospects: Prospect[], now: Date = new Date()): Prospect[] {
  return [...prospects].sort((a, b) => {
    const pa = PRIORITY_ORDER[getComputedPriority(a, now).level];
    const pb = PRIORITY_ORDER[getComputedPriority(b, now).level];
    if (pa !== pb) return pa - pb;
    const ca = createdAt(a)?.getTime() ?? 0;
    const cb = createdAt(b)?.getTime() ?? 0;
    return ca - cb;
  });
}

// ---------------------------------------------------------------------------
// Alertes dashboard (bandeau overview)
// ---------------------------------------------------------------------------

export function getAlerts(prospects: Prospect[], now: Date = new Date()): Alert[] {
  const alerts: Alert[] = [];
  for (const p of prospects) {
    const name = `${p.prenom} ${p.nom}`.trim();
    const info = getPipelineStage(p, now);
    const prio = getComputedPriority(p, now);
    if (prio.level !== 'Critique') continue;

    if (info.stage === 'a_traiter') {
      alerts.push({ type: 'lead_sla_depasse', prospectId: p.id, prospectName: name, message: `${name} — ${prio.reason}` });
    } else if (info.subState === 'attente_signature_devis') {
      alerts.push({ type: 'devis_non_signe', prospectId: p.id, prospectName: name, message: `${name} — ${prio.reason}` });
    } else if (info.subState === 'attente_signature_contrat') {
      alerts.push({ type: 'contrat_non_signe', prospectId: p.id, prospectName: name, message: `${name} — ${prio.reason}` });
    } else if (info.subState === 'contrat_a_emettre') {
      alerts.push({ type: 'contrat_a_emettre', prospectId: p.id, prospectName: name, message: `${name} — ${prio.reason}` });
    } else if (info.subState === 'attente_client') {
      alerts.push({ type: 'rappel_client_echu', prospectId: p.id, prospectName: name, message: `${name} — ${prio.reason}` });
    }
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Helpers d'affichage
// ---------------------------------------------------------------------------

/** Âge du dossier en jours entiers */
export function getAgeJours(p: Prospect, now: Date = new Date()): number | null {
  const c = createdAt(p);
  if (!c) return null;
  return Math.floor((now.getTime() - c.getTime()) / 86_400_000);
}

/** Jours d'inactivité (depuis Dernière_Activité) */
export function getInactiviteJours(p: Prospect, now: Date = new Date()): number | null {
  const d = lastActivity(p);
  if (!d) return null;
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

export function getSourceLabel(p: Prospect): string {
  const s = str(raw(p), 'Source');
  if (/apporteur/i.test(s)) return 'Apporteur';
  if (/web/i.test(s)) return 'Web';
  if (/cabinet/i.test(s)) return 'Cabinet';
  return s || '—';
}

export function getApporteurName(p: Prospect): string | null {
  const a = str(raw(p), 'Apporteurs');
  return a || null;
}

/** Répartition des prospects par étape du pipeline */
export function groupByStage(
  prospects: Prospect[],
  now: Date = new Date()
): Record<PipelineStage, Prospect[]> {
  const groups: Record<PipelineStage, Prospect[]> = {
    a_traiter: [], en_etude: [], signature: [], a_regulariser: [], sans_suite: [], converti: [],
  };
  for (const p of prospects) {
    groups[getPipelineStage(p, now).stage].push(p);
  }
  return groups;
}

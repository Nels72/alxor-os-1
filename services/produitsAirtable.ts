/**
 * Charge les règles de matching véhicule depuis la table Produits_CIE d'Airtable.
 * Retourne null seulement si la requête échoue ou si aucune ligne n'est liée à une
 * compagnie réelle → fallback côté appelant (`lib/compagnieRules.ts`).
 *
 * Doctrine "chargement instantané" (2026-06-16) : toute ligne réellement liée à une
 * compagnie est chargée dès qu'elle existe, même partiellement remplie — chaque champ
 * absent reçoit un défaut permissif (bénéfice du doute), plutôt que d'attendre que
 * *toutes* les compagnies aient des critères complets avant d'afficher quoi que ce soit.
 */

import type { CompagnieVehiculeRule } from '../lib/compagnieRules';
import { airtableFetch } from './airtable';

const BASE = process.env.REACT_APP_AIRTABLE_BASE_ID || '';

// Formules Airtable → libellés attendus par le moteur
const FORMULE_MAP: Record<string, 'RC' | 'Tiers Étendu' | 'Tous Risques'> = {
  RC: 'RC',
  Tiers_Etendu: 'Tiers Étendu',
  Tous_Risques: 'Tous Risques',
};

interface CompagnieRecord {
  id: string;
  nom: string;
  extranetUrl: string;
}

async function fetchCompagnies(): Promise<Map<string, CompagnieRecord>> {
  const url = `https://api.airtable.com/v0/${BASE}/Compagnies_et_Partenariats` +
    `?fields[]=Nom_Partenaire&fields[]=URL_Extranet`;
  const res = await airtableFetch(url);
  if (!res.ok) return new Map();
  const data = await res.json() as { records: Array<{ id: string; fields: Record<string, unknown> }> };
  const map = new Map<string, CompagnieRecord>();
  for (const r of data.records) {
    map.set(r.id, {
      id: r.id,
      nom: String(r.fields['Nom_Partenaire'] ?? ''),
      extranetUrl: String(r.fields['URL_Extranet'] ?? ''),
    });
  }
  return map;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function num(v: unknown, fallback: number): number {
  return typeof v === 'number' ? v : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

export async function fetchVehiculeRules(): Promise<CompagnieVehiculeRule[] | null> {
  const [compagniesMap, produitsRes] = await Promise.all([
    fetchCompagnies(),
    airtableFetch(
      `https://api.airtable.com/v0/${BASE}/Produits_CIE` +
      `?filterByFormula=OR({Type_Produit}="AUT",{Type_Produit}="MOT")` +
      `&fields[]=Nom_Produit&fields[]=Compagnie&fields[]=Type_Produit` +
      `&fields[]=Bonus_Max_Accepte&fields[]=Sinistres_Max_36m` +
      `&fields[]=Accepte_Resilie&fields[]=Motifs_Resilie_Exclus` +
      `&fields[]=Age_Conducteur_Min&fields[]=Anciennete_Permis_Min_Mois` +
      `&fields[]=Energies_Exclues` +
      `&fields[]=Score_QualitePrix&fields[]=Score_GestionSinistres` +
      `&fields[]=Score_EtendueGaranties&fields[]=Score_Reactivite` +
      `&fields[]=Prime_Base_EUR&fields[]=Formules_Disponibles&fields[]=Bonus_Score_Excellent` +
      `&fields[]=Franchise_Min_EUR&fields[]=Franchise_Max_EUR`
    ),
  ]);

  if (!produitsRes.ok) return null;
  const data = await produitsRes.json() as { records: Array<{ id: string; fields: Record<string, unknown> }> };

  const rules: CompagnieVehiculeRule[] = [];

  for (const record of data.records) {
    const f = record.fields;
    const compagnieIds = Array.isArray(f['Compagnie']) ? f['Compagnie'] as string[] : [];
    const compagnie = compagnieIds.length ? compagniesMap.get(compagnieIds[0]) : undefined;

    if (!compagnie) continue;

    const formulesRaw = strArr(f['Formules_Disponibles']);
    const formules = formulesRaw
      .map(k => FORMULE_MAP[k])
      .filter((v): v is 'RC' | 'Tiers Étendu' | 'Tous Risques' => v !== undefined);

    rules.push({
      compagnie: compagnie.nom || str(f['Nom_Produit']),
      extranet_url: compagnie.extranetUrl,
      eligible: {
        bonus_max: num(f['Bonus_Max_Accepte'], 3.50),
        sinistres_max: num(f['Sinistres_Max_36m'], 4),
        accepte_resilie: bool(f['Accepte_Resilie'], true),
        motifs_resilie_exclus: strArr(f['Motifs_Resilie_Exclus']),
        age_conducteur_min: typeof f['Age_Conducteur_Min'] === 'number' ? f['Age_Conducteur_Min'] : undefined,
        anciennete_permis_min_mois: typeof f['Anciennete_Permis_Min_Mois'] === 'number' ? f['Anciennete_Permis_Min_Mois'] : undefined,
        energies_exclus: strArr(f['Energies_Exclues']),
      },
      scoring: {
        rapport_qualite_prix: num(f['Score_QualitePrix'], 70),
        gestion_sinistres: num(f['Score_GestionSinistres'], 70),
        etendue_garanties: num(f['Score_EtendueGaranties'], 70),
        reactivite: num(f['Score_Reactivite'], 70),
      },
      formules_disponibles: formules.length ? formules : ['RC', 'Tiers Étendu', 'Tous Risques'],
      bonus_score_excellent: typeof f['Bonus_Score_Excellent'] === 'number' ? f['Bonus_Score_Excellent'] : undefined,
      prime_base: num(f['Prime_Base_EUR'], 900),
      // Pas de défaut : une fourchette inventée serait pire qu'une fourchette absente.
      franchise_min: typeof f['Franchise_Min_EUR'] === 'number' ? f['Franchise_Min_EUR'] : undefined,
      franchise_max: typeof f['Franchise_Max_EUR'] === 'number' ? f['Franchise_Max_EUR'] : undefined,
    });
  }

  // Au moins une compagnie réelle suffit pour charger — "instant update" dès qu'une
  // ligne Produits_CIE est liée à une compagnie, même seule ou partiellement remplie.
  return rules.length >= 1 ? rules : null;
}

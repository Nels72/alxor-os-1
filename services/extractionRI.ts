// services/extractionRI.ts
// Appel au webhook n8n "Extraction RI Cabinet" pour extraire
// les données structurées d'un Relevé d'Information (RI) PDF.

const N8N_BASE = process.env.REACT_APP_N8N_BASE_URL || '';

export interface RIExtrait {
  bonus_malus: number;
  compagnie_precedente: string;
  nb_sinistres_36m: number;
  type_sinistres: string | null;
  resilie: boolean;
  motif_resiliation: string | null;
  date_releve: string | null;
  date_effet_contrat: string | null;
  date_fin_contrat: string | null;
  /** Nombre de mois d'assurance cumulés depuis la date d'effet */
  nb_mois?: number | null;
  /** Date de dernière échéance du RI (bonus_malus.date_echeance) */
  bm_date_echeance?: string | null;
  date_echeance?: string | null;
  vehicule_marque: string | null;
  vehicule_modele: string | null;
  vehicule_categorie: string | null;   // Énergie / catégorie (C.9)
  immatriculation: string | null;
  usage_vehicule: string | null;
  conducteur_principal: string | null;
  date_naissance_conducteur: string | null;
  date_permis: string | null;
  annees_bonus_050: number | null;
  formule_actuelle: string | null;
  /** Sinistres détaillés (rubrique F du RI) */
  sinistres?: Array<{
    date: string | null;
    nature: string | null;        // responsable / non_responsable / partielle
    type: string | null;          // corporel / materiel / bris_de_glace / vol / autre
    conducteur_nom: string | null;
  }>;
  // Champs Airtable mappés (pour mise à jour locale)
  airtableFields: Record<string, unknown>;
  dossierId: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Envoie le PDF du RI au webhook n8n pour extraction via Gemini.
 * Retourne les données structurées extraites (bonus/malus, sinistres, véhicule…).
 * Les données sont aussi PATCHées automatiquement dans Airtable par le workflow.
 */
export async function extractRIData(
  dossierId: string,
  file: File
): Promise<RIExtrait> {
  if (!N8N_BASE) {
    throw new Error("N8N_BASE_URL non configuré — impossible d'extraire le RI.");
  }

  const base64 = await fileToBase64(file);

  const response = await fetch(`${N8N_BASE}/webhook/extraction-ri-cabinet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dossier_id: dossierId,
      file_base64: base64,
      file_type: file.type || 'application/pdf',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Extraction RI échouée (${response.status}): ${text || 'aucun détail'}`);
  }

  // Le webhook peut renvoyer un corps vide si le workflow n8n s'interrompt
  // avant le nœud "Respond" (ex: erreur Gemini ou PATCH Airtable).
  const raw = await response.text();
  if (!raw || !raw.trim()) {
    throw new Error(
      "Réponse vide du workflow n8n — l'extraction Gemini ou l'enregistrement Airtable a probablement échoué. Vérifiez l'exécution dans n8n."
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Réponse n8n non-JSON : ${raw.slice(0, 200)}`);
  }
  return data as RIExtrait;
}

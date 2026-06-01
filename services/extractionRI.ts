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
  vehicule_marque: string | null;
  vehicule_modele: string | null;
  immatriculation: string | null;
  usage_vehicule: string | null;
  conducteur_principal: string | null;
  date_naissance_conducteur: string | null;
  date_permis: string | null;
  annees_bonus_050: number | null;
  formule_actuelle: string | null;
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
    throw new Error(`Extraction RI échouée (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data as RIExtrait;
}

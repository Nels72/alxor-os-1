// services/devisExtraction.ts
// Appel au webhook n8n "Extraction Devis Compagnie" pour extraire
// automatiquement les données structurées d'un devis compagnie PDF.

const N8N_BASE = process.env.REACT_APP_N8N_BASE_URL || '';

export interface GarantieExtraite {
  nom: string;
  inclus: boolean;
  plafond?: string;
  franchise?: string;
}

export interface OptionExtraite {
  nom: string;
  inclus: boolean;
  supplement?: string;
}

export interface DevisExtrait {
  compagnie: string;
  produit: string;
  formule: string;
  garanties: GarantieExtraite[];
  options: OptionExtraite[];
  primeAnnuelleTTC: number;
  franchise: string;
  dateEffet?: string;
  numeroDevis?: string;
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
 * Envoie le PDF du devis compagnie au webhook n8n pour extraction via Gemini.
 * Retourne les données structurées extraites (compagnie, formule, garanties, prime…).
 *
 * contactId/idDossier permettent au workflow n8n d'archiver le PDF original sur
 * Dropbox (chemin /ged_alxor/{Cabinet}/{Contact}/{Dossier}/) en plus de l'extraction —
 * sans eux, le devis n'est jamais archivé (seules les données extraites le sont).
 */
export async function extractDevisData(
  dossierId: string,
  file: File,
  contactId?: string,
  idDossier?: string,
): Promise<DevisExtrait> {
  if (!N8N_BASE) {
    throw new Error('N8N_BASE_URL non configuré — impossible d\'extraire le devis.');
  }

  const base64 = await fileToBase64(file);

  const response = await fetch(`${N8N_BASE}/webhook/extraction-devis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dossier_id: dossierId,
      contact_id: contactId,
      id_dossier: idDossier,
      file_base64: base64,
      file_type: file.type || 'application/pdf',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Extraction devis échouée (${response.status}): ${text}`);
  }

  const data = await response.json();

  // Le webhook retourne les données dans un format structuré
  // On normalise la réponse pour matcher l'interface DevisExtrait
  return normalizeExtractionResponse(data);
}

/**
 * Normalise la réponse brute du webhook vers l'interface DevisExtrait.
 * Gère les variations de format possibles depuis Gemini.
 */
function normalizeExtractionResponse(raw: Record<string, unknown>): DevisExtrait {
  // Le webhook n8n retourne directement les champs extraits
  const garantiesRaw = raw.garanties as Array<Record<string, unknown>> | undefined;
  const optionsRaw = raw.options as Array<Record<string, unknown>> | undefined;

  const garanties: GarantieExtraite[] = (garantiesRaw || []).map(g => ({
    nom: String(g.nom || g.name || ''),
    inclus: Boolean(g.inclus ?? g.included ?? true),
    plafond: g.plafond ? String(g.plafond) : undefined,
    franchise: g.franchise ? String(g.franchise) : undefined,
  }));

  const options: OptionExtraite[] = (optionsRaw || []).map(o => ({
    nom: String(o.nom || o.name || ''),
    inclus: Boolean(o.inclus ?? o.included ?? false),
    supplement: o.supplement ? String(o.supplement) : undefined,
  }));

  return {
    compagnie: String(raw.compagnie || ''),
    produit: String(raw.produit || ''),
    formule: String(raw.formule || ''),
    garanties,
    options,
    primeAnnuelleTTC: Number(raw.prime_annuelle_ttc || raw.primeAnnuelleTTC || 0),
    franchise: String(raw.franchise || ''),
    dateEffet: raw.date_effet ? String(raw.date_effet) : undefined,
    numeroDevis: raw.numero_devis ? String(raw.numero_devis) : undefined,
  };
}

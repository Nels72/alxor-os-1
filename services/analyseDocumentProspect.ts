// services/analyseDocumentProspect.ts
// Appel au webhook n8n "Analyse Document Prospect" pour extraire
// les données structurées d'une carte grise ou d'un permis de conduire.

const N8N_BASE = process.env.REACT_APP_N8N_BASE_URL || '';

export type DocumentAnalyseType = 'carte_grise' | 'permis_conduire';

export interface CGExtraite {
  type_document: 'cg_definitive' | 'cg_provisoire_ww' | 'cg_barree' | 'certificat_cession' | 'illisible';
  immatriculation: string | null;
  date_premiere_immatriculation: string | null;
  date_carte_grise: string | null;
  titulaire_nom: string | null;
  titulaire_prenom: string | null;
  marque: string | null;
  modele: string | null;
  genre: string | null;
  energie: string | null;
  puissance_fiscale: number | null;
  numero_formule: string | null;
  date_provisoire_ww: string | null;
  ww_numero: string | null;
  cession_date: string | null;
  cession_ancien_proprietaire: string | null;
  notes: string[];
  confiance: 'haute' | 'moyenne' | 'basse';
}

export interface PermisExtrait {
  type_document: 'permis_definitif' | 'permis_validite_limitee' | 'certificat_examen' | 'illisible';
  numero_permis: string | null;
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  categorie_cible: string;
  date_obtention_categorie_cible: string | null;
  categorie_cible_trouvee: boolean;
  validite_limitee_categorie_cible: boolean;
  date_fin_validite: string | null;
  mention_restriction: string | null;
  pays_delivrance: string | null;
  notes: string[];
  confiance: 'haute' | 'moyenne' | 'basse';
}

export interface AnalyseDocumentResult {
  success: boolean;
  document_type: DocumentAnalyseType;
  cg?: CGExtraite;
  permis?: PermisExtrait;
  flag_relance_cg?: boolean;
  flag_relance_permis?: boolean;
  alerte?: string;
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

export async function analyseDocument(
  dossierId: string,
  file: File,
  documentType: DocumentAnalyseType,
  typeContrat: string,
  contactId?: string,
  idDossier?: string,
  file2?: File,
): Promise<AnalyseDocumentResult> {
  if (!N8N_BASE) {
    throw new Error("N8N_BASE_URL non configuré — impossible d'analyser le document.");
  }

  const base64 = await fileToBase64(file);

  const payload: Record<string, unknown> = {
    dossier_id: dossierId,
    id_dossier: idDossier,
    contact_id: contactId,
    document_type: documentType,
    type_contrat: typeContrat,
    file_base64: base64,
    file_type: file.type || 'application/pdf',
  };

  if (file2) {
    payload.file_base64_2 = await fileToBase64(file2);
    payload.file_type_2 = file2.type || 'image/jpeg';
  }

  const response = await fetch(`${N8N_BASE}/webhook/analyse-document-prospect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Analyse document échouée (${response.status}): ${text}`);
  }

  return response.json();
}

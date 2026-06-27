// services/devisExtraction.ts
// Appel au webhook n8n "Extraction Devis Compagnie" pour extraire
// automatiquement les données structurées d'un devis compagnie PDF,
// y compris le questionnaire risque et le brouillon FIC pré-rempli.

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

export interface QuestionReponse {
  question: string;
  reponse: string;
}

export interface QuestionnaireRisque {
  present: boolean;
  questions_reponses: QuestionReponse[];
}

export interface FicBrouillon {
  version: string;
  dossier_id: string;
  id_dossier: string;
  date_generation: string;
  type_fic: string;
  souscripteur: {
    civilite: string;
    nom: string;
    prenom: string;
    date_naissance: string;
    adresse: string;
    telephone: string;
    email: string;
  };
  vehicule: {
    marque: string;
    modele: string;
    immatriculation: string;
    usage: string;
    lieu_garage: string;
  };
  contrat: {
    compagnie: string;
    produit: string;
    formule: string;
    numero_devis: string;
    date_effet: string;
    date_echeance: string;
    prime_annuelle_ttc: number;
    prime_mensuelle_ttc: number | null;
    fractionnement: string;
    franchise_globale: string;
  };
  garanties: GarantieExtraite[];
  options: OptionExtraite[];
  questionnaire_risque: QuestionnaireRisque;
  permis: {
    categorie_cible: string;
    date_obtention: string;
  };
  recommandation_courtier: string;
  frais_dossier_ttc: number;
  flags: {
    relance_cg: boolean;
    relance_permis: boolean;
  };
  dda_conformite: {
    presentation_intermediaire: boolean;
    recueil_exigences_besoins: boolean;
    information_produit: boolean;
    conseil_personnalise: boolean;
  };
}

export interface DevisExtrait {
  compagnie: string;
  produit: string;
  formule: string;
  garanties: GarantieExtraite[];
  options: OptionExtraite[];
  primeAnnuelleTTC: number;
  primeMensuelleTTC?: number;
  fractionnement?: string;
  franchise: string;
  dateEffet?: string;
  dateEcheance?: string;
  numeroDevis?: string;
  vehicule?: { marque?: string; modele?: string; immatriculation?: string; usage?: string };
  souscripteur?: { nom?: string; prenom?: string; adresse?: string };
  questionnaireRisque?: QuestionnaireRisque;
  confiance?: string;
  notes?: string[];
  ficBrouillon?: FicBrouillon;
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

export async function extractDevisData(
  dossierId: string,
  file: File,
  contactId?: string,
  idDossier?: string,
  questionnaireFile?: File,
): Promise<DevisExtrait> {
  if (!N8N_BASE) {
    throw new Error('N8N_BASE_URL non configuré — impossible d\'extraire le devis.');
  }

  const base64 = await fileToBase64(file);

  const payload: Record<string, unknown> = {
    dossier_id: dossierId,
    contact_id: contactId,
    id_dossier: idDossier,
    file_base64: base64,
    file_type: file.type || 'application/pdf',
  };

  if (questionnaireFile) {
    payload.file_base64_2 = await fileToBase64(questionnaireFile);
    payload.file_type_2 = questionnaireFile.type || 'application/pdf';
  }

  const response = await fetch(`${N8N_BASE}/webhook/extraction-devis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Extraction devis échouée (${response.status}): ${text}`);
  }

  const data = await response.json();
  return normalizeExtractionResponse(data);
}

function normalizeExtractionResponse(raw: Record<string, unknown>): DevisExtrait {
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

  const vehiculeRaw = raw.vehicule as Record<string, unknown> | undefined;
  const souscripteurRaw = raw.souscripteur as Record<string, unknown> | undefined;
  const qrRaw = raw.questionnaire_risque as Record<string, unknown> | undefined;

  return {
    compagnie: String(raw.compagnie || ''),
    produit: String(raw.produit || ''),
    formule: String(raw.formule || ''),
    garanties,
    options,
    primeAnnuelleTTC: Number(raw.prime_annuelle_ttc || raw.primeAnnuelleTTC || 0),
    primeMensuelleTTC: raw.prime_mensuelle_ttc ? Number(raw.prime_mensuelle_ttc) : undefined,
    fractionnement: raw.fractionnement ? String(raw.fractionnement) : undefined,
    franchise: String(raw.franchise || ''),
    dateEffet: raw.date_effet ? String(raw.date_effet) : undefined,
    dateEcheance: raw.date_echeance ? String(raw.date_echeance) : undefined,
    numeroDevis: raw.numero_devis ? String(raw.numero_devis) : undefined,
    vehicule: vehiculeRaw ? {
      marque: vehiculeRaw.marque ? String(vehiculeRaw.marque) : undefined,
      modele: vehiculeRaw.modele ? String(vehiculeRaw.modele) : undefined,
      immatriculation: vehiculeRaw.immatriculation ? String(vehiculeRaw.immatriculation) : undefined,
      usage: vehiculeRaw.usage ? String(vehiculeRaw.usage) : undefined,
    } : undefined,
    souscripteur: souscripteurRaw ? {
      nom: souscripteurRaw.nom ? String(souscripteurRaw.nom) : undefined,
      prenom: souscripteurRaw.prenom ? String(souscripteurRaw.prenom) : undefined,
      adresse: souscripteurRaw.adresse ? String(souscripteurRaw.adresse) : undefined,
    } : undefined,
    questionnaireRisque: qrRaw ? {
      present: Boolean(qrRaw.present),
      questions_reponses: (qrRaw.questions_reponses as Array<Record<string, unknown>> || []).map(qr => ({
        question: String(qr.question || ''),
        reponse: String(qr.reponse || ''),
      })),
    } : undefined,
    confiance: raw.confiance ? String(raw.confiance) : undefined,
    notes: Array.isArray(raw.notes) ? raw.notes.map(String) : undefined,
    ficBrouillon: raw.fic_brouillon as FicBrouillon | undefined,
  };
}

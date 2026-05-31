import {
  createDocument,
  updateDocument,
  getDocumentsByDossier,
  mapDocTypeToAirtable,
  type AirtableDocument,
  type DocumentStatut,
} from './airtable';

const N8N_BASE = process.env.REACT_APP_N8N_BASE_URL || '';
const UPLOAD_PATH = process.env.REACT_APP_N8N_UPLOAD_WEBHOOK || '';

export interface UploadDocumentInput {
  file: File;
  dossierId: string;
  workflowDocType: string;
  label: string;
}

export interface QualifyDocumentInput {
  documentId: string;
  statut: DocumentStatut;
  conforme: boolean;
  dateEcheanceProvisoire?: string;
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

export async function uploadDocumentCabinet(input: UploadDocumentInput): Promise<AirtableDocument> {
  const airtableType = mapDocTypeToAirtable(input.workflowDocType);

  const doc = await createDocument({
    Nom_Fichier: `${input.label} - ${input.file.name}`,
    Type_Document: airtableType,
    Statut_Document: 'Valide',
    Document_Conforme: true,
    Dossier: [input.dossierId],
    Date_Upload: new Date().toISOString().split('T')[0],
  });

  if (N8N_BASE && UPLOAD_PATH) {
    try {
      const base64 = await fileToBase64(input.file);
      await fetch(`${N8N_BASE}${UPLOAD_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: doc.id,
          dossier_id: input.dossierId,
          file_name: input.file.name,
          file_base64: base64,
          file_type: input.file.type,
          doc_type: input.workflowDocType,
        }),
      });
    } catch {
      // Dropbox upload failed — Airtable record is still created
    }
  }

  return doc;
}

export async function qualifyDocument(input: QualifyDocumentInput): Promise<AirtableDocument> {
  const fields: Record<string, unknown> = {
    Statut_Document: input.statut,
    Document_Conforme: input.conforme,
  };
  if (input.statut === 'Provisoire' && input.dateEcheanceProvisoire) {
    fields.Date_Echeance_Provisoire = input.dateEcheanceProvisoire;
  } else {
    fields.Date_Echeance_Provisoire = null;
  }
  return updateDocument(input.documentId, fields as Partial<AirtableDocument['fields']>);
}

export async function fetchDocumentsForDossier(dossierId: string): Promise<AirtableDocument[]> {
  return getDocumentsByDossier(dossierId);
}

/**
 * Upload un PDF FIC (Blob) vers Airtable + Dropbox.
 * Même pattern que uploadDocumentCabinet mais accepte un Blob au lieu d'un File.
 */
export async function uploadFicPdf(
  dossierId: string,
  pdfBlob: Blob,
  ficType: string,
  prospectNom: string,
): Promise<AirtableDocument> {
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `FIC_${ficType.toUpperCase()}_${prospectNom}_${timestamp}.pdf`;

  const doc = await createDocument({
    Nom_Fichier: fileName,
    Type_Document: 'Fiche Information Conseil',
    Statut_Document: 'Valide',
    Document_Conforme: true,
    Dossier: [dossierId],
    Date_Upload: timestamp,
  });

  if (N8N_BASE && UPLOAD_PATH) {
    try {
      const base64 = await blobToBase64(pdfBlob);
      await fetch(`${N8N_BASE}${UPLOAD_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: doc.id,
          dossier_id: dossierId,
          file_name: fileName,
          file_base64: base64,
          file_type: 'application/pdf',
          doc_type: 'fic',
        }),
      });
    } catch {
      // Dropbox upload failed — Airtable record is still created
    }
  }

  return doc;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

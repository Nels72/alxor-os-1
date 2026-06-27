// services/ficValidation.ts
// Appel au webhook n8n "Validation FIC et Signature" pour valider la FIC,
// archiver le PDF sur Dropbox, et déclencher la signature Yousign.

import type { FicBrouillon } from './devisExtraction';

const N8N_BASE = process.env.REACT_APP_N8N_BASE_URL || '';

export interface FicValidationPayload {
  dossierId: string;
  contactId: string;
  idDossier: string;
  fraisDossierTtc: number;
  ficDataOverride?: Partial<FicBrouillon>;
  ficPdfBase64: string;
  ficPdfFilename?: string;
}

export interface FicValidationResult {
  status: 'ok' | 'error';
  message: string;
  dossierId: string;
  ficDocumentId?: string;
  yousignTriggered: boolean;
}

export async function validerFic(payload: FicValidationPayload): Promise<FicValidationResult> {
  if (!N8N_BASE) {
    throw new Error('N8N_BASE_URL non configuré — impossible de valider la FIC.');
  }

  const response = await fetch(`${N8N_BASE}/webhook/valider-fic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dossier_id: payload.dossierId,
      contact_id: payload.contactId,
      id_dossier: payload.idDossier,
      frais_dossier_ttc: payload.fraisDossierTtc,
      fic_data_override: payload.ficDataOverride,
      fic_pdf_base64: payload.ficPdfBase64,
      fic_pdf_filename: payload.ficPdfFilename,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Validation FIC échouée (${response.status}): ${text}`);
  }

  const data = await response.json();

  return {
    status: data.status || 'ok',
    message: data.message || '',
    dossierId: data.dossier_id || payload.dossierId,
    ficDocumentId: data.fic_document_id,
    yousignTriggered: Boolean(data.yousign_triggered),
  };
}

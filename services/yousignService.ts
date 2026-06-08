const N8N_BASE = process.env.REACT_APP_N8N_BASE_URL || '';

export interface SignatureResponse {
  status: 'ok' | 'error';
  message: string;
  signature_request_id?: string;
  dossier_id?: string;
}

export async function sendDevisForSignature(
  dossierId: string,
  contactId: string
): Promise<SignatureResponse> {
  if (!N8N_BASE) {
    throw new Error('N8N_BASE_URL non configuré');
  }

  const response = await fetch(`${N8N_BASE}/webhook/yousign-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dossier_id: dossierId,
      contact_id: contactId,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || `Erreur signature (${response.status})`);
  }

  return data as SignatureResponse;
}

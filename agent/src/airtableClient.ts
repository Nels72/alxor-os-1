import type { AirtableRecord } from './types.js';

const AIRTABLE_PAT = process.env.AIRTABLE_PAT || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'apprtejZaap5ouqGm';
const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const INTER_REQUEST_DELAY_MS = 600;
const MAX_RETRIES = 3;

let pending: Promise<void> = Promise.resolve();

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function airtableFetch(url: string, options?: RequestInit): Promise<Response> {
  const slot = pending.then(() => delay(INTER_REQUEST_DELAY_MS));
  pending = slot.catch(() => {});
  await slot;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const wait = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.pow(2, attempt + 1) * 1000;
      console.warn(`[airtable] 429 — retry in ${wait}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await delay(wait);
      continue;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Airtable ${response.status}: ${text}`);
    }

    return response;
  }

  throw new Error('Airtable: max retries exceeded (429)');
}

export async function queryTable(
  table: string,
  filterByFormula?: string,
  fields?: string[],
  maxRecords?: number,
): Promise<AirtableRecord[]> {
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    if (filterByFormula) params.set('filterByFormula', filterByFormula);
    if (fields) fields.forEach((f) => params.append('fields[]', f));
    if (maxRecords) params.set('maxRecords', String(maxRecords));
    if (offset) params.set('offset', offset);

    const url = `${BASE_URL}/${encodeURIComponent(table)}?${params}`;
    const res = await airtableFetch(url);
    const data = (await res.json()) as {
      records: AirtableRecord[];
      offset?: string;
    };

    allRecords.push(...data.records);
    offset = data.offset;

    if (maxRecords && allRecords.length >= maxRecords) break;
  } while (offset);

  return maxRecords ? allRecords.slice(0, maxRecords) : allRecords;
}

export async function getRecord(
  table: string,
  recordId: string,
): Promise<AirtableRecord> {
  const url = `${BASE_URL}/${encodeURIComponent(table)}/${recordId}`;
  const res = await airtableFetch(url);
  return (await res.json()) as AirtableRecord;
}

export async function createRecord(
  table: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord> {
  const url = `${BASE_URL}/${encodeURIComponent(table)}`;
  const res = await airtableFetch(url, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  return (await res.json()) as AirtableRecord;
}

export async function updateRecord(
  table: string,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord> {
  const url = `${BASE_URL}/${encodeURIComponent(table)}/${recordId}`;
  const res = await airtableFetch(url, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
  return (await res.json()) as AirtableRecord;
}

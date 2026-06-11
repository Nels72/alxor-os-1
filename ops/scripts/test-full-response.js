const https = require('https');
require('dotenv').config();
const N8N_KEY = process.env.N8N_API_KEY;

function n8nReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({ hostname: 'n8n2.reaktimo.com', path, method, headers: { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }, rejectUnauthorized: false },
      res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, body: b }); } }); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}

function webhookPost(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const r = https.request({ hostname: 'n8n2.reaktimo.com', path: '/webhook/renommage-document', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }, rejectUnauthorized: false },
      res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, body: b }); } }); });
    r.on('error', reject); r.write(data); r.end();
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Envoi webhook...');
  const wh = await webhookPost({
    airtable_document_id: 'recKDpsy6vlmKrjBt',
    dropbox_path: '/ged_alxor/recv1ho80vcpy8ltq/rec33mza5ozvggvzz/dos_imwyq9/pc_recto-specimen.pdf'
  });
  console.log('Réponse webhook (status', wh.status, '):');
  console.log(JSON.stringify(wh.body, null, 2));
}
main().catch(e => console.error(e.message));

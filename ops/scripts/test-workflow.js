const https = require('https');
require('dotenv').config();

const N8N_KEY = process.env.N8N_API_KEY;

function req(method, path, body, opts) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: opts?.ext ? undefined : 'n8n2.reaktimo.com',
      host: opts?.ext ? opts.host : undefined,
      path, method,
      headers: {
        'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      },
      rejectUnauthorized: false
    }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, body: b }); } }); });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function webhookPost(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const r = https.request({
      hostname: 'n8n2.reaktimo.com',
      path: '/webhook/renommage-document',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      rejectUnauthorized: false
    }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, body: b }); } }); });
    r.on('error', reject);
    r.write(data);
    r.end();
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Déclencher le webhook
  const payload = {
    airtable_document_id: 'recKDpsy6vlmKrjBt',
    dropbox_path: '/ged_alxor/recv1ho80vcpy8ltq/rec33mza5ozvggvzz/dos_imwyq9/pc_recto-specimen.pdf'
  };
  console.log('Test lancé...');
  const wh = await webhookPost(payload);
  console.log('Webhook:', wh.status, '|', typeof wh.body === 'string' ? wh.body.substring(0, 100) : JSON.stringify(wh.body).substring(0, 100));

  await sleep(12000);

  // Récupérer la dernière exécution
  const execs = await req('GET', '/api/v1/executions?workflowId=BzKQPCi78YVPer8F&limit=1');
  const exec = execs.body.data?.[0];
  if (!exec) { console.log('Aucune exécution trouvée'); return; }

  console.log(`Exéc ${exec.id} | Status: ${exec.status} | Dernier: ${exec.data?.resultData?.lastNodeExecuted}`);

  const runData = exec.data?.resultData?.runData || {};
  for (const [nodeName, runs] of Object.entries(runData)) {
    const r = runs[0];
    const ok = !r?.error;
    const out = r?.data?.main?.[0]?.[0]?.json;
    const snippet = out ? JSON.stringify(out).substring(0, 120) : (r?.error?.message || '');
    console.log(` ${ok ? '✅' : '❌'} ${nodeName}${snippet ? ' -> ' + snippet : ''}`);
  }
}
main().catch(e => console.error(e.message));

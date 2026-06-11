const https = require('https');
require('dotenv').config();

const N8N_KEY = process.env.N8N_API_KEY;

const NEW_APP_KEY     = process.env.DROPBOX_APP_KEY;
const NEW_APP_SECRET  = process.env.DROPBOX_APP_SECRET;
const NEW_REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'n8n2.reaktimo.com', path, method,
      headers: { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
      rejectUnauthorized: false
    }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) })); });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  const wf = (await req('GET', '/api/v1/workflows/BzKQPCi78YVPer8F')).body;

  const tokenNode = wf.nodes.find(n => n.id === 'refresh-dropbox-token');
  if (!tokenNode) { console.log('Nœud refresh-dropbox-token introuvable'); return; }

  // Mettre à jour les 4 paramètres du body
  const params = tokenNode.parameters.bodyParameters.parameters;
  params.find(p => p.name === 'grant_type').value    = 'refresh_token';
  params.find(p => p.name === 'refresh_token').value = NEW_REFRESH_TOKEN;
  params.find(p => p.name === 'client_id').value     = NEW_APP_KEY;
  params.find(p => p.name === 'client_secret').value = NEW_APP_SECRET;

  console.log('Credentials mis à jour dans le nœud:', tokenNode.name);

  const put = await req('PUT', '/api/v1/workflows/BzKQPCi78YVPer8F', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections,
    settings: wf.settings, staticData: wf.staticData || null
  });

  if (put.status === 200) console.log('Workflow mis à jour OK');
  else console.log('Erreur PUT:', JSON.stringify(put.body).substring(0, 300));
}
main().catch(e => console.error(e.message));

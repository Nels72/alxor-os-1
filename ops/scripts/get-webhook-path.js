const https = require('https');
require('dotenv').config();
const N8N_KEY = process.env.N8N_API_KEY;

function req(method, path) {
  return new Promise((resolve, reject) => {
    const r = https.request({ hostname: 'n8n2.reaktimo.com', path, method, headers: { 'X-N8N-API-KEY': N8N_KEY }, rejectUnauthorized: false },
      res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b))); });
    r.on('error', reject); r.end();
  });
}

async function main() {
  const wf = await req('GET', '/api/v1/workflows/BzKQPCi78YVPer8F');
  const webhook = wf.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
  console.log('Webhook node:', webhook?.name);
  console.log('Path:', webhook?.parameters?.path);
  console.log('HTTP Method:', webhook?.parameters?.httpMethod);
  console.log('Active workflow:', wf.active);
}
main().catch(e => console.error(e.message));

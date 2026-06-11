const https = require('https');
require('dotenv').config();
const N8N_KEY = process.env.N8N_API_KEY;

function req(path) {
  return new Promise((resolve, reject) => {
    const r = https.request({ hostname: 'n8n2.reaktimo.com', path, method: 'GET', headers: { 'X-N8N-API-KEY': N8N_KEY }, rejectUnauthorized: false },
      res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b))); });
    r.on('error', reject); r.end();
  });
}

async function main() {
  const execs = await req('/api/v1/executions?workflowId=BzKQPCi78YVPer8F&limit=1');
  const exec = execs.data?.[0];
  console.log(`Exéc ${exec.id} | Status: ${exec.status} | Dernier: ${exec.data?.resultData?.lastNodeExecuted}`);
  const runData = exec.data?.resultData?.runData || {};
  for (const [nodeName, runs] of Object.entries(runData)) {
    const r = runs[0];
    const ok = !r?.error;
    const out = r?.data?.main?.[0]?.[0]?.json;
    const snippet = out ? JSON.stringify(out).substring(0, 200) : (r?.error?.message || '');
    console.log(` ${ok ? '✅' : '❌'} ${nodeName}${snippet ? '\n    ' + snippet : ''}`);
  }
}
main().catch(e => console.error(e.message));

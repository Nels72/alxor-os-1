const https = require('https');
require('dotenv').config();
const N8N_KEY = process.env.N8N_API_KEY;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'n8n2.reaktimo.com', path, method,
      headers: { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json', ...(data ? {'Content-Length': Buffer.byteLength(data)} : {}) },
      rejectUnauthorized: false
    }, res => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(b)})); });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  const wf = (await req('GET', '/api/v1/workflows/BzKQPCi78YVPer8F')).body;
  const dropboxNode = wf.nodes.find(n => n.id === 'dropbox-rename');

  // Format exact attendu par n8n : chaîne commençant par = avec {{ }} pour les expressions
  // Les valeurs dynamiques référencent explicitement le nœud "Construit Nomenclature"
  const ancienPathExpr  = "{{ $('Construit Nomenclature').item.json.ancienPath }}";
  const nouveauPathExpr = "{{ $('Construit Nomenclature').item.json.nouveauPath }}";

  dropboxNode.parameters.jsonBody = [
    '={',
    `  "from_path": "${ancienPathExpr}",`,
    `  "to_path": "${nouveauPathExpr}",`,
    '  "allow_shared_folder": false,',
    '  "autorename": false,',
    '  "allow_ownership_transfer": false',
    '}'
  ].join('\n');

  console.log('jsonBody final:\n', dropboxNode.parameters.jsonBody);

  const put = await req('PUT', '/api/v1/workflows/BzKQPCi78YVPer8F', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections,
    settings: wf.settings, staticData: wf.staticData || null
  });
  console.log('PUT:', put.status === 200 ? 'OK' : JSON.stringify(put.body).substring(0, 300));
}
main().catch(e => console.error(e.message));

const https = require('https');
require('dotenv').config();

const API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'BzKQPCi78YVPer8F';
const HOST = 'n8n2.reaktimo.com';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: HOST,
      path,
      method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      },
      rejectUnauthorized: false
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Step 1: fetch current workflow
  console.log('Fetching workflow...');
  const get = await request('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (get.status !== 200) {
    console.error('Failed to fetch workflow:', get.body);
    process.exit(1);
  }
  const workflow = get.body;
  console.log(`Fetched: "${workflow.name}" (${workflow.nodes.length} nodes)`);

  // Step 2: apply fixes
  let fixed = 0;
  for (const node of workflow.nodes) {
    // Fix 1: "Récupère Document Airtable" must use Documents table tblfxKmkeklx4FyGY
    if (node.name === 'Récupère Document Airtable') {
      const old = node.parameters.url;
      node.parameters.url = `=https://api.airtable.com/v0/apprtejZaap5ouqGm/tblfxKmkeklx4FyGY/{{ $json.body.airtable_document_id }}`;
      if (old !== node.parameters.url) {
        console.log(`Fixed "Récupère Document Airtable": tblh45gV9PZcN1fkz -> tblfxKmkeklx4FyGY`);
        fixed++;
      }
    }

    // Fix 2: "Récupère Dossier Airtable" must reference $json.fields.Dossier[0] from doc node output
    if (node.name === 'Récupère Dossier Airtable') {
      const old = node.parameters.url;
      node.parameters.url = `=https://api.airtable.com/v0/apprtejZaap5ouqGm/tblh45gV9PZcN1fkz/{{ $json.fields.Dossier[0] }}`;
      if (old !== node.parameters.url) {
        console.log(`Fixed "Récupère Dossier Airtable" URL`);
        fixed++;
      }
    }
  }

  if (fixed === 0) {
    console.log('No fixes needed — workflow already correct.');
    return;
  }

  // Step 3: PUT the full workflow back (n8n requires name + nodes + connections + settings)
  console.log(`Applying ${fixed} fix(es)...`);
  const put = await request('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings,
    staticData: workflow.staticData || null
  });

  if (put.status === 200) {
    console.log(`\nSuccess! Workflow "${put.body.name}" updated.`);
    // Verify
    const docNode = put.body.nodes.find(n => n.name === 'Récupère Document Airtable');
    const correct = docNode?.parameters?.url?.includes('tblfxKmkeklx4FyGY');
    console.log(`Verification - correct table (tblfxKmkeklx4FyGY): ${correct ? 'YES' : 'NO'}`);
    console.log(`URL: ${docNode?.parameters?.url}`);
  } else {
    console.error(`Failed (${put.status}):`, JSON.stringify(put.body, null, 2));
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

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

  // Supprimer l'ancien nœud Code refresh (raté)
  wf.nodes = wf.nodes.filter(n => n.id !== 'refresh-dropbox-token');

  // Nouveau nœud : HTTP Request natif pour le refresh token Dropbox
  const refreshNode = {
    id: 'refresh-dropbox-token',
    name: 'Obtient Token Dropbox',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [1680, 304],
    parameters: {
      method: 'POST',
      url: 'https://api.dropboxapi.com/oauth2/token',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' }
        ]
      },
      sendBody: true,
      contentType: 'form-urlencoded',
      bodyParameters: {
        parameters: [
          { name: 'grant_type',    value: 'refresh_token' },
          { name: 'refresh_token', value: process.env.DROPBOX_REFRESH_TOKEN },
          { name: 'client_id',     value: process.env.DROPBOX_APP_KEY },
          { name: 'client_secret', value: process.env.DROPBOX_APP_SECRET }
        ]
      },
      options: {}
    }
  };

  // Positions propres
  const positions = {
    'webhook-trigger':       [240,  304],
    'get-airtable-doc':      [480,  304],
    'get-airtable-dossier':  [720,  304],
    'prepare-context':       [960,  304],
    'ai-classify':           [1200, 304],
    'build-nomenclature':    [1440, 304],
    'refresh-dropbox-token': [1680, 304],
    'dropbox-rename':        [1920, 304],
    'update-airtable':       [2160, 304],
    'respond-webhook':       [2400, 304],
  };
  wf.nodes.forEach(n => { if (positions[n.id]) n.position = positions[n.id]; });
  wf.nodes.push(refreshNode);

  // Header Authorization Dropbox : utilise le token retourné par le nœud précédent
  const dropboxNode = wf.nodes.find(n => n.id === 'dropbox-rename');
  const authHeader = dropboxNode.parameters.headerParameters.parameters.find(h => h.name === 'Authorization');
  // $json.access_token car le HTTP Request node retourne directement le JSON Dropbox
  authHeader.value = "={{ 'Bearer ' + $('Obtient Token Dropbox').item.json.access_token }}";
  console.log('Auth header Dropbox:', authHeader.value);

  // Connexions
  wf.connections = {
    'Webhook Make.com':                  { main: [[{ node: 'Récupère Document Airtable',       type: 'main', index: 0 }]] },
    'Récupère Document Airtable':        { main: [[{ node: 'Récupère Dossier Airtable',         type: 'main', index: 0 }]] },
    'Récupère Dossier Airtable':         { main: [[{ node: 'Prépare Contexte IA',               type: 'main', index: 0 }]] },
    'Prépare Contexte IA':               { main: [[{ node: 'Agent IA Gemini - Classification',  type: 'main', index: 0 }]] },
    'Agent IA Gemini - Classification':  { main: [[{ node: 'Construit Nomenclature',            type: 'main', index: 0 }]] },
    'Construit Nomenclature':            { main: [[{ node: 'Obtient Token Dropbox',             type: 'main', index: 0 }]] },
    'Obtient Token Dropbox':             { main: [[{ node: 'Renomme dans Dropbox',              type: 'main', index: 0 }]] },
    'Renomme dans Dropbox':              { main: [[{ node: 'MAJ Airtable Document',             type: 'main', index: 0 }]] },
    'MAJ Airtable Document':             { main: [[{ node: 'Réponse Webhook',                  type: 'main', index: 0 }]] },
  };

  const put = await req('PUT', '/api/v1/workflows/BzKQPCi78YVPer8F', {
    name: wf.name, nodes: wf.nodes, connections: wf.connections,
    settings: wf.settings, staticData: wf.staticData || null
  });

  if (put.status === 200) console.log('OK - workflow mis à jour avec', put.body.nodes.length, 'noeuds');
  else console.log('Erreur:', JSON.stringify(put.body).substring(0, 300));
}
main().catch(e => console.error(e.message));

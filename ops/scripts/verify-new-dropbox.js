const https = require('https');
require('dotenv').config();

const APP_KEY = process.env.DROPBOX_APP_KEY;
const APP_SECRET = process.env.DROPBOX_APP_SECRET;
const REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN;

function post(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const r = https.request({ hostname, path, method: 'POST', headers }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, body: b }); } });
    });
    r.on('error', reject);
    r.write(body);
    r.end();
  });
}

async function getToken() {
  const body = `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}&client_id=${APP_KEY}&client_secret=${APP_SECRET}`;
  const res = await post('api.dropboxapi.com', '/oauth2/token', body, {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body)
  });
  return res.body.access_token;
}

async function listFolder(token, path) {
  const body = JSON.stringify({ path });
  return post('api.dropboxapi.com', '/2/files/list_folder', body, {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
}

async function getMetadata(token, path) {
  const body = JSON.stringify({ path });
  return post('api.dropboxapi.com', '/2/files/get_metadata', body, {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
}

async function main() {
  const token = await getToken();
  console.log('Token OK');

  // Racine
  const root = await listFolder(token, '');
  console.log('\nRacine:');
  if (root.body.entries) root.body.entries.forEach(e => console.log(' ', e['.tag'], e.path_lower));
  else console.log('Erreur:', JSON.stringify(root.body));

  // Fichier exact
  const filePath = '/ged_alxor/recv1ho80vcpy8ltq/rec33mza5ozvggvzz/dos_imwyq9/pc_recto-specimen.pdf';
  console.log('\nMétadonnées', filePath, ':');
  const meta = await getMetadata(token, filePath);
  if (meta.body['.tag']) console.log(' OK -', meta.body['.tag'], meta.body.path_display, meta.body.size, 'bytes');
  else console.log(' Erreur:', JSON.stringify(meta.body));
}
main().catch(e => console.error(e.message));

const https = require('https');
require('dotenv').config();

const REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN;
const CLIENT_ID = process.env.DROPBOX_APP_KEY;
const CLIENT_SECRET = process.env.DROPBOX_APP_SECRET;

function post(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const r = https.request({ hostname, path, method: 'POST', headers }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b }); }
      });
    });
    r.on('error', reject);
    r.write(body);
    r.end();
  });
}

async function getToken() {
  const body = `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`;
  const res = await post('api.dropboxapi.com', '/oauth2/token', body, {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body)
  });
  if (!res.body.access_token) throw new Error('Token error: ' + JSON.stringify(res.body));
  return res.body.access_token;
}

async function listFolder(token, path) {
  const body = JSON.stringify({ path, recursive: false });
  const res = await post('api.dropboxapi.com', '/2/files/list_folder', body, {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  return res;
}

async function main() {
  const token = await getToken();
  console.log('Token OK');

  // Lister la racine
  console.log('\nRacine "/" :');
  const r0 = await listFolder(token, '');
  if (r0.body.entries) {
    r0.body.entries.forEach(e => console.log(' ', e['.tag'], e.path_lower));
  } else {
    console.log('Erreur:', JSON.stringify(r0.body));
  }

  // Lister ged_alxor
  console.log('\n/ged_alxor :');
  const r1 = await listFolder(token, '/ged_alxor');
  if (r1.body.entries) {
    r1.body.entries.forEach(e => console.log(' ', e['.tag'], e.path_lower));
  } else {
    console.log('Erreur:', JSON.stringify(r1.body));
  }
}

main().catch(e => console.error(e.message));

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

  // Lister le dossier parent
  const parent = '/ged_alxor/recv1ho80vcpy8ltq/rec33mza5ozvggvzz';
  console.log('\nContenu de', parent, ':');
  const r1 = await listFolder(token, parent);
  if (r1.body.entries) {
    r1.body.entries.forEach(e => console.log(' ', e['.tag'], e.path_lower));
  } else {
    console.log('Erreur:', JSON.stringify(r1.body));
  }

  // Essayer aussi le dossier dos_imwyq9
  const sub = '/ged_alxor/recv1ho80vcpy8ltq/rec33mza5ozvggvzz/dos_imwyq9';
  console.log('\nContenu de', sub, ':');
  const r2 = await listFolder(token, sub);
  if (r2.body.entries) {
    r2.body.entries.forEach(e => console.log(' ', e['.tag'], e.path_lower));
  } else {
    console.log('Erreur:', JSON.stringify(r2.body));
  }

  // Essayer aussi le dossier dos_xcwzdh
  const sub2 = '/ged_alxor/recv1ho80vcpy8ltq/rec33mza5ozvggvzz/dos_xcwzdh';
  console.log('\nContenu de', sub2, ':');
  const r3 = await listFolder(token, sub2);
  if (r3.body.entries) {
    r3.body.entries.forEach(e => console.log(' ', e['.tag'], e.path_lower));
  } else {
    console.log('Erreur:', JSON.stringify(r3.body));
  }

  // Lister le dossier ged_alxor/recv1ho80vcpy8ltq
  const top = '/ged_alxor/recv1ho80vcpy8ltq';
  console.log('\nContenu de', top, ':');
  const r4 = await listFolder(token, top);
  if (r4.body.entries) {
    r4.body.entries.forEach(e => console.log(' ', e['.tag'], e.path_lower));
  } else {
    console.log('Erreur:', JSON.stringify(r4.body));
  }
}

main().catch(e => console.error(e.message));

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
  console.log('account_id:', res.body.account_id);
  console.log('token_type:', res.body.token_type);
  return res.body.access_token;
}

async function main() {
  const token = await getToken();

  // Vérifier les infos du compte
  const acctBody = 'null';
  const acct = await post('api.dropboxapi.com', '/2/users/get_current_account', acctBody, {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(acctBody)
  });
  console.log('\nCompte:', acct.body.email, '| Type:', acct.body.account_type?.['.tag']);

  // Recherche du fichier par nom
  const searchBody = JSON.stringify({
    query: 'pc_recto-specimen',
    options: { max_results: 10 }
  });
  console.log('\nRecherche "pc_recto-specimen" :');
  const search = await post('api.dropboxapi.com', '/2/files/search_v2', searchBody, {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(searchBody)
  });
  if (search.body.matches) {
    if (search.body.matches.length === 0) {
      console.log('Aucun résultat');
    }
    search.body.matches.forEach(m => {
      const meta = m.metadata?.metadata;
      if (meta) console.log(' ', meta['.tag'], meta.path_display);
    });
  } else {
    console.log('Erreur recherche:', JSON.stringify(search.body).substring(0, 300));
  }

  // Lister récursivement depuis la racine (max 10 entries)
  console.log('\nList_folder récursif depuis "" :');
  const listBody = JSON.stringify({ path: '', recursive: true, limit: 20 });
  const list = await post('api.dropboxapi.com', '/2/files/list_folder', listBody, {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(listBody)
  });
  if (list.body.entries) {
    console.log('Entrées trouvées:', list.body.entries.length);
    list.body.entries.slice(0, 20).forEach(e => console.log(' ', e['.tag'], e.path_lower));
  } else {
    console.log('Erreur:', JSON.stringify(list.body).substring(0, 300));
  }
}

main().catch(e => console.error(e.message));

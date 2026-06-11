const https = require('https');
require('dotenv').config();

const APP_KEY = process.env.DROPBOX_APP_KEY;
const APP_SECRET = process.env.DROPBOX_APP_SECRET;
// Code OAuth one-shot : à renseigner dans .env (DROPBOX_AUTH_CODE) au moment du flow d'autorisation
const AUTH_CODE = process.env.DROPBOX_AUTH_CODE;

function post(body) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: 'api.dropboxapi.com', path: '/oauth2/token', method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
    });
    r.on('error', reject);
    r.write(body);
    r.end();
  });
}

async function main() {
  const body = `grant_type=authorization_code&code=${AUTH_CODE}&client_id=${APP_KEY}&client_secret=${APP_SECRET}`;
  const res = await post(body);
  console.log('Status:', res.status);
  if (res.body.refresh_token) {
    console.log('refresh_token:', res.body.refresh_token);
    console.log('account_id:', res.body.account_id);
    console.log('uid:', res.body.uid);
  } else {
    console.log('Erreur:', JSON.stringify(res.body));
  }
}
main().catch(e => console.error(e.message));

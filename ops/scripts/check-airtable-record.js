const https = require('https');
require('dotenv').config();

const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
const BASE_ID = 'apprtejZaap5ouqGm';
const TABLE_ID = 'tblfxKmkeklx4FyGY';
const RECORD_ID = 'recKDpsy6vlmKrjBt';

function get(path) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: 'api.airtable.com', path, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + AIRTABLE_TOKEN }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
    });
    r.on('error', reject);
    r.end();
  });
}

async function main() {
  const res = await get(`/v0/${BASE_ID}/${TABLE_ID}/${RECORD_ID}`);
  console.log('Status:', res.status);
  const fields = res.body.fields;
  // Afficher tous les champs qui contiennent "dropbox" ou "path" ou une URL
  Object.entries(fields).forEach(([k, v]) => {
    const str = typeof v === 'string' ? v : JSON.stringify(v);
    if (str.toLowerCase().includes('dropbox') || str.toLowerCase().includes('/ged') || str.toLowerCase().includes('http') || k.toLowerCase().includes('path') || k.toLowerCase().includes('fichier') || k.toLowerCase().includes('doc')) {
      console.log(`${k}: ${str.substring(0, 300)}`);
    }
  });
  console.log('\n--- Tous les champs ---');
  Object.entries(fields).forEach(([k, v]) => {
    const str = typeof v === 'string' ? v : JSON.stringify(v).substring(0, 150);
    console.log(`${k}: ${str}`);
  });
}
main().catch(e => console.error(e.message));

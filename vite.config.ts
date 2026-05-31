import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.REACT_APP_AIRTABLE_API_KEY': JSON.stringify(
          env.REACT_APP_AIRTABLE_API_KEY ?? ''
        ),
        'process.env.REACT_APP_AIRTABLE_TOKEN': JSON.stringify(
          env.REACT_APP_AIRTABLE_TOKEN ?? ''
        ),
        'process.env.REACT_APP_AIRTABLE_PAT': JSON.stringify(
          env.REACT_APP_AIRTABLE_PAT ?? ''
        ),
        'process.env.REACT_APP_AIRTABLE_BASE_ID': JSON.stringify(
          env.REACT_APP_AIRTABLE_BASE_ID ?? ''
        ),
        'process.env.REACT_APP_AIRTABLE_TABLE_NAME': JSON.stringify(
          env.REACT_APP_AIRTABLE_TABLE_NAME ?? 'Dossiers'
        ),
        'process.env.REACT_APP_AIRTABLE_CONTACTS_TABLE': JSON.stringify(
          env.REACT_APP_AIRTABLE_CONTACTS_TABLE ?? 'Contacts'
        ),
        'process.env.REACT_APP_AIRTABLE_CONTACT_LINK_FIELD': JSON.stringify(
          env.REACT_APP_AIRTABLE_CONTACT_LINK_FIELD ?? ''
        ),
        'process.env.REACT_APP_DOSSIER_RIB_FIELD': JSON.stringify(
          env.REACT_APP_DOSSIER_RIB_FIELD ?? 'RIB'
        ),
        'process.env.REACT_APP_CLOUDINARY_CLOUD_NAME': JSON.stringify(
          env.REACT_APP_CLOUDINARY_CLOUD_NAME ?? ''
        ),
        'process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET': JSON.stringify(
          env.REACT_APP_CLOUDINARY_UPLOAD_PRESET ?? ''
        ),
        'process.env.REACT_APP_N8N_BASE_URL': JSON.stringify(
          env.REACT_APP_N8N_BASE_URL ?? ''
        ),
        'process.env.REACT_APP_N8N_UPLOAD_WEBHOOK': JSON.stringify(
          env.REACT_APP_N8N_UPLOAD_WEBHOOK ?? ''
        ),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './'), // Forçage de lecture racine
        }
      }
    };
});

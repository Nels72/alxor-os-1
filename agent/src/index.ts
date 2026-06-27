import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runAgent } from './agent.js';
import type { AlexRequest } from './types.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/alex/chat', async (req, res) => {
  try {
    const { message, context, history } = req.body as AlexRequest;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message requis' });
      return;
    }

    if (!process.env.OPENROUTER_API_KEY) {
      res.status(500).json({ error: 'OPENROUTER_API_KEY non configurée' });
      return;
    }

    const result = await runAgent(message, context || {}, history);
    res.json(result);
  } catch (err) {
    console.error('[alex] Erreur:', err);
    const message = err instanceof Error ? err.message : 'Erreur interne';
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`[alex] Alex Assistant écoute sur le port ${PORT}`);
  console.log(`[alex] CORS: ${CORS_ORIGIN}`);
  console.log(`[alex] OpenRouter API: ${process.env.OPENROUTER_API_KEY ? '✓ configurée' : '✗ manquante'}`);
  console.log(`[alex] Modèle LLM: ${process.env.LLM_MODEL || 'moonshotai/kimi-k2.6'}`);
  console.log(`[alex] Airtable PAT: ${process.env.AIRTABLE_PAT ? '✓ configuré' : '✗ manquant'}`);
});

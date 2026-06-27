import { OPENAI_TOOLS, executeTool } from './tools/registry.js';
import { buildSystemPrompt } from './prompts/system.js';
import type { AlexContext, AlexResponse, HistoryMessage } from './types.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MAX_TURNS = 10;

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content?: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length';
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

async function callOpenRouter(messages: OpenAIMessage[]): Promise<OpenAIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY non configurée');

  const model = process.env.LLM_MODEL || 'moonshotai/kimi-k2.6';

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://alxor-os.fr',
      'X-Title': 'Alex Assistant - Easy Courtage',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages,
      tools: OPENAI_TOOLS,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }

  return (await res.json()) as OpenAIResponse;
}

export async function runAgent(
  userMessage: string,
  context: AlexContext,
  history?: HistoryMessage[],
): Promise<AlexResponse> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: buildSystemPrompt(context) },
  ];

  if (history?.length) {
    const recent = history.slice(-20);
    for (const h of recent) {
      messages.push({ role: h.role, content: h.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  const toolsCalled: string[] = [];
  let totalTokens = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await callOpenRouter(messages);
    const choice = response.choices?.[0];

    if (!choice) {
      return {
        text: '[Alex] Pas de réponse du modèle.',
        tokensUsed: totalTokens,
        toolsCalled,
      };
    }

    totalTokens += response.usage?.total_tokens || 0;
    const msg = choice.message;

    if (choice.finish_reason === 'stop' || !msg.tool_calls?.length) {
      return {
        text: msg.content || '[Pas de réponse]',
        tokensUsed: totalTokens,
        toolsCalled,
      };
    }

    messages.push({
      role: 'assistant',
      content: msg.content || null,
      tool_calls: msg.tool_calls,
    });

    const toolResults = await Promise.all(
      msg.tool_calls.map(async (tc) => {
        toolsCalled.push(tc.function.name);
        console.log(
          `[alex] Tool call: ${tc.function.name}`,
          tc.function.arguments.slice(0, 200),
        );

        try {
          const input = JSON.parse(tc.function.arguments);
          const result = await executeTool(tc.function.name, input);
          return {
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
          console.error(`[alex] Tool error (${tc.function.name}):`, errorMsg);
          return {
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify({ error: errorMsg }),
          };
        }
      }),
    );

    messages.push(...toolResults);
  }

  return {
    text: "[Alex] J'ai atteint la limite de raisonnement. Peux-tu reformuler ta question de manière plus précise ?",
    tokensUsed: totalTokens,
    toolsCalled,
  };
}

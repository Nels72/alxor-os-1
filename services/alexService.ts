const ALEX_URL = process.env.REACT_APP_ALEX_URL || '';

export interface AlexContext {
  currentPage?: string;
  currentProspectId?: string;
  currentProspectName?: string;
  currentProspectType?: string;
  sessionId?: string;
  courtierId?: string;
  courtierName?: string;
}

export interface AlexResponse {
  text: string;
  interactionId?: string;
  tokensUsed: number;
  toolsCalled: string[];
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function askAlex(
  message: string,
  context: AlexContext,
  history?: HistoryMessage[],
): Promise<AlexResponse> {
  const response = await fetch(`${ALEX_URL}/api/alex/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, history: history || [] }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Alex Assistant erreur (${response.status}): ${text}`);
  }

  return (await response.json()) as AlexResponse;
}

export async function sendAlexFeedback(
  interactionId: string,
  rating: 'utile' | 'inutile' | 'incorrect',
  detail?: string,
): Promise<void> {
  await fetch(`${ALEX_URL}/api/alex/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interactionId, rating, detail }),
  }).catch(() => {});
}

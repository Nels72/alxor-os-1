export interface AlexContext {
  currentPage?: 'dashboard' | 'prospect_detail' | 'client_portal' | 'conformite';
  currentProspectId?: string;
  currentProspectName?: string;
  currentProspectType?: string;
  sessionId?: string;
  courtierId?: string;
  courtierName?: string;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AlexRequest {
  message: string;
  context: AlexContext;
  history?: HistoryMessage[];
}

export interface AlexResponse {
  text: string;
  interactionId?: string;
  tokensUsed: number;
  toolsCalled: string[];
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}

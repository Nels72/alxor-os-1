import type { ToolDef } from '../types.js';
import * as queryDossiers from './queryDossiers.js';
import * as queryContacts from './queryContacts.js';
import * as getClientFiche from './getClientFiche.js';
import * as analyseMultidetention from './analyseMultidetention.js';
import * as getProductCatalog from './getProductCatalog.js';
import * as queryCollaborateurs from './queryCollaborateurs.js';
import * as queryApporteurs from './queryApporteurs.js';
import * as rapportProduction from './rapportProduction.js';

const TOOL_REGISTRY: ToolDef[] = [
  queryDossiers,
  queryContacts,
  getClientFiche,
  analyseMultidetention,
  getProductCatalog,
  queryCollaborateurs,
  queryApporteurs,
  rapportProduction,
];

export const OPENAI_TOOLS = TOOL_REGISTRY.map((t) => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.inputSchema,
  },
}));

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const tool = TOOL_REGISTRY.find((t) => t.name === name);
  if (!tool) throw new Error(`Outil inconnu: ${name}`);
  return tool.execute(input);
}

import type { WorkflowEdgeDefinition, WorkflowGraph, WorkflowNodeType } from '../../types/workflow';
import { getNodeCatalogItem } from './nodeCatalog';

const triggerTypes = new Set<WorkflowNodeType>([
  'manual_trigger',
  'webhook_trigger',
  'schedule_trigger',
  'gmail_trigger',
  'telegram_trigger',
]);

export function validateWorkflowGraph(graph: WorkflowGraph): string[] {
  const errors: string[] = [];
  const ids = graph.nodes.map((node) => node.id);
  const idSet = new Set(ids);

  if (graph.nodes.length === 0) errors.push('Le graphe doit contenir au moins un nœud.');
  if (idSet.size !== ids.length) errors.push('Les identifiants de nœuds doivent être uniques.');

  const triggers = graph.nodes.filter((node) => triggerTypes.has(node.type));
  if (triggers.length !== 1) errors.push('Le backend exige exactement un nœud déclencheur.');

  for (const edge of graph.edges) {
    if (!idSet.has(edge.source)) errors.push(`La connexion référence une source inconnue : ${edge.source}.`);
    if (!idSet.has(edge.target)) errors.push(`La connexion référence une cible inconnue : ${edge.target}.`);
  }

  if (containsCycle(ids, graph.edges)) {
    errors.push('Le graphe contient un cycle; le backend exige un graphe orienté sans cycle.');
  }

  for (const node of graph.nodes) {
    const item = getNodeCatalogItem(node.type);
    const missing = item.requiredConfig.filter((key) => {
      const value = node.config[key];
      return value === undefined || value === null || value === '';
    });
    if (missing.length > 0) errors.push(`${item.label} : champs requis manquants (${missing.join(', ')}).`);

    const inlineSecretPath = findInlineSecret(node.config);
    if (inlineSecretPath) errors.push(`${item.label} : la configuration contient un champ secret (${inlineSecretPath}); utilisez un credential géré par le backend.`);

    if (node.type === 'schedule_trigger') {
      if (!isValidScheduleCron(node.config.cron)) {
        errors.push('Schedule Trigger : cron doit être une expression valide à cinq champs.');
      }
      if (!isValidScheduleTimezone(node.config.timezone ?? 'UTC')) {
        errors.push('Schedule Trigger : timezone doit être un fuseau horaire IANA valide.');
      }
    }

    if (node.type === 'http_request') {
      const credentialId = node.config.credential_id;
      const credentialType = node.config.credential_type;
      if (credentialId && !['api_key', 'http_header'].includes(String(credentialType))) {
        errors.push('HTTP Request : choisissez un credential API Key ou HTTP Header valide.');
      }
      if (credentialType && !credentialId) {
        errors.push('HTTP Request : un credential_id est requis avec ce type de credential.');
      }
      if (credentialType === 'api_key' && node.config.api_key_header !== undefined && (typeof node.config.api_key_header !== 'string' || !node.config.api_key_header.trim())) {
        errors.push('HTTP Request : api_key_header doit etre un nom de header.');
      }
    }

    if (node.type === 'if_condition') {
      const handles = new Set(graph.edges.filter((edge) => edge.source === node.id).map((edge) => edge.source_handle));
      if (!handles.has('true') || !handles.has('false')) {
        errors.push(`${item.label} : les sorties true et false doivent toutes deux être connectées.`);
      }
    }

    if (node.type === 'telegram_trigger') {
      const chatIds = node.config.allowed_chat_ids;
      if (!Array.isArray(chatIds) || chatIds.length === 0) {
        errors.push('Telegram Trigger : allowed_chat_ids doit être une liste non vide.');
      } else {
        const normalizedIds = chatIds.map(String);
        if (chatIds.some((chatId) => !/^-?\d+$/.test(String(chatId)))) {
          errors.push('Telegram Trigger : chaque allowed_chat_ids doit être un entier.');
        }
        if (new Set(normalizedIds).size !== normalizedIds.length) {
          errors.push('Telegram Trigger : allowed_chat_ids contient des valeurs en double.');
        }
      }
      const interval = node.config.polling_interval_seconds ?? 60;
      if (!Number.isInteger(interval) || Number(interval) < 30 || Number(interval) > 3600) {
        errors.push('Telegram Trigger : polling_interval_seconds doit être un entier entre 30 et 3600.');
      }
    }
  }

  return [...new Set(errors)];
}

export function isValidScheduleCron(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const fields = value.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const bounds: [number, number][] = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
  const names = [
    null,
    null,
    null,
    { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 },
    { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 },
  ];

  return fields.every((field, index) => field.split(',').every((part) => {
    if (!part) return false;
    const [base, step, ...extra] = part.split('/');
    if (extra.length > 0 || (step !== undefined && (!/^\d+$/.test(step) || Number(step) < 1))) return false;
    if (base === '*') return true;
    const range = base.split('-');
    if (range.length > 2) return false;
    const parseValue = (raw: string): number | null => {
      const numeric = /^\d+$/.test(raw) ? Number(raw) : names[index]?.[raw.toLowerCase() as keyof NonNullable<(typeof names)[number]>];
      return typeof numeric === 'number' && numeric >= bounds[index][0] && numeric <= bounds[index][1] ? numeric : null;
    };
    const start = parseValue(range[0]);
    const end = range.length === 2 ? parseValue(range[1]) : start;
    return start !== null && end !== null && start <= end;
  }));
}

export function isValidScheduleTimezone(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function findInlineSecret(value: unknown, path = 'config'): string | null {
  const sensitiveKeys = new Set(['password', 'token', 'secret', 'access_token', 'refresh_token', 'client_secret', 'bot_token', 'api_key', 'api-key', 'authorization', 'private_key']);
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const result = findInlineSecret(item, `${path}[${index}]`);
      if (result) return result;
    }
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  for (const [key, item] of Object.entries(value)) {
    const itemPath = `${path}.${key}`;
    if (sensitiveKeys.has(key.toLowerCase()) && item !== undefined && item !== null && item !== '') return itemPath;
    const result = findInlineSecret(item, itemPath);
    if (result) return result;
  }
  return null;
}

function containsCycle(nodeIds: string[], edges: WorkflowEdgeDefinition[]): boolean {
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) adjacency.set(id, []);
  for (const edge of edges) {
    if (adjacency.has(edge.source) && adjacency.has(edge.target)) adjacency.get(edge.source)?.push(edge.target);
  }

  const visited = new Set<string>();
  const active = new Set<string>();
  function visit(id: string): boolean {
    visited.add(id);
    active.add(id);
    for (const target of adjacency.get(id) ?? []) {
      if (!visited.has(target) && visit(target)) return true;
      if (active.has(target)) return true;
    }
    active.delete(id);
    return false;
  }

  return nodeIds.some((id) => !visited.has(id) && visit(id));
}

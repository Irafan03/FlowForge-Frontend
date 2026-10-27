import type { WorkflowNodeType } from '../../types/workflow';

export type NodeCatalogItem = {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: string;
  group: 'Trigger' | 'Action' | 'Logic';
  color: string;
  requiredConfig: string[];
};

export const NODE_CATALOG: NodeCatalogItem[] = [
  { type: 'google_sheets_append', label: 'Google Sheets · Ajouter une ligne', description: 'Ajouter les valeurs dans une feuille Google', icon: '▤', group: 'Action', color: 'green', requiredConfig: ['credential_id', 'spreadsheet_id', 'range', 'values'] },
  { type: 'ai_agent', label: 'AI Agent (Ollama)', description: 'Générer une réponse avec le modèle configuré', icon: '✧', group: 'Action', color: 'violet', requiredConfig: ['prompt'] },
  { type: 'manual_trigger', label: 'Manual Trigger', description: 'Démarrer à la demande', icon: '▶', group: 'Trigger', color: 'violet', requiredConfig: [] },
  { type: 'webhook_trigger', label: 'Webhook Trigger', description: 'Recevoir un appel HTTP', icon: '⌁', group: 'Trigger', color: 'blue', requiredConfig: [] },
  { type: 'gmail_trigger', label: 'Gmail Trigger', description: 'Surveiller une boîte Gmail', icon: '✉', group: 'Trigger', color: 'red', requiredConfig: ['credential_id'] },
  { type: 'telegram_trigger', label: 'Telegram Trigger', description: 'Écouter un événement Telegram', icon: '➤', group: 'Trigger', color: 'cyan', requiredConfig: ['credential_id', 'allowed_chat_ids'] },
  { type: 'schedule_trigger', label: 'Schedule Trigger', description: 'Démarrer selon une planification', icon: '◷', group: 'Trigger', color: 'amber', requiredConfig: ['cron'] },
  { type: 'gmail_send', label: 'Gmail Send', description: 'Envoyer un e-mail', icon: '✉', group: 'Action', color: 'red', requiredConfig: ['credential_id', 'to', 'subject'] },
  { type: 'telegram_send', label: 'Telegram Send Message', description: 'Envoyer un message', icon: '➤', group: 'Action', color: 'cyan', requiredConfig: ['credential_id', 'chat_id', 'text'] },
  { type: 'http_request', label: 'HTTP Request', description: 'Appeler un service HTTP', icon: '⇄', group: 'Action', color: 'blue', requiredConfig: ['url', 'method'] },
  { type: 'ml_prediction', label: 'ML Prediction', description: 'Exécuter une prédiction ML', icon: '✳', group: 'Action', color: 'purple', requiredConfig: ['model_id', 'input'] },
  { type: 'set_data', label: 'Set Data', description: 'Définir des valeurs de données', icon: '≡', group: 'Logic', color: 'slate', requiredConfig: ['fields'] },
  { type: 'if_condition', label: 'IF Condition', description: 'Diriger selon une condition', icon: '⑂', group: 'Logic', color: 'amber', requiredConfig: ['condition'] },
];

export function getNodeCatalogItem(type: WorkflowNodeType): NodeCatalogItem {
  const item = NODE_CATALOG.find((candidate) => candidate.type === type);
  if (!item) throw new Error(`Unknown workflow node type: ${type}`);
  return item;
}

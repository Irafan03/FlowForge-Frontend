import type { Edge, Node } from '@xyflow/react';

export const WORKFLOW_NODE_TYPES = [
  'manual_trigger',
  'webhook_trigger',
  'schedule_trigger',
  'gmail_trigger',
  'telegram_trigger',
  'set_data',
  'if_condition',
  'http_request',
  'gmail_send',
  'telegram_send',
  'ml_prediction',
] as const;

export type WorkflowNodeType = (typeof WORKFLOW_NODE_TYPES)[number];
export type JsonObject = Record<string, unknown>;

export type WorkflowNodeDefinition = {
  id: string;
  type: WorkflowNodeType;
  name?: string | null;
  config: JsonObject;
  position: { x: number; y: number };
};

export type WorkflowEdgeDefinition = {
  id?: string | null;
  source: string;
  target: string;
  source_handle?: string | null;
  target_handle?: string | null;
};

export type WorkflowGraph = {
  nodes: WorkflowNodeDefinition[];
  edges: WorkflowEdgeDefinition[];
};

export type WorkflowNodeData = {
  workflowType: WorkflowNodeType;
  label: string;
  config: JsonObject;
};

export type WorkflowFlowNode = Node<WorkflowNodeData, 'workflowNode'>;
export type WorkflowFlowEdge = Edge;

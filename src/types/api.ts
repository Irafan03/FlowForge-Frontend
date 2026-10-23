import type { WorkflowGraph } from './workflow';

export type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
};

export type AuthTokenResponse = {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
};

export type Workflow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  graph: WorkflowGraph;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  skip: number;
  limit: number;
};

export type WorkflowCreate = {
  name: string;
  description?: string | null;
  graph: WorkflowGraph;
};

export type WorkflowUpdate = Partial<WorkflowCreate>;

export type ExecutionStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
export type NodeExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export type NodeExecution = {
  id: string;
  node_id: string;
  node_type: string;
  status: NodeExecutionStatus;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
};

export type Execution = {
  id: string;
  workflow_id: string;
  user_id: string;
  status: ExecutionStatus;
  trigger_type: string;
  input_data: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  created_at: string;
  node_executions: NodeExecution[];
};

export type EnqueuedExecution = {
  execution_id: string;
  status: ExecutionStatus;
  workflow_id: string;
  created_at: string;
};

export type Credential = {
  id: string;
  name: string;
  type: 'api_key' | 'oauth2_google' | 'telegram_bot' | 'http_header' | string;
  created_at: string;
  updated_at: string;
};

export type CredentialCreate = {
  name: string;
  type: 'api_key' | 'oauth2_google' | 'telegram_bot' | 'http_header';
  data: Record<string, unknown>;
};

export type WorkflowActivation = { id: string; is_active: boolean };

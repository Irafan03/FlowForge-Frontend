import type { EnqueuedExecution, Execution, ExecutionStatus, PaginatedResponse } from '../types/api';
import { apiRequest } from './apiClient';

type ExecutionListFilters = { skip?: number; limit?: number; workflow_id?: string; status?: ExecutionStatus };

function toQuery(filters: ExecutionListFilters): string {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const result = query.toString();
  return result ? `?${result}` : '';
}

export const executionService = {
  list(token: string, filters: ExecutionListFilters = {}): Promise<PaginatedResponse<Execution>> {
    return apiRequest(`/executions${toQuery(filters)}`, { token });
  },
  get(token: string, executionId: string): Promise<Execution> {
    return apiRequest(`/executions/${encodeURIComponent(executionId)}`, { token });
  },
  trigger(token: string, workflowId: string, input_data: Record<string, unknown> = {}): Promise<EnqueuedExecution> {
    return apiRequest(`/workflows/${encodeURIComponent(workflowId)}/executions`, { method: 'POST', token, body: { input_data } });
  },
  cancel(token: string, executionId: string): Promise<Execution> {
    return apiRequest(`/executions/${encodeURIComponent(executionId)}/cancel`, { method: 'POST', token });
  },
};

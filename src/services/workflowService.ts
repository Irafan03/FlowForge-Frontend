import type { PaginatedResponse, Workflow, WorkflowActivation, WorkflowCreate, WorkflowUpdate } from '../types/api';
import { apiRequest, getApiBaseUrl } from './apiClient';

type WorkflowListFilters = { skip?: number; limit?: number; is_active?: boolean };

function toQuery(filters: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const result = query.toString();
  return result ? `?${result}` : '';
}

export const workflowService = {
  list(token: string, filters: WorkflowListFilters = {}): Promise<PaginatedResponse<Workflow>> {
    return apiRequest(`/workflows${toQuery(filters)}`, { token });
  },
  get(token: string, workflowId: string): Promise<Workflow> {
    return apiRequest(`/workflows/${encodeURIComponent(workflowId)}`, { token });
  },
  create(token: string, input: WorkflowCreate): Promise<Workflow> {
    return apiRequest('/workflows', { method: 'POST', token, body: input });
  },
  update(token: string, workflowId: string, input: WorkflowUpdate): Promise<Workflow> {
    return apiRequest(`/workflows/${encodeURIComponent(workflowId)}`, { method: 'PUT', token, body: input });
  },
  delete(token: string, workflowId: string): Promise<void> {
    return apiRequest(`/workflows/${encodeURIComponent(workflowId)}`, { method: 'DELETE', token });
  },
  activate(token: string, workflowId: string): Promise<WorkflowActivation> {
    return apiRequest(`/workflows/${encodeURIComponent(workflowId)}/activate`, { method: 'POST', token });
  },
  deactivate(token: string, workflowId: string): Promise<WorkflowActivation> {
    return apiRequest(`/workflows/${encodeURIComponent(workflowId)}/deactivate`, { method: 'POST', token });
  },
  async getWebhookUrl(token: string, workflowId: string): Promise<string> {
    const response = await apiRequest<{ webhook_path: string }>(
      `/workflows/${encodeURIComponent(workflowId)}/webhook-url`,
      { token },
    );
    return new URL(response.webhook_path, `${getApiBaseUrl().replace(/\/+$/, '')}/`).toString();
  },
};

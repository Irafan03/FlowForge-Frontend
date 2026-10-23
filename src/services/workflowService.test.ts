import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl } from './apiClient';
import { workflowService } from './workflowService';

afterEach(() => vi.unstubAllGlobals());

describe('workflowService webhook URL', () => {
  it('resolves the authenticated webhook path against the configured API base', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      webhook_path: 'webhooks/opaque-token',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const apiBaseUrl = getApiBaseUrl();

    await expect(workflowService.getWebhookUrl('session-token', 'workflow-1'))
      .resolves.toBe(`${apiBaseUrl}/webhooks/opaque-token`);

    const [requestUrl, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe(`${apiBaseUrl}/workflows/workflow-1/webhook-url`);
    expect((request.headers as Headers).get('Authorization')).toBe('Bearer session-token');
  });
});

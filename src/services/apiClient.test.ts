import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './apiClient';

afterEach(() => vi.unstubAllGlobals());

describe('apiRequest', () => {
  it('sends JSON and bearer auth through the shared client', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'wf-1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest<{ id: string }>('/workflows', {
      method: 'POST',
      token: 'session-token',
      body: { name: 'Example' },
    })).resolves.toEqual({ id: 'wf-1' });

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request.headers).toBeInstanceOf(Headers);
    expect((request.headers as Headers).get('Authorization')).toBe('Bearer session-token');
    expect((request.headers as Headers).get('Content-Type')).toBe('application/json');
    expect(request.body).toBe(JSON.stringify({ name: 'Example' }));
  });

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiRequest<void>('/workflows/wf-1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('converts FastAPI validation details into a readable API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: [{ msg: 'Field required' }, { msg: 'Invalid value' }],
    }), { status: 422, headers: { 'Content-Type': 'application/json' } })));

    await expect(apiRequest('/workflows')).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      message: 'Field required · Invalid value',
    });
  });

  it('wraps network failures and preserves cancellation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(apiRequest('/health')).rejects.toBeInstanceOf(ApiError);

    const abortError = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));
    await expect(apiRequest('/health')).rejects.toBe(abortError);
  });
});

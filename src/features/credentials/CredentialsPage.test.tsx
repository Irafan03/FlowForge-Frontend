import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { getApiBaseUrl } from '../../services/apiClient';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  getAuthorizationUrl: vi.fn(),
  showToast: vi.fn(),
  session: { accessToken: 'session-token', email: 'user@example.com', expiresAt: Date.now() + 60_000 },
}));

vi.mock('../../app/AuthContext', () => ({ useAuth: () => ({ session: mocks.session }) }));
vi.mock('../../app/ToastContext', () => ({ useToast: () => ({ showToast: mocks.showToast }) }));
vi.mock('../../services/credentialService', () => ({
  credentialService: { list: mocks.list, create: mocks.create, delete: mocks.remove },
}));
vi.mock('../../services/googleIntegrationService', () => ({
  googleIntegrationService: { getAuthorizationUrl: mocks.getAuthorizationUrl },
}));

import { CredentialsPage } from './CredentialsPage';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('CredentialsPage Google OAuth', () => {
  it('opens the authorization URL in a popup and reloads credentials on success', async () => {
    const popup = { location: { href: '' }, close: vi.fn() };
    const open = vi.fn().mockReturnValue(popup);
    mocks.list.mockResolvedValue([]);
    mocks.getAuthorizationUrl.mockResolvedValue({ authorization_url: 'https://accounts.google.com/oauth' });
    vi.stubGlobal('open', open);

    render(<MemoryRouter><CredentialsPage /></MemoryRouter>);
    await waitFor(() => expect(mocks.list).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Connecter Google' }));

    await waitFor(() => expect(popup.location.href).toBe('https://accounts.google.com/oauth'));
    expect(open).toHaveBeenCalledWith('about:blank', 'flowforge-google-oauth', 'popup,width=600,height=720');
    expect(mocks.getAuthorizationUrl).toHaveBeenCalledWith('session-token');

    window.dispatchEvent(new MessageEvent('message', {
      origin: new URL(getApiBaseUrl()).origin,
      data: { type: 'flowforge:google-oauth', status: 'connected' },
    }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    expect(mocks.showToast).toHaveBeenCalledWith('Compte Google connecté.', 'success');
  });
});

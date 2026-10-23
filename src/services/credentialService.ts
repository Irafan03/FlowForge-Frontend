import type { Credential, CredentialCreate } from '../types/api';
import { apiRequest } from './apiClient';

export const credentialService = {
  create(token: string, input: CredentialCreate): Promise<Credential> {
    return apiRequest('/credentials', { method: 'POST', token, body: input });
  },
  list(token: string): Promise<Credential[]> {
    return apiRequest('/credentials', { token });
  },
  delete(token: string, credentialId: string): Promise<void> {
    return apiRequest(`/credentials/${encodeURIComponent(credentialId)}`, { method: 'DELETE', token });
  },
};

import { apiRequest } from './apiClient';

export const googleIntegrationService = {
  getAuthorizationUrl(token: string): Promise<{ authorization_url: string }> {
    return apiRequest('/integrations/google/auth-url', { token });
  },
};

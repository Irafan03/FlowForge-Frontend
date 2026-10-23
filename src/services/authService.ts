import type { AuthTokenResponse, AuthUser } from '../types/api';
import { apiRequest } from './apiClient';

export type RegisterInput = { email: string; password: string; full_name?: string };
export type LoginInput = { email: string; password: string };

export const authService = {
  register(input: RegisterInput): Promise<AuthUser> {
    return apiRequest('/auth/register', { method: 'POST', body: input });
  },
  login(input: LoginInput): Promise<AuthTokenResponse> {
    return apiRequest('/auth/login', { method: 'POST', body: input });
  },
};

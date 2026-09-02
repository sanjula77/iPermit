import { apiClient } from '@/lib/api-client';
import type { TokenResponse, User } from '@/types/auth';

export interface LoginPayload {
  identifier: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  return apiClient.post<TokenResponse>('/auth/login', payload);
}

export async function fetchCurrentUser(): Promise<User> {
  return apiClient.get<User>('/auth/me');
}

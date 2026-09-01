import { apiClient } from '@/api/client';
import type { TokenResponse, User } from '@/types/auth';

export interface RegisterPayload {
  email: string;
  nic: string;
  password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export async function register(payload: RegisterPayload): Promise<User> {
  return apiClient.post<User>('/auth/register', payload);
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  return apiClient.post<TokenResponse>('/auth/login', payload);
}

export async function fetchCurrentUser(): Promise<User> {
  return apiClient.get<User>('/auth/me');
}

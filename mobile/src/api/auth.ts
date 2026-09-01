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
  const { data } = await apiClient.post<User>('/auth/register', payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', payload);
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}

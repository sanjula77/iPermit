import { create, isAxiosError } from 'axios';

import { getToken } from '@/lib/token-storage';

// Set EXPO_PUBLIC_API_URL in .env for a physical device / Android emulator
// (localhost won't reach a host-machine backend from those). See mobile/README.md.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const apiClient = create({
  baseURL: API_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (error.message) return error.message;
  }
  return 'Something went wrong. Please try again.';
}

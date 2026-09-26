import { fetch } from 'expo/fetch';

import { getToken } from '@/lib/token-storage';

// Set EXPO_PUBLIC_API_URL in .env for a physical device / Android emulator
// (localhost won't reach a host-machine backend from those). See mobile/README.md.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    const message = typeof detail === 'string' ? detail : `HTTP ${response.status}`;
    throw new ApiError(message, response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

// Multipart uploads use XMLHttpRequest, not fetch: on native, Expo installs
// expo/fetch as the global fetch, and it rejects React Native's
// `{ uri, name, type }` file parts ("Unsupported FormDataPart implementation").
// XMLHttpRequest is React Native's own networking layer, which uploads those
// parts straight from disk; web `File` parts work with it too. No Content-Type
// header -- XHR sets the multipart boundary itself.
async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const token = await getToken();

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.onload = () => {
      let body: { detail?: unknown } | null = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T);
        return;
      }
      const detail = body?.detail;
      const message = typeof detail === 'string' ? detail : `HTTP ${xhr.status}`;
      reject(new ApiError(message, xhr.status, detail));
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.send(formData);
  });
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  postForm: <T>(path: string, formData: FormData): Promise<T> => requestForm<T>(path, formData),
};

export function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  // Non-HTTP failures (network, request building) otherwise all collapse into
  // the generic message; in development, surface the real cause.
  if (__DEV__ && error instanceof Error) {
    console.error('[api] request failed:', error);
    return `Something went wrong: ${error.message}`;
  }
  return 'Something went wrong. Please try again.';
}

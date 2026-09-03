const TOKEN_KEY = 'ipermit_admin_token';

// Guarded for SSR: Next.js renders client components on the server for the
// initial pass too, where `window` doesn't exist yet.
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function saveToken(token: string): void {
  if (isBrowser()) window.localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return isBrowser() ? window.localStorage.getItem(TOKEN_KEY) : null;
}

export function deleteToken(): void {
  if (isBrowser()) window.localStorage.removeItem(TOKEN_KEY);
}

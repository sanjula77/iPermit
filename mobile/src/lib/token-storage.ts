import * as SecureStore from 'expo-secure-store';

import type { User } from '@/types/auth';

// expo-secure-store is native-only; it throws on web. Fall back to localStorage
// there so the same auth flow works in the web preview used for development.
const TOKEN_KEY = 'ipermit_access_token';
const isWeb = process.env.EXPO_OS === 'web';

// "Remember me" off: the token lives only in memory for this app session, so
// closing the app signs the user out. Checked first by getToken().
let sessionToken: string | null = null;

export async function saveToken(token: string, { persist = true }: { persist?: boolean } = {}): Promise<void> {
  if (!persist) {
    sessionToken = token;
    // Clear any token remembered from an earlier login.
    await deleteStoredToken();
    return;
  }
  sessionToken = null;
  if (isWeb) {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (sessionToken) return sessionToken;
  if (isWeb) {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  sessionToken = null;
  await deleteStoredToken();
  await deleteCachedUser();
}

// The signed-in user is kept alongside the token so the app can open and stay
// signed in with no connection (an officer in a dead zone still needs to record
// violations). It is the same few fields /auth/me returns.
const USER_KEY = 'ipermit_cached_user';

export async function saveCachedUser(user: User): Promise<void> {
  const json = JSON.stringify(user);
  if (isWeb) {
    window.localStorage.setItem(USER_KEY, json);
    return;
  }
  await SecureStore.setItemAsync(USER_KEY, json);
}

export async function getCachedUser(): Promise<User | null> {
  try {
    const json = isWeb ? window.localStorage.getItem(USER_KEY) : await SecureStore.getItemAsync(USER_KEY);
    return json ? (JSON.parse(json) as User) : null;
  } catch {
    return null;
  }
}

async function deleteCachedUser(): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(USER_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(USER_KEY);
}

async function deleteStoredToken(): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

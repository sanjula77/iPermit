import * as SecureStore from 'expo-secure-store';

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
}

async function deleteStoredToken(): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

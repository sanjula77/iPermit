import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store is native-only; it throws on web. Fall back to localStorage
// there so the same auth flow works in the web preview used for development.
const TOKEN_KEY = 'ipermit_access_token';
const isWeb = Platform.OS === 'web';

export async function saveToken(token: string): Promise<void> {
  if (isWeb) {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (isWeb) {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import * as authApi from '@/api/auth';
import { ApiError } from '@/api/client';
import { deleteToken, getCachedUser, getToken, saveCachedUser, saveToken } from '@/lib/token-storage';
import type { User } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string, remember?: boolean) => Promise<void>;
  register: (email: string, nic: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const currentUser = await authApi.fetchCurrentUser();
          setUser(currentUser);
          await saveCachedUser(currentUser);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            // The server says the token is invalid/expired: clear it and fall
            // through to login.
            await deleteToken();
          } else {
            // No connection (or the server is down): that says nothing about
            // the token. Stay signed in as the last known user so an officer in
            // a dead zone can still record violations; they send when back online.
            const cached = await getCachedUser();
            if (cached) setUser(cached);
          }
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (identifier: string, password: string, remember = true) => {
    const { access_token } = await authApi.login({ identifier, password });
    // remember=false keeps the session in memory only (see token-storage).
    await saveToken(access_token, { persist: remember });
    const currentUser = await authApi.fetchCurrentUser();
    setUser(currentUser);
    await saveCachedUser(currentUser);
  }, []);

  const register = useCallback(async (email: string, nic: string, password: string) => {
    await authApi.register({ email, nic, password });
    // Registration doesn't return a token (REQ-1) — log in right after so the
    // flow feels continuous instead of dropping the user back at the login form.
    await login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    await deleteToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

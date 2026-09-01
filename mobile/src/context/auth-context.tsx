import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import * as authApi from '@/api/auth';
import { deleteToken, getToken, saveToken } from '@/lib/token-storage';
import type { User } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
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
        } catch {
          // Stored token is invalid/expired — clear it and fall through to login.
          await deleteToken();
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const { access_token } = await authApi.login({ identifier, password });
    await saveToken(access_token);
    const currentUser = await authApi.fetchCurrentUser();
    setUser(currentUser);
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
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

'use client';

import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import * as authApi from '@/lib/auth-api';
import { deleteToken, getToken, saveToken } from '@/lib/token-storage';
import type { User } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (token) {
        try {
          const currentUser = await authApi.fetchCurrentUser();
          if (currentUser.role === 'ADMIN') {
            setUser(currentUser);
          } else {
            deleteToken();
          }
        } catch {
          deleteToken();
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const { access_token } = await authApi.login({ identifier, password });
    saveToken(access_token);
    const currentUser = await authApi.fetchCurrentUser();
    if (currentUser.role !== 'ADMIN') {
      deleteToken();
      throw new Error('This dashboard is for admin accounts only.');
    }
    setUser(currentUser);
  }, []);

  const logout = useCallback(() => {
    deleteToken();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

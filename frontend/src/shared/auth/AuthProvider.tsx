import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { client } from '../../api/client';
import type { User } from '../../api/types';

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  error: string;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const refreshUser = async () => {
    try {
      const payload = await client.me();
      setUser(payload.user);
      setError('');
    } catch (e) {
      setUser(null);
      setError((e as Error).message || '');
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const login = async (token: string) => {
    const payload = await client.login(token);
    setUser(payload.user);
    setError('');
    setReady(true);
  };

  const logout = async () => {
    try {
      await client.logout();
    } finally {
      setUser(null);
      setError('');
      setReady(true);
    }
  };

  return (
    <AuthContext.Provider value={{ user, ready, error, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

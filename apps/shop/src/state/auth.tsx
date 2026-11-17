import { type ReactNode, createContext, useContext, useState } from 'react';
import { load, save } from '../lib/storage';

const KEY = 'saboteur.session';

export const TEST_ACCOUNT = { email: 'demo@saboteur.shop', password: 'sabotage123' };

type AuthApi = {
  email: string | null;
  signIn(email: string, password: string): boolean;
  signOut(): void;
};

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() => load<string | null>(KEY, null));

  const api: AuthApi = {
    email,
    signIn(e, p) {
      const ok = e.trim().toLowerCase() === TEST_ACCOUNT.email && p === TEST_ACCOUNT.password;
      if (ok) {
        setEmail(TEST_ACCOUNT.email);
        save(KEY, TEST_ACCOUNT.email);
      }
      return ok;
    },
    signOut() {
      setEmail(null);
      save(KEY, null);
    },
  };

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

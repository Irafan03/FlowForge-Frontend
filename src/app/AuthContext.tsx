import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AuthSession = {
  accessToken: string;
  email: string;
  expiresAt: number;
};

type AuthContextValue = {
  session: AuthSession | null;
  establishSession: (accessToken: string, email: string, expiresInSeconds: number) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  const signOut = () => setSession(null);
  const establishSession = (accessToken: string, email: string, expiresInSeconds: number) => {
    setSession({ accessToken, email, expiresAt: Date.now() + expiresInSeconds * 1000 });
  };

  useEffect(() => {
    const handleUnauthorized = () => signOut();
    window.addEventListener('flowforge:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('flowforge:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) {
      signOut();
      return;
    }
    const timer = window.setTimeout(signOut, remaining);
    return () => window.clearTimeout(timer);
  }, [session]);

  const value = useMemo(() => ({ session, establishSession, signOut }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be rendered within AuthProvider');
  return value;
}

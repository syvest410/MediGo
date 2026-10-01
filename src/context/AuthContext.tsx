import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';

export interface DatabaseStatus {
  provider: 'supabase' | 'local_persistent';
  supabaseConfigured: boolean;
  supabaseConnected?: boolean;
  tablesCreated?: boolean;
  missingTables?: string[];
  userCount: number;
  orderCount: number;
  supabaseUrl?: string;
  message?: string;
}

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  quickLoginAs: (role?: Role, email?: string) => Promise<{ success: boolean; token?: string; user?: User; error?: string }>;
  ensureValidToken: (roleFallback?: Role) => Promise<string | null>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  dbStatus: DatabaseStatus | null;
  refreshDbStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'medigo_auth_token';
const USER_KEY = 'medigo_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t || t === 'null' || t === 'undefined') return null;
    return t;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.warn('Could not fetch DB status:', err);
    }
  };

  // Verify stored token on initial load
  useEffect(() => {
    const verifyExistingSession = async () => {
      if (!token) {
        // Automatically establish active session
        await autoEstablishSession();
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } else {
          // Token invalid or expired - auto refresh session
          await autoEstablishSession();
        }
      } catch (err) {
        console.warn('Session verification fallback:', err);
        await autoEstablishSession();
      } finally {
        setIsLoading(false);
        fetchDbStatus();
      }
    };

    verifyExistingSession();
  }, []);

  const autoEstablishSession = async () => {
    try {
      const res = await fetch('/api/auth/quick-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: currentUser?.role || 'ADMIN',
          email: currentUser?.email || 'nsansvester89@gmail.com',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          setCurrentUser(data.user);
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
      }
    } catch (e) {
      console.warn('Auto-session establishment failed:', e);
    } finally {
      setIsLoading(false);
      fetchDbStatus();
    }
  };

  const ensureValidToken = async (roleFallback?: Role): Promise<string | null> => {
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          return token;
        }
      } catch (err) {
        // Continue to fresh token request
      }
    }

    try {
      const targetRole = roleFallback || currentUser?.role || 'ADMIN';
      const targetEmail = currentUser?.email || (targetRole === 'ADMIN' ? 'nsansvester89@gmail.com' : undefined);

      const res = await fetch('/api/auth/quick-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: targetRole,
          email: targetEmail,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          setCurrentUser(data.user);
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          return data.token;
        }
      }
    } catch (err) {
      console.warn('[Auth] ensureValidToken failed:', err);
    }
    return token;
  };

  const quickLoginAs = async (role?: Role, email?: string): Promise<{ success: boolean; token?: string; user?: User; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/quick-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setIsLoading(false);
        return { success: false, error: data.message || 'Quick login failed' };
      }
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setIsLoading(false);
      fetchDbStatus();
      return { success: true, token: data.token, user: data.user };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Quick login network error' };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.message || 'Login failed' };
      }

      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      setIsLoading(false);
      fetchDbStatus();
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: Boolean(currentUser && token),
        isLoading,
        login,
        quickLoginAs,
        ensureValidToken,
        logout,
        refreshUser,
        dbStatus,
        refreshDbStatus: fetchDbStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

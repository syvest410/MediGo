import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { apiFetch, setMemoryToken, refreshSession, registerAuthHandlers, parseJsonSafe } from '../lib/apiFetch';
import { authChannel } from '../lib/authChannel';

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes configurable idle timeout

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
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateSession: (user: User, token: string) => void;
  dbStatus: DatabaseStatus | null;
  refreshDbStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session state held ONLY in React memory - zero localStorage/sessionStorage persistence
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearSessionMemory = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    setMemoryToken(null);
  }, []);

  const fetchDbStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/db/status');
      if (res.ok) {
        const data = await parseJsonSafe<DatabaseStatus>(res);
        if (data) {
          setDbStatus(data);
        }
      }
    } catch (err) {
      console.warn('Could not fetch DB status:', err);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Clear server-side refresh token family and cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.warn('Logout network error (clearing local session regardless):', err);
    } finally {
      clearSessionMemory();
      authChannel.notifyLogout();
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    }
  }, [clearSessionMemory]);

  // Connect apiFetch refresh callbacks to React state
  useEffect(() => {
    registerAuthHandlers(
      (newToken, refreshedUser) => {
        setToken(newToken);
        if (refreshedUser) {
          setCurrentUser(refreshedUser);
        }
      },
      () => {
        clearSessionMemory();
      }
    );
  }, [clearSessionMemory]);

  // Multi-tab logout listener
  useEffect(() => {
    const unsubscribe = authChannel.onLogout(() => {
      clearSessionMemory();
    });
    return unsubscribe;
  }, [clearSessionMemory]);

  // Initial session recovery on app mount: POST /api/auth/refresh with credentials: 'include'
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          const data = await parseJsonSafe(res);
          if (isMounted && data) {
            const accessToken = data.accessToken || data.token;
            setToken(accessToken);
            setMemoryToken(accessToken);
            setCurrentUser(data.user);
          }
        } else {
          if (isMounted) {
            clearSessionMemory();
          }
        }
      } catch (err) {
        console.warn('Initial session recovery failed (showing login):', err);
        if (isMounted) {
          clearSessionMemory();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          fetchDbStatus();
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
    };
  }, [clearSessionMemory, fetchDbStatus]);

  // Idle timeout handler (15 minutes of inactivity)
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    if (currentUser) {
      idleTimerRef.current = setTimeout(() => {
        console.warn('[Security] Idle timeout reached (15 minutes inactive). Logging out.');
        logout();
      }, IDLE_TIMEOUT_MS);
    }
  }, [currentUser, logout]);

  useEffect(() => {
    if (!currentUser) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      return;
    }

    resetIdleTimer();

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => resetIdleTimer();

    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [currentUser, resetIdleTimer]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setIsLoading(false);
        const errorMsg = data?.message || `Server error (${res.status}). Please try again.`;
        return { success: false, error: errorMsg };
      }

      if (!data) {
        setIsLoading(false);
        return { success: false, error: `Server error (${res.status}). Please try again.` };
      }

      const accessToken = data.accessToken || data.token;
      setToken(accessToken);
      setMemoryToken(accessToken);
      setCurrentUser(data.user);

      setIsLoading(false);
      fetchDbStatus();
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const refreshUser = async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await parseJsonSafe(res);
        if (data?.user) {
          setCurrentUser(data.user);
        }
      } else {
        await logout();
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
      await logout();
    }
  };

  const updateSession = (updatedUser: User, newToken: string) => {
    setCurrentUser(updatedUser);
    setToken(newToken);
    setMemoryToken(newToken);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: Boolean(currentUser && token),
        isLoading,
        login,
        logout,
        refreshUser,
        updateSession,
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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { auth, testConnection } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isUser: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'portal_smkn1_auth_token';

// In-memory fallback if localStorage is disabled or restricted in iframe
const memoryFallback: Record<string, string> = {};

function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (err) {
    console.warn('[Storage] localStorage get restricted, using memory store', err);
  }
  return memoryFallback[key] || null;
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (err) {
    console.warn('[Storage] localStorage set restricted, using memory store', err);
  }
  memoryFallback[key] = value;
}

function safeRemoveStorage(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn('[Storage] localStorage remove restricted', err);
  }
  delete memoryFallback[key];
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => safeGetStorage(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initial check & Firebase connectivity check
  useEffect(() => {
    // Test Firebase connection
    testConnection().catch(() => {});

    const initAuth = async () => {
      const storedToken = safeGetStorage(TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/session', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          setToken(storedToken);
        } else {
          safeRemoveStorage(TOKEN_KEY);
          setToken(null);
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Failed to verify session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || 'Login gagal. Periksa kembali username dan kata sandi.';
        setError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      safeSetStorage(TOKEN_KEY, data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMsg = 'Gagal terhubung ke server portal. Pastikan koneksi internet stabil.';
      setError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      if (!firebaseUser.email) {
        setError('Akun Google tidak memiliki alamat email yang valid.');
        setIsLoading(false);
        return false;
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: firebaseUser.email,
          fullName: firebaseUser.displayName || firebaseUser.email,
          photoUrl: firebaseUser.photoURL,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Autentikasi Google gagal diproses oleh server portal.');
        setIsLoading(false);
        return false;
      }

      safeSetStorage(TOKEN_KEY, data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Jendela masuk Google ditutup sebelum selesai.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Permintaan login dibatalkan.');
      } else {
        setError('Gagal masuk dengan Google: ' + (err.message || 'Terjadi kesalahan sistem.'));
      }
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      safeRemoveStorage(TOKEN_KEY);
      setToken(null);
      setCurrentUser(null);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN' || isSuperAdmin;
  const isUser = currentUser?.role === 'USER';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isLoading,
        error,
        login,
        loginWithGoogle,
        logout,
        isSuperAdmin,
        isAdmin,
        isUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

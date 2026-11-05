import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { testConnection } from '../lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isUser: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'portal_smkn1_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initial check & Firebase connectivity check
  useEffect(() => {
    // Test Firebase connection as required by instructions
    testConnection().catch(() => {});

    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
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
          localStorage.removeItem(TOKEN_KEY);
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

  const login = async (username: string, password: string): Promise<boolean> => {
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
        setError(data.error || 'Login gagal. Periksa kembali username dan password.');
        setIsLoading(false);
        return false;
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError('Gagal terhubung ke server. Pastikan koneksi internet stabil.');
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
      localStorage.removeItem(TOKEN_KEY);
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

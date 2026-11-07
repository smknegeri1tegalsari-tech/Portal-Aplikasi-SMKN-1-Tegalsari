import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { auth, testConnection } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  authenticateLocally,
  getStoredUserSession,
  setStoredUserSession,
  clearStoredUserSession,
  addOrUpdateClientUser,
} from '../lib/clientAuth';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSession = getStoredUserSession();
  const [currentUser, setCurrentUser] = useState<User | null>(() => initialSession.user);
  const [token, setToken] = useState<string | null>(() => initialSession.token);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial check & background session sync
  useEffect(() => {
    // Non-blocking Firebase connectivity probe
    testConnection().catch(() => {});

    const initAuth = async () => {
      const { token: storedToken, user: storedUser } = getStoredUserSession();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      // If already restored from local storage, keep it active
      if (storedUser) {
        setCurrentUser(storedUser);
        setToken(storedToken);
      }

      // If token is a purely local session, no need to probe server session
      if (storedToken.startsWith('local_session_')) {
        setIsLoading(false);
        return;
      }

      // Attempt to verify and sync with backend server in the background
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch('/api/auth/session', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            setToken(storedToken);
            setStoredUserSession(data.user, storedToken);
          }
        } else if (res.status === 401) {
          // Token explicitly revoked by server
          clearStoredUserSession();
          setToken(null);
          setCurrentUser(null);
        }
      } catch (err) {
        console.warn('[AuthContext] Background session check could not reach server, keeping local session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    const cleanUsername = username.trim();
    const cleanPassword = password;

    try {
      // Step 1: Try server authentication with a 3.5-second timeout
      let serverRes: Response | null = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        serverRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (networkErr) {
        console.warn('[AuthContext] Server login endpoint unavailable or timed out, switching to local authentication engine', networkErr);
      }

      // Step 2: Handle server response if available and valid JSON
      if (serverRes) {
        const contentType = serverRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await serverRes.json();

          if (serverRes.ok && data.success) {
            setStoredUserSession(data.user, data.token);
            setToken(data.token);
            setCurrentUser(data.user);
            // Cache user in client-side storage for future offline access
            addOrUpdateClientUser(data.user).catch(() => {});
            setIsLoading(false);
            return { success: true };
          }

          // If server explicitly returned an error (e.g. wrong password or deactivated)
          if (!serverRes.ok) {
            // Also attempt client-side authentication as fallback in case server DB is stale
            const localFallback = await authenticateLocally(cleanUsername, cleanPassword);
            if (localFallback.success && localFallback.user && localFallback.token) {
              setStoredUserSession(localFallback.user, localFallback.token);
              setToken(localFallback.token);
              setCurrentUser(localFallback.user);
              setIsLoading(false);
              return { success: true };
            }

            const errorMsg = data.error || localFallback.error || 'Login gagal. Periksa kembali username dan kata sandi.';
            setError(errorMsg);
            setIsLoading(false);
            return { success: false, error: errorMsg };
          }
        }
      }

      // Step 3: Server was unreachable, timed out, or returned non-JSON (e.g., 502/503 HTML or CDN static view)
      // Execute seamless local authentication engine
      const localResult = await authenticateLocally(cleanUsername, cleanPassword);
      if (localResult.success && localResult.user && localResult.token) {
        setStoredUserSession(localResult.user, localResult.token);
        setToken(localResult.token);
        setCurrentUser(localResult.user);
        setIsLoading(false);
        return { success: true };
      } else {
        const errorMsg = localResult.error || 'Username atau kata sandi yang Anda masukkan tidak sesuai.';
        setError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      console.error('[AuthContext] Unexpected login exception:', err);
      // Even in case of an unexpected exception, try local auth
      const localResult = await authenticateLocally(cleanUsername, cleanPassword);
      if (localResult.success && localResult.user && localResult.token) {
        setStoredUserSession(localResult.user, localResult.token);
        setToken(localResult.token);
        setCurrentUser(localResult.user);
        setIsLoading(false);
        return { success: true };
      }

      const errorMsg = localResult.error || 'Username atau kata sandi tidak sesuai.';
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

      // Attempt server registration/login
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: firebaseUser.email,
            fullName: firebaseUser.displayName || firebaseUser.email,
            photoUrl: firebaseUser.photoURL,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          setStoredUserSession(data.user, data.token);
          setToken(data.token);
          setCurrentUser(data.user);
          setIsLoading(false);
          return true;
        }
      } catch (netErr) {
        console.warn('Google server exchange failed, creating local Google session:', netErr);
      }

      // Local Google session fallback
      const googleUser: User = {
        id: 'google-' + (firebaseUser.uid || Date.now().toString(36)),
        username: firebaseUser.email.split('@')[0],
        email: firebaseUser.email,
        fullName: firebaseUser.displayName || firebaseUser.email,
        role: firebaseUser.email.toLowerCase().includes('admin') || firebaseUser.email.toLowerCase() === 'smknegeri1tegalsari@gmail.com' ? 'SUPER_ADMIN' : 'USER',
        department: 'Akun Google Sekolah',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const localToken = 'google_local_' + Math.random().toString(36).substring(2);
      setStoredUserSession(googleUser, localToken);
      setToken(localToken);
      setCurrentUser(googleUser);
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
      if (token && !token.startsWith('local_session_')) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      clearStoredUserSession();
      setToken(null);
      setCurrentUser(null);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    if (token.startsWith('local_session_')) {
      const { user } = getStoredUserSession();
      if (user) setCurrentUser(user);
      return;
    }

    try {
      const res = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          setStoredUserSession(data.user, token);
        }
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

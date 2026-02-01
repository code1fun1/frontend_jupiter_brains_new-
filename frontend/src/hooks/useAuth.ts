import { useState, useEffect, useCallback } from 'react';

export type AppRole = 'admin' | 'user';

const STATIC_AUTH_STORAGE_KEY = 'jb_static_auth';

const API_BASE_URL =
  (import.meta as any)?.env?.VITE_API_BASE_URL && typeof (import.meta as any).env.VITE_API_BASE_URL === 'string'
    ? (import.meta as any).env.VITE_API_BASE_URL.replace(/"/g, '').trim()
    : 'http://127.0.0.1:8000';

type StaticUser = {
  id: string;
  email: string;
};

const getStaticAdminMode = (): 'auto' | 'admin' | 'user' => {
  const raw = (import.meta as any)?.env?.VITE_STATIC_ROLE;
  const role = typeof raw === 'string' ? raw.replace(/"/g, '').trim() : '';
  if (role === 'admin' || role === 'user') return role;
  return 'auto';
};

interface AuthState {
  user: StaticUser | null;
  session: null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
    isAdmin: false,
  });

  const setStaticUser = useCallback((email: string, roleOverride?: AppRole) => {
    const forcedRole = getStaticAdminMode();
    const computedRole: AppRole = roleOverride
      ? roleOverride
      : forcedRole === 'admin'
        ? 'admin'
        : forcedRole === 'user'
          ? 'user'
          : email.toLowerCase().includes('admin')
            ? 'admin'
            : 'user';

    const fakeUser: StaticUser = {
      id: 'static-user',
      email,
    };

    setAuthState({
      user: fakeUser,
      session: null,
      role: computedRole,
      isAdmin: computedRole === 'admin',
      isLoading: false,
    });

    try {
      localStorage.setItem(
        STATIC_AUTH_STORAGE_KEY,
        JSON.stringify({ email, role: computedRole })
      );
    } catch {
      // ignore
    }
  }, []);

  const setSessionUser = useCallback((payload: { id: number; email: string; role: AppRole }) => {
    const user = { id: String(payload.id), email: payload.email };
    setAuthState({
      user,
      session: null,
      role: payload.role,
      isAdmin: payload.role === 'admin',
      isLoading: false,
    });

    try {
      localStorage.setItem(
        STATIC_AUTH_STORAGE_KEY,
        JSON.stringify({ email: payload.email, role: payload.role, id: String(payload.id) })
      );
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATIC_AUTH_STORAGE_KEY);
      if (!raw) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const parsed = JSON.parse(raw) as { email?: string; role?: AppRole };
      if (!parsed.email) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const fakeUser: StaticUser = {
        id: 'static-user',
        email: parsed.email,
      };

      const role: AppRole = parsed.role === 'admin' ? 'admin' : 'user';

      setAuthState({
        user: fakeUser,
        session: null,
        role,
        isAdmin: role === 'admin',
        isLoading: false,
      });
    } catch {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const signIn = async (email: string, password: string, roleOverride?: AppRole) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { error: { message: data?.detail || 'Login failed' } };
      }

      const role = (roleOverride || data?.role || 'user') as AppRole;
      setSessionUser({ id: data.id, email: data.email, role });
      return { error: null };
    } catch (e: any) {
      return { error: { message: e?.message || 'Login failed' } };
    }
  };

  const signUp = async (email: string, password: string, roleOverride?: AppRole) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { data: null, error: { message: data?.detail || 'Signup failed' } };
      }

      const role = (roleOverride || data?.role || 'user') as AppRole;
      setSessionUser({ id: data.id, email: data.email, role });
      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Signup failed' } };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(STATIC_AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }

    setAuthState({
      user: null,
      session: null,
      role: null,
      isAdmin: false,
      isLoading: false,
    });
    return { error: null };
  };

  const signInWithGoogle = async () => {
    return { error: { message: 'Google sign-in is disabled.' } };
  };

  const signInWithGithub = async () => {
    return { error: { message: 'GitHub sign-in is disabled.' } };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithGithub,
  };
}

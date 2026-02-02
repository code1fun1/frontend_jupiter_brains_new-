import { useState, useEffect, useCallback } from 'react';

export type AppRole = 'admin' | 'user';

const STATIC_AUTH_STORAGE_KEY = 'jb_static_auth';

const API_BASE_URL =
  (import.meta as any)?.env?.VITE_API_BASE_URL && typeof (import.meta as any).env.VITE_API_BASE_URL === 'string'
    ? (import.meta as any).env.VITE_API_BASE_URL.replace(/"/g, '').trim()
    : 'http://127.0.0.1:8000';

const SIGNUP_URL =
  (import.meta as any)?.env?.VITE_AUTH_SIGNUP_URL && typeof (import.meta as any).env.VITE_AUTH_SIGNUP_URL === 'string'
    ? (import.meta as any).env.VITE_AUTH_SIGNUP_URL.replace(/"/g, '').trim()
    : 'http://localhost:8081/api/v1/auths/add';

const SIGNIN_URL =
  (import.meta as any)?.env?.VITE_AUTH_SIGNIN_URL && typeof (import.meta as any).env.VITE_AUTH_SIGNIN_URL === 'string'
    ? (import.meta as any).env.VITE_AUTH_SIGNIN_URL.replace(/"/g, '').trim()
    : 'http://localhost:8081/api/v1/auths/signin';

const SIGNOUT_URL =
  (import.meta as any)?.env?.VITE_AUTH_SIGNOUT_URL && typeof (import.meta as any).env.VITE_AUTH_SIGNOUT_URL === 'string'
    ? (import.meta as any).env.VITE_AUTH_SIGNOUT_URL.replace(/"/g, '').trim()
    : 'http://localhost:8081/api/v1/auths/signout';

const SIGNUP_BEARER_TOKEN =
  (import.meta as any)?.env?.VITE_AUTH_SIGNUP_BEARER_TOKEN &&
  typeof (import.meta as any).env.VITE_AUTH_SIGNUP_BEARER_TOKEN === 'string'
    ? (import.meta as any).env.VITE_AUTH_SIGNUP_BEARER_TOKEN.replace(/"/g, '').trim()
    : '';

const SIGNUP_API_KEY =
  (import.meta as any)?.env?.VITE_AUTH_SIGNUP_API_KEY && typeof (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY === 'string'
    ? (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY.replace(/"/g, '').trim()
    : '';

const SIGNUP_API_KEY_HEADER =
  (import.meta as any)?.env?.VITE_AUTH_SIGNUP_API_KEY_HEADER &&
  typeof (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY_HEADER === 'string'
    ? (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY_HEADER.replace(/"/g, '').trim()
    : 'x-api-key';

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
      const authValue = SIGNUP_BEARER_TOKEN
        ? SIGNUP_BEARER_TOKEN.toLowerCase().startsWith('bearer ')
          ? SIGNUP_BEARER_TOKEN
          : `Bearer ${SIGNUP_BEARER_TOKEN}`
        : '';

      const bearerHeader = authValue ? { Authorization: authValue } : {};
      const apiKeyHeader = SIGNUP_API_KEY ? { [SIGNUP_API_KEY_HEADER]: SIGNUP_API_KEY } : {};
      const authHeader = { ...bearerHeader, ...apiKeyHeader };

      const jsonRes = await fetch(SIGNIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeader },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const jsonData = await jsonRes.json().catch(() => null);

      const missingBody422 =
        jsonRes.status === 422 &&
        Array.isArray(jsonData?.detail) &&
        jsonData.detail.some((d: any) => Array.isArray(d?.loc) && d.loc.join('.') === 'body' && d.type === 'missing');

      const res = missingBody422
        ? await fetch(SIGNIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', ...authHeader },
            credentials: 'include',
            body: new URLSearchParams({ email, password }).toString(),
          })
        : jsonRes;

      const data = missingBody422 ? await res.json().catch(() => null) : jsonData;

      if (!res.ok) {
        const detail = typeof data?.detail === 'string' ? data.detail : null;
        const message = detail || `Login failed (HTTP ${res.status})`;
        return { error: { message } };
      }

      const payload = data?.user && typeof data.user === 'object' ? data.user : data;
      const id = payload?.id ?? payload?.user_id ?? payload?._id;
      const resolvedEmail = payload?.email || email;
      const role = (roleOverride || payload?.role || 'user') as AppRole;

      setSessionUser({ id: typeof id === 'number' ? id : Number(id) || 0, email: resolvedEmail, role });
      return { error: null };
    } catch (e: any) {
      return { error: { message: e?.message || 'Login failed' } };
    }
  };

  const signUp = async (email: string, password: string, roleOverride?: AppRole, nameOverride?: string) => {
    try {
      const cleanProvidedName =
        typeof nameOverride === 'string' ? nameOverride.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() : '';

      const derivedName = String(email || '')
        .split('@')[0]
        ?.replace(/[^a-zA-Z0-9_\-\s]/g, '')
        .trim();
      const name = cleanProvidedName || derivedName || 'user';

      const role = (roleOverride || 'user') as AppRole;

      const authValue = SIGNUP_BEARER_TOKEN
        ? SIGNUP_BEARER_TOKEN.toLowerCase().startsWith('bearer ')
          ? SIGNUP_BEARER_TOKEN
          : `Bearer ${SIGNUP_BEARER_TOKEN}`
        : '';

      const bearerHeader = authValue ? { Authorization: authValue } : {};
      const apiKeyHeader = SIGNUP_API_KEY ? { [SIGNUP_API_KEY_HEADER]: SIGNUP_API_KEY } : {};
      const authHeader = { ...bearerHeader, ...apiKeyHeader };

      const jsonRes = await fetch(SIGNUP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeader },
        credentials: 'include',
        body: JSON.stringify({ email, password, name, role }),
      });

      const jsonData = await jsonRes.json().catch(() => null);

      const missingBody422 =
        jsonRes.status === 422 &&
        Array.isArray(jsonData?.detail) &&
        jsonData.detail.some((d: any) => Array.isArray(d?.loc) && d.loc.join('.') === 'body' && d.type === 'missing');

      const res = missingBody422
        ? await fetch(SIGNUP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', ...authHeader },
            credentials: 'include',
            body: new URLSearchParams({ email, password, name, role }).toString(),
          })
        : jsonRes;

      const data = missingBody422 ? await res.json().catch(() => null) : jsonData;

      if (!res.ok) {
        const detail = typeof data?.detail === 'string' ? data.detail : null;
        const message = detail || `Signup failed (HTTP ${res.status})`;
        return { data: null, error: { message } };
      }

      const finalRole = (data?.role || roleOverride || 'user') as AppRole;
      setSessionUser({ id: data.id, email: data.email, role: finalRole });
      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Signup failed' } };
    }
  };

  const signOut = async () => {
    try {
      const authValue = SIGNUP_BEARER_TOKEN
        ? SIGNUP_BEARER_TOKEN.toLowerCase().startsWith('bearer ')
          ? SIGNUP_BEARER_TOKEN
          : `Bearer ${SIGNUP_BEARER_TOKEN}`
        : '';

      const bearerHeader = authValue ? { Authorization: authValue } : {};
      const apiKeyHeader = SIGNUP_API_KEY ? { [SIGNUP_API_KEY_HEADER]: SIGNUP_API_KEY } : {};
      const authHeader = { ...bearerHeader, ...apiKeyHeader };

      const headers = { Accept: 'application/json', ...authHeader };

      const res = await fetch(SIGNOUT_URL, {
        method: 'POST',
        headers,
        credentials: 'include',
      }).catch(() => null);

      if ((res as any)?.status === 405) {
        const res2 = await fetch(SIGNOUT_URL, {
          method: 'GET',
          headers,
          credentials: 'include',
        }).catch(() => null);

        if ((res2 as any)?.status === 405) {
          await fetch(SIGNOUT_URL, {
            method: 'DELETE',
            headers,
            credentials: 'include',
          }).catch(() => null);
        }
      }
    } catch {
      // ignore
    }

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

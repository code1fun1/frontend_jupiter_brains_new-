import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '@/utils/config';

export type AppRole = 'admin' | 'user';

const STATIC_AUTH_STORAGE_KEY = 'jb_static_auth';
const STATIC_AUTH_SESSION_KEY = 'jb_static_auth_session';

const SIGNUP_BEARER_TOKEN =
  typeof import.meta.env.VITE_AUTH_SIGNUP_BEARER_TOKEN === 'string'
    ? import.meta.env.VITE_AUTH_SIGNUP_BEARER_TOKEN.replace(/"/g, '').trim()
    : '';

const SIGNUP_API_KEY =
  typeof import.meta.env.VITE_AUTH_SIGNUP_API_KEY === 'string'
    ? import.meta.env.VITE_AUTH_SIGNUP_API_KEY.replace(/"/g, '').trim()
    : '';

const SIGNUP_API_KEY_HEADER =
  typeof import.meta.env.VITE_AUTH_SIGNUP_API_KEY_HEADER === 'string'
    ? import.meta.env.VITE_AUTH_SIGNUP_API_KEY_HEADER.replace(/"/g, '').trim()
    : 'x-api-key';

type StaticUser = {
  id: string;
  email: string;
  name?: string;
  role?: AppRole;
  profile_image_url?: string;
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

  const setSessionUser = useCallback((payload: any) => {
    const role: AppRole = payload.role === 'admin' ? 'admin' : 'user';

    const user: StaticUser = {
      id: String(payload.id ?? payload.user_id ?? '0'),
      email: payload.email,
      name: payload.name,
      role,
      profile_image_url: payload.profile_image_url,
    };

    setAuthState({
      user,
      session: null,
      role,
      isAdmin: role === 'admin',
      isLoading: false,
    });

    localStorage.setItem(
      STATIC_AUTH_STORAGE_KEY,
      JSON.stringify({ email: user.email, role, id: user.id, name: user.name })
    );

    if (payload.token) {
      localStorage.setItem(
        STATIC_AUTH_SESSION_KEY,
        JSON.stringify({
          token: payload.token,
          token_type: payload.token_type,
          expires_at: payload.expires_at,
        })
      );
    }

    window.dispatchEvent(new Event('jb-auth-changed'));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATIC_AUTH_STORAGE_KEY);
      if (!raw) return setAuthState(s => ({ ...s, isLoading: false }));

      const parsed = JSON.parse(raw);
      if (!parsed?.email) return;

      const role: AppRole = parsed.role === 'admin' ? 'admin' : 'user';

      setAuthState({
        user: {
          id: parsed.id || 'static-user',
          email: parsed.email,
          name: parsed.name,
          role,
        },
        session: null,
        role,
        isAdmin: role === 'admin',
        isLoading: false,
      });
    } catch {
      setAuthState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    const signInUrl = API_ENDPOINTS.auth.signIn();

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (SIGNUP_BEARER_TOKEN) {
      headers.Authorization = SIGNUP_BEARER_TOKEN.startsWith('Bearer ')
        ? SIGNUP_BEARER_TOKEN
        : `Bearer ${SIGNUP_BEARER_TOKEN}`;
    }

    if (SIGNUP_API_KEY) {
      headers[SIGNUP_API_KEY_HEADER] = SIGNUP_API_KEY;
    }

    let res: Response;
    let data: any;

    try {
      res = await fetch(signInUrl, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      data = await res.json().catch(() => null);

      if (res.status === 422) {
        res = await fetch(signInUrl, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
          credentials: 'include',
          body: new URLSearchParams({ email, password }).toString(),
        });

        data = await res.json().catch(() => null);
      }
    } catch {
      return { error: { message: 'Backend not reachable' } };
    }

    if (!res.ok) {
      return { error: { message: data?.detail || 'Login failed' } };
    }

    setSessionUser(data.user ?? data);
    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem(STATIC_AUTH_STORAGE_KEY);
    localStorage.removeItem(STATIC_AUTH_SESSION_KEY);

    setAuthState({
      user: null,
      session: null,
      role: null,
      isAdmin: false,
      isLoading: false,
    });

    window.dispatchEvent(new Event('jb-auth-changed'));
    return { error: null };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const signUpUrl = API_ENDPOINTS.auth.signUp();

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (SIGNUP_BEARER_TOKEN) {
      headers.Authorization = SIGNUP_BEARER_TOKEN.startsWith('Bearer ')
        ? SIGNUP_BEARER_TOKEN
        : `Bearer ${SIGNUP_BEARER_TOKEN}`;
    }

    if (SIGNUP_API_KEY) {
      headers[SIGNUP_API_KEY_HEADER] = SIGNUP_API_KEY;
    }

    try {
      const res = await fetch(signUpUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        return { error: { message: data?.detail || 'Sign up failed' } };
      }

      // Automatically sign in after sign up
      return await signIn(email, password);
    } catch (err: any) {
      console.error('Signup fetch error:', err);
      return { error: { message: 'Signup failed. Please try again later.' } };
    }
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    signInWithGoogle: async () => ({ error: { message: 'Disabled' } }),
    signInWithGithub: async () => ({ error: { message: 'Disabled' } }),
  };
}

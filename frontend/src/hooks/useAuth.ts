import { useState, useEffect, useCallback } from 'react';
import { getBackendBaseUrl, API_ENDPOINTS } from '@/utils/config';

export type AppRole = 'admin' | 'user';

const STATIC_AUTH_STORAGE_KEY = 'jb_static_auth';

const STATIC_AUTH_SESSION_KEY = 'jb_static_auth_session';

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
  name?: string;
  role?: AppRole;
  profile_image_url?: string;
};

type StaticSession = {
  token: string;
  token_type?: string;
  expires_at?: number;
  permissions?: any;
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

    try {
      window.dispatchEvent(new Event('jb-auth-changed'));
    } catch {
      // ignore
    }
  }, []);

  const setSessionUser = useCallback(
    (payload: {
      id: string | number;
      email: string;
      role: AppRole;
      name?: string;
      profile_image_url?: string;
      token?: string;
      token_type?: string;
      expires_at?: number;
      permissions?: any;
    }) => {
      const user: StaticUser = {
        id: String(payload.id),
        email: payload.email,
        name: payload.name,
        role: payload.role,
        profile_image_url: payload.profile_image_url,
      };
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
          JSON.stringify({ email: payload.email, role: payload.role, id: String(payload.id), name: payload.name })
        );
      } catch {
        // ignore
      }

      if (payload.token) {
        const session: StaticSession = {
          token: payload.token,
          token_type: payload.token_type,
          expires_at: payload.expires_at,
          permissions: payload.permissions,
        };

        try {
          localStorage.setItem(STATIC_AUTH_SESSION_KEY, JSON.stringify(session));
        } catch {
          // ignore
        }
      }

      try {
        window.dispatchEvent(new Event('jb-auth-changed'));
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

      const parsed = JSON.parse(raw) as { email?: string; role?: AppRole; id?: string; name?: string };
      if (!parsed.email) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const fakeUser: StaticUser = {
        id: parsed.id || 'static-user',
        email: parsed.email,
        name: typeof parsed.name === 'string' ? parsed.name : undefined,
        role: parsed.role === 'admin' ? 'admin' : 'user',
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
      const signInUrl = API_ENDPOINTS.auth.signIn();

      const authValue = SIGNUP_BEARER_TOKEN
        ? SIGNUP_BEARER_TOKEN.toLowerCase().startsWith('bearer ')
          ? SIGNUP_BEARER_TOKEN
          : `Bearer ${SIGNUP_BEARER_TOKEN}`
        : '';

      const bearerHeader = authValue ? { Authorization: authValue } : {};
      const apiKeyHeader = SIGNUP_API_KEY ? { [SIGNUP_API_KEY_HEADER]: SIGNUP_API_KEY } : {};
      const authHeader = { ...bearerHeader, ...apiKeyHeader };

      let res: Response;
      let data: any = null;

      try {
        const initialRes = await fetch(signInUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeader },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const initialData = await initialRes.json().catch(() => null);

        const is422MissingBody =
          initialRes.status === 422 &&
          Array.isArray(initialData?.detail) &&
          initialData.detail.some((d: any) =>
            Array.isArray(d?.loc) && d.loc.includes('body') && d.type === 'missing'
          );

        if (is422MissingBody) {
          res = await fetch(signInUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', ...authHeader },
            credentials: 'include',
            body: new URLSearchParams({ email, password }).toString(),
          });
          data = await res.json().catch(() => null);
        } else {
          res = initialRes;
          data = initialData;
        }
      } catch (err: any) {
        console.error('Signin fetch error:', err);
        return { error: { message: 'Connection failed. Please check backend and CORS settings.' } };
      }

      if (!res.ok) {
        const message = data?.detail || `Login failed (${res.status})`;
        return { error: { message } };
      }

      const payload = data?.user && typeof data.user === 'object' ? data.user : data;
      const id = payload?.id ?? payload?.user_id ?? payload?._id;
      const resolvedEmail = payload?.email || email;

      const apiRoleRaw = payload?.role;
      const apiRole: AppRole | null = apiRoleRaw === 'admin' || apiRoleRaw === 'user' ? apiRoleRaw : null;
      const role = (apiRole || roleOverride || 'user') as AppRole;

      const name = typeof payload?.name === 'string' ? payload.name : undefined;
      const profile_image_url = typeof payload?.profile_image_url === 'string' ? payload.profile_image_url : undefined;

      console.log('Signin successful');
      setSessionUser({
        id: typeof id === 'number' ? id : Number(id) || 0,
        email: resolvedEmail,
        role,
        name,
        profile_image_url,
        token: typeof payload?.token === 'string' ? payload.token : undefined,
        token_type: typeof payload?.token_type === 'string' ? payload.token_type : undefined,
        expires_at: typeof payload?.expires_at === 'number' ? payload.expires_at : undefined,
        permissions: payload?.permissions,
      });
      return { error: null };
    } catch (e: any) {
      console.error('Signin error:', e);
      return { error: { message: e?.message || 'Login failed' } };
    }
  };

  const signOut = async () => {
    try {
      const signOutUrl = API_ENDPOINTS.auth.signOut();

      const authValue = SIGNUP_BEARER_TOKEN
        ? SIGNUP_BEARER_TOKEN.toLowerCase().startsWith('bearer ')
          ? SIGNUP_BEARER_TOKEN
          : `Bearer ${SIGNUP_BEARER_TOKEN}`
        : '';

      const bearerHeader = authValue ? { Authorization: authValue } : {};
      const apiKeyHeader = SIGNUP_API_KEY ? { [SIGNUP_API_KEY_HEADER]: SIGNUP_API_KEY } : {};
      const authHeader = { ...bearerHeader, ...apiKeyHeader };

      const headers = { Accept: 'application/json', ...authHeader };

      await fetch(signOutUrl, {
        method: 'GET',
        headers,
        credentials: 'include',
      }).catch(() => null);
    } catch {
      // ignore
    }

    try {
      let emailKey = '';
      try {
        const raw = localStorage.getItem(STATIC_AUTH_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as any) : null;
        emailKey = typeof parsed?.email === 'string' ? parsed.email.trim().toLowerCase() : '';
      } catch {
        emailKey = '';
      }

      localStorage.removeItem(STATIC_AUTH_STORAGE_KEY);
      localStorage.removeItem(STATIC_AUTH_SESSION_KEY);
      localStorage.removeItem('jb_openai_config_overview');
      if (emailKey) localStorage.removeItem(`jb_openai_config_overview:${emailKey}`);
      localStorage.removeItem('jb_openai_config_form');
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

    try {
      window.dispatchEvent(new Event('jb-auth-changed'));
    } catch {
      // ignore
    }
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
    signOut,
    signInWithGoogle,
    signInWithGithub,
  };
}

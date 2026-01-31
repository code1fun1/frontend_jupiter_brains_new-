import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'user';

type AuthMode = 'supabase' | 'static';

const getAuthMode = (): AuthMode => {
  const raw = (import.meta as any)?.env?.VITE_AUTH_MODE;
  const mode = typeof raw === 'string' ? raw.replace(/"/g, '').trim() : '';
  return mode === 'supabase' ? 'supabase' : 'static';
};

const STATIC_AUTH_STORAGE_KEY = 'jb_static_auth';

const getStaticAdminMode = (): 'auto' | 'admin' | 'user' => {
  const raw = (import.meta as any)?.env?.VITE_STATIC_ROLE;
  const role = typeof raw === 'string' ? raw.replace(/"/g, '').trim() : '';
  if (role === 'admin' || role === 'user') return role;
  return 'auto';
};

interface AuthState {
  user: User | null;
  session: Session | null;
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

  const authMode = getAuthMode();

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

    const fakeUser = {
      id: 'static-user',
      email,
    } as unknown as User;

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

  const fetchUserRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data?.role as AppRole | null;
  }, []);

  useEffect(() => {
    if (authMode === 'static') {
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

        const fakeUser = {
          id: 'static-user',
          email: parsed.email,
        } as unknown as User;

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

      return;
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Defer role fetching to avoid deadlocks
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id).then(role => {
              setAuthState(prev => ({
                ...prev,
                role,
                isAdmin: role === 'admin',
                isLoading: false,
              }));
            });
          }, 0);
        } else {
          setAuthState(prev => ({
            ...prev,
            role: null,
            isAdmin: false,
            isLoading: false,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        fetchUserRole(session.user.id).then(role => {
          setAuthState(prev => ({
            ...prev,
            role,
            isAdmin: role === 'admin',
            isLoading: false,
          }));
        });
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, [authMode, fetchUserRole]);

  const signIn = async (email: string, password: string, roleOverride?: AppRole) => {
    if (authMode === 'static') {
      setStaticUser(email, roleOverride);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, roleOverride?: AppRole) => {
    if (authMode === 'static') {
      setStaticUser(email, roleOverride);
      return { data: null, error: null };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    if (authMode === 'static') {
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
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const signInWithGoogle = async () => {
    if (authMode === 'static') {
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signInWithGithub = async () => {
    if (authMode === 'static') {
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
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

import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'spct-admin' },
});

export interface Agent {
  user_id: string;
  role: 'admin' | 'agent';
  display_name: string;
}

export interface AdminAuth {
  status: 'loading' | 'signedOut' | 'notAgent' | 'ready';
  agent: Agent | null;
  email: string | null;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
}

/** Email + password sign-in; only users listed in `agents` get in (RLS lets a user read their own agent row). */
export function useAdminAuth(): AdminAuth {
  const [state, setState] = useState<Pick<AdminAuth, 'status' | 'agent' | 'email'>>({ status: 'loading', agent: null, email: null });

  const resolve = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user || user.is_anonymous) return setState({ status: 'signedOut', agent: null, email: null });
    const { data: agent } = await supabase.from('agents').select('user_id, role, display_name').eq('user_id', user.id).maybeSingle();
    if (!agent) {
      await supabase.auth.signOut();
      return setState({ status: 'notAgent', agent: null, email: user.email ?? null });
    }
    setState({ status: 'ready', agent: agent as Agent, email: user.email ?? null });
  }, []);

  useEffect(() => {
    void resolve();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setState((s) => (s.status === 'notAgent' ? s : { status: 'signedOut', agent: null, email: null }));
    });
    return () => data.subscription.unsubscribe();
  }, [resolve]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return 'That email and password don’t match.';
    await resolve();
    return null;
  };

  return { ...state, signIn, signOut: async () => void (await supabase.auth.signOut()) };
}

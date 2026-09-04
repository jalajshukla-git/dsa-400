import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, configured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    return { user: data.user, session: data.session, error };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data.user, error };
  }, []);

  const signInWithGitHub = useCallback(async () => {
    if (!configured) {
      return { error: new Error('Supabase is not connected — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.') };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/` },
    });
    return { error };
  }, [configured]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, configured, signUp, signIn, signInWithGitHub, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/* Resolve a human-readable name across providers:
   email signup → user_metadata.username
   GitHub       → user_metadata.user_name / name
   fallback     → email prefix */
export const displayName = u => {
  if (!u) return null;
  const m = u.user_metadata || {};
  return m.username || m.user_name || m.preferred_username || m.full_name || m.name
    || (u.email ? u.email.split('@')[0] : 'user');
};

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { getProfile } from '../api/profiles.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const loadProfile = useCallback(async (userId) => {
    try {
      const p = await getProfile(userId);
      if (mountedRef.current) setProfile(p);
      return p;
    } catch {
      if (mountedRef.current) setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // ยังไม่ได้ตั้งค่า .env → ปล่อยให้ App แสดงหน้าแนะนำการตั้งค่าแทน
    if (!supabase) {
      setLoading(false);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!mountedRef.current) return;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => mountedRef.current && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      // ห้ามเรียก Supabase ตรงใน callback (เสี่ยง deadlock) จึงครอบด้วย setTimeout
      setTimeout(async () => {
        if (!mountedRef.current) return;
        setSession(s);
        if (s) await loadProfile(s.user.id);
        else setProfile(null);
        setLoading(false);
      }, 0);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(
    (userId) => loadProfile(userId ?? session?.user?.id),
    [loadProfile, session],
  );

  const value = { session, profile, loading, refreshProfile, user: session?.user ?? null };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
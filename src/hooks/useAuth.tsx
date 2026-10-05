import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { setCurrentRole } from '@/lib/people';
import { Session, User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'staff' | 'viewer';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleUserId, setRoleUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (mounted) {
          if (error) throw error;
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setRole(null);
      setRoleUserId(null);
      return;
    }

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('Error fetching role:', error);
        const r = ((data as { role?: string } | null)?.role as AppRole) ?? null;
        setCurrentRole(r);
        setRole(r);
        setRoleUserId(user.id);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const roleLoading = !!user && roleUserId !== user.id;
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const isViewer = role === 'viewer';

  return {
    session,
    user,
    loading: loading || roleLoading,
    role,
    isAdmin,
    isStaff,
    isViewer,
  };
}

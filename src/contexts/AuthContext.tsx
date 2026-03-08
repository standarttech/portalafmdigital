import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AgencyRole = 'AgencyAdmin' | 'MediaBuyer' | 'Manager' | 'SalesManager' | 'AccountManager' | 'Designer' | 'Copywriter' | 'Client' | null;

export interface SimulatedUser {
  userId: string;
  displayName: string;
  role: AgencyRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  agencyRole: AgencyRole;
  effectiveRole: AgencyRole;
  viewAsRole: AgencyRole;
  setViewAsRole: (role: AgencyRole) => void;
  simulatedUser: SimulatedUser | null;
  setSimulatedUser: (u: SimulatedUser | null) => void;
  loading: boolean;
  adminExists: boolean | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setupAdmin: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  refreshRole: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [agencyRole, setAgencyRole] = useState<AgencyRole>(() => {
    return (localStorage.getItem('afm_cached_role') as AgencyRole) || null;
  });
  const [adminExists, setAdminExists] = useState<boolean | null>(() => {
    const cached = localStorage.getItem('afm_admin_exists');
    return cached !== null ? cached === 'true' : null;
  });

  const [viewAsRole, setViewAsRole] = useState<AgencyRole>(null);
  const [simulatedUser, setSimulatedUser] = useState<SimulatedUser | null>(null);
  const lastAuthUserIdRef = useRef<string | null>(null);

  // If simulating a specific user, use their role; otherwise use viewAsRole or real role
  const effectiveRole = simulatedUser ? simulatedUser.role : (viewAsRole || agencyRole);

  const checkAdminExists = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('no_admin_exists');
      if (error) {
        setAdminExists(true);
        localStorage.setItem('afm_admin_exists', 'true');
        return;
      }
      const exists = !data;
      setAdminExists(exists);
      localStorage.setItem('afm_admin_exists', String(exists));
    } catch {
      setAdminExists(true);
      localStorage.setItem('afm_admin_exists', 'true');
    }
  }, []);

  const fetchRole = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('agency_users')
        .select('agency_role')
        .eq('user_id', userId)
        .maybeSingle();

      const role = data ? (data.agency_role as AgencyRole) : null;
      setAgencyRole(role);
      if (role) {
        localStorage.setItem('afm_cached_role', role);
      } else {
        localStorage.removeItem('afm_cached_role');
      }
    } catch {
      setAgencyRole(null);
      localStorage.removeItem('afm_cached_role');
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        const nextUserId = newSession?.user?.id ?? null;
        const prevUserId = lastAuthUserIdRef.current;

        // Token refresh happens on tab switch/focus; don't reset guards or role for same user
        if (event === 'TOKEN_REFRESHED') {
          setSession(prev => {
            if (prev?.access_token === newSession?.access_token) return prev;
            return newSession;
          });
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Re-fetch role only when auth identity actually changes
          if (prevUserId !== nextUserId) {
            setTimeout(() => fetchRole(newSession.user.id), 0);
          }
        } else {
          setAgencyRole(null);
          localStorage.removeItem('afm_cached_role');
        }

        // Clear MFA/FPC checks only on real sign-in transitions (different user)
        if (event === 'SIGNED_IN' && prevUserId !== nextUserId) {
          sessionStorage.removeItem('afm_mfa_checked');
          sessionStorage.removeItem('afm_fpc_checked');
        }

        if (event === 'SIGNED_OUT') {
          setAgencyRole(null);
          setViewAsRole(null);
          setSimulatedUser(null);
          localStorage.removeItem('afm_cached_role');
          lastAuthUserIdRef.current = null;
          return;
        }

        lastAuthUserIdRef.current = nextUserId;
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      lastAuthUserIdRef.current = session?.user?.id ?? null;
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        localStorage.removeItem('afm_cached_role');
        setAgencyRole(null);
      }
      setLoading(false);
    });

    checkAdminExists();

    return () => subscription.unsubscribe();
  }, [fetchRole, checkAdminExists]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const setupAdmin = async (email: string, password: string, displayName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: redirectUrl, data: { display_name: displayName } },
    });
    if (signUpError) return { error: signUpError.message };
    if (!signUpData.user) return { error: 'Failed to create user' };

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return { error: null };

    const { error: roleError } = await supabase.from('agency_users').insert({
      user_id: signUpData.user.id, agency_role: 'AgencyAdmin', display_name: displayName,
    });
    if (roleError) return { error: roleError.message };

    await supabase.from('user_permissions').insert({
      user_id: signUpData.user.id,
      can_add_clients: true, can_edit_clients: true, can_assign_clients_to_users: true,
      can_connect_integrations: true, can_run_manual_sync: true, can_edit_metrics_override: true,
      can_manage_tasks: true, can_publish_reports: true, can_view_audit_log: true,
    });

    await supabase.from('user_settings').insert({
      user_id: signUpData.user.id, language: 'ru', theme: 'dark',
    });

    setAgencyRole('AgencyAdmin');
    localStorage.setItem('afm_cached_role', 'AgencyAdmin');
    setAdminExists(true);
    localStorage.setItem('afm_admin_exists', 'true');

    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem('afm_cached_role');
    localStorage.removeItem('afm_admin_exists');
    sessionStorage.removeItem('afm_fpc_checked');
    sessionStorage.removeItem('afm_mfa_checked');
    setViewAsRole(null);
    setSimulatedUser(null);
    await supabase.auth.signOut();
  };

  const refreshRole = useCallback(() => {
    if (user) fetchRole(user.id);
  }, [user, fetchRole]);

  return (
    <AuthContext.Provider value={{
      user, session, agencyRole, effectiveRole, viewAsRole, setViewAsRole,
      simulatedUser, setSimulatedUser,
      loading, adminExists, signIn, signOut, setupAdmin, refreshRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

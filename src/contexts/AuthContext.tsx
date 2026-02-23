import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AgencyRole = 'AgencyAdmin' | 'MediaBuyer' | 'Client' | 'Manager' | 'SalesManager' | 'AccountManager' | 'Designer' | 'Copywriter' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  agencyRole: AgencyRole;
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
  const [agencyRole, setAgencyRole] = useState<AgencyRole>(null);
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  // Cache role so tab-switch doesn't cause flicker
  const roleCache = useRef<{ userId: string; role: AgencyRole } | null>(null);

  const checkAdminExists = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('no_admin_exists');
      if (error) {
        console.error('Error checking admin exists:', error);
        setAdminExists(true);
        return;
      }
      setAdminExists(!data);
    } catch {
      setAdminExists(true);
    }
  }, []);

  const fetchRole = useCallback(async (userId: string, force = false) => {
    // Use cache if available and not forced
    if (!force && roleCache.current?.userId === userId) {
      setAgencyRole(roleCache.current.role);
      return;
    }
    try {
      const { data } = await supabase
        .from('agency_users')
        .select('agency_role')
        .eq('user_id', userId)
        .maybeSingle();
      
      const role = data?.agency_role as AgencyRole ?? null;
      roleCache.current = { userId, role };
      setAgencyRole(role);
    } catch {
      setAgencyRole(null);
    }
  }, []);

  useEffect(() => {
    let initialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setAgencyRole(null);
          roleCache.current = null;
          setLoading(false);
          initialized = true;
          return;
        }

        // On token refresh after init, just use cached role — no flicker
        if (initialized && event === 'TOKEN_REFRESHED') {
          if (newSession?.user) {
            await fetchRole(newSession.user.id, false);
          }
          return;
        }

        if (newSession?.user) {
          const force = !initialized || event === 'SIGNED_IN';
          await fetchRole(newSession.user.id, force);
        } else {
          setAgencyRole(null);
        }
        setLoading(false);
        initialized = true;
      }
    );

    // Safety timeout: if auth doesn't resolve in 5 seconds, proactively fetch session & role
    const safetyTimeout = setTimeout(async () => {
      if (!initialized) {
        console.warn('Auth init timeout — proactively fetching session');
        try {
          const { data: { session: fallbackSession } } = await supabase.auth.getSession();
          if (fallbackSession?.user) {
            setUser(fallbackSession.user);
            setSession(fallbackSession);
            await fetchRole(fallbackSession.user.id, true);
          }
        } catch (e) {
          console.error('Safety timeout session fetch failed:', e);
        }
        setLoading(false);
        initialized = true;
      }
    }, 5000);

    checkAdminExists();

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [fetchRole, checkAdminExists]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const setupAdmin = async (email: string, password: string, displayName: string) => {
    // Sign up the first user
    const redirectUrl = `${window.location.origin}/`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: displayName },
      },
    });
    
    if (signUpError) return { error: signUpError.message };
    
    if (!signUpData.user) return { error: 'Failed to create user' };
    
    // Try to sign in immediately (in case auto-confirm is on)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (signInError) {
      // User needs to confirm email
      return { error: null };
    }

    // Create agency_users record as admin
    const { error: roleError } = await supabase
      .from('agency_users')
      .insert({
        user_id: signUpData.user.id,
        agency_role: 'AgencyAdmin',
        display_name: displayName,
      });

    if (roleError) {
      return { error: roleError.message };
    }

    // Create full permissions for admin
    const { error: permError } = await supabase
      .from('user_permissions')
      .insert({
        user_id: signUpData.user.id,
        can_add_clients: true,
        can_edit_clients: true,
        can_assign_clients_to_users: true,
        can_connect_integrations: true,
        can_run_manual_sync: true,
        can_edit_metrics_override: true,
        can_manage_tasks: true,
        can_publish_reports: true,
        can_view_audit_log: true,
      });

    if (permError) {
      console.error('Permission setup error:', permError);
    }

    // Create default user settings
    await supabase.from('user_settings').insert({
      user_id: signUpData.user.id,
      language: 'ru',
      theme: 'dark',
    });

    setAgencyRole('AgencyAdmin');
    setAdminExists(true);

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRole = useCallback(() => {
    if (user) {
      fetchRole(user.id);
    }
  }, [user, fetchRole]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        agencyRole,
        loading,
        adminExists,
        signIn,
        signOut,
        setupAdmin,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

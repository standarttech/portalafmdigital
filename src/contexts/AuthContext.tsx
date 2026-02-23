import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AgencyRole = 'AgencyAdmin' | 'MediaBuyer' | 'Client' | null;

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

  const checkAdminExists = useCallback(async () => {
    try {
      // Use the SECURITY DEFINER RPC function — works for anon/unauthenticated users
      const { data, error } = await supabase.rpc('no_admin_exists');
      
      if (error) {
        console.error('Error checking admin exists:', error);
        // Fallback: assume admin exists to prevent showing setup page inappropriately
        setAdminExists(true);
        return;
      }
      
      // no_admin_exists returns TRUE when no admin → adminExists = false
      // no_admin_exists returns FALSE when admin exists → adminExists = true
      setAdminExists(!data);
    } catch {
      // Fallback: assume admin exists to prevent showing setup page inappropriately
      setAdminExists(true);
    }
  }, []);

  const fetchRole = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('agency_users')
        .select('agency_role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data) {
        setAgencyRole(data.agency_role as AgencyRole);
      } else {
        setAgencyRole(null);
      }
    } catch {
      setAgencyRole(null);
    }
  }, []);

  useEffect(() => {
    // IMPORTANT: Set up listener BEFORE getSession to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setAgencyRole(null);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          // Fetch role directly (no setTimeout) to prevent Access Denied flash
          await fetchRole(session.user.id);
        } else {
          setAgencyRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRole(session.user.id);
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

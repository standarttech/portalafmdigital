import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import {
  upsertRememberedAccount,
  removeRememberedAccount as removeRemembered,
  clearAllRememberedAccounts,
  pruneStaleAccounts,
  type AccountType,
} from '@/lib/rememberedAccounts';

type AgencyRole = 'AgencyAdmin' | 'MediaBuyer' | 'Manager' | 'SalesManager' | 'AccountManager' | 'Designer' | 'Copywriter' | 'Client' | null;

export interface SimulatedUser {
  userId: string;
  displayName: string;
  role: AgencyRole;
}

export interface LinkedAccount {
  userId: string;
  email: string;
  agencyRole: AgencyRole;
  displayName: string | null;
  lastUsedAt: string;
  isCurrent: boolean;
}

interface StoredLinkedAccount {
  userId: string;
  email: string;
  agencyRole: AgencyRole;
  displayName: string | null;
  refreshToken: string;
  lastUsedAt: string;
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
  linkedAccounts: LinkedAccount[];
  loading: boolean;
  adminExists: boolean | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  addAccount: (email: string, password: string) => Promise<{ error: string | null }>;
  switchAccount: (userId: string) => Promise<{ error: string | null }>;
  removeLinkedAccount: (userId: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setupAdmin: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  refreshRole: () => void;
}

const LINKED_ACCOUNTS_KEY = 'afm_linked_accounts';
const ROLE_CACHE_KEY = 'afm_cached_role';
const ROLE_TTL_MS = 30 * 60 * 1000;

const getCachedRole = (): AgencyRole => {
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed as AgencyRole; // legacy plain string
    if (Date.now() - parsed.cachedAt > ROLE_TTL_MS) {
      localStorage.removeItem(ROLE_CACHE_KEY);
      return null;
    }
    return parsed.role as AgencyRole;
  } catch {
    return null;
  }
};

const setCachedRole = (role: AgencyRole) => {
  if (role) {
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ role, cachedAt: Date.now() }));
  } else {
    localStorage.removeItem(ROLE_CACHE_KEY);
  }
};

const readStoredLinkedAccounts = (): StoredLinkedAccount[] => {
  try {
    const raw = localStorage.getItem(LINKED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a: any) =>
      typeof a?.userId === 'string' &&
      typeof a?.email === 'string' &&
      typeof a?.refreshToken === 'string'
    );
  } catch {
    return [];
  }
};

const writeStoredLinkedAccounts = (accounts: StoredLinkedAccount[]) => {
  localStorage.setItem(LINKED_ACCOUNTS_KEY, JSON.stringify(accounts));
};

const toLinkedAccountView = (accounts: StoredLinkedAccount[], currentUserId: string | null): LinkedAccount[] => {
  return [...accounts]
    .sort((a, b) => {
      const aCurrent = a.userId === currentUserId;
      const bCurrent = b.userId === currentUserId;
      if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
      return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
    })
    .map((a) => ({
      userId: a.userId,
      email: a.email,
      agencyRole: a.agencyRole,
      displayName: a.displayName,
      lastUsedAt: a.lastUsedAt,
      isCurrent: a.userId === currentUserId,
    }));
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [agencyRole, setAgencyRole] = useState<AgencyRole>(() => getCachedRole());
  const [adminExists, setAdminExists] = useState<boolean | null>(() => {
    const cached = localStorage.getItem('afm_admin_exists');
    return cached !== null ? cached === 'true' : null;
  });

  const storedAccountsRef = useRef<StoredLinkedAccount[]>(readStoredLinkedAccounts());
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>(() =>
    toLinkedAccountView(storedAccountsRef.current, null)
  );

  const [viewAsRole, setViewAsRole] = useState<AgencyRole>(null);
  const [simulatedUser, setSimulatedUser] = useState<SimulatedUser | null>(null);
  const lastAuthUserIdRef = useRef<string | null>(null);

  // If simulating a specific user, use their role; otherwise use viewAsRole or real role
  const effectiveRole = simulatedUser ? simulatedUser.role : (viewAsRole || agencyRole);

  const syncLinkedAccounts = useCallback((currentUserId: string | null) => {
    setLinkedAccounts(toLinkedAccountView(storedAccountsRef.current, currentUserId));
  }, []);

  const upsertLinkedAccount = useCallback((
    payload: {
      session: Session;
      user: User;
      agencyRole?: AgencyRole;
      displayName?: string | null;
    },
    currentUserId?: string | null,
  ) => {
    if (!payload.session.refresh_token) return;

    const existing = storedAccountsRef.current.find(a => a.userId === payload.user.id);
    const updated: StoredLinkedAccount = {
      userId: payload.user.id,
      email: payload.user.email || existing?.email || '',
      agencyRole: payload.agencyRole ?? existing?.agencyRole ?? null,
      displayName: payload.displayName ?? existing?.displayName ?? (payload.user.user_metadata?.display_name || null),
      refreshToken: payload.session.refresh_token,
      lastUsedAt: new Date().toISOString(),
    };

    const next = [updated, ...storedAccountsRef.current.filter(a => a.userId !== payload.user.id)].slice(0, 5);
    storedAccountsRef.current = next;
    writeStoredLinkedAccounts(next);
    syncLinkedAccounts(currentUserId ?? user?.id ?? null);
  }, [syncLinkedAccounts, user?.id]);

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

  const fetchRole = useCallback(async (userId: string, activeSession?: Session | null) => {
    try {
      const { data } = await supabase
        .from('agency_users')
        .select('agency_role, display_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();

      const role = data ? (data.agency_role as AgencyRole) : null;
      setAgencyRole(role);
      setCachedRole(role);

      if (activeSession?.user) {
        upsertLinkedAccount({
          session: activeSession,
          user: activeSession.user,
          agencyRole: role,
          displayName: data?.display_name || null,
        }, activeSession.user.id);

        // Save to remembered accounts (safe, no tokens)
        if (role) {
          upsertRememberedAccount({
            userId: activeSession.user.id,
            email: activeSession.user.email || '',
            displayName: data?.display_name || null,
            avatarUrl: data?.avatar_url || null,
            accountType: 'internal',
            roleLabel: role,
            portalClientLabel: null,
            entryRoute: '/dashboard',
          });
        }
      }
    } catch {
      setAgencyRole(null);
      setCachedRole(null);
    }
  }, [upsertLinkedAccount]);

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
          if (newSession?.user) {
            upsertLinkedAccount({ session: newSession, user: newSession.user }, newSession.user.id);
          }
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Re-fetch role only when auth identity actually changes
          if (prevUserId !== nextUserId) {
            setTimeout(() => fetchRole(newSession.user.id, newSession), 0);
          } else {
            upsertLinkedAccount({ session: newSession, user: newSession.user }, newSession.user.id);
          }
        } else {
          setAgencyRole(null);
          setCachedRole(null);
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
          setCachedRole(null);
          lastAuthUserIdRef.current = null;
          syncLinkedAccounts(null);
          return;
        }

        lastAuthUserIdRef.current = nextUserId;
        syncLinkedAccounts(nextUserId);
      }
    );

    // Prune stale remembered accounts on init
    pruneStaleAccounts(72);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      lastAuthUserIdRef.current = session?.user?.id ?? null;
      if (session?.user) {
        fetchRole(session.user.id, session);
      } else {
        localStorage.removeItem('afm_cached_role');
        setAgencyRole(null);
      }
      syncLinkedAccounts(session?.user?.id ?? null);
      setLoading(false);
    });

    checkAdminExists();

    return () => subscription.unsubscribe();
  }, [fetchRole, checkAdminExists, syncLinkedAccounts, upsertLinkedAccount]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const addAccount = async (email: string, password: string) => {
    const currentSession = session ?? (await supabase.auth.getSession()).data.session;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (!data.session || !data.user) return { error: 'Failed to sign in account' };

    const { data: roleData } = await supabase
      .from('agency_users')
      .select('agency_role, display_name')
      .eq('user_id', data.user.id)
      .maybeSingle();

    upsertLinkedAccount({
      session: data.session,
      user: data.user,
      agencyRole: (roleData?.agency_role as AgencyRole) ?? null,
      displayName: roleData?.display_name || null,
    }, currentSession?.user?.id ?? data.user.id);

    if (currentSession && currentSession.user.id !== data.user.id) {
      const { error: restoreError } = await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      });
      if (restoreError) return { error: restoreError.message };
    } else {
      fetchRole(data.user.id, data.session);
    }

    return { error: null };
  };

  const switchAccount = async (userId: string) => {
    const target = storedAccountsRef.current.find(a => a.userId === userId);
    if (!target) return { error: 'Account not found' };

    queryClient.clear();
    const { error } = await supabase.auth.setSession({
      access_token: '',
      refresh_token: target.refreshToken,
    });

    if (error) {
      const filtered = storedAccountsRef.current.filter(a => a.userId !== userId);
      storedAccountsRef.current = filtered;
      writeStoredLinkedAccounts(filtered);
      syncLinkedAccounts(user?.id ?? null);
      return { error: error.message };
    }

    return { error: null };
  };

  const removeLinkedAccount = async (userId: string) => {
    const before = storedAccountsRef.current;
    const filtered = before.filter(a => a.userId !== userId);
    storedAccountsRef.current = filtered;
    writeStoredLinkedAccounts(filtered);

    const isCurrent = user?.id === userId;
    if (isCurrent) {
      const fallback = filtered[0];
      if (fallback) {
        const { error } = await supabase.auth.setSession({
          access_token: '',
          refresh_token: fallback.refreshToken,
        });
        if (error) return { error: error.message };
      } else {
        await supabase.auth.signOut();
      }
    }

    syncLinkedAccounts(isCurrent ? (filtered[0]?.userId ?? null) : (user?.id ?? null));
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
    if (signInError) return { error: signInError.message };

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
    setCachedRole('AgencyAdmin');
    setAdminExists(true);
    localStorage.setItem('afm_admin_exists', 'true');

    return { error: null };
  };

  const signOut = async () => {
    queryClient.clear();
    setCachedRole(null);
    localStorage.removeItem('afm_admin_exists');
    sessionStorage.removeItem('afm_fpc_checked');
    sessionStorage.removeItem('afm_mfa_checked');
    setViewAsRole(null);
    setSimulatedUser(null);
    await supabase.auth.signOut();
  };

  const refreshRole = useCallback(() => {
    if (user) fetchRole(user.id, session);
  }, [user, fetchRole, session]);

  return (
    <AuthContext.Provider value={{
      user, session, agencyRole, effectiveRole, viewAsRole, setViewAsRole,
      simulatedUser, setSimulatedUser,
      linkedAccounts,
      loading, adminExists, signIn, addAccount, switchAccount, removeLinkedAccount, signOut, setupAdmin, refreshRole,
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

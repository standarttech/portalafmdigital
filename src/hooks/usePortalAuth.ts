import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PortalUser, PortalBranding } from '@/types/portal';
import { upsertRememberedAccount } from '@/lib/rememberedAccounts';

export function usePortalAuth() {
  const { user } = useAuth();
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [branding, setBranding] = useState<PortalBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPortalUser, setIsPortalUser] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    
    const { data: pu } = await supabase
      .from('client_portal_users' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (pu) {
      setPortalUser(pu as any as PortalUser);
      setIsPortalUser(true);

      // Update last_login_at via SECURITY DEFINER function (safe, no RLS bypass)
      await supabase.rpc('update_portal_last_login', { _user_id: user.id });

      // Load branding
      const { data: br } = await supabase
        .from('client_portal_branding' as any)
        .select('*')
        .eq('client_id', (pu as any).client_id)
        .maybeSingle();
      if (br) setBranding(br as any as PortalBranding);

      // Load client name for remembered account label
      let clientLabel: string | null = null;
      try {
        const { data: cl } = await supabase
          .from('clients')
          .select('name')
          .eq('id', (pu as any).client_id)
          .maybeSingle();
        clientLabel = cl?.name || null;
      } catch {}

      // Save to remembered accounts (portal type, no tokens)
      upsertRememberedAccount({
        userId: user.id,
        email: user.email || '',
        displayName: (pu as any).full_name || null,
        avatarUrl: null,
        accountType: 'portal',
        roleLabel: 'Portal',
        portalClientLabel: clientLabel || (br as any)?.portal_title || null,
        entryRoute: '/portal',
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { portalUser, branding, loading, isPortalUser, reload: load };
}

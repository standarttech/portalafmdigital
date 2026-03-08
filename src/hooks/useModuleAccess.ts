import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MODULE_KEYS = ['can_access_afm_internal', 'can_access_adminscale', 'can_access_crm', 'can_access_growth_os', 'can_access_ai_ads', 'can_manage_ai_infra'] as const;

export function useModuleAccess() {
  const { user, effectiveRole, simulatedUser } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;

    // Admin always has full access
    if (effectiveRole === 'AgencyAdmin') {
      setPermissions({ can_access_afm_internal: true, can_access_adminscale: true, can_access_crm: true, can_access_growth_os: true, can_access_ai_ads: true, can_manage_ai_infra: true });
      return;
    }

    // If simulating a specific user, load THEIR permissions
    const targetUserId = simulatedUser ? simulatedUser.userId : user.id;

    supabase.from('user_permissions')
      .select(MODULE_KEYS.join(','))
      .eq('user_id', targetUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const p: Record<string, boolean> = {};
          MODULE_KEYS.forEach(k => { p[k] = !!(data as any)[k]; });
          setPermissions(p);
        } else {
          setPermissions({ can_access_afm_internal: false, can_access_adminscale: false, can_access_crm: false, can_access_growth_os: false, can_access_ai_ads: false, can_manage_ai_infra: false });
        }
      });
  }, [user, effectiveRole, simulatedUser]);

  return {
    canAccessAfmInternal: permissions.can_access_afm_internal ?? false,
    canAccessAdminScale: permissions.can_access_adminscale ?? false,
    canAccessCrm: permissions.can_access_crm ?? false,
    canAccessGrowthOs: permissions.can_access_growth_os ?? false,
    canAccessAiAds: permissions.can_access_ai_ads ?? false,
  };
}

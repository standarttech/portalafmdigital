import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MODULE_KEYS = ['can_access_afm_internal', 'can_access_adminscale', 'can_access_crm'] as const;

export function useModuleAccess() {
  const { user, effectiveRole } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    if (effectiveRole === 'AgencyAdmin') {
      setPermissions({ can_access_afm_internal: true, can_access_adminscale: true, can_access_crm: true });
      return;
    }
    supabase.from('user_permissions')
      .select(MODULE_KEYS.join(','))
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const p: Record<string, boolean> = {};
          MODULE_KEYS.forEach(k => { p[k] = !!(data as any)[k]; });
          setPermissions(p);
        }
      });
  }, [user, effectiveRole]);

  return {
    canAccessAfmInternal: permissions.can_access_afm_internal ?? false,
    canAccessAdminScale: permissions.can_access_adminscale ?? false,
    canAccessCrm: permissions.can_access_crm ?? false,
  };
}

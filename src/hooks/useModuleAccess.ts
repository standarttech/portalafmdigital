import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MODULE_KEYS = ['can_access_afm_internal', 'can_access_crm', 'can_access_growth_os', 'can_access_ai_ads', 'can_manage_ai_infra'] as const;

const ALL_TRUE = Object.fromEntries(MODULE_KEYS.map(k => [k, true])) as Record<string, boolean>;
const ALL_FALSE = Object.fromEntries(MODULE_KEYS.map(k => [k, false])) as Record<string, boolean>;

export function useModuleAccess() {
  const { user, effectiveRole, simulatedUser } = useAuth();
  const targetUserId = simulatedUser ? simulatedUser.userId : user?.id;
  const isAdmin = effectiveRole === 'AgencyAdmin';

  const { data: permissions } = useQuery({
    queryKey: ['module-access', targetUserId, isAdmin],
    queryFn: async () => {
      if (isAdmin) return ALL_TRUE;
      if (!targetUserId) return ALL_FALSE;
      const { data } = await supabase.from('user_permissions')
        .select(MODULE_KEYS.join(','))
        .eq('user_id', targetUserId)
        .maybeSingle();
      if (!data) return ALL_FALSE;
      const p: Record<string, boolean> = {};
      MODULE_KEYS.forEach(k => { p[k] = !!(data as any)[k]; });
      return p;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const p = permissions ?? (isAdmin ? ALL_TRUE : ALL_FALSE);

  return {
    canAccessAfmInternal: p.can_access_afm_internal ?? false,
    
    canAccessCrm: p.can_access_crm ?? false,
    canAccessGrowthOs: p.can_access_growth_os ?? false,
    canAccessAiAds: p.can_access_ai_ads ?? false,
    canManageAiInfra: p.can_manage_ai_infra ?? false,
  };
}

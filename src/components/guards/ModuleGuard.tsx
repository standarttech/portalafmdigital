import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ModuleGuardProps {
  module: 'afm_internal' | 'crm' | 'growth_os' | 'ai_ads' | 'ai_infra';
  children: React.ReactElement;
}

/**
 * Guards module routes. Admins always have access.
 * Other roles need explicit permission flags.
 * Wraps a layout component — renders it directly so <Outlet> works.
 */
export default function ModuleGuard({ module, children }: ModuleGuardProps) {
  const { user, effectiveRole, simulatedUser } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(
    effectiveRole === 'AgencyAdmin' ? true : null
  );

  useEffect(() => {
    if (!user) { setAllowed(false); return; }
    if (effectiveRole === 'AgencyAdmin') { setAllowed(true); return; }

    const targetUserId = simulatedUser ? simulatedUser.userId : user.id;
    const permKey = module === 'ai_infra' ? 'can_manage_ai_infra' : `can_access_${module}`;
    supabase.from('user_permissions')
      .select(permKey)
      .eq('user_id', targetUserId)
      .maybeSingle()
      .then(({ data }) => {
        setAllowed(data ? !!(data as any)[permKey] : false);
      });
  }, [user, effectiveRole, simulatedUser, module]);

  if (allowed === null) return null;
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return children;
}

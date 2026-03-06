import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ModuleGuardProps {
  module: 'afm_internal' | 'adminscale' | 'crm';
  children: React.ReactElement;
}

/**
 * Guards module routes. Admins always have access.
 * Other roles need explicit permission flags.
 * Wraps a layout component — renders it directly so <Outlet> works.
 */
export default function ModuleGuard({ module, children }: ModuleGuardProps) {
  const { user, agencyRole } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(
    agencyRole === 'AgencyAdmin' ? true : null
  );

  useEffect(() => {
    if (!user) { setAllowed(false); return; }
    if (agencyRole === 'AgencyAdmin') { setAllowed(true); return; }

    const permKey = `can_access_${module}`;
    supabase.from('user_permissions')
      .select(permKey)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setAllowed(data ? !!(data as any)[permKey] : false);
      });
  }, [user, agencyRole, module]);

  if (allowed === null) return null;
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return children;
}

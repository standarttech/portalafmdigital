import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ModuleGuardProps {
  module: 'afm_internal' | 'adminscale' | 'crm';
  children: React.ReactNode;
}

/**
 * Guards module routes. Admins always have access.
 * Other roles need explicit permission flags.
 */
export default function ModuleGuard({ module, children }: ModuleGuardProps) {
  const { user, agencyRole } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setAllowed(false); return; }
    if (agencyRole === 'AgencyAdmin') { setAllowed(true); return; }

    const permKey = `can_access_${module}` as const;
    supabase.from('user_permissions')
      .select(permKey)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setAllowed(data ? !!(data as any)[permKey] : false);
      });
  }, [user, agencyRole, module]);

  if (allowed === null) return null; // loading
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

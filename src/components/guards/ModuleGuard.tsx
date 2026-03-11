import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ModuleGuardProps {
  module: 'afm_internal' | 'crm' | 'growth_os' | 'ai_ads' | 'ai_infra';
  children: React.ReactElement;
}

/**
 * Guards module routes. All roles, including AgencyAdmin, are verified
 * against the DB on every mount to prevent stale-cache privilege escalation.
 * Renders a spinner while the async check is in flight.
 */
export default function ModuleGuard({ module, children }: ModuleGuardProps) {
  const { user, effectiveRole, simulatedUser } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const checkRef = useRef(0);

  useEffect(() => {
    if (!user) {
      setAllowed(false);
      return;
    }

    const ticket = ++checkRef.current;

    const targetUserId = simulatedUser ? simulatedUser.userId : user.id;
    const permKey = module === 'ai_infra' ? 'can_manage_ai_infra' : `can_access_${module}`;

    const run = async () => {
      try {
        if (effectiveRole === 'AgencyAdmin') {
          const { data, error } = await supabase
            .from('agency_users')
            .select('agency_role')
            .eq('user_id', targetUserId)
            .maybeSingle();
          if (ticket !== checkRef.current) return;
          if (error || !data || data.agency_role !== 'AgencyAdmin') {
            setAllowed(false);
          } else {
            setAllowed(true);
          }
          return;
        }

        const { data } = await supabase
          .from('user_permissions')
          .select(permKey)
          .eq('user_id', targetUserId)
          .maybeSingle();
        if (ticket !== checkRef.current) return;
        setAllowed(data ? !!(data as any)[permKey] : false);
      } catch {
        if (ticket !== checkRef.current) return;
        setAllowed(false);
      }
    };

    run();
  }, [user, effectiveRole, simulatedUser, module]);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return children;
}

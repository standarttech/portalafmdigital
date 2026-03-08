import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useGosAuditLog() {
  const { user, effectiveRole } = useAuth();

  const logGosAction = useCallback(async (
    actionType: string,
    entityType: string,
    entityId?: string,
    entityName?: string,
    opts?: {
      clientId?: string;
      beforeSummary?: Record<string, any>;
      afterSummary?: Record<string, any>;
      metadata?: Record<string, any>;
    },
  ) => {
    if (!user) return;
    try {
      await supabase.from('gos_audit_log' as any).insert({
        actor_user_id: user.id,
        actor_role: effectiveRole || null,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId || null,
        entity_name: entityName || null,
        client_id: opts?.clientId || null,
        before_summary: opts?.beforeSummary || null,
        after_summary: opts?.afterSummary || null,
        metadata: opts?.metadata || {},
      });
    } catch {
      // Silent - audit logging should never block user actions
    }
  }, [user, effectiveRole]);

  return { logGosAction };
}

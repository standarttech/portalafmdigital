import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = useCallback(async (
    action: string,
    entityType?: string,
    entityId?: string,
    entityName?: string,
    details?: Record<string, any>,
  ) => {
    if (!user) return;
    try {
      await supabase.from('user_activity_log' as any).insert({
        user_id: user.id,
        action,
        entity_type: entityType || null,
        entity_id: entityId || null,
        entity_name: entityName || null,
        details: details || {},
      });
    } catch {}
  }, [user]);

  return { logActivity };
}

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePresence() {
  const { user } = useAuth();
  const intervalRef = useRef<number>();

  useEffect(() => {
    if (!user) return;

    const update = async (online: boolean) => {
      try {
        await supabase.from('user_presence' as any).upsert({
          user_id: user.id,
          is_online: online,
          last_seen_at: new Date().toISOString(),
          current_page: window.location.pathname,
        }, { onConflict: 'user_id' });
      } catch {}
    };

    update(true);
    intervalRef.current = window.setInterval(() => update(true), 60_000);

    const onVisibility = () => update(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);

    const onBeforeUnload = () => update(false);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
      update(false);
    };
  }, [user]);
}

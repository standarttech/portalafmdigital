import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Lightweight presence tracker that does NOT break bfcache.
 * Uses visibilitychange (safe) instead of beforeunload (breaks bfcache on mobile).
 * Sends heartbeat every 60s only when tab is visible.
 */
export function usePresence() {
  const { user } = useAuth();
  const intervalRef = useRef<number>();

  useEffect(() => {
    if (!user) return;

    const update = (online: boolean) => {
      // Use sendBeacon-style fire-and-forget to avoid blocking navigation
      supabase.from('user_presence' as any).upsert({
        user_id: user.id,
        is_online: online,
        last_seen_at: new Date().toISOString(),
        current_page: window.location.pathname,
      }, { onConflict: 'user_id' }).then(() => {});
    };

    // Initial online signal
    update(true);

    // Heartbeat only when visible
    intervalRef.current = window.setInterval(() => {
      if (document.visibilityState === 'visible') update(true);
    }, 60_000);

    // Visibility change — safe for bfcache
    const onVisibility = () => {
      update(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVisibility);

    // pagehide with persisted check — bfcache safe
    const onPageHide = (e: PageTransitionEvent) => {
      if (!e.persisted) {
        // Page is truly unloading, not going to bfcache
        update(false);
      }
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [user]);
}

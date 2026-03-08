import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, Bell, Download, Eye, UserX, Clock } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuditEntry {
  id: string;
  action: string;
  entity_id: string | null;
  user_id: string | null;
  created_at: string;
  details: any;
}

export default function PortalActivityPanel() {
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<AuditEntry[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<{ client_id: string; name: string; count: number }[]>([]);
  const [neverLogged, setNeverLogged] = useState<{ email: string; client_name: string }[]>([]);

  const load = useCallback(async () => {
    const [actRes, notifRes, puRes, cRes] = await Promise.all([
      supabase
        .from('audit_log')
        .select('*')
        .in('action', [
          'portal_report_exported', 'portal_pdf_report_generated',
          'portal_logout', 'portal_password_reset_initiated',
          'portal_notification_preferences_updated',
        ])
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('portal_notifications' as any)
        .select('client_id, is_read')
        .eq('is_read', false),
      supabase
        .from('client_portal_users' as any)
        .select('email, client_id, last_login_at, status')
        .eq('status', 'active'),
      supabase.from('clients').select('id, name'),
    ]);

    setRecentActivity((actRes.data as any[]) || []);

    // Aggregate unread by client
    const clients = (cRes.data || []) as { id: string; name: string }[];
    const clientMap = new Map(clients.map(c => [c.id, c.name]));
    const notifs = (notifRes.data as any[]) || [];
    const unreadMap = new Map<string, number>();
    for (const n of notifs) {
      unreadMap.set(n.client_id, (unreadMap.get(n.client_id) || 0) + 1);
    }
    setUnreadCounts(
      Array.from(unreadMap.entries())
        .map(([cid, count]) => ({ client_id: cid, name: clientMap.get(cid) || cid.slice(0, 8), count }))
        .sort((a, b) => b.count - a.count)
    );

    // Never logged in
    const users = (puRes.data as any[]) || [];
    setNeverLogged(
      users
        .filter(u => !u.last_login_at)
        .map(u => ({ email: u.email, client_name: clientMap.get(u.client_id) || u.client_id.slice(0, 8) }))
    );

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const actionLabel: Record<string, string> = {
    portal_report_exported: 'CSV Export',
    portal_pdf_report_generated: 'PDF Report',
    portal_logout: 'Logout',
    portal_password_reset_initiated: 'Password Reset',
    portal_notification_preferences_updated: 'Prefs Updated',
  };

  const actionIcon: Record<string, typeof Activity> = {
    portal_report_exported: Download,
    portal_pdf_report_generated: Download,
    portal_logout: UserX,
    portal_password_reset_initiated: Clock,
    portal_notification_preferences_updated: Bell,
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Eye className="h-4 w-4 text-primary" /> Portal Activity Monitor
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Unread Notifications by Client */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-amber-500" /> Unread Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unreadCounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">All caught up</p>
            ) : (
              <div className="space-y-1.5">
                {unreadCounts.slice(0, 8).map(uc => (
                  <div key={uc.client_id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground truncate flex-1">{uc.name}</span>
                    <Badge variant="outline" className="text-[9px] ml-2">{uc.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Never Logged In */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <UserX className="h-3.5 w-3.5 text-destructive" /> Never Logged In
            </CardTitle>
          </CardHeader>
          <CardContent>
            {neverLogged.length === 0 ? (
              <p className="text-xs text-muted-foreground">All users have logged in</p>
            ) : (
              <div className="space-y-1.5">
                {neverLogged.slice(0, 8).map((u, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-foreground">{u.email}</span>
                    <span className="text-muted-foreground ml-1">({u.client_name})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" /> Recent Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground">No portal activity yet</p>
            ) : (
              <div className="space-y-1.5">
                {recentActivity.slice(0, 8).map(a => {
                  const Icon = actionIcon[a.action] || Activity;
                  return (
                    <div key={a.id} className="flex items-center gap-1.5 text-xs">
                      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-foreground">{actionLabel[a.action] || a.action}</span>
                      <span className="text-muted-foreground ml-auto text-[9px] whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

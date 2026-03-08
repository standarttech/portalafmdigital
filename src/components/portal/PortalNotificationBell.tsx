import { Bell, Check, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

interface Props {
  clientId: string | null;
}

export default function PortalNotificationBell({ clientId }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('portal_notifications' as any)
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data as any as Notification[]) || []);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const unread = notifications.filter(n => !n.is_read).length;
  const displayed = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;

  const markRead = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from('portal_notifications' as any).update({ is_read: true } as any).eq('id', n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    // Navigate to link if it's a portal-safe route
    if (n.link && n.link.startsWith('/portal')) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const markAllRead = async () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (ids.length === 0) return;
    await supabase.from('portal_notifications' as any).update({ is_read: true } as any).in('id', ids);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const typeIcon: Record<string, string> = {
    campaign_launched: '🚀',
    optimization_update: '⚡',
    report_available: '📊',
    recommendation_added: '💡',
    portal_access_updated: '🔑',
    file_shared: '📁',
    general: '📌',
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="h-4 w-4 text-sidebar-muted" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] text-destructive-foreground flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" side="bottom">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Notifications</span>
            <button
              onClick={() => setFilter(f => f === 'all' ? 'unread' : 'all')}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="h-2.5 w-2.5" />
              {filter === 'unread' ? 'Unread' : 'All'}
            </button>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-[10px] h-6 px-2 gap-1">
              <Check className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {displayed.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </div>
          ) : (
            <div className="divide-y">
              {displayed.map(n => (
                <div
                  key={n.id}
                  className={`px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                  onClick={() => markRead(n)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm shrink-0">{typeIcon[n.type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${!n.is_read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>{n.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

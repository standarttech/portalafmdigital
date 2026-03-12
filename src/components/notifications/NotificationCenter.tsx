import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Check, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const typeIcons: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  error: AlertTriangle,
};

const typeColors: Record<string, string> = {
  info: 'text-blue-400',
  warning: 'text-warning',
  success: 'text-success',
  error: 'text-destructive',
};

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'unread' | 'read'>('unread');

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []) as Notification[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // Refetch when popover opens
    refetchInterval: open ? 30_000 : false,
  });

  const unread = notifications.filter(n => !n.is_read);
  const read = notifications.filter(n => n.is_read);
  const unreadCount = unread.length;
  const displayed = tab === 'unread' ? unread : read;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    queryClient.setQueryData(['notifications', user.id], (old: Notification[] | undefined) =>
      (old || []).map(n => ({ ...n, is_read: true }))
    );
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) =>
        (old || []).map(x => x.id === n.id ? { ...x, is_read: true } : x)
      );
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative text-muted-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-1rem)] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && tab === 'unread' && (
            <button onClick={markAllRead} className="text-[10px] text-primary hover:underline flex items-center gap-1">
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab('unread')}
            className={cn(
              'flex-1 text-[11px] font-medium py-2 transition-colors',
              tab === 'unread' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Unread {unreadCount > 0 && <span className="ml-1 px-1 rounded-full bg-destructive/10 text-destructive text-[9px]">{unreadCount}</span>}
          </button>
          <button
            onClick={() => setTab('read')}
            className={cn(
              'flex-1 text-[11px] font-medium py-2 transition-colors',
              tab === 'read' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Read
          </button>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">{tab === 'unread' ? 'No unread notifications' : 'No read notifications'}</p>
            </div>
          ) : (
            displayed.map(n => {
              const Icon = typeIcons[n.type] || Info;
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    'flex gap-2.5 px-3 py-2.5 border-b border-border/50 cursor-pointer hover:bg-secondary/30 transition-colors',
                    !n.is_read && 'bg-primary/5'
                  )}
                >
                  <Icon className={cn('h-4 w-4 flex-shrink-0 mt-0.5', typeColors[n.type] || 'text-muted-foreground')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={cn('text-xs font-medium truncate', !n.is_read ? 'text-foreground' : 'text-muted-foreground')}>{n.title}</p>
                      <span className="text-[9px] text-muted-foreground/60 flex-shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    {n.link && <p className="text-[9px] text-primary/60 mt-0.5">Click to view →</p>}
                  </div>
                  {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

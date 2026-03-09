import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Circle, Clock, Eye, Search, Activity, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

interface PresenceRow {
  user_id: string;
  is_online: boolean;
  last_seen_at: string;
  current_page: string | null;
  display_name?: string;
  agency_role?: string;
  email?: string;
}

interface ActivityRow {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_name: string | null;
  created_at: string;
  details: any;
}

export default function UserPresencePage() {
  const { t, language } = useLanguage();
  const [presenceList, setPresenceList] = useState<PresenceRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState('all');

  const locale = language === 'ru' ? ru : enUS;

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch ALL agency users first
    const { data: users } = await supabase
      .from('agency_users')
      .select('user_id, display_name, agency_role')
      .order('display_name');

    // Fetch presence records
    const { data: presence } = await supabase
      .from('user_presence' as any)
      .select('*');

    const presenceMap = new Map((presence || []).map((p: any) => [p.user_id, p]));

    // Merge: show ALL users, with presence data where available
    const enriched: PresenceRow[] = (users || []).map((u: any) => {
      const p = presenceMap.get(u.user_id) as any;
      return {
        user_id: u.user_id,
        is_online: p?.is_online || false,
        last_seen_at: p?.last_seen_at || new Date(0).toISOString(),
        current_page: p?.current_page || null,
        display_name: u.display_name || 'Unknown',
        agency_role: u.agency_role || 'Unknown',
      };
    });

    // Sort: online first, then by last_seen_at desc
    enriched.sort((a, b) => {
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;
      return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
    });

    setPresenceList(enriched);

    // Recent activities (last 100)
    const { data: acts } = await supabase
      .from('user_activity_log' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    setActivities((acts as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime presence updates
  useEffect(() => {
    const channel = supabase
      .channel('presence-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredPresence = presenceList.filter(p =>
    !search || p.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = presenceList.filter(p => p.is_online).length;

  const userActivities = selectedUserId
    ? activities.filter(a => a.user_id === selectedUserId)
    : activities;

  const filteredActivities = activityFilter === 'all'
    ? userActivities
    : userActivities.filter(a => a.action === activityFilter);

  const actionTypes = [...new Set(activities.map(a => a.action))];

  if (loading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t('admin.userPresence' as any)}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {onlineCount} {t('admin.onlineNow' as any)} · {presenceList.length} {t('admin.totalTracked' as any)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> {t('admin.refresh' as any) || 'Refresh'}
        </Button>
      </div>

      {/* Online Users Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('admin.whoIsOnline' as any)}</CardTitle>
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder={t('common.search') || 'Search...'} value={search} onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredPresence.map(p => (
              <button key={p.user_id} onClick={() => setSelectedUserId(p.user_id === selectedUserId ? null : p.user_id)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  selectedUserId === p.user_id ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/30'
                }`}>
                <div className="relative">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Circle className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 ${
                    p.is_online ? 'text-emerald-500 fill-emerald-500' : 'text-muted-foreground/40 fill-muted-foreground/20'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.display_name}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[9px] h-4 px-1">{p.agency_role}</Badge>
                    {p.is_online && p.current_page && (
                      <span className="flex items-center gap-0.5 truncate">
                        <Eye className="h-2.5 w-2.5" /> {p.current_page}
                      </span>
                    )}
                  </div>
                  {!p.is_online && p.last_seen_at !== new Date(0).toISOString() && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(p.last_seen_at), { addSuffix: true, locale })}
                    </p>
                  )}
                  {!p.is_online && p.last_seen_at === new Date(0).toISOString() && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {t('admin.lastSeen' as any)}: —
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">
              {selectedUserId
                ? `${t('admin.activityFor' as any)}: ${presenceList.find(p => p.user_id === selectedUserId)?.display_name || 'User'}`
                : t('admin.recentActivity' as any)}
            </CardTitle>
            <div className="flex gap-2">
              {selectedUserId && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedUserId(null)}>
                  {t('crm.clearFilters') || 'Clear'}
                </Button>
              )}
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                  {actionTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('common.noData') || 'No activity data'}</p>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {filteredActivities.map(a => {
                const userName = presenceList.find(p => p.user_id === a.user_id)?.display_name || 'Unknown';
                return (
                  <div key={a.id} className="flex items-start gap-3 py-2 px-2 rounded hover:bg-secondary/20 text-sm">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{userName}</span>
                        {' · '}
                        <span className="text-muted-foreground">{a.action}</span>
                        {a.entity_name && (
                          <span className="text-foreground"> — {a.entity_name}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale })}
                        {a.entity_type && ` · ${a.entity_type}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Shield, Search, Clock, User, ChevronDown, ChevronRight, CalendarIcon, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange as DayPickerRange } from 'react-day-picker';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
}

const actionStyles: Record<string, string> = {
  INSERT: 'bg-success/15 text-success border-success/20',
  UPDATE: 'bg-info/15 text-info border-info/20',
  DELETE: 'bg-destructive/15 text-destructive border-destructive/20',
};

const entityIcons: Record<string, string> = {
  clients: '👤', agency_users: '🔑', campaigns: '📢', tasks: '✅',
  invitations: '💌', user_permissions: '🛡️', client_users: '🔗',
  reports: '📊', access_requests: '📝', budget_plans: '💰',
  client_targets: '🎯', platform_connections: '🔌',
};

function getHumanAction(entry: AuditEntry, isRu: boolean): string {
  const d = entry.details;
  const record = d?.new || d?.old;
  const name = record?.name || record?.campaign_name || record?.title || record?.email || record?.display_name || '';
  const entity = entry.entity_type || '';

  const labels: Record<string, Record<string, Record<string, string>>> = {
    clients: {
      INSERT: { ru: `Создан клиент "${name}"`, en: `Created client "${name}"` },
      UPDATE: { ru: `Обновлен клиент "${name}"`, en: `Updated client "${name}"` },
      DELETE: { ru: `Удален клиент "${name}"`, en: `Deleted client "${name}"` },
    },
    agency_users: {
      INSERT: { ru: `Добавлен пользователь "${name}"`, en: `Added user "${name}"` },
      UPDATE: { ru: `Обновлен пользователь "${name}"`, en: `Updated user "${name}"` },
      DELETE: { ru: `Удален пользователь "${name}"`, en: `Removed user "${name}"` },
    },
    invitations: {
      INSERT: { ru: `Создано приглашение для ${record?.email || ''}`, en: `Created invitation for ${record?.email || ''}` },
      UPDATE: { ru: `Обновлено приглашение для ${record?.email || ''}`, en: `Updated invitation for ${record?.email || ''}` },
    },
    client_users: {
      INSERT: { ru: 'Пользователь назначен к клиенту', en: 'Assigned user to client' },
      DELETE: { ru: 'Пользователь отвязан от клиента', en: 'Unassigned user from client' },
    },
    user_permissions: {
      UPDATE: { ru: 'Обновлены разрешения', en: 'Updated permissions' },
      INSERT: { ru: 'Установлены разрешения', en: 'Set permissions' },
    },
    campaigns: {
      INSERT: { ru: `Создана кампания "${name}"`, en: `Created campaign "${name}"` },
      UPDATE: { ru: `Обновлена кампания "${name}"`, en: `Updated campaign "${name}"` },
    },
    access_requests: {
      INSERT: { ru: `Новый запрос от ${record?.email || name}`, en: `New request from ${record?.email || name}` },
      UPDATE: { ru: `Обработан запрос от ${record?.email || name}`, en: `Processed request from ${record?.email || name}` },
    },
    reports: {
      INSERT: { ru: `Создан отчет "${name}"`, en: `Created report "${name}"` },
    },
  };

  const lang = isRu ? 'ru' : 'en';
  return labels[entity]?.[entry.action]?.[lang] || `${entry.action} ${entity}`;
}

export default function AuditPage() {
  const { t, language } = useLanguage();
  const isRu = language === 'ru';
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DayPickerRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (dateRange?.from) {
      query = query.gte('created_at', format(dateRange.from, 'yyyy-MM-dd'));
    }
    if (dateRange?.to) {
      const nextDay = new Date(dateRange.to);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.lt('created_at', format(nextDay, 'yyyy-MM-dd'));
    }

    const { data, error } = await query;

    if (!error && data) {
      setLogs(data);
      const userIds = [...new Set(data.map(l => l.user_id).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('agency_users')
          .select('user_id, display_name')
          .in('user_id', userIds);
        if (users) {
          const map: Record<string, string> = {};
          users.forEach(u => { map[u.user_id] = u.display_name || u.user_id.slice(0, 8); });
          setUserNames(map);
        }
      }
    }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const uniqueEntities = useMemo(() => [...new Set(logs.map(l => l.entity_type).filter(Boolean))] as string[], [logs]);
  const uniqueUsers = useMemo(() => [...new Set(logs.map(l => l.user_id).filter(Boolean))] as string[], [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    if (entityFilter !== 'all' && l.entity_type !== entityFilter) return false;
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (userFilter !== 'all' && l.user_id !== userFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const userName = l.user_id ? (userNames[l.user_id] || '').toLowerCase() : '';
      const humanAction = getHumanAction(l, isRu).toLowerCase();
      return humanAction.includes(s) || userName.includes(s);
    }
    return true;
  }), [logs, entityFilter, actionFilter, userFilter, search, userNames, isRu]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const groupedByDate = useMemo(() => filtered.reduce<Record<string, AuditEntry[]>>((acc, entry) => {
    const dateKey = new Date(entry.created_at).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {}), [filtered, isRu]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('audit.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('audit.subtitle')}</p>
      </motion.div>

      <motion.div variants={item} className="flex items-center gap-2 flex-wrap">
        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateRange?.from ? format(dateRange.from, 'dd.MM.yy') : '—'} – {dateRange?.to ? format(dateRange.to, 'dd.MM.yy') : '—'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={1}
              disabled={date => date > new Date()}
              className="p-3 pointer-events-auto"
              weekStartsOn={1}
            />
          </PopoverContent>
        </Popover>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder={t('common.search') + '...'} className="h-8 w-32 sm:w-40 pl-8 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Entity Filter */}
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="h-8 w-[110px] sm:w-[140px] text-xs">
            <SelectValue placeholder={isRu ? 'Объект' : 'Entity'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {uniqueEntities.map(e => (
              <SelectItem key={e} value={e}>{entityIcons[e] || '📌'} {e.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action Filter */}
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-8 w-[100px] sm:w-[120px] text-xs">
            <SelectValue placeholder={isRu ? 'Действие' : 'Action'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="INSERT">{isRu ? 'Создание' : 'Create'}</SelectItem>
            <SelectItem value="UPDATE">{isRu ? 'Изменение' : 'Update'}</SelectItem>
            <SelectItem value="DELETE">{isRu ? 'Удаление' : 'Delete'}</SelectItem>
          </SelectContent>
        </Select>

        {/* User Filter */}
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder={isRu ? 'Пользователь' : 'User'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {uniqueUsers.map(uid => (
              <SelectItem key={uid} value={uid}>{userNames[uid] || uid.slice(0, 8)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="text-[10px]">{filtered.length} {isRu ? 'записей' : 'entries'}</Badge>
      </motion.div>

      <motion.div variants={item}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">{t('audit.noLogs')}</h2>
            <p className="text-muted-foreground text-sm max-w-md">{t('audit.noLogsDesc')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([dateKey, entries]) => (
              <div key={dateKey}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">{dateKey}</p>
                <div className="space-y-1.5">
                  {entries.map(entry => {
                    const isExpanded = expandedIds.has(entry.id);
                    return (
                      <Card key={entry.id} className="glass-card">
                        <CardContent className="py-2.5 px-4">
                          <button className="w-full flex items-start gap-3 text-left" onClick={() => toggleExpand(entry.id)}>
                            <span className="text-base flex-shrink-0 mt-0.5">{entityIcons[entry.entity_type || ''] || '📌'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">{getHumanAction(entry, isRu)}</p>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] py-0 ${actionStyles[entry.action] || ''}`}>
                                  {entry.action}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {entry.user_id ? (userNames[entry.user_id] || entry.user_id.slice(0, 8)) : 'System'}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(entry.created_at).toLocaleString(isRu ? 'ru-RU' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                            {entry.details && (
                              isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                            )}
                          </button>
                          {isExpanded && entry.details && (
                            <div className="mt-3 pt-3 border-t border-border/30">
                              <pre className="text-[11px] text-muted-foreground bg-secondary/30 rounded-md p-3 overflow-x-auto max-h-[200px]">
                                {JSON.stringify(entry.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

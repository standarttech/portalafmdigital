import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Shield, Search, Clock, User, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TranslationKey } from '@/i18n/translations';

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
  reports: '📊', access_requests: '📝',
};

const IMPORTANT_ENTITIES = ['clients', 'agency_users', 'campaigns', 'user_permissions', 'client_users', 'invitations', 'access_requests', 'reports'];

function getHumanAction(entry: AuditEntry): string {
  const d = entry.details;
  const record = d?.new || d?.old;
  const name = record?.name || record?.campaign_name || record?.title || record?.email || record?.display_name || '';
  const entity = entry.entity_type || '';

  if (entity === 'clients') {
    if (entry.action === 'INSERT') return `Created client "${name}"`;
    if (entry.action === 'UPDATE') return `Updated client "${name}"`;
    if (entry.action === 'DELETE') return `Deleted client "${name}"`;
  }
  if (entity === 'agency_users') {
    if (entry.action === 'INSERT') return `Added user "${name}"`;
    if (entry.action === 'UPDATE') {
      const oldRole = d?.old?.agency_role;
      const newRole = d?.new?.agency_role;
      if (oldRole && newRole && oldRole !== newRole) return `Changed role: ${name} → ${newRole}`;
      return `Updated user "${name}"`;
    }
    if (entry.action === 'DELETE') return `Removed user "${name}"`;
  }
  if (entity === 'client_users') {
    if (entry.action === 'INSERT') return `Assigned user to client`;
    if (entry.action === 'DELETE') return `Unassigned user from client`;
  }
  if (entity === 'user_permissions') {
    return entry.action === 'UPDATE' ? `Updated permissions` : `Set permissions`;
  }
  if (entity === 'campaigns') {
    if (entry.action === 'INSERT') return `Created campaign "${name}"`;
    if (entry.action === 'UPDATE') return `Updated campaign "${name}"`;
  }
  if (entity === 'invitations') {
    if (entry.action === 'INSERT') return `Created invitation for ${record?.email || ''}`;
    if (entry.action === 'UPDATE') return `Updated invitation for ${record?.email || ''}`;
  }
  if (entity === 'access_requests') {
    if (entry.action === 'UPDATE') {
      const status = record?.status;
      return `${status === 'approved' ? 'Approved' : status === 'denied' ? 'Denied' : 'Updated'} access request from ${record?.email || name}`;
    }
    if (entry.action === 'INSERT') return `New access request from ${record?.email || name}`;
  }
  if (entity === 'reports') {
    if (entry.action === 'INSERT') return `Created report "${name}"`;
  }

  return `${entry.action} ${entity}`;
}

export default function AuditPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      // Filter to important entities only + skip noisy daily_metrics
      const filtered = data.filter(l => !l.entity_type || IMPORTANT_ENTITIES.includes(l.entity_type));
      setLogs(filtered);
      const userIds = [...new Set(filtered.map(l => l.user_id).filter(Boolean))] as string[];
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
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    if (entityFilter !== 'all' && l.entity_type !== entityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const userName = l.user_id ? (userNames[l.user_id] || '').toLowerCase() : '';
      const humanAction = getHumanAction(l).toLowerCase();
      return humanAction.includes(s) || userName.includes(s);
    }
    return true;
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group by date
  const groupedByDate = filtered.reduce<Record<string, AuditEntry[]>>((acc, entry) => {
    const dateKey = new Date(entry.created_at).toLocaleDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {});

  const uniqueEntities = [...new Set(logs.map(l => l.entity_type).filter(Boolean))] as string[];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('audit.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('audit.subtitle')}</p>
      </motion.div>

      <motion.div variants={item} className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('common.search') + '...'} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('audit.entity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {uniqueEntities.map(e => (
              <SelectItem key={e} value={e}>{entityIcons[e] || '📌'} {e.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                              <p className="text-sm text-foreground">{getHumanAction(entry)}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge variant="outline" className={`text-[10px] py-0 ${actionStyles[entry.action] || ''}`}>
                                  {t(`audit.${entry.action}` as TranslationKey) || entry.action}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {entry.user_id ? (userNames[entry.user_id] || entry.user_id.slice(0, 8)) : 'System'}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(entry.created_at)}
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

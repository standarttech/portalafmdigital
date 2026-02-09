import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Shield, Search, Clock, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

const entityLabels: Record<string, string> = {
  clients: '👤 Client',
  agency_users: '🔑 User',
  campaigns: '📢 Campaign',
  tasks: '✅ Task',
  invitations: '💌 Invitation',
  user_permissions: '🛡️ Permissions',
  client_users: '🔗 Client Assignment',
  reports: '📊 Report',
  daily_metrics: '📈 Metrics',
};

export default function AuditPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      setLogs(data);
      // Fetch user display names
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
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    if (entityFilter !== 'all' && l.entity_type !== entityFilter) return false;
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const userName = l.user_id ? (userNames[l.user_id] || '').toLowerCase() : '';
      return l.action.toLowerCase().includes(s) ||
        (l.entity_type || '').toLowerCase().includes(s) ||
        userName.includes(s) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(s);
    }
    return true;
  });

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  const getEntityDetail = (entry: AuditEntry) => {
    if (!entry.details) return null;
    const d = entry.details;
    const record = d.new || d.old;
    if (!record) return null;
    return record.name || record.campaign_name || record.title || record.email || record.display_name || null;
  };

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
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('audit.entity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {uniqueEntities.map(e => (
              <SelectItem key={e} value={e}>{entityLabels[e] || e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('audit.action')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="INSERT">{t('audit.INSERT')}</SelectItem>
            <SelectItem value="UPDATE">{t('audit.UPDATE')}</SelectItem>
            <SelectItem value="DELETE">{t('audit.DELETE')}</SelectItem>
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
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">{t('common.date')}</TableHead>
                      <TableHead>{t('audit.action')}</TableHead>
                      <TableHead>{t('audit.entity')}</TableHead>
                      <TableHead>{t('common.details')}</TableHead>
                      <TableHead>{t('common.user')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {formatDate(entry.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${actionStyles[entry.action] || ''}`}>
                            {t(`audit.${entry.action}` as TranslationKey) || entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="text-muted-foreground">
                            {entry.entity_type ? (entityLabels[entry.entity_type] || entry.entity_type) : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-foreground max-w-[200px] truncate">
                          {getEntityDetail(entry) || (entry.entity_id ? `#${entry.entity_id.slice(0, 8)}` : '—')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            {entry.user_id ? (userNames[entry.user_id] || entry.user_id.slice(0, 8) + '...') : '—'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}

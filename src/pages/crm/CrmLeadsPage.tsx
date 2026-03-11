import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users2, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { generateCSV, downloadCSV } from '@/lib/portalExport';

export default function CrmLeadsPage() {
  const { t } = useLanguage();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [stages, setStages] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [{ data: cl }, { data: st }] = await Promise.all([
        supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
        supabase.from('crm_pipeline_stages').select('id, name'),
      ]);
      setClients(cl || []);
      const map: Record<string, string> = {};
      (st || []).forEach((s: any) => { map[s.id] = s.name; });
      setStages(map);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase.from('crm_leads')
        .select('*, clients!crm_leads_client_id_fkey(name)')
        .order('created_at', { ascending: false }).limit(500);
      if (selectedClientId !== 'all') query = query.eq('client_id', selectedClientId);
      const { data } = await query;
      setLeads(data || []);
      setLoading(false);
    })();
  }, [selectedClientId]);

  const filtered = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.full_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.utm_campaign?.toLowerCase().includes(q) ||
      l.campaign_name?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Source', 'Stage', 'Value', 'UTM Source', 'UTM Campaign', 'Campaign', 'Ad', 'Client', 'Date'];
    const keys = ['full_name', 'email', 'phone', 'company', 'source', 'stage', 'value', 'utm_source', 'utm_campaign', 'campaign_name', 'ad_name', 'client_name', 'created_at'];
    const rows = filtered.map((l: any) => ({
      ...l,
      stage: stages[l.stage_id] || '',
      client_name: l.clients?.name || '',
      created_at: l.created_at ? format(new Date(l.created_at), 'yyyy-MM-dd') : '',
    }));
    downloadCSV(generateCSV(headers, rows, keys), `crm-leads-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  if (loading && clients.length === 0) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">{t('crm.allLeads')}</h1>
        <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
        <div className="flex-1" />
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder={t('crm.allClients')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('crm.allClients')}</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder={t('common.search') + '...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 w-[220px] text-sm" />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1.5" />Export
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="text-center space-y-2">
            <Users2 className="h-12 w-12 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">{t('crm.noLeads')}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('common.name')}</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('crm.company')}</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('common.email')}</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('crm.phone')}</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('crm.source')}</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Stage</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Value</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">UTM Campaign</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Campaign / Ad</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('crm.client')}</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('common.date')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">
                    {lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{lead.company || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{lead.email || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">{lead.phone || '—'}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{lead.source || '—'}</Badge></td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="text-xs">{stages[lead.stage_id] || '—'}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">
                    {lead.value > 0 ? `$${Number(lead.value).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs truncate max-w-[140px]" title={lead.utm_campaign}>
                    {lead.utm_campaign || '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs truncate max-w-[160px]" title={`${lead.campaign_name || ''} / ${lead.ad_name || ''}`}>
                    {lead.campaign_name || lead.ad_name ? `${lead.campaign_name || ''}${lead.ad_name ? ` / ${lead.ad_name}` : ''}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{(lead as any).clients?.name || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">{lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Users2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function CrmLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('crm_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      setLeads(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.full_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">All Leads</h1>
        <Badge variant="secondary" className="text-xs">{leads.length}</Badge>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 w-[220px] text-sm" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="text-center space-y-2">
            <Users2 className="h-12 w-12 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">No leads found</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Source</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2 font-medium text-foreground">{lead.full_name || `${lead.first_name} ${lead.last_name}`}</td>
                  <td className="px-3 py-2 text-muted-foreground">{lead.email || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{lead.phone || '—'}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{lead.source || '—'}</Badge></td>
                  <td className="px-3 py-2"><Badge variant="secondary" className="text-xs">{lead.status}</Badge></td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

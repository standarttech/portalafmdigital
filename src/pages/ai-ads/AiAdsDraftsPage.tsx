import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileStack, Plus, Loader2, Search, Rocket, Clock, CheckCircle2, XCircle,
  Edit, ArrowLeft, Trash2, ChevronDown, ChevronRight, AlertTriangle,
  Eye, Settings, Target, Users, ImageIcon, DollarSign, Shield, Copy
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

// ── Types ──

interface Draft {
  id: string; name: string; campaign_name: string; draft_type: string; status: string;
  platform: string; client_id: string; ad_account_id: string | null;
  source_type: string; source_entity_id: string | null;
  objective: string; budget_mode: string; total_budget: number;
  bid_strategy: string; buying_type: string;
  validation_status: string; validation_errors: any[];
  preview_payload: any; notes: string; config: any; metadata: any;
  created_by: string; created_at: string; updated_at: string;
  recommendation_id: string | null; hypothesis_id: string | null; session_id: string | null;
}

interface DraftItem {
  id: string; draft_id: string; item_type: string; parent_item_id: string | null;
  name: string; status: string; config: any; sort_order: number;
  validation_errors: any[]; created_at: string; updated_at: string;
}

interface Client { id: string; name: string; }
interface AdAccount { id: string; account_name: string | null; platform_account_id: string; client_id: string; connection_id: string; }
interface MetaPage { id: string; name: string; page_id: string; }

// ── Constants ──

const objectives = [
  { value: 'leads', label: 'Lead Generation' },
  { value: 'sales', label: 'Sales / Conversions' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'awareness', label: 'Brand Awareness' },
];

const bidStrategies = [
  { value: 'lowest_cost', label: 'Lowest Cost' },
  { value: 'cost_cap', label: 'Cost Cap' },
  { value: 'bid_cap', label: 'Bid Cap' },
  { value: 'minimum_roas', label: 'Minimum ROAS' },
];

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  draft: { icon: <Edit className="h-3 w-3" />, color: 'text-muted-foreground border-muted-foreground/30', label: 'Draft' },
  ready_for_review: { icon: <Clock className="h-3 w-3" />, color: 'text-amber-400 border-amber-400/30', label: 'In Review' },
  approved: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-emerald-400 border-emerald-400/30', label: 'Approved' },
  rejected: { icon: <XCircle className="h-3 w-3" />, color: 'text-destructive border-destructive/30', label: 'Rejected' },
  submitted_for_execution: { icon: <Rocket className="h-3 w-3" />, color: 'text-blue-400 border-blue-400/30', label: 'Executing' },
  executed: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-violet-400 border-violet-400/30', label: 'Executed' },
  execution_failed: { icon: <AlertTriangle className="h-3 w-3" />, color: 'text-destructive border-destructive/30', label: 'Exec Failed' },
};

const validationStatusConfig: Record<string, { color: string; label: string }> = {
  not_validated: { color: 'text-muted-foreground', label: 'Not Validated' },
  valid: { color: 'text-emerald-400', label: 'Valid' },
  invalid: { color: 'text-destructive', label: 'Has Errors' },
  warning: { color: 'text-amber-400', label: 'Warnings' },
};

// ── Validation logic ──

interface ValidationError { field: string; message: string; severity: 'error' | 'warning'; section?: string; }

function validateDraft(draft: Draft, items: DraftItem[]): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!draft.client_id) errors.push({ field: 'client_id', message: 'Client is required', severity: 'error', section: 'campaign' });
  if (!draft.campaign_name.trim()) errors.push({ field: 'campaign_name', message: 'Campaign name is required', severity: 'error', section: 'campaign' });
  if (!draft.objective) errors.push({ field: 'objective', message: 'Objective is required', severity: 'error', section: 'campaign' });
  if (draft.total_budget <= 0) errors.push({ field: 'total_budget', message: 'Budget must be greater than 0', severity: 'error', section: 'budget' });
  if (!draft.ad_account_id) errors.push({ field: 'ad_account_id', message: 'Ad account is required for launch', severity: 'warning', section: 'campaign' });

  const adsets = items.filter(i => i.item_type === 'adset');
  const ads = items.filter(i => i.item_type === 'ad');

  if (adsets.length === 0) errors.push({ field: 'adsets', message: 'At least one ad set is required', severity: 'error', section: 'adsets' });

  adsets.forEach((as, idx) => {
    const cfg = as.config || {};
    if (!as.name.trim()) errors.push({ field: `adset_${idx}_name`, message: `Ad Set ${idx + 1}: Name is required`, severity: 'error', section: 'adsets' });
    if (!cfg.geo) errors.push({ field: `adset_${idx}_geo`, message: `Ad Set "${as.name || idx + 1}": Geo targeting is required`, severity: 'error', section: 'adsets' });
    if (!cfg.optimization_goal) errors.push({ field: `adset_${idx}_optimization`, message: `Ad Set "${as.name || idx + 1}": Optimization goal is required`, severity: 'warning', section: 'adsets' });

    const adsInSet = ads.filter(a => a.parent_item_id === as.id);
    if (adsInSet.length === 0) errors.push({ field: `adset_${idx}_ads`, message: `Ad Set "${as.name || idx + 1}": No ads configured`, severity: 'warning', section: 'ads' });
  });

  ads.forEach((ad, idx) => {
    const cfg = ad.config || {};
    if (!ad.name.trim()) errors.push({ field: `ad_${idx}_name`, message: `Ad ${idx + 1}: Name is required`, severity: 'error', section: 'ads' });
    if (!cfg.primary_text) errors.push({ field: `ad_${idx}_primary_text`, message: `Ad "${ad.name || idx + 1}": Primary text is required`, severity: 'error', section: 'ads' });
    if (!cfg.headline) errors.push({ field: `ad_${idx}_headline`, message: `Ad "${ad.name || idx + 1}": Headline is required`, severity: 'error', section: 'ads' });
    if (!cfg.destination_url) errors.push({ field: `ad_${idx}_destination`, message: `Ad "${ad.name || idx + 1}": Destination URL is required`, severity: 'error', section: 'ads' });
    if (!ad.parent_item_id) errors.push({ field: `ad_${idx}_parent`, message: `Ad "${ad.name || idx + 1}": Not assigned to any ad set`, severity: 'error', section: 'ads' });
    if (!cfg.page_id) errors.push({ field: `ad_${idx}_page_id`, message: `Ad "${ad.name || idx + 1}": Facebook Page ID is required for Meta execution`, severity: 'warning', section: 'ads' });
  });

  return errors;
}

function buildPreviewPayload(draft: Draft, items: DraftItem[]): any {
  const adsets = items.filter(i => i.item_type === 'adset');
  const ads = items.filter(i => i.item_type === 'ad');

  return {
    campaign: {
      name: draft.campaign_name || draft.name,
      objective: draft.objective,
      buying_type: draft.buying_type,
      bid_strategy: draft.bid_strategy,
      budget: { mode: draft.budget_mode, amount: draft.total_budget },
      platform: draft.platform,
      status: 'PAUSED',
    },
    ad_sets: adsets.map(as => ({
      name: as.name,
      targeting: {
        geo: as.config?.geo || '',
        age_min: as.config?.age_min || 18,
        age_max: as.config?.age_max || 65,
        gender: as.config?.gender || 'all',
        interests: as.config?.interests || '',
        placements: as.config?.placements || 'automatic',
      },
      budget: { daily: as.config?.daily_budget || 0 },
      optimization_goal: as.config?.optimization_goal || '',
      ads: ads.filter(a => a.parent_item_id === as.id).map(ad => ({
        name: ad.name,
        creative: {
          primary_text: ad.config?.primary_text || '',
          headline: ad.config?.headline || '',
          cta: ad.config?.cta || 'LEARN_MORE',
          destination_url: ad.config?.destination_url || '',
          creative_ref: ad.config?.creative_ref || null,
        },
      })),
    })),
  };
}

// ── Main Page ──

export default function AiAdsDraftsPage() {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newDraft, setNewDraft] = useState({ client_id: '', campaign_name: '', objective: '', platform: 'meta' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [dRes, cRes] = await Promise.all([
      supabase.from('campaign_drafts' as any).select('*').order('updated_at', { ascending: false }).limit(200),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    setDrafts((dRes.data as any[]) || []);
    setClients(cRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createDraft = async () => {
    if (!user || !newDraft.client_id || !newDraft.campaign_name.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.from('campaign_drafts' as any).insert({
        client_id: newDraft.client_id,
        created_by: user.id,
        name: newDraft.campaign_name.trim(),
        campaign_name: newDraft.campaign_name.trim(),
        objective: newDraft.objective,
        platform: newDraft.platform,
        source_type: 'manual',
        draft_type: 'campaign',
      }).select().single();
      if (error) throw error;
      logGosAction('create', 'campaign_draft', (data as any).id, newDraft.campaign_name.trim(), { clientId: newDraft.client_id });
      toast.success('Draft created');
      setCreateOpen(false);
      setNewDraft({ client_id: '', campaign_name: '', objective: '', platform: 'meta' });
      load();
    } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
  };

  const filtered = drafts.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (filterClient !== 'all' && d.client_id !== filterClient) return false;
    if (filterSource !== 'all' && d.source_type !== filterSource) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !(d.campaign_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  if (selectedDraft) {
    return <DraftBuilder draft={selectedDraft} clientName={clientName(selectedDraft.client_id)}
      clients={clients} onBack={() => { setSelectedDraft(null); load(); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileStack className="h-6 w-6 text-emerald-400" /> Campaign Drafts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Build, validate, and prepare campaigns for launch</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Draft</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Campaign Draft</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Client</Label>
                <Select value={newDraft.client_id} onValueChange={v => setNewDraft(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Campaign Name</Label><Input value={newDraft.campaign_name} onChange={e => setNewDraft(f => ({ ...f, campaign_name: e.target.value }))} placeholder="Q2 Lead Gen — Lookalike" maxLength={200} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Objective</Label>
                  <Select value={newDraft.objective} onValueChange={v => setNewDraft(f => ({ ...f, objective: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{objectives.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Platform</Label>
                  <Select value={newDraft.platform} onValueChange={v => setNewDraft(f => ({ ...f, platform: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta">Meta</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={createDraft} disabled={!newDraft.client_id || !newDraft.campaign_name.trim() || creating} className="w-full">
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create Draft
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="recommendation">Recommendation</SelectItem>
            <SelectItem value="hypothesis">Hypothesis</SelectItem>
            <SelectItem value="analysis">Analysis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <FileStack className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Campaign Drafts</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create a draft manually or convert a recommendation/hypothesis into a campaign draft.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">AI Analysis</Badge><span>→</span>
            <Badge variant="secondary">Recommendation</Badge><span>→</span>
            <Badge variant="secondary">Draft</Badge><span>→</span>
            <Badge variant="secondary">Approval</Badge><span>→</span>
            <Badge variant="secondary">Launch</Badge>
          </div>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => {
            const sc = statusConfig[d.status] || statusConfig.draft;
            const vc = validationStatusConfig[d.validation_status] || validationStatusConfig.not_validated;
            return (
              <Card key={d.id} className="hover:border-primary/20 transition-colors cursor-pointer" onClick={() => setSelectedDraft(d)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold truncate">{d.campaign_name || d.name}</CardTitle>
                    <Badge variant="outline" className={`gap-1 text-[10px] ${sc.color}`}>{sc.icon} {sc.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="text-foreground">{clientName(d.client_id)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Objective</span><span className="text-foreground capitalize">{d.objective || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><Badge variant="secondary" className="text-[10px]">{d.platform}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="text-foreground capitalize">{d.source_type}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Validation</span><span className={`font-medium ${vc.color}`}>{vc.label}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="text-foreground">{d.total_budget > 0 ? `$${d.total_budget} (${d.budget_mode})` : '—'}</span></div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Draft Builder ──

function DraftBuilder({ draft: initialDraft, clientName, clients, onBack }: {
  draft: Draft; clientName: string; clients: Client[]; onBack: () => void;
}) {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [metaPages, setMetaPages] = useState<MetaPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const loadItems = useCallback(async () => {
    const [iRes, aRes] = await Promise.all([
      supabase.from('campaign_draft_items' as any).select('*').eq('draft_id', draft.id).order('sort_order'),
      supabase.from('ad_accounts').select('id, account_name, platform_account_id, client_id, connection_id').eq('client_id', draft.client_id).eq('is_active', true),
    ]);
    setItems((iRes.data as any[]) || []);
    const accs = aRes.data || [];
    setAccounts(accs);
    // Attempt to fetch Meta pages from platform_connections metadata for connected accounts
    const pages: MetaPage[] = [];
    for (const acc of accs) {
      if (acc.connection_id) {
        const { data: conn } = await supabase.from('platform_connections').select('id, account_name').eq('id', acc.connection_id).single();
        if (conn) {
          // Use the platform_account_id as a potential page source hint
          // Real Meta page discovery would need a dedicated edge function; for now expose account info
          pages.push({ id: acc.id, name: conn.account_name || acc.platform_account_id, page_id: acc.platform_account_id });
        }
      }
    }
    setMetaPages(pages);
    setLoading(false);
  }, [draft.id, draft.client_id]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const saveDraft = async (updates: Partial<Draft>) => {
    setSaving(true);
    // Only send fields that are actually in updates to avoid overwriting with stale state
    const payload: Record<string, any> = {};
    const fieldMap: Record<string, string> = {
      campaign_name: 'campaign_name', objective: 'objective', platform: 'platform',
      budget_mode: 'budget_mode', total_budget: 'total_budget', bid_strategy: 'bid_strategy',
      buying_type: 'buying_type', notes: 'notes', ad_account_id: 'ad_account_id',
      config: 'config', validation_status: 'validation_status',
      validation_errors: 'validation_errors', preview_payload: 'preview_payload',
      status: 'status',
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) payload[col] = (updates as any)[key];
    }
    if (Object.keys(payload).length === 0) { setSaving(false); return; }
    const { error } = await supabase.from('campaign_drafts' as any).update(payload).eq('id', draft.id);
    if (error) { toast.error('Save failed'); setSaving(false); return; }
    const merged = { ...draft, ...updates };
    logGosAction('update', 'campaign_draft', draft.id, merged.campaign_name || draft.name, { clientId: draft.client_id });
    setDraft(merged);
    setSaving(false);
    toast.success('Draft saved');
  };

  const addItem = async (itemType: string, parentId?: string) => {
    const maxSort = items.filter(i => i.item_type === itemType).reduce((m, i) => Math.max(m, i.sort_order), -1);
    const name = itemType === 'adset' ? `Ad Set ${items.filter(i => i.item_type === 'adset').length + 1}` : `Ad ${items.filter(i => i.item_type === 'ad').length + 1}`;
    const { data, error } = await supabase.from('campaign_draft_items' as any).insert({
      draft_id: draft.id, item_type: itemType, name,
      parent_item_id: parentId || null, sort_order: maxSort + 1,
      config: itemType === 'adset' ? { geo: '', age_min: 18, age_max: 65, gender: 'all', interests: '', placements: 'automatic', daily_budget: 0, optimization_goal: '' } :
        { primary_text: '', headline: '', cta: 'LEARN_MORE', destination_url: '', creative_ref: '' },
    }).select().single();
    if (error) { toast.error('Failed to add item'); return; }
    logGosAction('create', 'campaign_draft_item', (data as any).id, name, { metadata: { draftId: draft.id, itemType } });
    setItems(prev => [...prev, data as any]);
  };

  const updateItem = async (itemId: string, updates: Partial<DraftItem>) => {
    const { error } = await supabase.from('campaign_draft_items' as any).update(updates).eq('id', itemId);
    if (error) { toast.error('Save failed'); return; }
    logGosAction('update', 'campaign_draft_item', itemId, undefined, { metadata: { draftId: draft.id } });
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));
  };

  const deleteItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    const { error } = await supabase.from('campaign_draft_items' as any).delete().eq('id', itemId);
    if (error) { toast.error('Delete failed'); return; }
    logGosAction('delete', 'campaign_draft_item', itemId, item?.name, { metadata: { draftId: draft.id } });
    setItems(prev => prev.filter(i => i.id !== itemId && i.parent_item_id !== itemId));
  };

  const runValidation = () => {
    const errors = validateDraft(draft, items);
    const hasErrors = errors.some(e => e.severity === 'error');
    const hasWarnings = errors.some(e => e.severity === 'warning');
    const status = hasErrors ? 'invalid' : hasWarnings ? 'warning' : 'valid';
    setValidationErrors(errors);
    saveDraft({ validation_status: status, validation_errors: errors as any[] });
    logGosAction('validate', 'campaign_draft', draft.id, draft.campaign_name || draft.name, { metadata: { status, errorCount: errors.length } });
    if (status === 'valid') toast.success('Draft is valid and ready');
    else toast.warning(`Found ${errors.length} issue${errors.length > 1 ? 's' : ''}`);
  };

  const generatePreview = () => {
    const payload = buildPreviewPayload(draft, items);
    saveDraft({ preview_payload: payload });
    logGosAction('preview', 'campaign_draft', draft.id, draft.campaign_name || draft.name);
    toast.success('Preview payload generated');
  };

  const submitForReview = async () => {
    if (!user) return;
    // Run validation first
    const errors = validateDraft(draft, items);
    const hasErrors = errors.some(e => e.severity === 'error');
    if (hasErrors) {
      toast.error('Fix validation errors before submitting');
      setValidationErrors(errors);
      saveDraft({ validation_status: 'invalid', validation_errors: errors as any[] });
      return;
    }
    // Generate preview payload
    const payload = buildPreviewPayload(draft, items);
    // Create launch request
    const { data: lr, error } = await supabase.from('launch_requests' as any).insert({
      draft_id: draft.id,
      client_id: draft.client_id,
      ad_account_id: draft.ad_account_id,
      platform: draft.platform,
      requested_by: user.id,
      normalized_payload: payload,
      notes: draft.notes || '',
    }).select().single();
    if (error) { toast.error('Failed to submit: ' + error.message); return; }
    // Update draft status
    saveDraft({ status: 'ready_for_review', preview_payload: payload });
    logGosAction('submit_for_review', 'campaign_draft', draft.id, draft.campaign_name || draft.name, { clientId: draft.client_id, metadata: { launchRequestId: (lr as any).id } });
    toast.success('Draft submitted for review');
  };

  const resubmit = async () => {
    if (!user) return;
    const errors = validateDraft(draft, items);
    const hasErrors = errors.some(e => e.severity === 'error');
    if (hasErrors) {
      toast.error('Fix validation errors before resubmitting');
      setValidationErrors(errors);
      saveDraft({ validation_status: 'invalid', validation_errors: errors as any[] });
      return;
    }
    const payload = buildPreviewPayload(draft, items);
    const { data: lr, error } = await supabase.from('launch_requests' as any).insert({
      draft_id: draft.id,
      client_id: draft.client_id,
      ad_account_id: draft.ad_account_id,
      platform: draft.platform,
      requested_by: user.id,
      normalized_payload: payload,
      notes: `Resubmission: ${draft.notes || ''}`,
    }).select().single();
    if (error) { toast.error('Failed to resubmit: ' + error.message); return; }
    saveDraft({ status: 'ready_for_review', preview_payload: payload });
    logGosAction('resubmit_for_review', 'campaign_draft', draft.id, draft.campaign_name || draft.name, { clientId: draft.client_id, metadata: { launchRequestId: (lr as any).id } });
    toast.success('Draft resubmitted for review');
  };

  const adsets = items.filter(i => i.item_type === 'adset');
  const ads = items.filter(i => i.item_type === 'ad');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg text-foreground truncate">{draft.campaign_name || draft.name}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{clientName}</span><span>·</span><span className="capitalize">{draft.platform}</span>
            <span>·</span><span className="capitalize">{draft.source_type}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`gap-1 ${(statusConfig[draft.status] || statusConfig.draft).color}`}>
            {(statusConfig[draft.status] || statusConfig.draft).icon} {(statusConfig[draft.status] || statusConfig.draft).label}
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${(validationStatusConfig[draft.validation_status] || validationStatusConfig.not_validated).color}`}>
            {(validationStatusConfig[draft.validation_status] || validationStatusConfig.not_validated).label}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="campaign" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="campaign" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" /> Campaign</TabsTrigger>
            <TabsTrigger value="adsets" className="gap-1.5 text-xs"><Target className="h-3.5 w-3.5" /> Ad Sets ({adsets.length})</TabsTrigger>
            <TabsTrigger value="ads" className="gap-1.5 text-xs"><ImageIcon className="h-3.5 w-3.5" /> Ads ({ads.length})</TabsTrigger>
            <TabsTrigger value="budget" className="gap-1.5 text-xs"><DollarSign className="h-3.5 w-3.5" /> Budget</TabsTrigger>
            <TabsTrigger value="validation" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" /> Validation</TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" /> Preview</TabsTrigger>
          </TabsList>

          {/* Campaign Settings */}
          <TabsContent value="campaign">
            <CampaignSettingsTab draft={draft} accounts={accounts} clients={clients} onSave={saveDraft} saving={saving} />
          </TabsContent>

          {/* Ad Sets */}
          <TabsContent value="adsets">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Ad Sets</h3>
                <Button size="sm" className="gap-1.5 text-xs" onClick={() => addItem('adset')}>
                  <Plus className="h-3.5 w-3.5" /> Add Ad Set
                </Button>
              </div>
              {adsets.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No ad sets yet. Add one to define targeting and delivery settings.</p>
                </CardContent></Card>
              ) : (
                adsets.map(as => (
                  <AdSetEditor key={as.id} item={as} onUpdate={updateItem} onDelete={deleteItem}
                    onAddAd={() => addItem('ad', as.id)}
                    childAds={ads.filter(a => a.parent_item_id === as.id)} metaPages={metaPages} />
                ))
              )}
            </div>
          </TabsContent>

          {/* Ads */}
          <TabsContent value="ads">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Ads / Creatives</h3>
                {adsets.length > 0 && (
                  <Select onValueChange={v => addItem('ad', v)}>
                    <SelectTrigger className="w-auto gap-1.5 text-xs h-8"><Plus className="h-3.5 w-3.5" /> Add Ad to...</SelectTrigger>
                    <SelectContent>{adsets.map(as => <SelectItem key={as.id} value={as.id}>{as.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              {ads.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">{adsets.length === 0 ? 'Create an ad set first, then add ads to it.' : 'No ads yet. Add one from the dropdown above.'}</p>
                </CardContent></Card>
              ) : (
                ads.map(ad => {
                  const parentName = adsets.find(as => as.id === ad.parent_item_id)?.name || 'Unassigned';
                  return <AdEditor key={ad.id} item={ad} parentName={parentName} adsets={adsets} onUpdate={updateItem} onDelete={deleteItem} />;
                })
              )}
            </div>
          </TabsContent>

          {/* Budget */}
          <TabsContent value="budget">
            <BudgetTab draft={draft} onSave={saveDraft} saving={saving} />
          </TabsContent>

          {/* Validation */}
          <TabsContent value="validation">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Preflight Validation</h3>
                <Button size="sm" onClick={runValidation} className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" /> Run Validation</Button>
              </div>
              {validationErrors.length === 0 && draft.validation_status === 'not_validated' ? (
                <Card><CardContent className="py-12 text-center">
                  <Shield className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Run validation to check your draft for issues before submission.</p>
                </CardContent></Card>
              ) : validationErrors.length === 0 ? (
                <Card className="border-emerald-500/30"><CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400 mb-3" />
                  <p className="text-sm font-medium text-foreground">Draft is valid</p>
                  <p className="text-xs text-muted-foreground mt-1">All checks passed. Ready for submission.</p>
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {validationErrors.map((e, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${e.severity === 'error' ? 'border-destructive/30 bg-destructive/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                      {e.severity === 'error' ? <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{e.message}</p>
                        {e.section && <p className="text-[10px] text-muted-foreground mt-0.5">Section: {e.section}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Preview Payload</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={generatePreview} className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" /> Generate Preview</Button>
                  {draft.preview_payload && Object.keys(draft.preview_payload).length > 0 && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { navigator.clipboard.writeText(JSON.stringify(draft.preview_payload, null, 2)); toast.success('Copied'); }}>
                      <Copy className="h-3.5 w-3.5" /> Copy JSON
                    </Button>
                  )}
                </div>
              </div>
              {!draft.preview_payload || Object.keys(draft.preview_payload).length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <Eye className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Generate a preview to see what would be sent to the ad platform API.</p>
                  <p className="text-xs text-muted-foreground mt-1">This is preview only — nothing will be published.</p>
                </CardContent></Card>
              ) : (
                <Card><CardContent className="p-4">
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap overflow-auto max-h-[600px] bg-muted/30 rounded-lg p-4">
                    {JSON.stringify(draft.preview_payload, null, 2)}
                  </pre>
                </CardContent></Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Status Actions */}
      {draft.status === 'draft' && (
        <Card className="border-amber-400/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Submit for Review</p>
                <p className="text-xs text-muted-foreground">Send this draft to admin for approval before execution.</p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={submitForReview} disabled={saving}>
                <Rocket className="h-3.5 w-3.5" /> Submit for Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {draft.status === 'rejected' && (
        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Draft was rejected</p>
                <p className="text-xs text-muted-foreground">Make changes and resubmit when ready.</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={resubmit} disabled={saving}>
                <Rocket className="h-3.5 w-3.5" /> Resubmit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {(draft.status === 'executed' || draft.status === 'approved' || draft.status === 'ready_for_review' || draft.status === 'submitted_for_execution') && (
        <Card className="border-blue-400/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground capitalize">{(statusConfig[draft.status] || statusConfig.draft).label}</p>
              <p className="text-xs text-muted-foreground">Go to Executions page to view launch status and details.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Notes & Rationale</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={draft.notes || ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
            placeholder="Add notes about this campaign draft..." rows={3} className="text-sm"
            onBlur={() => saveDraft({ notes: draft.notes })} maxLength={2000} />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Campaign Settings Tab ──

function CampaignSettingsTab({ draft, accounts, clients, onSave, saving }: {
  draft: Draft; accounts: AdAccount[]; clients: Client[]; onSave: (u: Partial<Draft>) => void; saving: boolean;
}) {
  const [local, setLocal] = useState(draft);
  useEffect(() => setLocal(draft), [draft]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Campaign Name</Label><Input value={local.campaign_name} onChange={e => setLocal(l => ({ ...l, campaign_name: e.target.value }))} maxLength={200} /></div>
            <div><Label>Platform</Label>
              <Select value={local.platform} onValueChange={v => setLocal(l => ({ ...l, platform: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="meta">Meta</SelectItem><SelectItem value="google">Google</SelectItem><SelectItem value="tiktok">TikTok</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Objective</Label>
              <Select value={local.objective} onValueChange={v => setLocal(l => ({ ...l, objective: v }))}>
                <SelectTrigger><SelectValue placeholder="Select objective" /></SelectTrigger>
                <SelectContent>{objectives.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Ad Account</Label>
              <Select value={local.ad_account_id || '__none__'} onValueChange={v => setLocal(l => ({ ...l, ad_account_id: v === '__none__' ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No account selected</SelectItem>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name || a.platform_account_id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Buying Type</Label>
              <Select value={local.buying_type} onValueChange={v => setLocal(l => ({ ...l, buying_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="auction">Auction</SelectItem><SelectItem value="reservation">Reservation</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Source</Label><Input value={local.source_type} disabled className="bg-muted/30" /></div>
          </div>
          <Button size="sm" onClick={() => onSave({
            campaign_name: local.campaign_name, objective: local.objective, platform: local.platform,
            ad_account_id: local.ad_account_id, buying_type: local.buying_type,
          })} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Campaign Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Budget Tab ──

function BudgetTab({ draft, onSave, saving }: { draft: Draft; onSave: (u: Partial<Draft>) => void; saving: boolean; }) {
  const [local, setLocal] = useState(draft);
  useEffect(() => setLocal(draft), [draft]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Budget Mode</Label>
            <Select value={local.budget_mode} onValueChange={v => setLocal(l => ({ ...l, budget_mode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="lifetime">Lifetime</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Total Budget ($)</Label><Input type="number" min={0} step={0.01} value={local.total_budget} onChange={e => setLocal(l => ({ ...l, total_budget: parseFloat(e.target.value) || 0 }))} /></div>
          <div><Label>Bid Strategy</Label>
            <Select value={local.bid_strategy} onValueChange={v => setLocal(l => ({ ...l, bid_strategy: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{bidStrategies.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" onClick={() => onSave({
          budget_mode: local.budget_mode, total_budget: local.total_budget, bid_strategy: local.bid_strategy,
        })} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Budget Settings
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Ad Set Editor ──

function AdSetEditor({ item, onUpdate, onDelete, onAddAd, childAds }: {
  item: DraftItem; onUpdate: (id: string, u: Partial<DraftItem>) => void;
  onDelete: (id: string) => void; onAddAd: () => void; childAds: DraftItem[];
}) {
  const [expanded, setExpanded] = useState(true);
  const [cfg, setCfg] = useState(item.config || {});
  const [name, setName] = useState(item.name);

  const save = () => onUpdate(item.id, { name, config: cfg });

  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <Target className="h-4 w-4 text-blue-400" />
          <span className="font-semibold text-sm text-foreground flex-1">{item.name}</span>
          <Badge variant="secondary" className="text-[10px]">{childAds.length} ad{childAds.length !== 1 ? 's' : ''}</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onAddAd(); }}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); onDelete(item.id); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Name</Label><Input value={name} onChange={e => setName(e.target.value)} onBlur={save} className="text-sm" maxLength={200} /></div>
            <div><Label className="text-xs">Geo Targeting</Label><Input value={cfg.geo || ''} onChange={e => setCfg((c: any) => ({ ...c, geo: e.target.value }))} onBlur={save} placeholder="e.g. US, UK" className="text-sm" maxLength={500} /></div>
            <div><Label className="text-xs">Age Min</Label><Input type="number" min={13} max={65} value={cfg.age_min ?? 18} onChange={e => setCfg((c: any) => ({ ...c, age_min: +e.target.value }))} onBlur={save} className="text-sm" /></div>
            <div><Label className="text-xs">Age Max</Label><Input type="number" min={13} max={65} value={cfg.age_max ?? 65} onChange={e => setCfg((c: any) => ({ ...c, age_max: +e.target.value }))} onBlur={save} className="text-sm" /></div>
            <div><Label className="text-xs">Gender</Label>
              <Select value={cfg.gender || 'all'} onValueChange={v => { setCfg((c: any) => ({ ...c, gender: v })); setTimeout(save, 0); }}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Placements</Label>
              <Select value={cfg.placements || 'automatic'} onValueChange={v => { setCfg((c: any) => ({ ...c, placements: v })); setTimeout(save, 0); }}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="automatic">Automatic</SelectItem><SelectItem value="manual">Manual</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Interests / Audience Notes</Label><Input value={cfg.interests || ''} onChange={e => setCfg((c: any) => ({ ...c, interests: e.target.value }))} onBlur={save} placeholder="e.g. fitness, health" className="text-sm" maxLength={500} /></div>
            <div><Label className="text-xs">Daily Budget ($)</Label><Input type="number" min={0} step={0.01} value={cfg.daily_budget ?? 0} onChange={e => setCfg((c: any) => ({ ...c, daily_budget: parseFloat(e.target.value) || 0 }))} onBlur={save} className="text-sm" /></div>
            <div><Label className="text-xs">Optimization Goal</Label><Input value={cfg.optimization_goal || ''} onChange={e => setCfg((c: any) => ({ ...c, optimization_goal: e.target.value }))} onBlur={save} placeholder="e.g. LEAD_GENERATION" className="text-sm" maxLength={200} /></div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Ad Editor ──

function AdEditor({ item, parentName, adsets, onUpdate, onDelete }: {
  item: DraftItem; parentName: string; adsets: DraftItem[];
  onUpdate: (id: string, u: Partial<DraftItem>) => void; onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [cfg, setCfg] = useState(item.config || {});
  const [name, setName] = useState(item.name);

  const save = () => onUpdate(item.id, { name, config: cfg });

  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <ImageIcon className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-sm text-foreground flex-1">{item.name}</span>
          <Badge variant="secondary" className="text-[10px]">{parentName}</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); onDelete(item.id); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Ad Name</Label><Input value={name} onChange={e => setName(e.target.value)} onBlur={save} className="text-sm" maxLength={200} /></div>
            <div><Label className="text-xs">Parent Ad Set</Label>
              <Select value={item.parent_item_id || '__none__'} onValueChange={v => onUpdate(item.id, { parent_item_id: v === '__none__' ? null : v })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {adsets.map(as => <SelectItem key={as.id} value={as.id}>{as.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-xs">Primary Text</Label>
            <Textarea value={cfg.primary_text || ''} onChange={e => setCfg((c: any) => ({ ...c, primary_text: e.target.value }))} onBlur={save} rows={3} className="text-sm" maxLength={2000} placeholder="Main ad copy..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Headline</Label><Input value={cfg.headline || ''} onChange={e => setCfg((c: any) => ({ ...c, headline: e.target.value }))} onBlur={save} className="text-sm" maxLength={200} placeholder="Ad headline" /></div>
            <div><Label className="text-xs">CTA</Label>
              <Select value={cfg.cta || 'LEARN_MORE'} onValueChange={v => { setCfg((c: any) => ({ ...c, cta: v })); setTimeout(save, 0); }}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEARN_MORE">Learn More</SelectItem>
                  <SelectItem value="SIGN_UP">Sign Up</SelectItem>
                  <SelectItem value="SHOP_NOW">Shop Now</SelectItem>
                  <SelectItem value="GET_OFFER">Get Offer</SelectItem>
                  <SelectItem value="APPLY_NOW">Apply Now</SelectItem>
                  <SelectItem value="CONTACT_US">Contact Us</SelectItem>
                  <SelectItem value="DOWNLOAD">Download</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label className="text-xs">Destination URL</Label><Input value={cfg.destination_url || ''} onChange={e => setCfg((c: any) => ({ ...c, destination_url: e.target.value }))} onBlur={save} className="text-sm" maxLength={500} placeholder="https://..." /></div>
            <div><Label className="text-xs">Facebook Page ID</Label><Input value={cfg.page_id || ''} onChange={e => setCfg((c: any) => ({ ...c, page_id: e.target.value }))} onBlur={save} className="text-sm" maxLength={100} placeholder="Required for Meta ad creation" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Creative Reference (optional)</Label><Input value={cfg.creative_ref || ''} onChange={e => setCfg((c: any) => ({ ...c, creative_ref: e.target.value }))} onBlur={save} className="text-sm" maxLength={500} placeholder="Link or reference to creative asset" /></div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

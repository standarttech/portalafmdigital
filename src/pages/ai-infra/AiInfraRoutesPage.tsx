import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GitBranch, Plus, Loader2, ArrowRight, Settings, AlertTriangle, Key } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

interface Route {
  id: string; task_type: string; primary_provider_id: string; fallback_provider_id: string | null;
  priority: number; is_active: boolean; timeout_seconds: number; retry_limit: number;
  model_override: string; created_at: string;
}
interface Provider {
  id: string; name: string; slug: string; auth_type: string; default_model: string;
  is_active: boolean; metadata: any;
}
interface SecretInfo { provider_id: string; secret_ref: string | null; }

export default function AiInfraRoutesPage() {
  const { logGosAction } = useGosAuditLog();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [secrets, setSecrets] = useState<SecretInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<Route | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    task_type: '', primary_provider_id: '', fallback_provider_id: '',
    timeout_seconds: 60, retry_limit: 1, model_override: '',
  });

  const load = useCallback(async () => {
    const [rRes, pRes, sRes] = await Promise.all([
      supabase.from('ai_provider_routes').select('*').order('task_type'),
      supabase.from('ai_providers').select('id, name, slug, auth_type, default_model, is_active, metadata').order('name'),
      supabase.from('ai_provider_secrets').select('provider_id, secret_ref'),
    ]);
    setRoutes((rRes.data as any[]) || []);
    setProviders((pRes.data as any[]) || []);
    setSecrets((sRes.data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const providerName = (id: string | null) => providers.find(p => p.id === id)?.name || '—';

  const providerConfigured = (id: string | null): boolean => {
    if (!id) return false;
    const p = providers.find(x => x.id === id);
    if (!p) return false;
    if (p.auth_type === 'none' || p.metadata?.builtin) return true;
    return secrets.some(s => s.provider_id === id && s.secret_ref);
  };

  const providerModel = (id: string | null): string => {
    if (!id) return '';
    return providers.find(p => p.id === id)?.default_model || '';
  };

  const createRoute = async () => {
    if (!form.task_type || !form.primary_provider_id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('ai_provider_routes').insert({
        task_type: form.task_type,
        primary_provider_id: form.primary_provider_id,
        fallback_provider_id: form.fallback_provider_id || null,
        timeout_seconds: form.timeout_seconds,
        retry_limit: form.retry_limit,
        model_override: form.model_override || '',
      });
      if (error) throw error;
      logGosAction('create', 'ai_provider_route', undefined, form.task_type);
      toast.success('Route created');
      setCreateOpen(false);
      setForm({ task_type: '', primary_provider_id: '', fallback_provider_id: '', timeout_seconds: 60, retry_limit: 1, model_override: '' });
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const openEdit = (r: Route) => {
    setEditRoute(r);
    setForm({
      task_type: r.task_type,
      primary_provider_id: r.primary_provider_id,
      fallback_provider_id: r.fallback_provider_id || '',
      timeout_seconds: r.timeout_seconds,
      retry_limit: r.retry_limit,
      model_override: r.model_override || '',
    });
  };

  const saveEdit = async () => {
    if (!editRoute) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('ai_provider_routes').update({
        task_type: form.task_type,
        primary_provider_id: form.primary_provider_id,
        fallback_provider_id: form.fallback_provider_id || null,
        timeout_seconds: form.timeout_seconds,
        retry_limit: form.retry_limit,
        model_override: form.model_override || '',
      }).eq('id', editRoute.id);
      if (error) throw error;
      logGosAction('update', 'ai_provider_route', editRoute.id, form.task_type);
      toast.success('Route updated');
      setEditRoute(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const toggleRoute = async (r: Route) => {
    await supabase.from('ai_provider_routes').update({ is_active: !r.is_active }).eq('id', r.id);
    logGosAction('update', 'ai_provider_route', r.id, r.task_type, { metadata: { toggled: !r.is_active ? 'active' : 'inactive' } });
    load();
  };

  const RouteForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-4 pt-2">
      <div>
        <Label>Task Type</Label>
        <Input value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))} placeholder="e.g. ai_ads_analysis" />
      </div>
      <div>
        <Label>Primary Provider</Label>
        <Select value={form.primary_provider_id} onValueChange={v => setForm(f => ({ ...f, primary_provider_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
          <SelectContent>
            {providers.map(p => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  {p.name}
                  {!providerConfigured(p.id) && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.primary_provider_id && !providerConfigured(form.primary_provider_id) && (
          <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Provider has no configured secret — route will fail at runtime
          </p>
        )}
      </div>
      <div>
        <Label>Fallback Provider (optional)</Label>
        <Select value={form.fallback_provider_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, fallback_provider_id: v === '__none__' ? '' : v }))}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Model Override <span className="text-muted-foreground">(leave empty to use provider default)</span></Label>
        <Input value={form.model_override} onChange={e => setForm(f => ({ ...f, model_override: e.target.value }))}
          placeholder={providerModel(form.primary_provider_id) || 'e.g. openai/gpt-4o'} />
        {form.primary_provider_id && providerModel(form.primary_provider_id) && !form.model_override && (
          <p className="text-xs text-muted-foreground mt-1">Will use provider default: <code className="font-mono">{providerModel(form.primary_provider_id)}</code></p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Timeout (s)</Label><Input type="number" value={form.timeout_seconds} onChange={e => setForm(f => ({ ...f, timeout_seconds: +e.target.value }))} /></div>
        <div><Label>Retry Limit</Label><Input type="number" value={form.retry_limit} onChange={e => setForm(f => ({ ...f, retry_limit: +e.target.value }))} /></div>
      </div>
      <Button onClick={isEdit ? saveEdit : createRoute} disabled={!form.task_type || !form.primary_provider_id || saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {isEdit ? 'Save Route' : 'Create Route'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-[hsl(200,70%,55%)]" /> AI Routes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Map task types to providers with fallback chains</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Route</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Route</DialogTitle></DialogHeader>
            <RouteForm isEdit={false} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : routes.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Routes</h3>
          <p className="text-sm text-muted-foreground">Add routing rules to map task types to AI providers.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {routes.map(r => (
            <Card key={r.id} className={!r.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted/50">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-semibold text-foreground">{r.task_type}</code>
                    <Badge variant={r.is_active ? 'default' : 'secondary'} className="text-[10px]">{r.is_active ? 'Active' : 'Disabled'}</Badge>
                    {r.model_override && <Badge variant="outline" className="text-[10px] font-mono">{r.model_override}</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="font-medium flex items-center gap-1">
                      {providerName(r.primary_provider_id)}
                      {!providerConfigured(r.primary_provider_id) && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                    </span>
                    {r.fallback_provider_id && (
                      <>
                        <ArrowRight className="h-3 w-3" />
                        <span className="flex items-center gap-1">
                          {providerName(r.fallback_provider_id)}
                          {!providerConfigured(r.fallback_provider_id) && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span>{r.timeout_seconds}s timeout</span>
                    <span>·</span>
                    <span>{r.retry_limit} retries</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => openEdit(r)}>
                  <Settings className="h-3 w-3" /> Edit
                </Button>
                <Switch checked={r.is_active} onCheckedChange={() => toggleRoute(r)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Route Dialog */}
      <Dialog open={!!editRoute} onOpenChange={v => { if (!v) setEditRoute(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Route</DialogTitle></DialogHeader>
          <RouteForm isEdit={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

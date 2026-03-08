import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Plug, Loader2, CheckCircle2, XCircle, Trash2, Zap, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { TranslationKey } from '@/i18n/translations';

const categories = ['crm', 'ads', 'analytics', 'messaging', 'general'];
const categoryColors: Record<string, string> = {
  crm: 'border-blue-500/30 text-blue-400',
  ads: 'border-violet-500/30 text-violet-400',
  analytics: 'border-emerald-500/30 text-emerald-400',
  messaging: 'border-amber-500/30 text-amber-400',
  general: 'border-muted text-muted-foreground',
};

export default function GosIntegrationsPage() {
  const { t } = useLanguage();
  const { effectiveRole } = useAuth();
  const isAdmin = effectiveRole === 'AgencyAdmin';
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingIntegration, setAddingIntegration] = useState(false);
  const [connectingTo, setConnectingTo] = useState<any | null>(null);
  const [newInt, setNewInt] = useState({ name: '', provider: '', category: 'general', description: '' });
  const [connectSecret, setConnectSecret] = useState('');
  const [connectConfig, setConnectConfig] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    // RLS now handles scoping — queries will return only accessible data
    const [intRes, instRes, cRes] = await Promise.all([
      supabase.from('gos_integrations').select('*').order('name'),
      supabase.from('gos_integration_instances').select('*, gos_integrations(name, provider, category)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    setIntegrations(intRes.data || []);
    setInstances(instRes.data || []);
    setClients(cRes.data || []);
    setLoading(false);
  };

  const createIntegration = async () => {
    if (!newInt.name || !newInt.provider) { toast.error('Name and provider are required'); return; }
    const { error } = await supabase.from('gos_integrations').insert({
      name: newInt.name,
      provider: newInt.provider,
      category: newInt.category,
      description: newInt.description,
      config_schema: {},
    });
    if (error) toast.error('Failed to create');
    else { toast.success('Integration added'); setAddingIntegration(false); setNewInt({ name: '', provider: '', category: 'general', description: '' }); loadData(); }
  };

  const deleteIntegration = async (id: string) => {
    await supabase.from('gos_integrations').delete().eq('id', id);
    toast.success('Integration removed');
    loadData();
  };

  const connectIntegration = async () => {
    if (!connectingTo) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // First create the instance with clean config (no secrets)
    const clientId = selectedClient === 'global' ? null : (selectedClient || null);
    const { data: instance, error } = await supabase.from('gos_integration_instances').insert({
      integration_id: connectingTo.id,
      created_by: user.id,
      client_id: clientId,
      config: connectConfig, // non-sensitive config only
      is_active: true,
    }).select('id').single();

    if (error) { toast.error('Connection failed'); return; }

    // If a secret was provided, store it securely via edge function
    if (connectSecret && instance) {
      try {
        const { data: session } = await supabase.auth.getSession();
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/gos-store-secret`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.session?.access_token}`,
            },
            body: JSON.stringify({
              instance_id: instance.id,
              secret_value: connectSecret,
              config: connectConfig,
            }),
          }
        );
        if (!res.ok) {
          console.error('Failed to store secret securely');
          toast.error('Connected but secret storage failed — update secret later');
        }
      } catch (e) {
        console.error('Secret storage error:', e);
      }
    }

    toast.success('Connected!');
    setConnectingTo(null);
    setConnectSecret('');
    setConnectConfig({});
    setSelectedClient('');
    loadData();
  };

  const toggleInstance = async (id: string, active: boolean) => {
    await supabase.from('gos_integration_instances').update({ is_active: !active }).eq('id', id);
    loadData();
  };

  const deleteInstance = async (id: string) => {
    await supabase.from('gos_integration_instances').delete().eq('id', id);
    toast.success('Connection removed');
    loadData();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('gos.integrations' as TranslationKey)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('gos.integrationsDesc' as TranslationKey)}</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setAddingIntegration(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Integration
          </Button>
        )}
      </div>

      {integrations.length === 0 && instances.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Plug className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No integrations configured yet</p>
            <p className="text-xs text-muted-foreground mb-3">Add CRM, Ad Platform, or Analytics integrations</p>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setAddingIntegration(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add First</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map(int => (
              <Card key={int.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-foreground text-sm">{int.name}</h3>
                    <Badge variant="outline" className={`text-[10px] ${categoryColors[int.category] || categoryColors.general}`}>{int.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{int.provider}</p>
                  {int.description && <p className="text-xs text-muted-foreground mb-3">{int.description}</p>}
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setConnectingTo(int)}>
                      <Zap className="h-3 w-3" /> Connect
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteIntegration(int.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {instances.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Active Connections</h2>
              <div className="space-y-2">
                {instances.map(inst => (
                  <Card key={inst.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {inst.is_active ? <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                        <div className="min-w-0">
                          <span className="text-sm text-foreground block truncate">{(inst as any).gos_integrations?.name || 'Integration'}</span>
                          <div className="flex items-center gap-1">
                            {inst.vault_secret_ref && <ShieldCheck className="h-3 w-3 text-emerald-400" />}
                            {inst.error_message && <span className="text-xs text-destructive block truncate">{inst.error_message}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch checked={inst.is_active} onCheckedChange={() => toggleInstance(inst.id, inst.is_active)} />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteInstance(inst.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Integration Dialog — admin only */}
      <Dialog open={addingIntegration} onOpenChange={setAddingIntegration}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Integration</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input value={newInt.name} onChange={e => setNewInt({ ...newInt, name: e.target.value })} placeholder="e.g. Meta Ads" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Provider</label>
              <Input value={newInt.provider} onChange={e => setNewInt({ ...newInt, provider: e.target.value })} placeholder="e.g. Facebook" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={newInt.category} onValueChange={v => setNewInt({ ...newInt, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea value={newInt.description} onChange={e => setNewInt({ ...newInt, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter><Button size="sm" onClick={createIntegration}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect Dialog — secrets go to Vault, not plaintext */}
      <Dialog open={!!connectingTo} onOpenChange={open => { if (!open) setConnectingTo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Connect {connectingTo?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Client (optional)</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger><SelectValue placeholder="Global (all clients)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-400" /> API Key / Token (stored securely)
              </label>
              <Input
                type="password"
                value={connectSecret}
                onChange={e => setConnectSecret(e.target.value)}
                placeholder="Enter API key..."
              />
              <p className="text-[10px] text-muted-foreground mt-1">Stored in encrypted vault — never visible again after save</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Account ID (optional)</label>
              <Input value={connectConfig.account_id || ''} onChange={e => setConnectConfig({ ...connectConfig, account_id: e.target.value })} />
            </div>
          </div>
          <DialogFooter><Button size="sm" onClick={connectIntegration}>Connect</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

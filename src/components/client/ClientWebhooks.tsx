import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Webhook, Plus, Trash2, CheckCircle2, XCircle, Clock, Eye, Send, Edit2, RotateCcw, Copy, AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { TranslationKey } from '@/i18n/translations';

interface WebhookRow {
  id: string; client_id: string; name: string; url: string; secret: string | null;
  events: string[]; is_active: boolean; headers: Record<string, string>;
  created_at: string; last_triggered_at: string | null; last_status_code: number | null;
  failure_count: number; created_by: string | null; updated_at: string;
}

interface WebhookLogRow {
  id: string; event_type: string; response_status: number | null;
  response_body: string | null; success: boolean; created_at: string; payload: any;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function ClientWebhooks({ clientId }: { clientId: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookRow | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formSecret, setFormSecret] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>(['*']);
  const [formHeaders, setFormHeaders] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<{ webhookId: string; webhookName: string; logs: WebhookLogRow[] } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [inboundCount, setInboundCount] = useState(0);

  const EVENT_OPTIONS = [
    { value: '*', label: t('webhooks.allEvents' as TranslationKey) },
    { value: 'lead.new', label: t('webhooks.newLead' as TranslationKey) },
    { value: 'lead.updated', label: t('webhooks.leadUpdated' as TranslationKey) },
    { value: 'lead.deleted', label: t('webhooks.leadDeleted' as TranslationKey) },
    { value: 'metric.synced', label: t('webhooks.metricsSynced' as TranslationKey) },
    { value: 'report.published', label: t('webhooks.reportPublished' as TranslationKey) },
    { value: 'campaign.status_changed', label: t('webhooks.campaignStatusChanged' as TranslationKey) },
    { value: 'budget.updated', label: t('webhooks.budgetUpdated' as TranslationKey) },
    { value: 'task.completed', label: t('webhooks.taskCompleted' as TranslationKey) },
  ];

  const fetchWebhooks = async () => {
    const { data } = await supabase.from('client_webhooks').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setWebhooks((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchWebhooks();
    supabase.from('crm_webhook_endpoints').select('id', { count: 'exact', head: true }).eq('client_id', clientId).then(({ count }) => setInboundCount(count || 0));
  }, [clientId]);

  const resetForm = () => { setFormName(''); setFormUrl(''); setFormSecret(''); setFormEvents(['*']); setFormHeaders(''); };
  const openCreate = () => { resetForm(); setEditingWebhook(null); setShowCreate(true); };
  const openEdit = (wh: WebhookRow) => {
    setFormName(wh.name); setFormUrl(wh.url); setFormSecret(wh.secret || '');
    setFormEvents(wh.events?.length ? wh.events : ['*']);
    setFormHeaders(wh.headers && Object.keys(wh.headers).length ? JSON.stringify(wh.headers, null, 2) : '');
    setEditingWebhook(wh); setShowCreate(true);
  };

  const saveWebhook = async () => {
    if (!formName || !formUrl) { toast.error(t('webhooks.nameAndUrl' as TranslationKey)); return; }
    try { new URL(formUrl); } catch { toast.error(t('webhooks.invalidUrl' as TranslationKey)); return; }
    let headers: Record<string, string> = {};
    if (formHeaders.trim()) {
      try { headers = JSON.parse(formHeaders); } catch { toast.error(t('webhooks.headersJson' as TranslationKey)); return; }
    }
    setSaving(true);
    if (editingWebhook) {
      const { error } = await supabase.from('client_webhooks').update({ name: formName, url: formUrl, secret: formSecret || null, events: formEvents, headers } as any).eq('id', editingWebhook.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success(t('webhooks.updated' as TranslationKey));
    } else {
      const { error } = await supabase.from('client_webhooks').insert({ client_id: clientId, name: formName, url: formUrl, secret: formSecret || null, events: formEvents, headers } as any);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success(t('webhooks.created' as TranslationKey));
    }
    setSaving(false); resetForm(); setShowCreate(false); setEditingWebhook(null); fetchWebhooks();
  };

  const toggleActive = async (wh: WebhookRow) => { await supabase.from('client_webhooks').update({ is_active: !wh.is_active } as any).eq('id', wh.id); fetchWebhooks(); };
  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from('webhook_logs').delete().eq('webhook_id', deleteId);
    await supabase.from('client_webhooks').delete().eq('id', deleteId);
    toast.success(t('webhooks.deleted' as TranslationKey)); setDeleteId(null); fetchWebhooks();
  };
  const viewLogs = async (webhookId: string, webhookName: string) => {
    const { data } = await supabase.from('webhook_logs').select('id, event_type, response_status, response_body, success, created_at, payload').eq('webhook_id', webhookId).order('created_at', { ascending: false }).limit(50);
    setSelectedLogs({ webhookId, webhookName, logs: (data as any[]) || [] });
  };
  const testWebhook = async (wh: WebhookRow) => {
    setTesting(wh.id);
    try {
      const { error } = await supabase.functions.invoke('trigger-webhooks', { body: { client_id: clientId, event_type: 'test.ping', data: { message: 'Test webhook from AFM Digital', timestamp: new Date().toISOString(), webhook_name: wh.name } } });
      if (error) throw error;
      toast.success(t('webhooks.testSent' as TranslationKey));
      setTimeout(() => { fetchWebhooks(); if (selectedLogs?.webhookId === wh.id) viewLogs(wh.id, wh.name); }, 2000);
    } catch (e: any) { toast.error(e.message); }
    setTesting(null);
  };
  const resetFailures = async (wh: WebhookRow) => {
    await supabase.from('client_webhooks').update({ failure_count: 0, is_active: true } as any).eq('id', wh.id);
    toast.success(t('webhooks.failuresReset' as TranslationKey)); fetchWebhooks();
  };
  const toggleEvent = (ev: string) => {
    if (ev === '*') { setFormEvents(['*']); return; }
    setFormEvents(prev => { const without = prev.filter(e => e !== '*'); return without.includes(ev) ? without.filter(e => e !== ev) : [...without, ev]; });
  };
  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); toast.success(t('webhooks.urlCopied' as TranslationKey)); };

  if (loading) return null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">{t('webhooks.title' as TranslationKey)}</h3>
        </div>
      </motion.div>

      {/* Tabs: Outbound + Inbound */}
      <Tabs defaultValue="outbound">
        <TabsList>
          <TabsTrigger value="outbound" className="gap-1.5 text-xs">
            <ArrowUpRight className="h-3 w-3" /> {t('webhooks.outbound' as TranslationKey)} <Badge variant="secondary" className="text-[10px] ml-1">{webhooks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="inbound" className="gap-1.5 text-xs">
            <ArrowDownLeft className="h-3 w-3" /> {t('webhooks.inbound' as TranslationKey)} <Badge variant="secondary" className="text-[10px] ml-1">{inboundCount}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outbound" className="space-y-3 mt-3">
          {/* Info banner */}
          <motion.div variants={item}>
            <Card className="glass-card border-primary/10">
              <CardContent className="p-3 text-xs text-muted-foreground space-y-1.5">
                <p>{t('webhooks.outboundDesc' as TranslationKey)}</p>
                <p>{t('webhooks.telegramTip' as TranslationKey)}</p>
              </CardContent>
            </Card>
          </motion.div>

          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-3.5 w-3.5" /> {t('webhooks.add' as TranslationKey)}</Button>
          </div>

          {webhooks.length === 0 ? (
            <motion.div variants={item}>
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  <Webhook className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{t('webhooks.noWebhooks' as TranslationKey)}</p>
                  <p className="text-xs mt-1">{t('webhooks.noWebhooksDesc' as TranslationKey)}</p>
                  <Button size="sm" className="mt-4 gap-1.5" onClick={openCreate}><Plus className="h-3.5 w-3.5" /> {t('webhooks.createFirst' as TranslationKey)}</Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {webhooks.map(wh => (
                <motion.div key={wh.id} variants={item}>
                  <Card className={cn("glass-card transition-all", !wh.is_active && "opacity-60")}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {wh.failure_count >= 5 ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
                           wh.last_status_code && wh.last_status_code >= 200 && wh.last_status_code < 300 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                           wh.last_status_code ? <XCircle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{wh.name}</span>
                            <Switch checked={wh.is_active} onCheckedChange={() => toggleActive(wh)} className="scale-75" />
                            {wh.last_status_code && <Badge variant={wh.last_status_code < 300 ? 'default' : 'destructive'} className="text-[10px] h-4">{wh.last_status_code}</Badge>}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-xs text-muted-foreground truncate">{wh.url}</p>
                            <button onClick={() => copyUrl(wh.url)} className="text-muted-foreground hover:text-foreground flex-shrink-0"><Copy className="h-3 w-3" /></button>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(wh.events || []).map(ev => <Badge key={ev} variant="outline" className="text-[10px] h-4">{EVENT_OPTIONS.find(e => e.value === ev)?.label || ev}</Badge>)}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            {wh.last_triggered_at && <span>{t('webhooks.lastCall' as TranslationKey)} {formatDistanceToNow(new Date(wh.last_triggered_at), { addSuffix: true })}</span>}
                            {wh.secret && <span>🔐 HMAC</span>}
                          </div>
                          {wh.failure_count >= 3 && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <p className="text-xs text-destructive">⚠ {wh.failure_count} {t('webhooks.errorsConsecutive' as TranslationKey)}{wh.failure_count >= 5 ? ` ${t('webhooks.autoDisabled' as TranslationKey)}` : ''}</p>
                              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5 gap-1" onClick={() => resetFailures(wh)}><RotateCcw className="h-3 w-3" /> {t('webhooks.resetErrors' as TranslationKey)}</Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => testWebhook(wh)} disabled={testing === wh.id || !wh.is_active}><Send className={cn("h-3.5 w-3.5", testing === wh.id && "animate-pulse")} /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => viewLogs(wh.id, wh.name)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(wh)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(wh.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inbound" className="space-y-3 mt-3">
          <Card className="glass-card border-primary/10">
            <CardContent className="p-3 text-xs text-muted-foreground">
              <p>{t('webhooks.inboundDesc' as TranslationKey)}</p>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{inboundCount} {t('webhooks.inbound' as TranslationKey).toLowerCase()} webhook(s)</p>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate('/crm/webhooks')}>
              {t('webhooks.goToCrmWebhooks' as TranslationKey)} <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => { if (!v) { setShowCreate(false); setEditingWebhook(null); resetForm(); } else setShowCreate(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingWebhook ? t('webhooks.editWebhook' as TranslationKey) : t('webhooks.newWebhook' as TranslationKey)}</DialogTitle>
            <DialogDescription>{editingWebhook ? t('webhooks.editDesc' as TranslationKey) : t('webhooks.createDesc' as TranslationKey)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">{t('common.name')}</Label><Input placeholder="CRM Integration, Telegram Bot..." value={formName} onChange={e => setFormName(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">{t('webhooks.endpointUrl' as TranslationKey)}</Label><Input placeholder="https://your-api.com/webhook" value={formUrl} onChange={e => setFormUrl(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">{t('webhooks.secretHmac' as TranslationKey)}</Label><Input placeholder="my-webhook-secret" value={formSecret} onChange={e => setFormSecret(e.target.value)} className="mt-1 font-mono text-xs" /><p className="text-[10px] text-muted-foreground mt-1">{t('webhooks.signatureHeader' as TranslationKey)}</p></div>
            <div>
              <Label className="text-xs mb-1.5 block">{t('webhooks.events' as TranslationKey)}</Label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_OPTIONS.map(ev => <Badge key={ev.value} variant={formEvents.includes(ev.value) ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => toggleEvent(ev.value)}>{ev.label}</Badge>)}
              </div>
            </div>
            <div><Label className="text-xs">{t('webhooks.additionalHeaders' as TranslationKey)}</Label><Textarea placeholder='{"Authorization": "Bearer token123"}' value={formHeaders} onChange={e => setFormHeaders(e.target.value)} className="mt-1 font-mono text-xs h-16" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild><Button variant="ghost" size="sm">{t('common.cancel')}</Button></DialogClose>
              <Button size="sm" onClick={saveWebhook} disabled={saving}>{saving ? t('webhooks.saving' as TranslationKey) : editingWebhook ? t('common.save') : t('common.create')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('webhooks.deleteConfirm' as TranslationKey)}</AlertDialogTitle>
            <AlertDialogDescription>{t('webhooks.deleteDesc' as TranslationKey)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logs Dialog */}
      <Dialog open={!!selectedLogs} onOpenChange={() => setSelectedLogs(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('webhooks.logsTitle' as TranslationKey)} {selectedLogs?.webhookName}</DialogTitle>
            <DialogDescription>{t('webhooks.last50' as TranslationKey)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
            {selectedLogs?.logs.length === 0 && (
              <div className="text-center py-8"><Eye className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" /><p className="text-sm text-muted-foreground">{t('webhooks.noLogs' as TranslationKey)}</p></div>
            )}
            {selectedLogs?.logs.map(log => (
              <Card key={log.id} className="glass-card">
                <CardContent className="p-2.5">
                  <div className="flex items-start gap-2">
                    {log.success ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-xs text-foreground">{log.event_type}</span>
                        <Badge variant={log.success ? 'default' : 'destructive'} className="text-[10px] h-4">{log.response_status || 'ERR'}</Badge>
                        <span className="text-muted-foreground text-[10px] ml-auto flex-shrink-0">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      {log.response_body && <pre className="text-[10px] text-muted-foreground mt-1 bg-muted/30 rounded p-1.5 max-h-20 overflow-auto font-mono whitespace-pre-wrap break-all">{log.response_body.substring(0, 500)}</pre>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
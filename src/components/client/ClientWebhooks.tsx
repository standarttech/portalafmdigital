import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Webhook, Plus, Trash2, CheckCircle2, XCircle, Clock, Eye, Send, Edit2, RotateCcw, Copy, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const EVENT_OPTIONS = [
  { value: '*', label: 'Все события' },
  { value: 'lead.new', label: 'Новый лид' },
  { value: 'lead.updated', label: 'Лид обновлён' },
  { value: 'lead.deleted', label: 'Лид удалён' },
  { value: 'metric.synced', label: 'Метрики синхронизированы' },
  { value: 'report.published', label: 'Отчёт опубликован' },
  { value: 'campaign.status_changed', label: 'Статус кампании изменён' },
  { value: 'budget.updated', label: 'Бюджет обновлён' },
  { value: 'task.completed', label: 'Задача выполнена' },
];

interface WebhookRow {
  id: string;
  client_id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  headers: Record<string, string>;
  created_at: string;
  last_triggered_at: string | null;
  last_status_code: number | null;
  failure_count: number;
  created_by: string | null;
  updated_at: string;
}

interface WebhookLogRow {
  id: string;
  event_type: string;
  response_status: number | null;
  response_body: string | null;
  success: boolean;
  created_at: string;
  payload: any;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

// FIX #7: Full webhook management interface with edit, logs, retry, auto-disable
export default function ClientWebhooks({ clientId }: { clientId: string }) {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookRow | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formSecret, setFormSecret] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>(['*']);
  const [formHeaders, setFormHeaders] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [selectedLogs, setSelectedLogs] = useState<{ webhookId: string; webhookName: string; logs: WebhookLogRow[] } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    const { data, error } = await supabase
      .from('client_webhooks')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (!error) setWebhooks((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchWebhooks(); }, [clientId]);

  const resetForm = () => {
    setFormName(''); setFormUrl(''); setFormSecret(''); setFormEvents(['*']); setFormHeaders('');
  };

  const openCreate = () => {
    resetForm();
    setEditingWebhook(null);
    setShowCreate(true);
  };

  const openEdit = (wh: WebhookRow) => {
    setFormName(wh.name);
    setFormUrl(wh.url);
    setFormSecret(wh.secret || '');
    setFormEvents(wh.events?.length ? wh.events : ['*']);
    setFormHeaders(wh.headers && Object.keys(wh.headers).length ? JSON.stringify(wh.headers, null, 2) : '');
    setEditingWebhook(wh);
    setShowCreate(true);
  };

  const saveWebhook = async () => {
    if (!formName || !formUrl) { toast.error('Укажите имя и URL'); return; }
    
    // FIX #8: Validate URL format
    try {
      new URL(formUrl);
    } catch {
      toast.error('Некорректный URL. Укажите полный адрес (https://...)');
      return;
    }

    let headers: Record<string, string> = {};
    if (formHeaders.trim()) {
      try {
        headers = JSON.parse(formHeaders);
      } catch {
        toast.error('Заголовки должны быть валидным JSON');
        return;
      }
    }

    setSaving(true);
    
    if (editingWebhook) {
      // Update
      const { error } = await supabase.from('client_webhooks').update({
        name: formName,
        url: formUrl,
        secret: formSecret || null,
        events: formEvents,
        headers,
      } as any).eq('id', editingWebhook.id);
      setSaving(false);
      if (error) { toast.error('Ошибка: ' + error.message); return; }
      toast.success('Вебхук обновлён');
    } else {
      // Create
      const { error } = await supabase.from('client_webhooks').insert({
        client_id: clientId,
        name: formName,
        url: formUrl,
        secret: formSecret || null,
        events: formEvents,
        headers,
      } as any);
      setSaving(false);
      if (error) { toast.error('Ошибка: ' + error.message); return; }
      toast.success('Вебхук создан');
    }
    
    resetForm();
    setShowCreate(false);
    setEditingWebhook(null);
    fetchWebhooks();
  };

  const toggleActive = async (wh: WebhookRow) => {
    await supabase.from('client_webhooks').update({ is_active: !wh.is_active } as any).eq('id', wh.id);
    fetchWebhooks();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    // FIX #9: Delete webhook logs first to avoid FK constraint
    await supabase.from('webhook_logs').delete().eq('webhook_id', deleteId);
    await supabase.from('client_webhooks').delete().eq('id', deleteId);
    toast.success('Вебхук удалён');
    setDeleteId(null);
    fetchWebhooks();
  };

  const viewLogs = async (webhookId: string, webhookName: string) => {
    const { data } = await supabase
      .from('webhook_logs')
      .select('id, event_type, response_status, response_body, success, created_at, payload')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(50);
    setSelectedLogs({ webhookId, webhookName, logs: (data as any[]) || [] });
  };

  const testWebhook = async (wh: WebhookRow) => {
    setTesting(wh.id);
    try {
      const { error } = await supabase.functions.invoke('trigger-webhooks', {
        body: {
          client_id: clientId,
          event_type: 'test.ping',
          data: { message: 'Test webhook from AFM Digital', timestamp: new Date().toISOString(), webhook_name: wh.name },
        },
      });
      if (error) throw error;
      toast.success('Тестовый запрос отправлен');
      setTimeout(() => { fetchWebhooks(); if (selectedLogs?.webhookId === wh.id) viewLogs(wh.id, wh.name); }, 2000);
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    }
    setTesting(null);
  };

  // FIX #10: Reset failure count (retry webhook)
  const resetFailures = async (wh: WebhookRow) => {
    await supabase.from('client_webhooks').update({
      failure_count: 0,
      is_active: true,
    } as any).eq('id', wh.id);
    toast.success('Счётчик ошибок сброшен, вебхук активирован');
    fetchWebhooks();
  };

  const toggleEvent = (ev: string) => {
    if (ev === '*') { setFormEvents(['*']); return; }
    setFormEvents(prev => {
      const without = prev.filter(e => e !== '*');
      return without.includes(ev) ? without.filter(e => e !== ev) : [...without, ev];
    });
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL скопирован');
  };

  if (loading) return null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Вебхуки</h3>
          <Badge variant="secondary" className="text-xs">{webhooks.length}</Badge>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Добавить
        </Button>
      </motion.div>

      {/* Info banner */}
      <motion.div variants={item}>
        <Card className="glass-card border-primary/10">
          <CardContent className="p-3 text-xs text-muted-foreground space-y-1.5">
            <p>Настройте вебхуки для автоматической отправки данных в CRM, Telegram-боты или другие сервисы. Каждый вебхук подписывается HMAC (SHA-256) для безопасности.</p>
            <p>Быстрое подключение Telegram: укажите URL в формате <code className="px-1 py-0.5 rounded bg-muted text-foreground">telegram://CHAT_ID</code> (например, <code className="px-1 py-0.5 rounded bg-muted text-foreground">telegram://123456789</code>).</p>
          </CardContent>
        </Card>
      </motion.div>

      {webhooks.length === 0 ? (
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              <Webhook className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Нет вебхуков</p>
              <p className="text-xs mt-1">Добавьте вебхук для интеграции с CRM, Telegram и другими сервисами</p>
              <Button size="sm" className="mt-4 gap-1.5" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> Создать первый вебхук
              </Button>
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
                      {wh.failure_count >= 5 ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : wh.last_status_code && wh.last_status_code >= 200 && wh.last_status_code < 300 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : wh.last_status_code ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{wh.name}</span>
                        <Switch checked={wh.is_active} onCheckedChange={() => toggleActive(wh)} className="scale-75" />
                        {wh.last_status_code && (
                          <Badge variant={wh.last_status_code < 300 ? 'default' : 'destructive'} className="text-[10px] h-4">
                            {wh.last_status_code}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">{wh.url}</p>
                        <button onClick={() => copyWebhookUrl(wh.url)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(wh.events || []).map(ev => (
                          <Badge key={ev} variant="outline" className="text-[10px] h-4">
                            {EVENT_OPTIONS.find(e => e.value === ev)?.label || ev}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        {wh.last_triggered_at && (
                          <span>Последний вызов: {formatDistanceToNow(new Date(wh.last_triggered_at), { addSuffix: true })}</span>
                        )}
                        {wh.secret && <span>🔐 HMAC</span>}
                      </div>
                      {wh.failure_count >= 3 && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-xs text-destructive">⚠ {wh.failure_count} ошибок подряд{wh.failure_count >= 5 ? ' — автоматически деактивирован' : ''}</p>
                          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5 gap-1" onClick={() => resetFailures(wh)}>
                            <RotateCcw className="h-3 w-3" /> Сбросить
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => testWebhook(wh)} disabled={testing === wh.id || !wh.is_active} title="Тестовый запрос">
                        <Send className={cn("h-3.5 w-3.5", testing === wh.id && "animate-pulse")} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => viewLogs(wh.id, wh.name)} title="Логи">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(wh)} title="Редактировать">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(wh.id)} title="Удалить">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => { if (!v) { setShowCreate(false); setEditingWebhook(null); resetForm(); } else setShowCreate(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingWebhook ? 'Редактировать вебхук' : 'Новый вебхук'}</DialogTitle>
            <DialogDescription>
              {editingWebhook ? 'Измените настройки вебхука' : 'Создайте новый вебхук для отправки данных во внешние сервисы'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Название</Label>
              <Input placeholder="CRM Integration, Telegram Bot, и т.д." value={formName} onChange={e => setFormName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">URL эндпоинта</Label>
              <Input placeholder="https://your-api.com/webhook или telegram://123456789" value={formUrl} onChange={e => setFormUrl(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Secret (для HMAC подписи, опционально)</Label>
              <Input placeholder="my-webhook-secret" value={formSecret} onChange={e => setFormSecret(e.target.value)} className="mt-1 font-mono text-xs" />
              <p className="text-[10px] text-muted-foreground mt-1">Подпись отправляется в заголовке X-Webhook-Signature</p>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">События</Label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_OPTIONS.map(ev => (
                  <Badge
                    key={ev.value}
                    variant={formEvents.includes(ev.value) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleEvent(ev.value)}
                  >
                    {ev.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Дополнительные заголовки (JSON, опционально)</Label>
              <Textarea 
                placeholder='{"Authorization": "Bearer token123"}' 
                value={formHeaders} 
                onChange={e => setFormHeaders(e.target.value)} 
                className="mt-1 font-mono text-xs h-16"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild><Button variant="ghost" size="sm">Отмена</Button></DialogClose>
              <Button size="sm" onClick={saveWebhook} disabled={saving}>
                {saving ? 'Сохранение...' : editingWebhook ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить вебхук?</AlertDialogTitle>
            <AlertDialogDescription>
              Вебхук и все его логи будут удалены безвозвратно. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logs Dialog */}
      <Dialog open={!!selectedLogs} onOpenChange={() => setSelectedLogs(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Логи: {selectedLogs?.webhookName}</DialogTitle>
            <DialogDescription>Последние 50 доставок</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
            {selectedLogs?.logs.length === 0 && (
              <div className="text-center py-8">
                <Eye className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Нет записей. Отправьте тестовый запрос.</p>
              </div>
            )}
            {selectedLogs?.logs.map(log => (
              <Card key={log.id} className="glass-card">
                <CardContent className="p-2.5">
                  <div className="flex items-start gap-2">
                    {log.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-xs text-foreground">{log.event_type}</span>
                        <Badge variant={log.success ? 'default' : 'destructive'} className="text-[10px] h-4">
                          {log.response_status || 'ERR'}
                        </Badge>
                        <span className="text-muted-foreground text-[10px] ml-auto flex-shrink-0">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      {log.response_body && (
                        <pre className="text-[10px] text-muted-foreground mt-1 bg-muted/30 rounded p-1.5 max-h-20 overflow-auto font-mono whitespace-pre-wrap break-all">
                          {log.response_body.substring(0, 500)}
                        </pre>
                      )}
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

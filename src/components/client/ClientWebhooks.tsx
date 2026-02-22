import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Webhook, Plus, Trash2, Activity, CheckCircle2, XCircle, Clock, Eye, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const EVENT_OPTIONS = [
  { value: '*', label: 'Все события' },
  { value: 'lead.new', label: 'Новый лид' },
  { value: 'lead.updated', label: 'Лид обновлён' },
  { value: 'metric.synced', label: 'Метрики синхронизированы' },
  { value: 'report.published', label: 'Отчёт опубликован' },
  { value: 'campaign.status_changed', label: 'Статус кампании изменён' },
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
}

interface WebhookLogRow {
  id: string;
  event_type: string;
  response_status: number | null;
  success: boolean;
  created_at: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function ClientWebhooks({ clientId }: { clientId: string }) {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>(['*']);
  const [saving, setSaving] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<{ webhookId: string; logs: WebhookLogRow[] } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

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

  const createWebhook = async () => {
    if (!newName || !newUrl) { toast.error('Укажите имя и URL'); return; }
    setSaving(true);
    const { error } = await supabase.from('client_webhooks').insert({
      client_id: clientId,
      name: newName,
      url: newUrl,
      secret: newSecret || null,
      events: newEvents,
    } as any);
    setSaving(false);
    if (error) { toast.error('Ошибка создания: ' + error.message); return; }
    toast.success('Вебхук создан');
    setNewName(''); setNewUrl(''); setNewSecret(''); setNewEvents(['*']);
    setShowCreate(false);
    fetchWebhooks();
  };

  const toggleActive = async (wh: WebhookRow) => {
    await supabase.from('client_webhooks').update({ is_active: !wh.is_active } as any).eq('id', wh.id);
    fetchWebhooks();
  };

  const deleteWebhook = async (id: string) => {
    await supabase.from('client_webhooks').delete().eq('id', id);
    toast.success('Вебхук удалён');
    fetchWebhooks();
  };

  const viewLogs = async (webhookId: string) => {
    const { data } = await supabase
      .from('webhook_logs')
      .select('id, event_type, response_status, success, created_at')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(20);
    setSelectedLogs({ webhookId, logs: (data as any[]) || [] });
  };

  const testWebhook = async (wh: WebhookRow) => {
    setTesting(wh.id);
    try {
      const { error } = await supabase.functions.invoke('trigger-webhooks', {
        body: {
          client_id: clientId,
          event_type: 'test.ping',
          data: { message: 'Test webhook from AFM Digital', timestamp: new Date().toISOString() },
        },
      });
      if (error) throw error;
      toast.success('Тестовый запрос отправлен');
      setTimeout(() => fetchWebhooks(), 1500);
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    }
    setTesting(null);
  };

  const toggleEvent = (ev: string) => {
    if (ev === '*') { setNewEvents(['*']); return; }
    setNewEvents(prev => {
      const without = prev.filter(e => e !== '*');
      return without.includes(ev) ? without.filter(e => e !== ev) : [...without, ev];
    });
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
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Добавить
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый вебхук</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Название (напр. CRM Integration)" value={newName} onChange={e => setNewName(e.target.value)} />
              <Input placeholder="URL (https://...)" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
              <Input placeholder="Secret (опционально, для подписи)" value={newSecret} onChange={e => setNewSecret(e.target.value)} />
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">События</label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_OPTIONS.map(ev => (
                    <Badge
                      key={ev.value}
                      variant={newEvents.includes(ev.value) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleEvent(ev.value)}
                    >
                      {ev.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <DialogClose asChild><Button variant="ghost" size="sm">Отмена</Button></DialogClose>
                <Button size="sm" onClick={createWebhook} disabled={saving}>{saving ? 'Создание...' : 'Создать'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {webhooks.length === 0 ? (
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              <Webhook className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Нет вебхуков. Добавьте вебхук для интеграции с CRM, Telegram и другими сервисами.
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {webhooks.map(wh => (
            <motion.div key={wh.id} variants={item}>
              <Card className="glass-card">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {wh.last_status_code && wh.last_status_code >= 200 && wh.last_status_code < 300 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
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
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(wh.events || []).map(ev => (
                          <Badge key={ev} variant="outline" className="text-[10px] h-4">
                            {EVENT_OPTIONS.find(e => e.value === ev)?.label || ev}
                          </Badge>
                        ))}
                      </div>
                      {wh.failure_count > 0 && (
                        <p className="text-xs text-destructive mt-1">⚠ {wh.failure_count} ошибок подряд</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => testWebhook(wh)} disabled={testing === wh.id}>
                        <Send className={cn("h-3.5 w-3.5", testing === wh.id && "animate-pulse")} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => viewLogs(wh.id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteWebhook(wh.id)}>
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

      {/* Logs dialog */}
      <Dialog open={!!selectedLogs} onOpenChange={() => setSelectedLogs(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Лог доставки</DialogTitle></DialogHeader>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {selectedLogs?.logs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Нет записей</p>
            )}
            {selectedLogs?.logs.map(log => (
              <div key={log.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
                {log.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                )}
                <span className="font-medium text-foreground">{log.event_type}</span>
                <Badge variant={log.success ? 'default' : 'destructive'} className="text-[10px] h-4 ml-auto">
                  {log.response_status || 'ERR'}
                </Badge>
                <span className="text-muted-foreground text-[10px]">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

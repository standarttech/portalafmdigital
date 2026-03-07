import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Send, MessageSquare, Webhook, ChevronDown, ExternalLink, BookOpen,
  CheckCircle, AlertTriangle, Copy, Bot, Plus, Trash2, Settings, Loader2,
  ArrowRight, Shield, Globe, Zap,
} from 'lucide-react';

/* ── Types ── */
interface BotProfile {
  id: string;
  client_id: string;
  bot_name: string;
  bot_token_ref: string | null;
  is_active: boolean;
  created_at: string;
}

interface ClientNotificationConfig {
  client_id: string;
  telegram_enabled: boolean;
  telegram_chat_id: string;
  webhook_enabled: boolean;
  webhook_url: string;
  notify_new_lead: boolean;
  notify_stage_change: boolean;
  notify_won: boolean;
  notify_lost: boolean;
}

/* ── Bot Management Dialog ── */
function BotManagementDialog({
  open, onOpenChange, clientId, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  onSaved: () => void;
}) {
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [newToken, setNewToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchBots = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('crm_bot_profiles')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    setBots(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open && clientId) fetchBots();
  }, [open, clientId]);

  const handleAdd = async () => {
    if (!newName.trim() || !newToken.trim()) return;
    setSaving(true);
    // Validate token format
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(newToken.trim())) {
      toast({ title: 'Ошибка', description: 'Неверный формат токена. Ожидается: 1234567890:AAH...', variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Store token in vault via edge function (service role)
    const { data: vaultData, error: vaultErr } = await supabase.functions.invoke('store-bot-token', {
      body: { secret_name: `crm_bot_${clientId}_${Date.now()}`, secret_value: newToken.trim() },
    });

    if (vaultErr || vaultData?.error) {
      toast({ title: 'Ошибка', description: vaultData?.error || vaultErr?.message || 'Не удалось сохранить токен', variant: 'destructive' });
      setSaving(false);
      return;
    }
    const tokenRef = vaultData?.token_ref;

    // Deactivate other bots for this client
    await supabase.from('crm_bot_profiles').update({ is_active: false }).eq('client_id', clientId);

    const { error } = await supabase.from('crm_bot_profiles').insert({
      client_id: clientId,
      bot_name: newName.trim(),
      bot_token_ref: tokenRef,
      is_active: true,
    });

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Бот добавлен', description: `${newName} подключён и активирован` });
      setNewName('');
      setNewToken('');
      setAddMode(false);
      fetchBots();
      onSaved();
    }
    setSaving(false);
  };

  const handleActivate = async (botId: string) => {
    await supabase.from('crm_bot_profiles').update({ is_active: false }).eq('client_id', clientId);
    await supabase.from('crm_bot_profiles').update({ is_active: true }).eq('id', botId);
    fetchBots();
    onSaved();
    toast({ title: 'Бот активирован' });
  };

  const handleDelete = async (bot: BotProfile) => {
    if (bot.bot_token_ref) {
      await supabase.rpc('delete_social_token', { _token_reference: bot.bot_token_ref });
    }
    await supabase.from('crm_bot_profiles').delete().eq('id', bot.id);
    fetchBots();
    onSaved();
    toast({ title: 'Бот удалён' });
  };

  const handleTest = async (bot: BotProfile) => {
    if (!bot.bot_token_ref) return;
    setTesting(bot.id);
    try {
      const { data: token } = await supabase.rpc('get_social_token', { _token_reference: bot.bot_token_ref });
      if (!token) throw new Error('Токен не найден');

      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const json = await res.json();
      if (json.ok) {
        toast({ title: '✅ Бот доступен', description: `@${json.result.username} — ${json.result.first_name}` });
      } else {
        toast({ title: '❌ Ошибка', description: json.description || 'Бот недоступен', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: '❌ Ошибка', description: e.message, variant: 'destructive' });
    }
    setTesting(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Управление Telegram-ботами
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {bots.length === 0 && !addMode && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Bot className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Нет подключённых ботов</p>
                <p className="text-xs mt-1">Добавьте бота для отправки уведомлений</p>
              </div>
            )}

            {bots.map(bot => (
              <div key={bot.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${bot.is_active ? 'border-primary/40 bg-primary/5' : 'border-border/50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{bot.bot_name}</span>
                    {bot.is_active && <Badge className="text-[9px] h-4 bg-primary/20 text-primary border-primary/30">Активен</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Добавлен: {new Date(bot.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                    onClick={() => handleTest(bot)} disabled={testing === bot.id}>
                    {testing === bot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Тест'}
                  </Button>
                  {!bot.is_active && (
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => handleActivate(bot.id)}>
                      Активировать
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(bot)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {addMode ? (
              <div className="space-y-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <div className="space-y-2">
                  <Label className="text-xs">Имя бота</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Например: AFM CRM Bot" className="h-8 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Токен бота (от @BotFather)</Label>
                  <Input value={newToken} onChange={e => setNewToken(e.target.value)}
                    placeholder="1234567890:AAH..." className="h-8 text-sm font-mono" type="password" />
                  <p className="text-[10px] text-muted-foreground">Токен хранится в зашифрованном виде (Vault)</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="text-xs" onClick={handleAdd} disabled={saving || !newName.trim() || !newToken.trim()}>
                    {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Добавить бота
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => { setAddMode(false); setNewName(''); setNewToken(''); }}>
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setAddMode(true)}>
                <Plus className="h-3.5 w-3.5" /> Добавить нового бота
              </Button>
            )}

            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
              <p className="font-medium text-foreground">💡 Как это работает</p>
              <p className="text-muted-foreground">Активный бот будет использоваться для всех Telegram-уведомлений этого клиента. Можно добавить несколько ботов и переключаться между ними.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Закрыть</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── External CRM Connectors Section ── */
function ExternalCrmConnectors({ clientId }: { clientId: string }) {
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    supabase.from('crm_webhook_endpoints').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
      .then(({ data }) => { setEndpoints(data || []); setLoading(false); });
  }, [clientId]);

  const webhookBaseUrl = `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/crm-webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Скопировано' });
  };

  if (loading) return <Skeleton className="h-32" />;

  return (
    <div className="space-y-4">
      {/* Active endpoints */}
      {endpoints.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Активные входящие вебхуки</h3>
          {endpoints.map(ep => (
            <div key={ep.id} className="p-3 rounded-lg border border-border/50 bg-secondary/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{ep.name}</span>
                <Badge variant={ep.is_active ? 'default' : 'secondary'} className="text-[9px]">
                  {ep.is_active ? 'Активен' : 'Отключён'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-[10px] bg-secondary p-1.5 rounded flex-1 break-all font-mono">
                  {webhookBaseUrl}/{ep.endpoint_slug}
                </code>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(`${webhookBaseUrl}/${ep.endpoint_slug}`)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Secret: <code className="bg-secondary px-1 rounded">{ep.secret_key?.slice(0, 8)}...</code>
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 ml-1" onClick={() => copyToClipboard(ep.secret_key)}>
                  <Copy className="h-2.5 w-2.5" />
                </Button>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Popular CRM Integration Guides */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Интеграции с внешними CRM
        </h3>

        {[
          {
            name: 'GoHighLevel',
            icon: '🟠',
            desc: 'Автоматическая передача лидов, статусов и конверсий',
            steps: [
              'Перейдите в Settings → Webhooks в GoHighLevel',
              'Нажмите "Add Webhook"',
              `Вставьте URL: ${webhookBaseUrl}/<ваш_endpoint_slug>`,
              'Добавьте Header: X-Webhook-Secret: <ваш_secret_key>',
              'Выберите события: Contact Created, Pipeline Stage Changed, Opportunity Won',
              'Сохраните и отправьте тестовый запрос',
            ],
            payload: '{\n  "first_name": "{{contact.first_name}}",\n  "last_name": "{{contact.last_name}}",\n  "email": "{{contact.email}}",\n  "phone": "{{contact.phone}}",\n  "source": "gohighlevel"\n}',
          },
          {
            name: 'HubSpot',
            icon: '🟧',
            desc: 'Синхронизация контактов и сделок через вебхуки',
            steps: [
              'Перейдите в Settings → Integrations → Webhooks',
              'Создайте новую подписку на события',
              `URL: ${webhookBaseUrl}/<ваш_endpoint_slug>`,
              'Выберите: contact.creation, deal.creation, deal.propertyChange',
              'В маппинге полей укажите соответствия (firstname→first_name, email→email)',
            ],
            payload: '{\n  "first_name": "{{firstname}}",\n  "email": "{{email}}",\n  "phone": "{{phone}}",\n  "company": "{{company}}",\n  "source": "hubspot"\n}',
          },
          {
            name: 'Bitrix24',
            icon: '🔵',
            desc: 'Лиды и сделки из Bitrix24 через исходящие вебхуки',
            steps: [
              'Откройте CRM → Настройки → Роботы и триггеры',
              'Добавьте робот "Вебхук" на нужном этапе воронки',
              `URL: ${webhookBaseUrl}/<ваш_endpoint_slug>`,
              'Метод: POST, Формат: JSON',
              'В теле передайте: first_name, email, phone, source',
              'Добавьте заголовок X-Webhook-Secret',
            ],
            payload: '{\n  "first_name": "{{NAME}}",\n  "email": "{{EMAIL}}",\n  "phone": "{{PHONE}}",\n  "company": "{{COMPANY_TITLE}}",\n  "source": "bitrix24"\n}',
          },
          {
            name: 'AmoCRM',
            icon: '🔷',
            desc: 'Передача лидов через Digital Pipeline или виджеты',
            steps: [
              'Перейдите в Настройки → Интеграции',
              'Создайте виджет с Webhook или используйте Digital Pipeline',
              `Webhook URL: ${webhookBaseUrl}/<ваш_endpoint_slug>`,
              'Настройте маппинг: lead[name]→full_name, lead[main_contact][email]→email',
              'Добавьте заголовок авторизации',
            ],
            payload: '{\n  "full_name": "{{lead.name}}",\n  "email": "{{lead.email}}",\n  "phone": "{{lead.phone}}",\n  "value": "{{lead.price}}",\n  "source": "amocrm"\n}',
          },
          {
            name: 'Универсальный Webhook (Zapier, Make, n8n)',
            icon: '⚡',
            desc: 'Подключите любой источник данных через HTTP POST',
            steps: [
              'Создайте новый Zap/Scenario/Workflow',
              'Добавьте действие "HTTP Request" / "Webhook"',
              `URL: ${webhookBaseUrl}/<ваш_endpoint_slug>`,
              'Метод: POST, Content-Type: application/json',
              'Headers: X-Webhook-Secret: <ваш_secret_key>',
              'Body: JSON с полями first_name, email, phone, source',
            ],
            payload: '{\n  "first_name": "John",\n  "last_name": "Doe",\n  "email": "john@example.com",\n  "phone": "+1234567890",\n  "source": "landing_page",\n  "utm_source": "google",\n  "utm_campaign": "brand"\n}',
          },
        ].map(crm => (
          <Collapsible key={crm.name}>
            <Card className="border-border/40">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-lg py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{crm.icon}</span>
                    <div className="flex-1">
                      <CardTitle className="text-sm">{crm.name}</CardTitle>
                      <CardDescription className="text-[10px]">{crm.desc}</CardDescription>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">Пошаговая инструкция:</p>
                    {crm.steps.map((step, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                        <p className="text-muted-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-foreground">Пример JSON-тела запроса:</p>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => copyToClipboard(crm.payload)}>
                        <Copy className="h-2.5 w-2.5" /> Копировать
                      </Button>
                    </div>
                    <pre className="bg-secondary/50 p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto border border-border/30 whitespace-pre">
                      {crm.payload}
                    </pre>
                  </div>
                  <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-emerald-600 text-[10px]">После настройки отправьте тестовый запрос и проверьте, что лид появился во вкладке Leads</p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function CrmIntegrationsPage() {
  const { t } = useLanguage();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [config, setConfig] = useState<ClientNotificationConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [botDialogOpen, setBotDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingClients(true);
      const { data } = await supabase.from('clients').select('id, name').eq('status', 'active').order('name');
      setClients(data || []);
      if (data && data.length > 0) setSelectedClientId(data[0].id);
      setLoadingClients(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedClientId) { setConfig(null); return; }
    setTestResult(null);
    (async () => {
      const { data } = await supabase
        .from('client_webhooks')
        .select('*')
        .eq('client_id', selectedClientId)
        .like('name', '__notification_%')
        .limit(2);

      const telegramWh = (data || []).find((w: any) => w.name === '__notification_telegram');
      const webhookWh = (data || []).find((w: any) => w.name === '__notification_webhook');

      setConfig({
        client_id: selectedClientId,
        telegram_enabled: telegramWh?.is_active || false,
        telegram_chat_id: telegramWh?.url?.replace('telegram://', '') || '',
        webhook_enabled: webhookWh?.is_active || false,
        webhook_url: webhookWh?.url || '',
        notify_new_lead: true,
        notify_stage_change: telegramWh?.events?.includes('stage_changed') || webhookWh?.events?.includes('stage_changed') || false,
        notify_won: telegramWh?.events?.includes('won') || webhookWh?.events?.includes('won') || true,
        notify_lost: telegramWh?.events?.includes('lost') || webhookWh?.events?.includes('lost') || false,
      });
    })();
  }, [selectedClientId]);

  const handleSave = async () => {
    if (!config || !selectedClientId) return;
    setSaving(true);

    const events = ['new_lead', 'test'];
    if (config.notify_stage_change) events.push('stage_changed');
    if (config.notify_won) events.push('won');
    if (config.notify_lost) events.push('lost');

    const telegramUrl = config.telegram_chat_id ? `telegram://${config.telegram_chat_id}` : '';
    const { data: existingTg } = await supabase
      .from('client_webhooks').select('id').eq('client_id', selectedClientId).eq('name', '__notification_telegram').maybeSingle();

    if (existingTg) {
      await supabase.from('client_webhooks').update({ url: telegramUrl, is_active: config.telegram_enabled && !!config.telegram_chat_id, events }).eq('id', existingTg.id);
    } else if (config.telegram_enabled && config.telegram_chat_id) {
      await supabase.from('client_webhooks').insert({ client_id: selectedClientId, name: '__notification_telegram', url: telegramUrl, is_active: true, events });
    }

    const { data: existingWh } = await supabase
      .from('client_webhooks').select('id').eq('client_id', selectedClientId).eq('name', '__notification_webhook').maybeSingle();

    if (existingWh) {
      await supabase.from('client_webhooks').update({ url: config.webhook_url || '', is_active: config.webhook_enabled && !!config.webhook_url, events }).eq('id', existingWh.id);
    } else if (config.webhook_enabled && config.webhook_url) {
      await supabase.from('client_webhooks').insert({ client_id: selectedClientId, name: '__notification_webhook', url: config.webhook_url, is_active: true, events });
    }

    setSaving(false);
    toast({ title: t('common.save'), description: t('crm.integrationsSaved') });
  };

  const handleTestTelegram = async () => {
    if (!config?.telegram_chat_id || !selectedClientId) return;
    setTesting(true);
    setTestResult(null);
    await handleSave();

    try {
      const { data, error } = await supabase.functions.invoke('trigger-webhooks', {
        body: {
          client_id: selectedClientId,
          event_type: 'test',
          data: { full_name: 'Test Lead (Проверка)', phone: '+7 999 123-45-67', email: 'test@afmdigital.com', source: 'CRM Integration Test' },
        },
      });

      if (error) throw error;
      const results = data?.results || {};
      const anySuccess = Object.values(results).some((r: any) => r.success);
      const anyFailed = Object.values(results).some((r: any) => !r.success);

      if (data?.triggered === 0) {
        setTestResult({ ok: false, message: 'Нет активных вебхуков. Сначала сохраните настройки.' });
      } else if (anySuccess && !anyFailed) {
        setTestResult({ ok: true, message: '✅ Тестовое сообщение успешно отправлено в Telegram!' });
      } else if (anyFailed) {
        const failedResult = Object.values(results).find((r: any) => !r.success) as any;
        setTestResult({ ok: false, message: `Ошибка доставки (код ${failedResult?.status || 0}). Проверьте Chat ID и что бот добавлен в чат.` });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: `Ошибка: ${e.message}` });
    }
    setTesting(false);
  };

  if (loadingClients) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">{t('crm.integrations')}</h1>
        <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder={t('crm.selectClient')} /></SelectTrigger>
          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="notifications" className="text-xs gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Уведомления
          </TabsTrigger>
          <TabsTrigger value="bots" className="text-xs gap-1.5">
            <Bot className="h-3.5 w-3.5" /> Управление ботами
          </TabsTrigger>
          <TabsTrigger value="external" className="text-xs gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Внешние CRM
          </TabsTrigger>
        </TabsList>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Telegram Guide */}
          <Collapsible>
            <Card className="border-primary/20 bg-primary/5">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 cursor-pointer hover:bg-primary/10 transition-colors rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">📖 Инструкция: Telegram-уведомления</CardTitle>
                    <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 text-sm">
                  {[
                    { n: 1, title: 'Создайте бота через @BotFather', desc: 'Отправьте /newbot, задайте имя и username, скопируйте токен' },
                    { n: 2, title: 'Добавьте бота во вкладке "Управление ботами"', desc: 'Введите имя и токен — он будет зашифрован и сохранён' },
                    { n: 3, title: 'Получите Chat ID', desc: 'Напишите боту /start, затем откройте api.telegram.org/bot<TOKEN>/getUpdates' },
                    { n: 4, title: 'Вставьте Chat ID ниже и сохраните', desc: 'Включите интеграцию и отправьте тестовое сообщение' },
                  ].map(s => (
                    <div key={s.n} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{s.n}</span>
                      <div><p className="font-medium text-xs">{s.title}</p><p className="text-[10px] text-muted-foreground">{s.desc}</p></div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {config && (
            <>
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Telegram Bot</CardTitle>
                    <Switch checked={config.telegram_enabled} onCheckedChange={v => setConfig({ ...config, telegram_enabled: v })} className="ml-auto" />
                  </div>
                </CardHeader>
                {config.telegram_enabled && (
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Chat ID</Label>
                      <Input placeholder="-1001234567890 или 123456789" value={config.telegram_chat_id}
                        onChange={e => setConfig({ ...config, telegram_chat_id: e.target.value })}
                        className="text-sm h-9 mt-1 font-mono" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={handleTestTelegram} disabled={testing || !config.telegram_chat_id}>
                        <Send className="h-3 w-3" />{testing ? 'Отправка...' : 'Отправить тест'}
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setBotDialogOpen(true)}>
                        <Settings className="h-3 w-3" /> Управление ботами
                      </Button>
                    </div>
                    {testResult && (
                      <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${testResult.ok ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                        {testResult.ok ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />}
                        <p className={testResult.ok ? 'text-emerald-600' : 'text-destructive'}>{testResult.message}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Webhook</CardTitle>
                    <Switch checked={config.webhook_enabled} onCheckedChange={v => setConfig({ ...config, webhook_enabled: v })} className="ml-auto" />
                  </div>
                </CardHeader>
                {config.webhook_enabled && (
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">URL</Label>
                      <Input placeholder="https://hooks.zapier.com/..." value={config.webhook_url}
                        onChange={e => setConfig({ ...config, webhook_url: e.target.value })}
                        className="text-sm h-9 mt-1 font-mono" />
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('crm.eventTriggers')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: t('crm.newLeadCreated'), key: 'notify_new_lead' as const },
                    { label: t('crm.stageChanged'), key: 'notify_stage_change' as const },
                    { label: t('crm.dealWon'), key: 'notify_won' as const },
                    { label: t('crm.dealLost'), key: 'notify_lost' as const },
                  ].map(ev => (
                    <label key={ev.key} className="flex items-center justify-between">
                      <span className="text-sm">{ev.label}</span>
                      <Switch checked={config[ev.key]} onCheckedChange={v => setConfig({ ...config, [ev.key]: v })} />
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </>
          )}
        </TabsContent>

        {/* ── Bots Tab ── */}
        <TabsContent value="bots" className="space-y-4">
          {selectedClientId && (
            <BotManagementInline clientId={selectedClientId} />
          )}
        </TabsContent>

        {/* ── External CRM Tab ── */}
        <TabsContent value="external" className="space-y-4">
          {selectedClientId && <ExternalCrmConnectors clientId={selectedClientId} />}
        </TabsContent>
      </Tabs>

      {selectedClientId && (
        <BotManagementDialog
          open={botDialogOpen}
          onOpenChange={setBotDialogOpen}
          clientId={selectedClientId}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}

/* ── Inline Bot Management (for Bots tab) ── */
function BotManagementInline({ clientId }: { clientId: string }) {
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [newToken, setNewToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchBots = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_bot_profiles').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setBots(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBots(); }, [clientId]);

  const handleAdd = async () => {
    if (!newName.trim() || !newToken.trim()) return;
    setSaving(true);
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(newToken.trim())) {
      toast({ title: 'Ошибка', description: 'Неверный формат токена', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const { data: vaultData, error: vaultErr } = await supabase.functions.invoke('store-bot-token', {
      body: { secret_name: `crm_bot_${clientId}_${Date.now()}`, secret_value: newToken.trim() },
    });

    if (vaultErr || vaultData?.error) { toast({ title: 'Ошибка', description: vaultData?.error || vaultErr?.message || 'Не удалось сохранить токен', variant: 'destructive' }); setSaving(false); return; }
    const tokenRef = vaultData?.token_ref;

    await supabase.from('crm_bot_profiles').update({ is_active: false }).eq('client_id', clientId);

    const { error } = await supabase.from('crm_bot_profiles').insert({
      client_id: clientId, bot_name: newName.trim(), bot_token_ref: tokenRef, is_active: true,
    });

    if (error) { toast({ title: 'Ошибка', description: error.message, variant: 'destructive' }); }
    else {
      toast({ title: 'Бот добавлен', description: `${newName} подключён` });
      setNewName(''); setNewToken(''); setAddMode(false); fetchBots();
    }
    setSaving(false);
  };

  const handleActivate = async (botId: string) => {
    await supabase.from('crm_bot_profiles').update({ is_active: false }).eq('client_id', clientId);
    await supabase.from('crm_bot_profiles').update({ is_active: true }).eq('id', botId);
    fetchBots();
    toast({ title: 'Бот активирован' });
  };

  const handleDelete = async (bot: BotProfile) => {
    if (bot.bot_token_ref) await supabase.rpc('delete_social_token', { _token_reference: bot.bot_token_ref });
    await supabase.from('crm_bot_profiles').delete().eq('id', bot.id);
    fetchBots();
    toast({ title: 'Бот удалён' });
  };

  const handleTest = async (bot: BotProfile) => {
    if (!bot.bot_token_ref) return;
    setTesting(bot.id);
    try {
      const { data: token } = await supabase.rpc('get_social_token', { _token_reference: bot.bot_token_ref });
      if (!token) throw new Error('Токен не найден');
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const json = await res.json();
      if (json.ok) {
        toast({ title: '✅ Бот доступен', description: `@${json.result.username} — ${json.result.first_name}` });
      } else {
        toast({ title: '❌ Ошибка', description: json.description || 'Бот недоступен', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: '❌ Ошибка', description: e.message, variant: 'destructive' });
    }
    setTesting(null);
  };

  if (loading) return <Skeleton className="h-32" />;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">Telegram-боты для уведомлений</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Добавьте одного или нескольких ботов. Активный бот будет отправлять уведомления о лидах в указанный чат. 
            Токен хранится зашифрованным в Vault.
          </p>
        </CardContent>
      </Card>

      {bots.length === 0 && !addMode && (
        <div className="text-center py-8 text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Нет подключённых ботов</p>
        </div>
      )}

      {bots.map(bot => (
        <Card key={bot.id} className={bot.is_active ? 'border-primary/30' : 'border-border/40'}>
          <CardContent className="p-4 flex items-center gap-3">
            <Bot className={`h-5 w-5 ${bot.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{bot.bot_name}</span>
                {bot.is_active && <Badge className="text-[9px] h-4 bg-primary/20 text-primary border-primary/30">Активен</Badge>}
              </div>
              <p className="text-[10px] text-muted-foreground">{new Date(bot.created_at).toLocaleDateString('ru-RU')}</p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleTest(bot)} disabled={testing === bot.id}>
                {testing === bot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '🔍 Тест'}
              </Button>
              {!bot.is_active && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleActivate(bot.id)}>✅ Активировать</Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(bot)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {addMode ? (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Имя бота</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="AFM CRM Bot" className="h-8 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Токен от @BotFather</Label>
              <Input value={newToken} onChange={e => setNewToken(e.target.value)} placeholder="1234567890:AAH..." className="h-8 text-sm font-mono" type="password" />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Хранится зашифрованным</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="text-xs" onClick={handleAdd} disabled={saving || !newName.trim() || !newToken.trim()}>
                {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Добавить
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { setAddMode(false); setNewName(''); setNewToken(''); }}>Отмена</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="w-full gap-1.5" onClick={() => setAddMode(true)}>
          <Plus className="h-4 w-4" /> Добавить бота
        </Button>
      )}
    </div>
  );
}

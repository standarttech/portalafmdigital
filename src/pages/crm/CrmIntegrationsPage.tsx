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
import { toast } from '@/hooks/use-toast';
import { Send, MessageSquare, Webhook, ChevronDown, ExternalLink, BookOpen, CheckCircle, AlertTriangle, Copy } from 'lucide-react';

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

export default function CrmIntegrationsPage() {
  const { t } = useLanguage();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [config, setConfig] = useState<ClientNotificationConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const AFM_DIGITAL_ID = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    (async () => {
      setLoadingClients(true);
      const { data } = await supabase.from('clients').select('id, name').eq('status', 'active').order('name');
      if (data) {
        // Ensure AFM Digital appears first
        const sorted = data.sort((a, b) => a.id === AFM_DIGITAL_ID ? -1 : b.id === AFM_DIGITAL_ID ? 1 : 0);
        setClients(sorted);
        if (sorted.length > 0) setSelectedClientId(sorted[0].id);
      }
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

    // First ensure config is saved with 'test' event included
    await handleSave();

    try {
      const { data, error } = await supabase.functions.invoke('trigger-webhooks', {
        body: {
          client_id: selectedClientId,
          event_type: 'test',
          data: {
            full_name: 'Test Lead (Проверка)',
            phone: '+7 999 123-45-67',
            email: 'test@afmdigital.com',
            source: 'CRM Integration Test',
          },
        },
      });

      if (error) throw error;

      const results = data?.results || {};
      const anySuccess = Object.values(results).some((r: any) => r.success);
      const anyFailed = Object.values(results).some((r: any) => !r.success);

      if (data?.triggered === 0) {
        setTestResult({ ok: false, message: 'Нет активных вебхуков для этого клиента. Сначала сохраните настройки.' });
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

  const copyBotToken = () => {
    navigator.clipboard.writeText('/start');
    toast({ title: 'Скопировано', description: 'Команда /start скопирована' });
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

      {/* ===================== TELEGRAM FULL GUIDE ===================== */}
      <Collapsible defaultOpen>
        <Card className="border-primary/20 bg-primary/5">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-primary/10 transition-colors rounded-t-lg">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">📖 Полная инструкция: Telegram-бот для уведомлений</CardTitle>
                <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
              <CardDescription className="text-xs">Пошаговая настройка от создания бота до получения первого уведомления</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                  <div className="flex-1">
                    <p className="font-medium">Создайте бота через @BotFather</p>
                    <ol className="text-xs text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                      <li>Откройте Telegram и найдите <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">@BotFather <ExternalLink className="h-2.5 w-2.5" /></a></li>
                      <li>Отправьте команду <code className="bg-secondary px-1 rounded">/newbot</code></li>
                      <li>Введите имя бота (например: <code className="bg-secondary px-1 rounded">AFM CRM Notifications</code>)</li>
                      <li>Введите username бота (например: <code className="bg-secondary px-1 rounded">afm_crm_notify_bot</code>)</li>
                      <li>Скопируйте полученный <strong className="text-foreground">токен бота</strong> (формат: <code className="bg-secondary px-1 rounded text-[10px]">1234567890:AAH...</code>)</li>
                    </ol>
                    <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[10px] text-amber-500 font-medium">⚠️ Токен бота уже настроен в системе. Если вы хотите использовать СВОЕГО бота — передайте токен администратору для обновления в настройках.</p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                  <div className="flex-1">
                    <p className="font-medium">Получите Chat ID</p>
                    <p className="text-xs text-muted-foreground mt-1">Есть 2 способа получить Chat ID:</p>
                    <div className="mt-2 space-y-2">
                      <div className="p-2 rounded bg-secondary/50 border border-border">
                        <p className="text-xs font-medium text-foreground">Способ A: Личные сообщения</p>
                        <ol className="text-[11px] text-muted-foreground mt-1 space-y-0.5 list-decimal list-inside">
                          <li>Отправьте любое сообщение вашему боту в Telegram</li>
                          <li>Откройте в браузере: <code className="bg-secondary px-1 rounded break-all">https://api.telegram.org/bot{'<TOKEN>'}/getUpdates</code></li>
                          <li>Найдите <code className="bg-secondary px-1 rounded">"chat":{"{"}"id":123456789{"}"}</code> — это ваш Chat ID</li>
                        </ol>
                      </div>
                      <div className="p-2 rounded bg-secondary/50 border border-border">
                        <p className="text-xs font-medium text-foreground">Способ B: Через @RawDataBot</p>
                        <ol className="text-[11px] text-muted-foreground mt-1 space-y-0.5 list-decimal list-inside">
                          <li>Найдите <a href="https://t.me/RawDataBot" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@RawDataBot</a> в Telegram</li>
                          <li>Отправьте <code className="bg-secondary px-1 rounded">/start</code></li>
                          <li>Бот ответит вашими данными — найдите <code className="bg-secondary px-1 rounded">Chat ID</code></li>
                        </ol>
                      </div>
                      <div className="p-2 rounded bg-secondary/50 border border-border">
                        <p className="text-xs font-medium text-foreground">Способ C: Для группового чата</p>
                        <ol className="text-[11px] text-muted-foreground mt-1 space-y-0.5 list-decimal list-inside">
                          <li>Добавьте вашего бота в группу</li>
                          <li>Отправьте любое сообщение в группу</li>
                          <li>Используйте <code className="bg-secondary px-1 rounded break-all">getUpdates</code> API выше — Chat ID группы начинается с <code className="bg-secondary px-1 rounded">-100...</code></li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                  <div className="flex-1">
                    <p className="font-medium">Вставьте Chat ID ниже и сохраните</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Вставьте полученный Chat ID в поле ниже, включите интеграцию и нажмите «Сохранить». 
                      Затем нажмите «Отправить тест» для проверки.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                  <div className="flex-1">
                    <p className="font-medium">Важно: бот должен быть «запущен»</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Для личных сообщений: откройте бота и нажмите <strong>Start</strong> (или отправьте <code className="bg-secondary px-1 rounded">/start</code>). 
                      Для групп: добавьте бота в группу как участника.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ===================== EXTERNAL CRM GUIDE ===================== */}
      <Collapsible>
        <Card className="border-border/40">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-lg">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{t('crm.externalCrmGuideTitle')}</CardTitle>
                <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
              <CardDescription className="text-xs">{t('crm.externalCrmGuideDesc')}</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                {[
                  { n: 1, title: t('crm.extStep1Title'), desc: t('crm.extStep1Desc') },
                  { n: 2, title: t('crm.extStep2Title'), desc: t('crm.extStep2Desc') },
                  { n: 3, title: t('crm.extStep3Title'), desc: t('crm.extStep3Desc') },
                  { n: 4, title: t('crm.extStep4Title'), desc: t('crm.extStep4Desc') },
                ].map(s => (
                  <div key={s.n} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-bold">{s.n}</span>
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-muted-foreground text-xs">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {config && (
        <>
          {/* Telegram Integration */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Telegram Bot</CardTitle>
                <Switch checked={config.telegram_enabled} onCheckedChange={v => setConfig({ ...config, telegram_enabled: v })} className="ml-auto" />
              </div>
              <CardDescription className="text-xs">{t('crm.telegramTip')}</CardDescription>
            </CardHeader>
            {config.telegram_enabled && (
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Chat ID</Label>
                  <Input
                    placeholder="Например: -1001234567890 или 123456789"
                    value={config.telegram_chat_id}
                    onChange={e => setConfig({ ...config, telegram_chat_id: e.target.value })}
                    className="text-sm h-9 mt-1 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Личный чат: числовой ID. Группа: начинается с -100</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={handleTestTelegram} disabled={testing || !config.telegram_chat_id}>
                    <Send className="h-3 w-3" />{testing ? 'Отправка...' : 'Отправить тест'}
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

          {/* Generic Webhook */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Webhook</CardTitle>
                <Switch checked={config.webhook_enabled} onCheckedChange={v => setConfig({ ...config, webhook_enabled: v })} className="ml-auto" />
              </div>
              <CardDescription className="text-xs">{t('crm.webhookDesc')}</CardDescription>
            </CardHeader>
            {config.webhook_enabled && (
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">{t('crm.destinationUrl')}</Label>
                  <Input placeholder="https://hooks.zapier.com/..." value={config.webhook_url}
                    onChange={e => setConfig({ ...config, webhook_url: e.target.value })}
                    className="text-sm h-9 mt-1 font-mono" />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Event Toggles */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('crm.eventTriggers')}</CardTitle>
              <CardDescription className="text-xs">{t('crm.eventTriggersDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm">{t('crm.newLeadCreated')}</span>
                <Switch checked={config.notify_new_lead} onCheckedChange={v => setConfig({ ...config, notify_new_lead: v })} />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">{t('crm.stageChanged')}</span>
                <Switch checked={config.notify_stage_change} onCheckedChange={v => setConfig({ ...config, notify_stage_change: v })} />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">{t('crm.dealWon')}</span>
                <Switch checked={config.notify_won} onCheckedChange={v => setConfig({ ...config, notify_won: v })} />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">{t('crm.dealLost')}</span>
                <Switch checked={config.notify_lost} onCheckedChange={v => setConfig({ ...config, notify_lost: v })} />
              </label>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </>
      )}
    </div>
  );
}

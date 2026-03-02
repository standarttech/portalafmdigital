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
import { toast } from '@/hooks/use-toast';
import { Send, MessageSquare, Webhook, HelpCircle, ChevronDown, ExternalLink, BookOpen } from 'lucide-react';

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

  useEffect(() => {
    (async () => {
      setLoadingClients(true);
      const { data } = await supabase.from('clients').select('id, name').eq('status', 'active').order('name');
      if (data) {
        setClients(data);
        if (data.length > 0) setSelectedClientId(data[0].id);
      }
      setLoadingClients(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedClientId) { setConfig(null); return; }
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

    const events = ['new_lead'];
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
    try {
      const { error } = await supabase.functions.invoke('trigger-webhooks', {
        body: { client_id: selectedClientId, event_type: 'test', data: { full_name: 'Test Lead', phone: '+1234567890', email: 'test@example.com', source: 'Test' } },
      });
      if (error) throw error;
      toast({ title: '✅ Test sent', description: t('crm.checkTelegram') });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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

      {/* ===================== TELEGRAM SETUP GUIDE ===================== */}
      <Collapsible>
        <Card className="border-primary/20 bg-primary/5">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-primary/10 transition-colors rounded-t-lg">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t('crm.telegramGuideTitle')}</CardTitle>
                <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
              <CardDescription className="text-xs">{t('crm.telegramGuideDesc')}</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <p className="font-medium">{t('crm.tgStep1Title')}</p>
                    <p className="text-muted-foreground text-xs">{t('crm.tgStep1Desc')}</p>
                    <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary text-xs inline-flex items-center gap-1 mt-1 hover:underline">
                      @BotFather <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <p className="font-medium">{t('crm.tgStep2Title')}</p>
                    <p className="text-muted-foreground text-xs">{t('crm.tgStep2Desc')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <p className="font-medium">{t('crm.tgStep3Title')}</p>
                    <p className="text-muted-foreground text-xs">{t('crm.tgStep3Desc')}</p>
                    <a href="https://t.me/RawDataBot" target="_blank" rel="noopener noreferrer" className="text-primary text-xs inline-flex items-center gap-1 mt-1 hover:underline">
                      @RawDataBot <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                  <div>
                    <p className="font-medium">{t('crm.tgStep4Title')}</p>
                    <p className="text-muted-foreground text-xs">{t('crm.tgStep4Desc')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</span>
                  <div>
                    <p className="font-medium">{t('crm.tgStep5Title')}</p>
                    <p className="text-muted-foreground text-xs">{t('crm.tgStep5Desc')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ===================== EXTERNAL CRM GUIDE ===================== */}
      <Collapsible>
        <Card className="border-info/20 bg-info/5">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-info/10 transition-colors rounded-t-lg">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-info" />
                <CardTitle className="text-base">{t('crm.externalCrmGuideTitle')}</CardTitle>
                <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
              <CardDescription className="text-xs">{t('crm.externalCrmGuideDesc')}</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-info text-info-foreground flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <p className="font-medium">{t('crm.extStep1Title')}</p>
                    <p className="text-muted-foreground text-xs">{t('crm.extStep1Desc')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-info text-info-foreground flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <p className="font-medium">{t('crm.extStep2Title')}</p>
                    <p className="text-muted-foreground text-xs">{t('crm.extStep2Desc')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-info text-info-foreground flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <p className="font-medium">{t('crm.extStep3Title')}</p>
                    <p className="text-muted-foreground text-xs">{t('crm.extStep3Desc')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-info text-info-foreground flex items-center justify-center text-xs font-bold">4</span>
                  <div>
                    <p className="font-medium">{t('crm.extStep4Title')}</p>
                    <p className="text-muted-foreground text-xs">{t('crm.extStep4Desc')}</p>
                  </div>
                </div>
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
                    placeholder="e.g. -1001234567890 or 123456789"
                    value={config.telegram_chat_id}
                    onChange={e => setConfig({ ...config, telegram_chat_id: e.target.value })}
                    className="text-sm h-9 mt-1 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{t('crm.chatIdHint')}</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs" onClick={handleTestTelegram} disabled={testing || !config.telegram_chat_id}>
                  <Send className="h-3 w-3 mr-1" />{testing ? t('common.loading') : t('crm.sendTest')}
                </Button>
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
                  <Input
                    placeholder="https://hooks.zapier.com/..."
                    value={config.webhook_url}
                    onChange={e => setConfig({ ...config, webhook_url: e.target.value })}
                    className="text-sm h-9 mt-1 font-mono"
                  />
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

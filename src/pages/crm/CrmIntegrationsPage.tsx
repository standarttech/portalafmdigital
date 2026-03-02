import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Link2, Send, MessageSquare, Webhook, CheckCircle2, XCircle, Clock } from 'lucide-react';

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

  // Load clients
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

  // Load notification config from client_webhooks
  useEffect(() => {
    if (!selectedClientId) { setConfig(null); return; }
    (async () => {
      // Look for a webhook with name starting with "__notification_"
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

    // Telegram webhook
    const telegramUrl = config.telegram_chat_id ? `telegram://${config.telegram_chat_id}` : '';
    const { data: existingTg } = await supabase
      .from('client_webhooks')
      .select('id')
      .eq('client_id', selectedClientId)
      .eq('name', '__notification_telegram')
      .maybeSingle();

    if (existingTg) {
      await supabase.from('client_webhooks').update({
        url: telegramUrl,
        is_active: config.telegram_enabled && !!config.telegram_chat_id,
        events,
      }).eq('id', existingTg.id);
    } else if (config.telegram_enabled && config.telegram_chat_id) {
      await supabase.from('client_webhooks').insert({
        client_id: selectedClientId,
        name: '__notification_telegram',
        url: telegramUrl,
        is_active: true,
        events,
      });
    }

    // Generic webhook
    const { data: existingWh } = await supabase
      .from('client_webhooks')
      .select('id')
      .eq('client_id', selectedClientId)
      .eq('name', '__notification_webhook')
      .maybeSingle();

    if (existingWh) {
      await supabase.from('client_webhooks').update({
        url: config.webhook_url || '',
        is_active: config.webhook_enabled && !!config.webhook_url,
        events,
      }).eq('id', existingWh.id);
    } else if (config.webhook_enabled && config.webhook_url) {
      await supabase.from('client_webhooks').insert({
        client_id: selectedClientId,
        name: '__notification_webhook',
        url: config.webhook_url,
        is_active: true,
        events,
      });
    }

    setSaving(false);
    toast({ title: t('common.save'), description: 'Notification settings saved' });
  };

  const handleTestTelegram = async () => {
    if (!config?.telegram_chat_id || !selectedClientId) return;
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke('trigger-webhooks', {
        body: {
          client_id: selectedClientId,
          event_type: 'test',
          data: { full_name: 'Test Lead', phone: '+1234567890', email: 'test@example.com', source: 'Test' },
        },
      });
      if (error) throw error;
      toast({ title: '✅ Test sent', description: 'Check your Telegram for the test message' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setTesting(false);
  };

  if (loadingClients) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">{t('crm.integrations')}</h1>
        <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder={t('crm.selectClient')} /></SelectTrigger>
          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

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
              <CardDescription className="text-xs">
                {t('crm.telegramTip')}
              </CardDescription>
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
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Get your Chat ID from @userinfobot or @RawDataBot in Telegram
                  </p>
                </div>
                <Button size="sm" variant="outline" className="text-xs" onClick={handleTestTelegram} disabled={testing || !config.telegram_chat_id}>
                  <Send className="h-3 w-3 mr-1" />{testing ? 'Sending...' : 'Send Test Message'}
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
              <CardDescription className="text-xs">
                Send CRM events to any external URL (e.g. Zapier, Make.com, your CRM)
              </CardDescription>
            </CardHeader>
            {config.webhook_enabled && (
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Destination URL</Label>
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
              <CardTitle className="text-base">Event Triggers</CardTitle>
              <CardDescription className="text-xs">Choose which events trigger notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm">New Lead Created</span>
                <Switch checked={config.notify_new_lead} onCheckedChange={v => setConfig({ ...config, notify_new_lead: v })} />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">Stage Changed</span>
                <Switch checked={config.notify_stage_change} onCheckedChange={v => setConfig({ ...config, notify_stage_change: v })} />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">Deal Won</span>
                <Switch checked={config.notify_won} onCheckedChange={v => setConfig({ ...config, notify_won: v })} />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">Deal Lost</span>
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

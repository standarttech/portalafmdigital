import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Bell, Mail, MessageCircle, BellRing, Loader2, Copy, Check, Unlink } from 'lucide-react';

const CHANNEL_OPTIONS = ['in_app', 'email', 'telegram', 'webpush'] as const;
const NOTIFICATION_TYPES = ['alert', 'task', 'chat', 'report', 'approval'] as const;

type ChannelField = `${typeof NOTIFICATION_TYPES[number]}_channels`;

export default function NotificationSettings() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<any>(null);

  // Telegram linking
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const fetchPrefs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setPrefs(data);
    } else {
      // Create default prefs
      const { data: newPrefs } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id })
        .select()
        .single();
      setPrefs(newPrefs);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const updatePref = async (field: string, value: any) => {
    if (!user || !prefs) return;
    const updated = { ...prefs, [field]: value };
    setPrefs(updated);

    const { error } = await supabase
      .from('notification_preferences')
      .update({ [field]: value })
      .eq('user_id', user.id);

    if (error) {
      toast.error(error.message);
      fetchPrefs(); // revert
    }
  };

  const toggleChannel = (type: typeof NOTIFICATION_TYPES[number], channel: string) => {
    const field = `${type}_channels` as ChannelField;
    const current: string[] = prefs?.[field] || [];
    const updated = current.includes(channel)
      ? current.filter((c: string) => c !== channel)
      : [...current, channel];
    updatePref(field, updated);
  };

  const handleGenerateTelegramCode = async () => {
    setGeneratingCode(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ action: 'generate_link_code' }),
        }
      );
      const result = await res.json();
      if (result.link_code) {
        setLinkCode(result.link_code);
      } else {
        toast.error(result.error || 'Failed to generate code');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setGeneratingCode(false);
  };

  const handleCopyCode = () => {
    if (!linkCode) return;
    navigator.clipboard.writeText(`/start ${linkCode}`);
    setCodeCopied(true);
    toast.success(t('notif.codeCopied'));
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleUnlinkTelegram = async () => {
    setUnlinking(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ action: 'unlink' }),
        }
      );
      toast.success(t('notif.telegramUnlinked'));
      fetchPrefs();
    } catch (e: any) {
      toast.error(e.message);
    }
    setUnlinking(false);
  };

  const handleEnableWebPush = async () => {
    try {
      if (!('Notification' in window)) {
        toast.error(t('notif.webpushNotSupported'));
        return;
      }
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toast.error(t('notif.webpushNotSupported'));
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error(t('notif.webpushDenied'));
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Fetch VAPID public key from edge function
      const vapidRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-vapid-key`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const vapidData = await vapidRes.json();
      const vapidPublicKey = vapidData.publicKey;
      if (!vapidPublicKey) {
        toast.error('VAPID key not configured');
        return;
      }

      // Convert VAPID key to Uint8Array
      const padding = '='.repeat((4 - (vapidPublicKey.length % 4)) % 4);
      const base64 = (vapidPublicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        applicationServerKey[i] = rawData.charCodeAt(i);
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const subscriptionJson = subscription.toJSON();

      // Save subscription to DB
      await updatePref('webpush_subscription', subscriptionJson);
      await updatePref('webpush_enabled', true);
      toast.success(t('notif.webpushEnabled'));
    } catch (e: any) {
      console.error('Web push setup error:', e);
      toast.error(t('notif.webpushNotSupported'));
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const channelLabels: Record<string, { icon: React.ReactNode; label: string }> = {
    in_app: { icon: <Bell className="h-3.5 w-3.5" />, label: 'In-App' },
    email: { icon: <Mail className="h-3.5 w-3.5" />, label: 'Email' },
    telegram: { icon: <MessageCircle className="h-3.5 w-3.5" />, label: 'Telegram' },
    webpush: { icon: <BellRing className="h-3.5 w-3.5" />, label: 'Web Push' },
  };

  const typeLabels: Record<string, string> = {
    alert: t('notif.typeAlert'),
    task: t('notif.typeTask'),
    chat: t('notif.typeChat'),
    report: t('notif.typeReport'),
    approval: t('notif.typeApproval'),
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('notif.title')}</CardTitle>
        </div>
        <CardDescription>{t('notif.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channel connections */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">{t('notif.channels')}</h4>

          {/* Email - always connected */}
          <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Email</span>
            </div>
            <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/30">
                {t('notif.connected')}
              </Badge>
              <Switch
                checked={prefs?.email_enabled !== false}
                onCheckedChange={(v) => updatePref('email_enabled', v)}
              />
            </div>
          </div>

          {/* Telegram */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Telegram</span>
              </div>
              {prefs?.telegram_chat_id ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/30">
                    {t('notif.connected')}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleUnlinkTelegram} disabled={unlinking}>
                    <Unlink className="h-3.5 w-3.5 mr-1" />
                    {t('notif.unlink')}
                  </Button>
                </div>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {t('notif.notConnected')}
                </Badge>
              )}
            </div>

            {!prefs?.telegram_chat_id && (
              <div className="space-y-2">
                {linkCode ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{t('notif.telegramInstructions')}</p>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-background/50 rounded px-3 py-2 text-sm font-mono">
                        /start {linkCode}
                      </code>
                      <Button variant="outline" size="sm" onClick={handleCopyCode}>
                        {codeCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleGenerateTelegramCode} disabled={generatingCode}>
                    {generatingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <MessageCircle className="h-3.5 w-3.5 mr-1" />}
                    {t('notif.linkTelegram')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Web Push */}
          <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Web Push</span>
            </div>
            <div className="flex items-center gap-3">
              {prefs?.webpush_enabled ? (
                <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/30">
                  {t('notif.enabled')}
                </Badge>
              ) : (
                <Button variant="outline" size="sm" onClick={handleEnableWebPush}>
                  {t('notif.enable')}
                </Button>
              )}
              {prefs?.webpush_enabled && (
                <Switch
                  checked={prefs.webpush_enabled}
                  onCheckedChange={(v) => updatePref('webpush_enabled', v)}
                />
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Channel matrix */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">{t('notif.channelMatrix')}</h4>

          {/* Header */}
          <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground px-1">
            <div></div>
            {CHANNEL_OPTIONS.map(ch => (
              <div key={ch} className="text-center">{channelLabels[ch].label}</div>
            ))}
          </div>

          {/* Rows */}
          {NOTIFICATION_TYPES.map(type => {
            const field = `${type}_channels` as ChannelField;
            const channels: string[] = prefs?.[field] || [];

            return (
              <div key={type} className="grid grid-cols-5 gap-2 items-center bg-muted/20 rounded-lg p-2">
                <div className="text-sm font-medium text-foreground truncate">
                  {typeLabels[type]}
                </div>
                {CHANNEL_OPTIONS.map(ch => (
                  <div key={ch} className="flex justify-center">
                    <Switch
                      checked={channels.includes(ch)}
                      onCheckedChange={() => toggleChannel(type, ch)}
                      className="scale-75"
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Palette, Globe, Loader2, CheckCircle2, XCircle, Key, Settings, Link2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Integration {
  id: string;
  integration_type: string;
  display_name: string;
  is_active: boolean;
  config: any;
  secret_ref: string | null;
}

const INTEGRATIONS_CONFIG = [
  {
    type: 'freepik',
    name: 'Freepik',
    icon: <Palette className="h-5 w-5 text-emerald-400" />,
    description: 'Создание креативов с помощью Freepik AI. Подключите API ключ вашей подписки.',
    docsUrl: 'https://www.freepik.com/api',
    secretLabel: 'Freepik API Key',
    fields: [
      { key: 'workspace_id', label: 'Workspace / Space ID', placeholder: 'Опционально' },
    ],
  },
  {
    type: 'meta_ads_management',
    name: 'Meta Ads Management',
    icon: <Globe className="h-5 w-5 text-blue-400" />,
    description: 'Полный доступ к управлению кампаниями (создание, редактирование пикселей, аудитории). Требуется Meta App с разрешением ads_management.',
    docsUrl: 'https://developers.facebook.com/docs/marketing-apis/',
    secretLabel: 'Meta Management Access Token',
    fields: [
      { key: 'app_id', label: 'Meta App ID', placeholder: 'ID приложения с ads_management' },
      { key: 'default_pixel_id', label: 'Default Pixel ID', placeholder: 'Опционально' },
    ],
  },
];

export default function PlatformIntegrationsPanel() {
  const { agencyRole } = useAuth();
  const isAdmin = agencyRole === 'AgencyAdmin';
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupType, setSetupType] = useState<string | null>(null);
  const [secretValue, setSecretValue] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [configFields, setConfigFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('platform_integrations' as any).select('*');
    setIntegrations((data || []) as unknown as Integration[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getIntegration = (type: string) => integrations.find(i => i.integration_type === type);
  const getConfig = (type: string) => INTEGRATIONS_CONFIG.find(c => c.type === type)!;

  const openSetup = (type: string) => {
    const existing = getIntegration(type);
    setSetupType(type);
    setSecretValue('');
    setShowSecret(false);
    const cfg = getConfig(type);
    const fields: Record<string, string> = {};
    cfg.fields.forEach(f => {
      fields[f.key] = (existing?.config as any)?.[f.key] || '';
    });
    setConfigFields(fields);
  };

  const handleSave = async () => {
    if (!setupType) return;
    setSaving(true);

    try {
      // If secret provided, store in vault
      if (secretValue) {
        const { error } = await supabase.rpc('store_platform_integration_secret', {
          _integration_type: setupType,
          _secret_value: secretValue,
        });
        if (error) throw error;
      }

      // Update config fields
      const cfg = getConfig(setupType);
      const existing = getIntegration(setupType);
      const configUpdate = { ...((existing?.config as any) || {}), ...configFields };

      if (existing) {
        await supabase.from('platform_integrations' as any)
          .update({ config: configUpdate, is_active: true, display_name: cfg.name })
          .eq('id', existing.id);
      } else if (!secretValue) {
        // Create without secret
        await supabase.from('platform_integrations' as any).insert({
          integration_type: setupType,
          display_name: cfg.name,
          config: configUpdate,
          is_active: true,
        });
      }

      toast.success(`${cfg.name} подключён`);
      setSetupType(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleIntegration = async (type: string, active: boolean) => {
    const existing = getIntegration(type);
    if (!existing) return;
    await supabase.from('platform_integrations' as any)
      .update({ is_active: active })
      .eq('id', existing.id);
    toast.success(active ? 'Интеграция включена' : 'Интеграция отключена');
    load();
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        Интеграции платформы
      </h2>
      <p className="text-sm text-muted-foreground">Подключайте и управляйте внешними сервисами прямо из платформы.</p>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3">
          {INTEGRATIONS_CONFIG.map(cfg => {
            const integration = getIntegration(cfg.type);
            const isConnected = integration?.is_active && integration?.secret_ref;

            return (
              <Card key={cfg.type} className={isConnected ? 'border-emerald-500/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{cfg.name}</span>
                        {isConnected ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Подключено
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Не подключено
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cfg.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isConnected && (
                        <Switch
                          checked={integration.is_active}
                          onCheckedChange={v => toggleIntegration(cfg.type, v)}
                        />
                      )}
                      <Button size="sm" variant={isConnected ? "outline" : "default"} className="text-xs gap-1"
                        onClick={() => openSetup(cfg.type)}>
                        <Settings className="h-3 w-3" />
                        {isConnected ? 'Настройки' : 'Подключить'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Setup dialog */}
      <Dialog open={!!setupType} onOpenChange={v => { if (!v) setSetupType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {setupType ? getConfig(setupType).name : ''} — Настройка
            </DialogTitle>
            <DialogDescription>
              Ключ будет зашифрован и сохранён в Vault. Только администраторы имеют доступ.
            </DialogDescription>
          </DialogHeader>

          {setupType && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Key className="h-3.5 w-3.5" />
                  {getConfig(setupType).secretLabel}
                </Label>
                <div className="relative">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={secretValue}
                    onChange={e => setSecretValue(e.target.value)}
                    placeholder={getIntegration(setupType)?.secret_ref ? '••••••••• (уже настроен)' : 'Введите API ключ'}
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowSecret(!showSecret)}>
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {getConfig(setupType).fields.map(field => (
                <div key={field.key} className="space-y-2">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    value={configFields[field.key] || ''}
                    onChange={e => setConfigFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

              <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">
                <p>📖 Где получить ключ: <a href={getConfig(setupType).docsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{getConfig(setupType).docsUrl}</a></p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupType(null)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

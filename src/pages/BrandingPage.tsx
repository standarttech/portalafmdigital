import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, Loader2, Palette, Image as ImageIcon, RotateCcw, Layout } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const BG_PRESETS = [
  { label: 'Transparent', value: 'transparent' },
  { label: 'Dark navy', value: 'hsl(228, 35%, 4%)' },
  { label: 'Midnight', value: 'hsl(225, 30%, 9%)' },
  { label: 'Gold tint', value: 'hsl(42, 87%, 14%)' },
  { label: 'Slate', value: 'hsl(217, 33%, 17%)' },
  { label: 'White', value: 'hsl(0, 0%, 100%)' },
];

function LogoUploadCard({
  settingKey,
  title,
  description,
  logoUrl,
  setLogoUrl,
  logoSize,
  setLogoSize,
  logoBg,
  setLogoBg,
  logoBgCustom,
  setLogoBgCustom,
  saving,
  onSave,
  onReset,
}: {
  settingKey: string;
  title: string;
  description: string;
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  logoSize: number;
  setLogoSize: (v: number) => void;
  logoBg: string;
  setLogoBg: (v: string) => void;
  logoBgCustom: string;
  setLogoBgCustom: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `logo/${settingKey}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('branding').upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('branding').getPublicUrl(path);
    setLogoUrl(urlData.publicUrl);
    setUploading(false);
    toast.success('Логотип загружен');
  };

  const effectiveBg = logoBgCustom || logoBg;

  return (
    <div className="space-y-4">
      {/* Preview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Предпросмотр
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div
            className="rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-border/40"
            style={{
              width: logoSize * 1.5,
              height: logoSize * 1.5,
              background: effectiveBg === 'transparent'
                ? 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 0 0 / 12px 12px'
                : effectiveBg,
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo preview" style={{ width: logoSize, height: logoSize, objectFit: 'contain' }} />
            ) : (
              <span className="text-muted-foreground text-xs">Logo</span>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground mt-1">Размер: <span className="text-primary font-mono">{logoSize}px</span></p>
            <p className="text-xs text-muted-foreground">Фон: {effectiveBg}</p>
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Загрузить логотип
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Загрузка...' : 'Выбрать файл'}
            </Button>
            {logoUrl && (
              <Button variant="ghost" onClick={() => setLogoUrl('')} className="text-destructive">Удалить</Button>
            )}
          </div>
          {logoUrl && (
            <div>
              <Label className="text-xs text-muted-foreground">URL логотипа</Label>
              <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="mt-1 text-xs font-mono" placeholder="https://..." />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Size */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm">Размер логотипа</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground w-8">16px</span>
            <Slider value={[logoSize]} onValueChange={([v]) => setLogoSize(v)} min={16} max={64} step={2} className="flex-1" />
            <span className="text-xs text-muted-foreground w-8">64px</span>
          </div>
          <p className="text-xs text-muted-foreground">Текущий: <span className="text-foreground font-mono">{logoSize}px</span></p>
        </CardContent>
      </Card>

      {/* Background */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />Фон логотипа
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {BG_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => { setLogoBg(preset.value); setLogoBgCustom(''); }}
                className={`h-8 px-3 rounded-lg text-xs border transition-all ${
                  logoBgCustom === '' && logoBg === preset.value
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                <span
                  className="inline-block w-3 h-3 rounded-full mr-1.5 border border-border/30 align-middle"
                  style={{ background: preset.value === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 6px 6px' : preset.value }}
                />
                {preset.label}
              </button>
            ))}
          </div>
          <div>
            <Label className="text-xs">Произвольный цвет (CSS)</Label>
            <Input value={logoBgCustom} onChange={e => setLogoBgCustom(e.target.value)} placeholder="e.g. hsl(42, 87%, 14%) or #1a1a2e" className="mt-1 text-xs font-mono" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={onSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Сохранить
        </Button>
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />Сбросить
        </Button>
      </div>
    </div>
  );
}

export default function BrandingPage() {
  const { t } = useLanguage();

  // Login logo settings
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState(36);
  const [logoBg, setLogoBg] = useState('transparent');
  const [logoBgCustom, setLogoBgCustom] = useState('');
  const [saving, setSaving] = useState(false);

  // Sidebar logo settings
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState('');
  const [sidebarLogoSize, setSidebarLogoSize] = useState(32);
  const [sidebarLogoBg, setSidebarLogoBg] = useState('transparent');
  const [sidebarLogoBgCustom, setSidebarLogoBgCustom] = useState('');
  const [savingSidebar, setSavingSidebar] = useState(false);

  useEffect(() => {
    supabase.from('platform_settings')
      .select('key, value')
      .in('key', ['logo_url', 'logo_size', 'logo_bg', 'sidebar_logo_url', 'sidebar_logo_size', 'sidebar_logo_bg'])
      .then(({ data }) => {
        data?.forEach(row => {
          if (row.key === 'logo_url') setLogoUrl((row.value as any) || '');
          if (row.key === 'logo_size') setLogoSize(Number(row.value) || 36);
          if (row.key === 'logo_bg') setLogoBg((row.value as any) || 'transparent');
          if (row.key === 'sidebar_logo_url') setSidebarLogoUrl((row.value as any) || '');
          if (row.key === 'sidebar_logo_size') setSidebarLogoSize(Number(row.value) || 32);
          if (row.key === 'sidebar_logo_bg') setSidebarLogoBg((row.value as any) || 'transparent');
        });
      });
  }, []);

  const saveSetting = async (key: string, value: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('platform_settings').upsert({ key, value, updated_by: user?.id }, { onConflict: 'key' });
  };

  const handleSaveLogin = async () => {
    setSaving(true);
    const bgToSave = logoBgCustom || logoBg;
    await Promise.all([saveSetting('logo_url', logoUrl), saveSetting('logo_size', logoSize), saveSetting('logo_bg', bgToSave)]);
    setSaving(false);
    toast.success('Настройки логотипа входа сохранены');
  };

  const handleSaveSidebar = async () => {
    setSavingSidebar(true);
    const bgToSave = sidebarLogoBgCustom || sidebarLogoBg;
    await Promise.all([saveSetting('sidebar_logo_url', sidebarLogoUrl), saveSetting('sidebar_logo_size', sidebarLogoSize), saveSetting('sidebar_logo_bg', bgToSave)]);
    setSavingSidebar(false);
    toast.success('Настройки логотипа сайдбара сохранены');
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('branding.title' as any)}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('branding.subtitle' as any)}</p>
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="login">
          <TabsList className="mb-4">
            <TabsTrigger value="login" className="gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Логотип при входе
            </TabsTrigger>
            <TabsTrigger value="sidebar" className="gap-1.5">
              <Layout className="h-3.5 w-3.5" />
              Логотип в сайдбаре
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <LogoUploadCard
              settingKey="login-logo"
              title="Логотип при входе"
              description="Отображается на странице авторизации и регистрации"
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              logoSize={logoSize}
              setLogoSize={setLogoSize}
              logoBg={logoBg}
              setLogoBg={setLogoBg}
              logoBgCustom={logoBgCustom}
              setLogoBgCustom={setLogoBgCustom}
              saving={saving}
              onSave={handleSaveLogin}
              onReset={() => { setLogoUrl(''); setLogoSize(36); setLogoBg('transparent'); setLogoBgCustom(''); }}
            />
          </TabsContent>

          <TabsContent value="sidebar">
            <LogoUploadCard
              settingKey="sidebar-logo"
              title="Логотип в сайдбаре"
              description="Отображается в верхней части боковой панели рядом с надписью AFM DIGITAL"
              logoUrl={sidebarLogoUrl}
              setLogoUrl={setSidebarLogoUrl}
              logoSize={sidebarLogoSize}
              setLogoSize={setSidebarLogoSize}
              logoBg={sidebarLogoBg}
              setLogoBg={setSidebarLogoBg}
              logoBgCustom={sidebarLogoBgCustom}
              setLogoBgCustom={setSidebarLogoBgCustom}
              saving={savingSidebar}
              onSave={handleSaveSidebar}
              onReset={() => { setSidebarLogoUrl(''); setSidebarLogoSize(32); setSidebarLogoBg('transparent'); setSidebarLogoBgCustom(''); }}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

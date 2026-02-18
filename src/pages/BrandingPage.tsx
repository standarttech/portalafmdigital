import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Upload, Loader2, Palette, Image as ImageIcon, RotateCcw } from 'lucide-react';

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

export default function BrandingPage() {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoSize, setLogoSize] = useState(36);
  const [logoBg, setLogoBg] = useState('transparent');
  const [logoBgCustom, setLogoBgCustom] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('platform_settings').select('key, value').in('key', ['logo_url', 'logo_size', 'logo_bg']).then(({ data }) => {
      data?.forEach(row => {
        if (row.key === 'logo_url') setLogoUrl((row.value as any) || '');
        if (row.key === 'logo_size') setLogoSize(Number(row.value) || 36);
        if (row.key === 'logo_bg') setLogoBg((row.value as any) || 'transparent');
      });
    });
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `logo/agency-logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('chat-images').upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path);
    setLogoUrl(urlData.publicUrl);
    setUploading(false);
    toast.success('Логотип загружен');
  };

  const saveSetting = async (key: string, value: any) => {
    await supabase.from('platform_settings').upsert({ key, value, updated_by: (await supabase.auth.getUser()).data.user?.id }, { onConflict: 'key' });
  };

  const handleSave = async () => {
    setSaving(true);
    const bgToSave = logoBgCustom || logoBg;
    await Promise.all([
      saveSetting('logo_url', logoUrl),
      saveSetting('logo_size', logoSize),
      saveSetting('logo_bg', bgToSave),
    ]);
    setSaving(false);
    toast.success('Настройки брендинга сохранены');
  };

  const handleReset = () => {
    setLogoUrl('');
    setLogoSize(36);
    setLogoBg('transparent');
    setLogoBgCustom('');
  };

  const effectiveBg = logoBgCustom || logoBg;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('branding.title' as any)}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('branding.subtitle' as any)}</p>
      </motion.div>

      {/* Preview */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Предпросмотр логотипа
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div
              className="rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-border/40"
              style={{
                width: logoSize * 1.5,
                height: logoSize * 1.5,
                background: effectiveBg === 'transparent' ? 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 0 0 / 12px 12px' : effectiveBg,
              }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  style={{ width: logoSize, height: logoSize, objectFit: 'contain' }}
                />
              ) : (
                <span className="text-muted-foreground text-xs">Logo</span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">Размер: <span className="text-primary font-mono">{logoSize}px</span></p>
              <p className="text-xs text-muted-foreground mt-1">Фон: {effectiveBg}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upload */}
      <motion.div variants={item}>
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
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Загрузка...' : 'Выбрать файл'}
              </Button>
              {logoUrl && (
                <Button variant="ghost" onClick={() => setLogoUrl('')} className="text-destructive">
                  Удалить
                </Button>
              )}
            </div>
            {logoUrl && (
              <div>
                <Label className="text-xs text-muted-foreground">URL логотипа</Label>
                <Input
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="mt-1 text-xs font-mono"
                  placeholder="https://..."
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Size */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm">Размер логотипа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground w-8">16px</span>
              <Slider
                value={[logoSize]}
                onValueChange={([v]) => setLogoSize(v)}
                min={16}
                max={64}
                step={2}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8">64px</span>
            </div>
            <p className="text-xs text-muted-foreground">Текущий: <span className="text-foreground font-mono">{logoSize}px</span></p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Background */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Фон логотипа
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {BG_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => { setLogoBg(preset.value); setLogoBgCustom(''); }}
                  className={`h-8 px-3 rounded-lg text-xs border transition-all ${
                    (logoBgCustom === '' && logoBg === preset.value)
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
              <Input
                value={logoBgCustom}
                onChange={e => setLogoBgCustom(e.target.value)}
                placeholder="e.g. hsl(42, 87%, 14%) or #1a1a2e"
                className="mt-1 text-xs font-mono"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div variants={item} className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Сохранить настройки
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Сбросить
        </Button>
      </motion.div>
    </motion.div>
  );
}

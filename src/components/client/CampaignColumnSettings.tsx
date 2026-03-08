import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Settings2, Save, Trash2, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ColumnDef {
  key: string;
  label: string;
  right: boolean;
}

interface Preset {
  id: string;
  name: string;
  columns: string[];
  is_active: boolean;
}

const DEFAULT_COLUMNS = ['name', 'spend', 'impressions', 'clicks', 'cpc', 'ctr', 'leads', 'cpl', 'purchases', 'revenue'];

interface Props {
  allColumns: ColumnDef[];
  visibleKeys: string[];
  onChangeVisible: (keys: string[]) => void;
}

export default function CampaignColumnSettings({ allColumns, visibleKeys, onChangeVisible }: Props) {
  const { t } = useLanguage();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('user_campaign_column_presets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (data) setPresets(data.map(d => ({ ...d, columns: d.columns as unknown as string[] })));
  };

  const toggle = (key: string) => {
    if (key === 'name') return; // name is always visible
    const next = visibleKeys.includes(key)
      ? visibleKeys.filter(k => k !== key)
      : [...visibleKeys, key];
    onChangeVisible(next);
  };

  const savePreset = async () => {
    if (!newPresetName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from('user_campaign_column_presets').insert({
      user_id: user.id,
      name: newPresetName.trim(),
      columns: visibleKeys as any,
      is_active: false,
    });
    if (!error) {
      toast.success(t('columns.saved'));
      setNewPresetName('');
      loadPresets();
    }
    setSaving(false);
  };

  const applyPreset = (preset: Preset) => {
    onChangeVisible(preset.columns);
    toast.success(t('columns.applied'));
  };

  const deletePreset = async (id: string) => {
    await supabase.from('user_campaign_column_presets').delete().eq('id', id);
    toast.success(t('columns.deleted'));
    loadPresets();
  };

  const resetDefault = () => {
    onChangeVisible(DEFAULT_COLUMNS);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
          <Settings2 className="h-3.5 w-3.5" />
          {t('columns.settings')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Column toggles */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('columns.toggleColumns')}</p>
            <div className="space-y-1.5">
              {allColumns.map(col => (
                <label key={col.key} className="flex items-center justify-between gap-2 py-0.5 cursor-pointer">
                  <span className={`text-xs ${col.key === 'name' ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {col.label}
                  </span>
                  <Switch
                    checked={visibleKeys.includes(col.key)}
                    onCheckedChange={() => toggle(col.key)}
                    disabled={col.key === 'name'}
                    className="scale-75"
                  />
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Reset */}
          <Button variant="ghost" size="sm" className="w-full text-xs h-7 gap-1.5" onClick={resetDefault}>
            <RotateCcw className="h-3 w-3" />
            {t('columns.resetToDefault')}
          </Button>

          <Separator />

          {/* Presets */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('columns.presets')}</p>
            {presets.length > 0 && (
              <div className="space-y-1 mb-2">
                {presets.map(p => (
                  <div key={p.id} className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-start text-xs h-7 truncate"
                      onClick={() => applyPreset(p)}
                    >
                      <Check className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive flex-shrink-0"
                      onClick={() => deletePreset(p.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Save new preset */}
            <div className="flex gap-1">
              <Input
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                placeholder={t('columns.presetName')}
                className="h-7 text-xs"
                onKeyDown={e => e.key === 'Enter' && savePreset()}
              />
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                disabled={!newPresetName.trim() || saving}
                onClick={savePreset}
              >
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

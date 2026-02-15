import { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import type { DateRange as DayPickerRange } from 'react-day-picker';
import type { DateRange, Comparison } from './dashboardData';
import type { TranslationKey } from '@/i18n/translations';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
  comparison: Comparison;
  onComparisonChange: (c: Comparison) => void;
  customDateRange?: { from: Date; to: Date };
  onCustomDateRangeChange?: (range: { from: Date; to: Date }) => void;
  compareEnabled?: boolean;
  onCompareEnabledChange?: (enabled: boolean) => void;
}

type PresetKey = 'today' | 'yesterday' | '7d' | '14d' | '28d' | '30d' |
  'this_week' | 'last_week' | 'this_month' | 'last_month' |
  'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';

interface Preset {
  key: PresetKey;
  labelKey: TranslationKey;
  fallbackEn: string;
  getRange: () => { from: Date; to: Date };
}

const now = () => new Date();

const presets: Preset[] = [
  { key: 'today', labelKey: 'common.today', fallbackEn: 'Today', getRange: () => ({ from: now(), to: now() }) },
  { key: 'yesterday', labelKey: 'common.yesterday', fallbackEn: 'Yesterday', getRange: () => { const d = subDays(now(), 1); return { from: d, to: d }; } },
  { key: '7d', labelKey: 'dashboard.last7days', fallbackEn: 'Last 7 days', getRange: () => ({ from: subDays(now(), 6), to: now() }) },
  { key: '14d', labelKey: 'dashboard.14days', fallbackEn: 'Last 14 days', getRange: () => ({ from: subDays(now(), 13), to: now() }) },
  { key: '28d', labelKey: 'dashboard.30days', fallbackEn: 'Last 28 days', getRange: () => ({ from: subDays(now(), 27), to: now() }) },
  { key: '30d', labelKey: 'dashboard.last30days', fallbackEn: 'Last 30 days', getRange: () => ({ from: subDays(now(), 29), to: now() }) },
  { key: 'this_week', labelKey: 'common.week', fallbackEn: 'This week', getRange: () => ({ from: startOfWeek(now(), { weekStartsOn: 1 }), to: now() }) },
  { key: 'last_week', labelKey: 'common.week', fallbackEn: 'Last week', getRange: () => { const lw = subDays(startOfWeek(now(), { weekStartsOn: 1 }), 7); return { from: lw, to: endOfWeek(lw, { weekStartsOn: 1 }) }; } },
  { key: 'this_month', labelKey: 'common.month', fallbackEn: 'This month', getRange: () => ({ from: startOfMonth(now()), to: now() }) },
  { key: 'last_month', labelKey: 'dashboard.lastMonth', fallbackEn: 'Last month', getRange: () => { const lm = subMonths(now(), 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; } },
  { key: 'this_quarter', labelKey: 'common.custom', fallbackEn: 'This quarter', getRange: () => ({ from: startOfQuarter(now()), to: now() }) },
  { key: 'last_quarter', labelKey: 'common.custom', fallbackEn: 'Last quarter', getRange: () => { const lq = subMonths(startOfQuarter(now()), 1); return { from: startOfQuarter(lq), to: endOfQuarter(lq) }; } },
  { key: 'this_year', labelKey: 'common.custom', fallbackEn: 'This year', getRange: () => ({ from: startOfYear(now()), to: now() }) },
  { key: 'last_year', labelKey: 'common.custom', fallbackEn: 'Last year', getRange: () => { const ly = subMonths(now(), 12); return { from: startOfYear(ly), to: endOfYear(ly) }; } },
  { key: 'custom', labelKey: 'common.custom', fallbackEn: 'Custom', getRange: () => ({ from: subDays(now(), 29), to: now() }) },
];

// Readable labels per key (not from translations since some are reused)
const presetLabels: Record<string, Record<PresetKey, string>> = {
  en: { today: 'Today', yesterday: 'Yesterday', '7d': 'Last 7 days', '14d': 'Last 14 days', '28d': 'Last 28 days', '30d': 'Last 30 days', this_week: 'This week', last_week: 'Last week', this_month: 'This month', last_month: 'Last month', this_quarter: 'This quarter', last_quarter: 'Last quarter', this_year: 'This year', last_year: 'Last year', custom: 'Custom' },
  ru: { today: 'Сегодня', yesterday: 'Вчера', '7d': 'Последние 7 дн.', '14d': 'Последние 14 дн.', '28d': 'Последние 28 дн.', '30d': 'Последние 30 дн.', this_week: 'Эта неделя', last_week: 'Прошлая неделя', this_month: 'Этот месяц', last_month: 'Прошлый месяц', this_quarter: 'Этот квартал', last_quarter: 'Прошлый квартал', this_year: 'Этот год', last_year: 'Прошлый год', custom: 'Мои настройки' },
  it: { today: 'Oggi', yesterday: 'Ieri', '7d': 'Ultimi 7 gg', '14d': 'Ultimi 14 gg', '28d': 'Ultimi 28 gg', '30d': 'Ultimi 30 gg', this_week: 'Questa settimana', last_week: 'Settimana scorsa', this_month: 'Questo mese', last_month: 'Mese scorso', this_quarter: 'Questo trimestre', last_quarter: 'Trimestre scorso', this_year: "Quest'anno", last_year: 'Anno scorso', custom: 'Personalizzato' },
  es: { today: 'Hoy', yesterday: 'Ayer', '7d': 'Últimos 7 días', '14d': 'Últimos 14 días', '28d': 'Últimos 28 días', '30d': 'Últimos 30 días', this_week: 'Esta semana', last_week: 'Semana pasada', this_month: 'Este mes', last_month: 'Mes pasado', this_quarter: 'Este trimestre', last_quarter: 'Trimestre pasado', this_year: 'Este año', last_year: 'Año pasado', custom: 'Personalizado' },
  ar: { today: 'اليوم', yesterday: 'أمس', '7d': 'آخر 7 أيام', '14d': 'آخر 14 يومًا', '28d': 'آخر 28 يومًا', '30d': 'آخر 30 يومًا', this_week: 'هذا الأسبوع', last_week: 'الأسبوع الماضي', this_month: 'هذا الشهر', last_month: 'الشهر الماضي', this_quarter: 'هذا الربع', last_quarter: 'الربع الماضي', this_year: 'هذا العام', last_year: 'العام الماضي', custom: 'مخصص' },
  fr: { today: "Aujourd'hui", yesterday: 'Hier', '7d': '7 derniers jours', '14d': '14 derniers jours', '28d': '28 derniers jours', '30d': '30 derniers jours', this_week: 'Cette semaine', last_week: 'Semaine dernière', this_month: 'Ce mois', last_month: 'Mois dernier', this_quarter: 'Ce trimestre', last_quarter: 'Trimestre dernier', this_year: 'Cette année', last_year: 'Année dernière', custom: 'Personnalisé' },
};

function toDateRange(key: PresetKey): DateRange {
  if (['today', '7d', '14d', '30d', '90d'].includes(key)) return key as DateRange;
  return 'custom';
}

export default function DateRangePicker({
  dateRange, onDateRangeChange,
  comparison, onComparisonChange,
  customDateRange, onCustomDateRangeChange,
  compareEnabled: externalCompareEnabled, onCompareEnabledChange,
}: Props) {
  const { language, t } = useLanguage();
  const isMobile = useIsMobile();
  const labels = presetLabels[language] || presetLabels.en;
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(
    dateRange === 'custom' ? 'custom' : (dateRange as PresetKey)
  );
  const [compareEnabled, setCompareEnabled] = useState(externalCompareEnabled ?? false);
  const [pickerRange, setPickerRange] = useState<DayPickerRange | undefined>(
    customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined
  );

  const displayLabel = useMemo(() => {
    if (dateRange === 'custom' && customDateRange) {
      return `${format(customDateRange.from, 'dd.MM.yy')} – ${format(customDateRange.to, 'dd.MM.yy')}`;
    }
    return labels[dateRange as PresetKey] || labels['30d'];
  }, [dateRange, customDateRange, labels]);

  const handlePresetClick = (preset: Preset) => {
    setSelectedPreset(preset.key);
    if (preset.key !== 'custom') {
      const range = preset.getRange();
      setPickerRange({ from: range.from, to: range.to });
    }
  };

  const handleApply = () => {
    if (selectedPreset === 'custom' && pickerRange?.from && pickerRange?.to) {
      onCustomDateRangeChange?.({ from: pickerRange.from, to: pickerRange.to });
      onDateRangeChange('custom');
    } else {
      const preset = presets.find(p => p.key === selectedPreset);
      if (preset) {
        const range = preset.getRange();
        onCustomDateRangeChange?.({ from: range.from, to: range.to });
        onDateRangeChange(toDateRange(selectedPreset));
      }
    }
    if (compareEnabled) {
      onComparisonChange(comparison === 'none' ? 'previous_period' : comparison);
    } else {
      onComparisonChange('none');
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setPickerRange(customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined);
    setOpen(false);
  };

  const currentPickerFrom = pickerRange?.from;
  const currentPickerTo = pickerRange?.to;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-medium gap-1.5 border-border/50"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="truncate max-w-[140px] sm:max-w-none">{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
        <div className={cn("flex", isMobile && "flex-col max-h-[80vh] overflow-y-auto")}>
          {/* Presets sidebar */}
          <div className={cn(
            "border-border py-2 overflow-y-auto",
            isMobile ? "w-full border-b flex flex-wrap gap-1 px-3 py-2" : "w-44 border-r max-h-[420px]"
          )}>
            {presets.map(preset => (
              <button
                key={preset.key}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'text-left text-xs transition-colors',
                  isMobile
                    ? cn('px-2.5 py-1.5 rounded-md', selectedPreset === preset.key ? 'text-primary font-semibold bg-primary/10' : 'text-foreground bg-secondary/50')
                    : cn('w-full px-4 py-1.5', selectedPreset === preset.key ? 'text-primary font-semibold bg-primary/5' : 'text-foreground hover:bg-secondary/50')
                )}
              >
                {isMobile ? (
                  labels[preset.key]
                ) : (
                  <span className="flex items-center gap-2">
                    <span className={cn(
                      'w-2.5 h-2.5 rounded-full border-2 flex-shrink-0',
                      selectedPreset === preset.key
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/40'
                    )} />
                    {labels[preset.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Calendar area */}
          <div className="flex flex-col">
            <Calendar
              mode="range"
              selected={pickerRange}
              onSelect={r => { setPickerRange(r); setSelectedPreset('custom'); }}
              numberOfMonths={isMobile ? 1 : 2}
              disabled={date => date > new Date()}
              className={cn("p-3 pointer-events-auto")}
              weekStartsOn={1}
            />

            {/* Compare + date display + actions */}
            <div className="px-3 sm:px-4 pb-3 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={compareEnabled}
                  onCheckedChange={(v) => {
                    const val = !!v;
                    setCompareEnabled(val);
                    onCompareEnabledChange?.(val);
                  }}
                  id="compare-check"
                />
                <label htmlFor="compare-check" className="text-xs cursor-pointer">
                  {t('dashboard.vsPreviousPeriod')}
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-1 bg-secondary/50 rounded text-foreground">
                    {currentPickerFrom ? format(currentPickerFrom, 'dd.MM.yy') : '—'}
                  </span>
                  <span>–</span>
                  <span className="px-2 py-1 bg-secondary/50 rounded text-foreground">
                    {currentPickerTo ? format(currentPickerTo, 'dd.MM.yy') : '—'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} className="h-7 text-xs">
                    {t('common.cancel')}
                  </Button>
                  <Button size="sm" onClick={handleApply} className="h-7 text-xs">
                    {t('dashboard.apply')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

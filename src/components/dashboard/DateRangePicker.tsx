import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import type { DateRange as DayPickerRange } from 'react-day-picker';
import type { DateRange, Comparison } from './dashboardData';
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
  'this_quarter' | 'last_quarter' | 'this_year' | 'last_year';

interface Preset {
  key: PresetKey;
  getRange: () => { from: Date; to: Date };
}

const now = () => new Date();

const presets: Preset[] = [
  { key: 'today', getRange: () => ({ from: now(), to: now() }) },
  { key: 'yesterday', getRange: () => { const d = subDays(now(), 1); return { from: d, to: d }; } },
  { key: '7d', getRange: () => ({ from: subDays(now(), 6), to: now() }) },
  { key: '14d', getRange: () => ({ from: subDays(now(), 13), to: now() }) },
  { key: '28d', getRange: () => ({ from: subDays(now(), 27), to: now() }) },
  { key: '30d', getRange: () => ({ from: subDays(now(), 29), to: now() }) },
  { key: 'this_week', getRange: () => ({ from: startOfWeek(now(), { weekStartsOn: 1 }), to: now() }) },
  { key: 'last_week', getRange: () => { const lw = subDays(startOfWeek(now(), { weekStartsOn: 1 }), 7); return { from: lw, to: endOfWeek(lw, { weekStartsOn: 1 }) }; } },
  { key: 'this_month', getRange: () => ({ from: startOfMonth(now()), to: now() }) },
  { key: 'last_month', getRange: () => { const lm = subMonths(now(), 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; } },
  { key: 'this_quarter', getRange: () => ({ from: startOfQuarter(now()), to: now() }) },
  { key: 'last_quarter', getRange: () => { const lq = subMonths(startOfQuarter(now()), 1); return { from: startOfQuarter(lq), to: endOfQuarter(lq) }; } },
  { key: 'this_year', getRange: () => ({ from: startOfYear(now()), to: now() }) },
  { key: 'last_year', getRange: () => { const ly = subMonths(now(), 12); return { from: startOfYear(ly), to: endOfYear(ly) }; } },
];

const presetLabels: Record<string, Record<PresetKey, string>> = {
  en: { today: 'Today', yesterday: 'Yesterday', '7d': 'Last 7 days', '14d': 'Last 14 days', '28d': 'Last 28 days', '30d': 'Last 30 days', this_week: 'This week', last_week: 'Last week', this_month: 'This month', last_month: 'Last month', this_quarter: 'This quarter', last_quarter: 'Last quarter', this_year: 'This year', last_year: 'Last year' },
  ru: { today: 'Сегодня', yesterday: 'Вчера', '7d': '7 дней', '14d': '14 дней', '28d': '28 дней', '30d': '30 дней', this_week: 'Эта неделя', last_week: 'Прошлая неделя', this_month: 'Этот месяц', last_month: 'Прошлый месяц', this_quarter: 'Этот квартал', last_quarter: 'Прошлый квартал', this_year: 'Этот год', last_year: 'Прошлый год' },
  it: { today: 'Oggi', yesterday: 'Ieri', '7d': '7 giorni', '14d': '14 giorni', '28d': '28 giorni', '30d': '30 giorni', this_week: 'Questa settimana', last_week: 'Scorsa settimana', this_month: 'Questo mese', last_month: 'Mese scorso', this_quarter: 'Questo trim.', last_quarter: 'Trim. scorso', this_year: "Quest'anno", last_year: 'Anno scorso' },
  es: { today: 'Hoy', yesterday: 'Ayer', '7d': '7 días', '14d': '14 días', '28d': '28 días', '30d': '30 días', this_week: 'Esta semana', last_week: 'Semana pasada', this_month: 'Este mes', last_month: 'Mes pasado', this_quarter: 'Este trim.', last_quarter: 'Trim. pasado', this_year: 'Este año', last_year: 'Año pasado' },
  ar: { today: 'اليوم', yesterday: 'أمس', '7d': '7 أيام', '14d': '14 يومًا', '28d': '28 يومًا', '30d': '30 يومًا', this_week: 'هذا الأسبوع', last_week: 'الأسبوع الماضي', this_month: 'هذا الشهر', last_month: 'الشهر الماضي', this_quarter: 'هذا الربع', last_quarter: 'الربع الماضي', this_year: 'هذا العام', last_year: 'العام الماضي' },
  fr: { today: "Aujourd'hui", yesterday: 'Hier', '7d': '7 jours', '14d': '14 jours', '28d': '28 jours', '30d': '30 jours', this_week: 'Cette semaine', last_week: 'Sem. dernière', this_month: 'Ce mois', last_month: 'Mois dernier', this_quarter: 'Ce trim.', last_quarter: 'Trim. dernier', this_year: 'Cette année', last_year: 'Année dern.' },
};

function toDateRange(key: PresetKey): DateRange {
  if (['today', '7d', '14d', '30d', '90d'].includes(key)) return key as DateRange;
  return 'custom';
}

export default function DateRangePicker({
  dateRange, onDateRangeChange,
  comparison, onComparisonChange,
  customDateRange, onCustomDateRangeChange,
}: Props) {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const labels = presetLabels[language] || presetLabels.en;
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | 'custom'>(
    dateRange === 'custom' ? 'custom' : (dateRange as PresetKey)
  );

  // FB-style: track click state for range selection
  // null = no click yet, Date = first click (start date selected, waiting for end)
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [pickerRange, setPickerRange] = useState<DayPickerRange | undefined>(
    customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined
  );

  const displayLabel = useMemo(() => {
    if (dateRange === 'custom' && customDateRange) {
      return `${format(customDateRange.from, 'dd.MM.yy')} – ${format(customDateRange.to, 'dd.MM.yy')}`;
    }
    return labels[dateRange as PresetKey] || labels['30d'];
  }, [dateRange, customDateRange, labels]);

  const applyRange = useCallback((from: Date, to: Date, presetKey: PresetKey | 'custom' = 'custom') => {
    onCustomDateRangeChange?.({ from, to });
    onDateRangeChange(presetKey === 'custom' ? 'custom' : toDateRange(presetKey));
    setPickerRange({ from, to });
    setSelectedPreset(presetKey);
    setRangeStart(null);
    setOpen(false);
  }, [onCustomDateRangeChange, onDateRangeChange]);

  const handlePresetClick = (preset: Preset) => {
    const range = preset.getRange();
    applyRange(range.from, range.to, preset.key);
  };

  // FB-style calendar click: 1 click = single date, 2nd click = range end
  const handleDayClick = (day: Date) => {
    if (!rangeStart) {
      // First click: set start
      setRangeStart(day);
      setPickerRange({ from: day, to: day });
      setSelectedPreset('custom');
    } else {
      // Second click: set end and apply
      const from = day < rangeStart ? day : rangeStart;
      const to = day < rangeStart ? rangeStart : day;
      applyRange(from, to, 'custom');
    }
  };

  const triggerButton = (
    <Button
      variant="outline"
      size="sm"
      className="h-8 px-3 text-xs font-medium gap-1.5 border-border/50"
    >
      <CalendarIcon className="h-3.5 w-3.5" />
      <span className="truncate max-w-[140px] sm:max-w-none">{displayLabel}</span>
    </Button>
  );

  const pickerContent = (
    <div className={cn("flex", isMobile ? "flex-col" : "")}>
      {/* Presets */}
      <div className={cn(
        "border-border py-2",
        isMobile
          ? "w-full border-b flex flex-wrap gap-1.5 px-3 py-3"
          : "w-40 border-r max-h-[380px] overflow-y-auto"
      )}>
        {presets.map(preset => (
          <button
            key={preset.key}
            onClick={() => handlePresetClick(preset)}
            className={cn(
              'text-left text-xs transition-colors',
              isMobile
                ? cn('px-3 py-1.5 rounded-lg border', selectedPreset === preset.key
                    ? 'text-primary font-semibold bg-primary/10 border-primary/30'
                    : 'text-foreground bg-secondary/50 border-transparent')
                : cn('w-full px-3 py-1.5', selectedPreset === preset.key
                    ? 'text-primary font-semibold bg-primary/5'
                    : 'text-foreground hover:bg-secondary/50')
            )}
          >
            {labels[preset.key]}
          </button>
        ))}
      </div>

      {/* Calendar area */}
      <div className="flex flex-col">
        <Calendar
          mode="range"
          selected={pickerRange}
          onSelect={() => {}} // We handle via onDayClick
          onDayClick={handleDayClick}
          numberOfMonths={isMobile ? 1 : 2}
          disabled={date => date > new Date()}
          className={cn("p-3 pointer-events-auto")}
          weekStartsOn={1}
        />

        {/* Status bar */}
        <div className="px-3 pb-3 flex items-center gap-2 text-xs text-muted-foreground">
          {rangeStart ? (
            <span className="text-primary font-medium">
              {format(rangeStart, 'dd.MM.yy')} → {language === 'ru' ? 'выберите конец периода' : 'select end date'}
            </span>
          ) : pickerRange?.from && pickerRange?.to ? (
            <span>
              {format(pickerRange.from, 'dd.MM.yy')} – {format(pickerRange.to, 'dd.MM.yy')}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {triggerButton}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {language === 'ru' ? 'Выберите период' : 'Select date range'}
            </SheetTitle>
          </SheetHeader>
          {pickerContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setRangeStart(null); }}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
        {pickerContent}
      </PopoverContent>
    </Popover>
  );
}

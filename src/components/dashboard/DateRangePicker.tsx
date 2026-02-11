import { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import type { DateRange as DayPickerRange } from 'react-day-picker';
import type { DateRange, Comparison } from './dashboardData';

interface Props {
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
  comparison: Comparison;
  onComparisonChange: (c: Comparison) => void;
  customDateRange?: { from: Date; to: Date };
  onCustomDateRangeChange?: (range: { from: Date; to: Date }) => void;
}

type PresetKey = 'today' | 'yesterday' | '7d' | '14d' | '28d' | '30d' |
  'this_week' | 'last_week' | 'this_month' | 'last_month' |
  'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';

interface Preset {
  key: PresetKey;
  labelRu: string;
  labelEn: string;
  getRange: () => { from: Date; to: Date };
}

const now = () => new Date();

const presets: Preset[] = [
  { key: 'today', labelRu: 'Сегодня', labelEn: 'Today', getRange: () => ({ from: now(), to: now() }) },
  { key: 'yesterday', labelRu: 'Вчера', labelEn: 'Yesterday', getRange: () => { const d = subDays(now(), 1); return { from: d, to: d }; } },
  { key: '7d', labelRu: 'Последние 7 дн.', labelEn: 'Last 7 days', getRange: () => ({ from: subDays(now(), 6), to: now() }) },
  { key: '14d', labelRu: 'Последние 14 дн.', labelEn: 'Last 14 days', getRange: () => ({ from: subDays(now(), 13), to: now() }) },
  { key: '28d', labelRu: 'Последние 28 дн.', labelEn: 'Last 28 days', getRange: () => ({ from: subDays(now(), 27), to: now() }) },
  { key: '30d', labelRu: 'Последние 30 дн.', labelEn: 'Last 30 days', getRange: () => ({ from: subDays(now(), 29), to: now() }) },
  { key: 'this_week', labelRu: 'Эта неделя', labelEn: 'This week', getRange: () => ({ from: startOfWeek(now(), { weekStartsOn: 1 }), to: now() }) },
  { key: 'last_week', labelRu: 'Прошлая неделя', labelEn: 'Last week', getRange: () => { const lw = subDays(startOfWeek(now(), { weekStartsOn: 1 }), 7); return { from: lw, to: endOfWeek(lw, { weekStartsOn: 1 }) }; } },
  { key: 'this_month', labelRu: 'Этот месяц', labelEn: 'This month', getRange: () => ({ from: startOfMonth(now()), to: now() }) },
  { key: 'last_month', labelRu: 'Прошлый месяц', labelEn: 'Last month', getRange: () => { const lm = subMonths(now(), 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; } },
  { key: 'this_quarter', labelRu: 'Этот квартал', labelEn: 'This quarter', getRange: () => ({ from: startOfQuarter(now()), to: now() }) },
  { key: 'last_quarter', labelRu: 'Прошлый квартал', labelEn: 'Last quarter', getRange: () => { const lq = subMonths(startOfQuarter(now()), 1); return { from: startOfQuarter(lq), to: endOfQuarter(lq) }; } },
  { key: 'this_year', labelRu: 'Этот год', labelEn: 'This year', getRange: () => ({ from: startOfYear(now()), to: now() }) },
  { key: 'last_year', labelRu: 'Прошлый год', labelEn: 'Last year', getRange: () => { const ly = subMonths(now(), 12); return { from: startOfYear(ly), to: endOfYear(ly) }; } },
  { key: 'custom', labelRu: 'Мои настройки', labelEn: 'Custom', getRange: () => ({ from: subDays(now(), 29), to: now() }) },
];

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
  const isRu = language === 'ru';
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(
    dateRange === 'custom' ? 'custom' : (dateRange as PresetKey)
  );
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [pickerRange, setPickerRange] = useState<DayPickerRange | undefined>(
    customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined
  );

  const displayLabel = useMemo(() => {
    if (dateRange === 'custom' && customDateRange) {
      return `${format(customDateRange.from, 'dd.MM.yy')} – ${format(customDateRange.to, 'dd.MM.yy')}`;
    }
    const preset = presets.find(p => p.key === dateRange);
    return preset ? (isRu ? preset.labelRu : preset.labelEn) : (isRu ? 'Последние 30 дн.' : 'Last 30 days');
  }, [dateRange, customDateRange, isRu]);

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
      onComparisonChange(comparison);
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
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
        <div className="flex">
          {/* Presets sidebar */}
          <div className="w-44 border-r border-border py-2 max-h-[420px] overflow-y-auto">
            {presets.map(preset => (
              <button
                key={preset.key}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'w-full text-left px-4 py-1.5 text-xs transition-colors',
                  selectedPreset === preset.key
                    ? 'text-primary font-semibold bg-primary/5'
                    : 'text-foreground hover:bg-secondary/50'
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn(
                    'w-2.5 h-2.5 rounded-full border-2 flex-shrink-0',
                    selectedPreset === preset.key
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40'
                  )} />
                  {isRu ? preset.labelRu : preset.labelEn}
                </span>
              </button>
            ))}
          </div>

          {/* Calendar area */}
          <div className="flex flex-col">
            <Calendar
              mode="range"
              selected={pickerRange}
              onSelect={r => { setPickerRange(r); setSelectedPreset('custom'); }}
              numberOfMonths={2}
              disabled={date => date > new Date()}
              className={cn("p-3 pointer-events-auto")}
              weekStartsOn={1}
            />

            {/* Compare + date display + actions */}
            <div className="px-4 pb-3 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={compareEnabled}
                  onCheckedChange={(v) => setCompareEnabled(!!v)}
                  id="compare-check"
                />
                <label htmlFor="compare-check" className="text-xs cursor-pointer">
                  {isRu ? 'Сравнить' : 'Compare'}
                </label>
              </div>

              <div className="flex items-center justify-between gap-3">
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
                    {isRu ? 'Отмена' : 'Cancel'}
                  </Button>
                  <Button size="sm" onClick={handleApply} className="h-7 text-xs">
                    {isRu ? 'Обновить' : 'Update'}
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

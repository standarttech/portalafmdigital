import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange, Comparison, PlatformFilter } from './dashboardData';
import DateRangePicker from './DateRangePicker';

interface Props {
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
  comparison: Comparison;
  onComparisonChange: (c: Comparison) => void;
  platform: PlatformFilter;
  onPlatformChange: (p: PlatformFilter) => void;
  search?: string;
  onSearchChange?: (s: string) => void;
  customDateRange?: { from: Date; to: Date };
  onCustomDateRangeChange?: (range: { from: Date; to: Date }) => void;
  compareEnabled?: boolean;
  onCompareEnabledChange?: (enabled: boolean) => void;
  // kept for backward compat but no longer used by DateRangePicker
}

const platformOptions: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: '' },
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
  { value: 'tiktok', label: 'TikTok' },
];

export default function DashboardControls({
  dateRange, onDateRangeChange,
  comparison, onComparisonChange,
  platform, onPlatformChange,
  search, onSearchChange,
  customDateRange, onCustomDateRangeChange,
  compareEnabled, onCompareEnabledChange,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-background/95 backdrop-blur-lg border-b border-border/50 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3">
      {/* Date Range Picker */}
      <DateRangePicker
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        comparison={comparison}
        onComparisonChange={onComparisonChange}
        customDateRange={customDateRange}
        onCustomDateRangeChange={onCustomDateRangeChange}
        compareEnabled={compareEnabled}
        onCompareEnabledChange={onCompareEnabledChange}
      />

      {/* Search (optional) */}
      {onSearchChange && (
        <div className="relative ml-auto lg:ml-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t('common.search') + '...'}
            className="h-7 w-40 pl-8 text-xs bg-secondary/50 border-border/50"
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}

      {/* Platform Filter */}
      <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5 overflow-x-auto max-w-full scrollbar-none sm:ml-auto">
        {platformOptions.map((opt) => (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            onClick={() => onPlatformChange(opt.value)}
            className={cn(
              'h-7 px-2.5 text-xs font-medium rounded-md transition-all',
              platform === opt.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.value === 'all' ? t('dashboard.allPlatforms') : opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

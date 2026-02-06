import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, GitCompareArrows, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange, Comparison, PlatformFilter } from './dashboardData';
import type { TranslationKey } from '@/i18n/translations';

interface Props {
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
  comparison: Comparison;
  onComparisonChange: (c: Comparison) => void;
  platform: PlatformFilter;
  onPlatformChange: (p: PlatformFilter) => void;
  search?: string;
  onSearchChange?: (s: string) => void;
}

const dateRangeOptions: { value: DateRange; key: TranslationKey }[] = [
  { value: 'today', key: 'dashboard.today' },
  { value: '7d', key: 'dashboard.7days' },
  { value: '14d', key: 'dashboard.14days' },
  { value: '30d', key: 'dashboard.30days' },
  { value: '90d', key: 'dashboard.90days' },
];

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
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-background/80 backdrop-blur-lg border-b border-border/50 flex flex-wrap items-center gap-3">
      {/* Date Range */}
      <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5">
        {dateRangeOptions.map((opt) => (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            onClick={() => onDateRangeChange(opt.value)}
            className={cn(
              'h-7 px-2.5 text-xs font-medium rounded-md transition-all',
              dateRange === opt.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(opt.key)}
          </Button>
        ))}
      </div>

      {/* Comparison */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-border/50">
            <GitCompareArrows className="h-3 w-3" />
            <span className="hidden sm:inline">
              {comparison === 'previous_period' ? t('dashboard.vsPreviousPeriod') : t('dashboard.vsPreviousMonth')}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onComparisonChange('previous_period')}>
            {t('dashboard.vsPreviousPeriod')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onComparisonChange('previous_month')}>
            {t('dashboard.vsPreviousMonth')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
      <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5 ml-auto">
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

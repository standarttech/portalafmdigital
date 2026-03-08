import { Button } from '@/components/ui/button';
import { subDays, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

const presets: { label: string; range: () => DateRange }[] = [
  { label: 'Last 7 days', range: () => ({ from: subDays(new Date(), 7), to: new Date(), label: 'Last 7 days' }) },
  { label: 'Last 30 days', range: () => ({ from: subDays(new Date(), 30), to: new Date(), label: 'Last 30 days' }) },
  { label: 'This month', range: () => ({ from: startOfMonth(new Date()), to: new Date(), label: 'This month' }) },
  { label: 'Previous month', range: () => {
    const prev = subMonths(new Date(), 1);
    return { from: startOfMonth(prev), to: endOfMonth(prev), label: 'Previous month' };
  }},
];

interface Props {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
}

export default function PortalDateFilter({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Button size="sm" variant={!value ? 'default' : 'outline'} onClick={() => onChange(null)} className="text-xs h-7 px-2.5">
        All time
      </Button>
      {presets.map(p => {
        const active = value?.label === p.label;
        return (
          <Button key={p.label} size="sm" variant={active ? 'default' : 'outline'} onClick={() => onChange(p.range())} className="text-xs h-7 px-2.5">
            {p.label}
          </Button>
        );
      })}
      {value && (
        <span className="text-[10px] text-muted-foreground ml-1">
          {format(value.from, 'MMM d')} – {format(value.to, 'MMM d, yyyy')}
        </span>
      )}
    </div>
  );
}

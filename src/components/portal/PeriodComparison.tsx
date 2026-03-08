import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface ComparisonMetric {
  label: string;
  current: number;
  previous: number;
  prefix?: string;
  format?: 'number' | 'currency';
}

interface Props {
  metrics: ComparisonMetric[];
  previousLabel: string;
}

function formatVal(val: number, fmt?: 'number' | 'currency', prefix?: string): string {
  if (fmt === 'currency') return `${prefix || '$'}${val.toFixed(0)}`;
  return val.toLocaleString();
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> No change</span>;
  if (previous === 0) return <span className="text-[10px] text-emerald-500 flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" /> New</span>;

  const delta = ((current - previous) / previous) * 100;
  const isUp = delta > 0;
  const isFlat = Math.abs(delta) < 0.5;

  if (isFlat) return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> ~0%</span>;

  return (
    <span className={`text-[10px] flex items-center gap-0.5 ${isUp ? 'text-emerald-500' : 'text-destructive'}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {isUp ? '+' : ''}{delta.toFixed(1)}%
    </span>
  );
}

export default function PeriodComparison({ metrics, previousLabel }: Props) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <p className="text-[10px] text-muted-foreground font-medium">vs {previousLabel}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="text-center space-y-0.5">
            <p className="text-sm font-bold text-foreground">{formatVal(m.current, m.format, m.prefix)}</p>
            <DeltaBadge current={m.current} previous={m.previous} />
            <p className="text-[9px] text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

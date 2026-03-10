import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface SparklineCardProps {
  label: string;
  value: string;
  data: number[];
  color?: string;
  trend?: 'up' | 'down' | 'flat';
  icon?: React.ReactNode;
  className?: string;
}

export default function SparklineCard({
  label, value, data, color = 'hsl(var(--primary))', trend, icon, className,
}: SparklineCardProps) {
  const sparkData = data.map((v, i) => ({ i, v }));
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={cn('kpi-card py-3 px-3 sm:py-4 sm:px-4 relative overflow-hidden', className)}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <div className="text-primary flex-shrink-0">{icon}</div>}
        <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <p className={cn('text-base sm:text-lg font-bold text-foreground truncate', trendColor !== 'text-muted-foreground' && trendColor)}>
        {value}
      </p>
      {data.length > 1 && (
        <div className="absolute bottom-0 right-0 w-[60%] h-[40px] opacity-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`spark-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} fill={`url(#spark-${label.replace(/\s/g, '')})`} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

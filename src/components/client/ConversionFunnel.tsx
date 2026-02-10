import { useMemo, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, MousePointerClick, Users, ShoppingBag, ShoppingCart, CreditCard, Pencil, Check, X } from 'lucide-react';
import type { TranslationKey } from '@/i18n/translations';
import type { ClientCategory } from '@/components/dashboard/categoryMetrics';

interface FunnelStep {
  key: string;
  labelKey: TranslationKey;
  icon: typeof Eye;
  color: string;
}

// Funnel steps per category
const CATEGORY_FUNNEL_STEPS: Record<ClientCategory, FunnelStep[]> = {
  ecom: [
    { key: 'impressions', labelKey: 'metric.impressions', icon: Eye, color: 'hsl(217, 91%, 60%)' },
    { key: 'clicks', labelKey: 'metric.clicks', icon: MousePointerClick, color: 'hsl(42, 87%, 55%)' },
    { key: 'addToCart', labelKey: 'metric.addToCart', icon: ShoppingCart, color: 'hsl(280, 65%, 60%)' },
    { key: 'checkouts', labelKey: 'metric.checkouts', icon: CreditCard, color: 'hsl(200, 70%, 50%)' },
    { key: 'purchases', labelKey: 'metric.purchases', icon: ShoppingBag, color: 'hsl(160, 84%, 39%)' },
  ],
  info_product: [
    { key: 'impressions', labelKey: 'metric.impressions', icon: Eye, color: 'hsl(217, 91%, 60%)' },
    { key: 'clicks', labelKey: 'metric.clicks', icon: MousePointerClick, color: 'hsl(42, 87%, 55%)' },
    { key: 'leads', labelKey: 'metric.leads', icon: Users, color: 'hsl(160, 84%, 39%)' },
    { key: 'purchases', labelKey: 'metric.purchases', icon: ShoppingBag, color: 'hsl(280, 65%, 60%)' },
  ],
  saas: [
    { key: 'impressions', labelKey: 'metric.impressions', icon: Eye, color: 'hsl(217, 91%, 60%)' },
    { key: 'clicks', labelKey: 'metric.clicks', icon: MousePointerClick, color: 'hsl(42, 87%, 55%)' },
    { key: 'leads', labelKey: 'metric.leads', icon: Users, color: 'hsl(160, 84%, 39%)' },
    { key: 'purchases', labelKey: 'metric.purchases', icon: ShoppingBag, color: 'hsl(280, 65%, 60%)' },
  ],
  online_business: [
    { key: 'impressions', labelKey: 'metric.impressions', icon: Eye, color: 'hsl(217, 91%, 60%)' },
    { key: 'clicks', labelKey: 'metric.clicks', icon: MousePointerClick, color: 'hsl(42, 87%, 55%)' },
    { key: 'leads', labelKey: 'metric.leads', icon: Users, color: 'hsl(160, 84%, 39%)' },
  ],
  local_business: [
    { key: 'impressions', labelKey: 'metric.impressions', icon: Eye, color: 'hsl(217, 91%, 60%)' },
    { key: 'clicks', labelKey: 'metric.clicks', icon: MousePointerClick, color: 'hsl(42, 87%, 55%)' },
    { key: 'leads', labelKey: 'metric.leads', icon: Users, color: 'hsl(160, 84%, 39%)' },
  ],
  real_estate: [
    { key: 'impressions', labelKey: 'metric.impressions', icon: Eye, color: 'hsl(217, 91%, 60%)' },
    { key: 'clicks', labelKey: 'metric.clicks', icon: MousePointerClick, color: 'hsl(42, 87%, 55%)' },
    { key: 'leads', labelKey: 'metric.leads', icon: Users, color: 'hsl(160, 84%, 39%)' },
  ],
  other: [
    { key: 'impressions', labelKey: 'metric.impressions', icon: Eye, color: 'hsl(217, 91%, 60%)' },
    { key: 'clicks', labelKey: 'metric.clicks', icon: MousePointerClick, color: 'hsl(42, 87%, 55%)' },
    { key: 'leads', labelKey: 'metric.leads', icon: Users, color: 'hsl(160, 84%, 39%)' },
  ],
};

interface Props {
  category: ClientCategory;
  metrics: Record<string, number>;
  onOverride?: (overrides: Record<string, number>) => void;
}

export default function ConversionFunnel({ category, metrics, onOverride }: Props) {
  const { t, formatNumber } = useLanguage();
  const { agencyRole } = useAuth();
  const isAdmin = agencyRole === 'AgencyAdmin';
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const steps = CATEGORY_FUNNEL_STEPS[category] || CATEGORY_FUNNEL_STEPS.other;

  const stepsWithValues = useMemo(() =>
    steps.map(s => ({ ...s, value: metrics[s.key] || 0 })),
    [steps, metrics]
  );

  const maxVal = Math.max(...stepsWithValues.map(s => s.value), 1);

  const startEdit = () => {
    const vals: Record<string, string> = {};
    stepsWithValues.forEach(s => { vals[s.key] = String(s.value); });
    setEditValues(vals);
    setEditing(true);
  };

  const saveEdit = () => {
    const overrides: Record<string, number> = {};
    Object.entries(editValues).forEach(([k, v]) => {
      const num = parseInt(v) || 0;
      if (num !== (metrics[k] || 0)) overrides[k] = num;
    });
    onOverride?.(overrides);
    setEditing(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-semibold">{t('funnel.title' as TranslationKey)}</CardTitle>
          {isAdmin && onOverride && !editing && (
            <Button variant="ghost" size="sm" onClick={startEdit} className="h-7 w-7 p-0">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
          {editing && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={saveEdit} className="h-7 w-7 p-0 text-success">
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="h-7 w-7 p-0 text-destructive">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {stepsWithValues.map((step, idx) => {
          const prevVal = idx > 0 ? stepsWithValues[idx - 1].value : 0;
          const convRate = prevVal > 0 ? ((step.value / prevVal) * 100).toFixed(1) : null;
          const barWidth = Math.max((step.value / maxVal) * 100, 4);
          const Icon = step.icon;

          return (
            <div key={step.key}>
              {idx > 0 && convRate && (
                <div className="flex items-center justify-center my-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>↓</span>
                    <span className="font-semibold text-foreground">{convRate}%</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-24 sm:w-28 flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: step.color }} />
                  <span className="text-xs text-muted-foreground truncate">{t(step.labelKey)}</span>
                </div>
                {editing ? (
                  <Input
                    type="number"
                    value={editValues[step.key] || ''}
                    onChange={(e) => setEditValues(prev => ({ ...prev, [step.key]: e.target.value }))}
                    className="h-7 text-xs flex-1"
                  />
                ) : (
                  <div className="flex-1 h-7 bg-secondary/30 rounded-md overflow-hidden relative">
                    <div
                      className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                      style={{ width: `${barWidth}%`, backgroundColor: step.color, opacity: 0.85 }}
                    >
                      <span className="text-[10px] font-bold text-white whitespace-nowrap">
                        {formatNumber(step.value)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

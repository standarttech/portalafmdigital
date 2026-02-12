import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { Calculator, Plus, Trash2, RotateCcw, TrendingUp, TrendingDown, DollarSign, Target, Percent, ArrowRight, Copy, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface FunnelStep {
  id: string;
  name: string;
  conversionRate: number;
}

const PRESETS: Record<string, { name: string; icon: string; steps: Omit<FunnelStep, 'id'>[] }> = {
  lead_gen: {
    name: 'Lead Generation',
    icon: '📋',
    steps: [
      { name: 'Impressions', conversionRate: 100 },
      { name: 'Clicks', conversionRate: 2 },
      { name: 'Leads', conversionRate: 5 },
      { name: 'Qualified Leads', conversionRate: 30 },
      { name: 'Sales', conversionRate: 20 },
    ],
  },
  ecom: {
    name: 'E-Commerce',
    icon: '🛒',
    steps: [
      { name: 'Impressions', conversionRate: 100 },
      { name: 'Clicks', conversionRate: 2 },
      { name: 'Add to Cart', conversionRate: 10 },
      { name: 'Checkouts', conversionRate: 50 },
      { name: 'Purchases', conversionRate: 60 },
    ],
  },
  info_product: {
    name: 'Info Product / Webinar',
    icon: '🎓',
    steps: [
      { name: 'Impressions', conversionRate: 100 },
      { name: 'Clicks', conversionRate: 2 },
      { name: 'Registrations', conversionRate: 15 },
      { name: 'Webinar Visits', conversionRate: 40 },
      { name: 'Sales', conversionRate: 10 },
    ],
  },
  saas: {
    name: 'SaaS / App',
    icon: '💻',
    steps: [
      { name: 'Impressions', conversionRate: 100 },
      { name: 'Clicks', conversionRate: 1.5 },
      { name: 'Sign Ups', conversionRate: 8 },
      { name: 'Trial Users', conversionRate: 60 },
      { name: 'Paid Users', conversionRate: 15 },
    ],
  },
};

let stepIdCounter = 0;
const genId = () => `step-${++stepIdCounter}`;

export default function DecompositionPage() {
  const { t, formatCurrency, formatNumber } = useLanguage();

  const [budget, setBudget] = useState(5000);
  const [avgCheck, setAvgCheck] = useState(100);
  const [cpm, setCpm] = useState(5);
  const [preset, setPreset] = useState<string>('lead_gen');
  const [steps, setSteps] = useState<FunnelStep[]>(
    PRESETS.lead_gen.steps.map(s => ({ ...s, id: genId() }))
  );
  const [mode, setMode] = useState<'forward' | 'reverse'>('forward');
  const [targetSales, setTargetSales] = useState(50);

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    setPreset(key);
    stepIdCounter = 0;
    setSteps(p.steps.map(s => ({ ...s, id: genId() })));
  };

  const updateStep = (id: string, field: 'name' | 'conversionRate', val: string | number) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const addStep = () => {
    setSteps(prev => [...prev, { id: genId(), name: 'New Step', conversionRate: 10 }]);
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  // Forward: budget → impressions → funnel
  const forwardCalc = useMemo(() => {
    if (steps.length === 0) return [];
    const impressions = Math.round((budget / cpm) * 1000);
    const result: Array<{ name: string; value: number; costPer: number; rate: number }> = [];
    let currentValue = impressions;

    for (let i = 0; i < steps.length; i++) {
      if (i === 0) currentValue = impressions;
      else currentValue = Math.round(currentValue * (steps[i].conversionRate / 100));
      result.push({
        name: steps[i].name,
        value: currentValue,
        costPer: currentValue > 0 ? budget / currentValue : 0,
        rate: steps[i].conversionRate,
      });
    }
    return result;
  }, [steps, budget, cpm]);

  // Reverse: target sales → required budget
  const reverseCalc = useMemo(() => {
    if (steps.length < 2) return { requiredBudget: 0, steps: [] };
    const result: Array<{ name: string; value: number; rate: number }> = [];
    
    // Work backwards from target
    let values: number[] = new Array(steps.length);
    values[steps.length - 1] = targetSales;
    for (let i = steps.length - 2; i >= 0; i--) {
      const nextRate = steps[i + 1].conversionRate / 100;
      values[i] = nextRate > 0 ? Math.ceil(values[i + 1] / nextRate) : 0;
    }
    
    const requiredBudget = Math.round(values[0] * cpm / 1000);
    for (let i = 0; i < steps.length; i++) {
      result.push({ name: steps[i].name, value: values[i], rate: steps[i].conversionRate });
    }
    return { requiredBudget, steps: result };
  }, [steps, targetSales, cpm]);

  const lastStep = forwardCalc[forwardCalc.length - 1];
  const revenue = lastStep ? lastStep.value * avgCheck : 0;
  const profit = revenue - budget;
  const roas = budget > 0 ? revenue / budget : 0;
  const roi = budget > 0 ? ((revenue - budget) / budget) * 100 : 0;

  const reverseRevenue = targetSales * avgCheck;
  const reverseProfit = reverseRevenue - reverseCalc.requiredBudget;
  const reverseRoas = reverseCalc.requiredBudget > 0 ? reverseRevenue / reverseCalc.requiredBudget : 0;

  const copyToClipboard = useCallback(() => {
    const isForward = mode === 'forward';
    const data = isForward ? forwardCalc : reverseCalc.steps;
    const b = isForward ? budget : reverseCalc.requiredBudget;
    const rev = isForward ? revenue : reverseRevenue;
    const prof = isForward ? profit : reverseProfit;
    const r = isForward ? roas : reverseRoas;

    let text = `Decomposition (${PRESETS[preset]?.name || 'Custom'})\n`;
    text += `Budget: $${b.toLocaleString()}\n\n`;
    data.forEach((s, i) => {
      text += `${i + 1}. ${s.name}: ${s.value.toLocaleString()}${i > 0 ? ` (${s.rate}%)` : ''}\n`;
    });
    text += `\nRevenue: $${rev.toLocaleString()}\nProfit: $${prof.toLocaleString()}\nROAS: ${r.toFixed(2)}x`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, [mode, forwardCalc, reverseCalc, budget, revenue, profit, roas, reverseRevenue, reverseProfit, reverseRoas, preset]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Calculator className="h-6 w-6 text-primary" />
            {t('decomposition.title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t('decomposition.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={copyToClipboard}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
      </motion.div>

      {/* Mode Tabs */}
      <motion.div variants={item}>
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'forward' | 'reverse')}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="forward" className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Budget → Result
            </TabsTrigger>
            <TabsTrigger value="reverse" className="gap-1.5">
              <Target className="h-3.5 w-3.5" /> Target → Budget
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Settings Grid */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Preset */}
        <div className="space-y-1.5 col-span-2 sm:col-span-1 lg:col-span-2">
          <Label className="text-[11px] text-muted-foreground">Funnel Preset</Label>
          <Select value={preset} onValueChange={applyPreset}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRESETS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.icon} {v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CPM */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">CPM ($)</Label>
          <Input type="number" step="0.5" value={cpm} onChange={e => setCpm(Number(e.target.value))} className="h-9" />
        </div>

        {/* Avg Check */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Avg. Check ($)</Label>
          <Input type="number" value={avgCheck} onChange={e => setAvgCheck(Number(e.target.value))} className="h-9" />
        </div>

        {mode === 'forward' ? (
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Budget ($)</Label>
            <Input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} className="h-9" />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Target Sales</Label>
            <Input type="number" value={targetSales} onChange={e => setTargetSales(Number(e.target.value))} className="h-9" />
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <Button variant="outline" size="sm" className="gap-1 h-9" onClick={addStep}>
            <Plus className="h-3.5 w-3.5" /> Step
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 h-9" onClick={() => applyPreset(preset)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>

      {/* Funnel Visualization */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-border/50">
          <CardContent className="p-0">
            <div className="p-3 border-b border-border/50 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversion Funnel</span>
              <span className="text-[10px] text-muted-foreground">{steps.length} steps</span>
            </div>
            <div className="divide-y divide-border/30">
              {(mode === 'forward' ? forwardCalc : reverseCalc.steps).map((step, i) => {
                const isFirst = i === 0;
                const isLast = i === (mode === 'forward' ? forwardCalc : reverseCalc.steps).length - 1;
                const stepData = steps[i];
                // Width for funnel bar
                const maxVal = (mode === 'forward' ? forwardCalc : reverseCalc.steps)[0]?.value || 1;
                const widthPercent = Math.max(8, (step.value / maxVal) * 100);
                
                return (
                  <div key={stepData?.id || i} className="flex items-center gap-3 px-4 py-3 group hover:bg-secondary/20 transition-colors">
                    {/* Step number */}
                    <div className={cn(
                      'h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                      isLast ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                    )}>
                      {i + 1}
                    </div>

                    {/* Name (editable) */}
                    <div className="w-32 sm:w-40 flex-shrink-0">
                      <Input
                        value={stepData?.name || step.name}
                        onChange={e => stepData && updateStep(stepData.id, 'name', e.target.value)}
                        className="h-7 text-xs border-none bg-transparent p-0 focus-visible:ring-0 font-medium"
                      />
                    </div>

                    {/* Conversion rate */}
                    <div className="w-20 flex-shrink-0">
                      {isFirst ? (
                        <span className="text-[10px] text-muted-foreground/50">—</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Slider
                            value={[stepData?.conversionRate || 0]}
                            onValueChange={([v]) => stepData && updateStep(stepData.id, 'conversionRate', v)}
                            max={100}
                            min={0.1}
                            step={0.1}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            step="0.1"
                            value={stepData?.conversionRate || 0}
                            onChange={e => stepData && updateStep(stepData.id, 'conversionRate', Number(e.target.value))}
                            className="h-6 w-14 text-[10px] text-right border-none bg-transparent p-0 focus-visible:ring-0"
                          />
                          <span className="text-[10px] text-muted-foreground">%</span>
                        </div>
                      )}
                    </div>

                    {/* Visual bar + value */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-6 bg-secondary/30 rounded overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded transition-all duration-500 flex items-center px-2',
                              isLast ? 'bg-primary/25' : 'bg-primary/10'
                            )}
                            style={{ width: `${widthPercent}%` }}
                          >
                            <span className="text-[11px] font-mono font-semibold text-foreground whitespace-nowrap">
                              {formatNumber(step.value)}
                            </span>
                          </div>
                        </div>
                        {mode === 'forward' && 'costPer' in step && (
                          <span className="text-[10px] text-muted-foreground font-mono w-16 text-right flex-shrink-0">
                            {formatCurrency((step as any).costPer)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    {steps.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => stepData && removeStep(stepData.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard
          label={mode === 'forward' ? 'Budget' : 'Required Budget'}
          value={formatCurrency(mode === 'forward' ? budget : reverseCalc.requiredBudget)}
          icon={DollarSign}
        />
        <SummaryCard
          label="Revenue"
          value={formatCurrency(mode === 'forward' ? revenue : reverseRevenue)}
          color="text-success"
          icon={TrendingUp}
        />
        <SummaryCard
          label="Profit"
          value={formatCurrency(mode === 'forward' ? profit : reverseProfit)}
          color={(mode === 'forward' ? profit : reverseProfit) >= 0 ? 'text-success' : 'text-destructive'}
          icon={(mode === 'forward' ? profit : reverseProfit) >= 0 ? TrendingUp : TrendingDown}
        />
        <SummaryCard
          label="ROAS"
          value={`${(mode === 'forward' ? roas : reverseRoas).toFixed(2)}x`}
          color={(mode === 'forward' ? roas : reverseRoas) >= 1 ? 'text-success' : 'text-destructive'}
          icon={Target}
        />
        <SummaryCard
          label="ROI"
          value={`${(mode === 'forward' ? roi : ((reverseRevenue - reverseCalc.requiredBudget) / (reverseCalc.requiredBudget || 1) * 100)).toFixed(0)}%`}
          color={(mode === 'forward' ? roi : ((reverseRevenue - reverseCalc.requiredBudget) / (reverseCalc.requiredBudget || 1) * 100)) >= 0 ? 'text-success' : 'text-destructive'}
          icon={Percent}
        />
      </motion.div>
    </motion.div>
  );
}

function SummaryCard({ label, value, color, icon: Icon }: {
  label: string;
  value: string;
  color?: string;
  icon: any;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-secondary/50', color || 'text-foreground')}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={cn('text-lg font-bold truncate', color || 'text-foreground')}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

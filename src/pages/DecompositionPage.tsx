import { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { Calculator, Plus, Trash2, Download, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface FunnelStep {
  id: string;
  name: string;
  value: number;
  conversionRate: number; // % from previous step
}

const PRESETS = {
  lead_gen: {
    name: 'Lead Generation',
    steps: [
      { name: 'Impressions', value: 100000, conversionRate: 100 },
      { name: 'Clicks', value: 2000, conversionRate: 2 },
      { name: 'Leads', value: 100, conversionRate: 5 },
      { name: 'Sales', value: 10, conversionRate: 10 },
    ],
  },
  ecom: {
    name: 'E-Commerce',
    steps: [
      { name: 'Impressions', value: 200000, conversionRate: 100 },
      { name: 'Clicks', value: 4000, conversionRate: 2 },
      { name: 'Add to Cart', value: 400, conversionRate: 10 },
      { name: 'Checkouts', value: 200, conversionRate: 50 },
      { name: 'Purchases', value: 120, conversionRate: 60 },
    ],
  },
  info_product: {
    name: 'Info Product',
    steps: [
      { name: 'Impressions', value: 150000, conversionRate: 100 },
      { name: 'Clicks', value: 3000, conversionRate: 2 },
      { name: 'Registrations', value: 450, conversionRate: 15 },
      { name: 'Webinar Visits', value: 180, conversionRate: 40 },
      { name: 'Sales', value: 18, conversionRate: 10 },
    ],
  },
};

let stepIdCounter = 0;
const genId = () => `step-${++stepIdCounter}`;

export default function DecompositionPage() {
  const { t, formatCurrency, formatNumber } = useLanguage();

  const [budget, setBudget] = useState(5000);
  const [avgCheck, setAvgCheck] = useState(100);
  const [preset, setPreset] = useState<string>('lead_gen');
  const [steps, setSteps] = useState<FunnelStep[]>(
    PRESETS.lead_gen.steps.map(s => ({ ...s, id: genId() }))
  );

  const applyPreset = (key: string) => {
    const p = PRESETS[key as keyof typeof PRESETS];
    if (!p) return;
    setPreset(key);
    stepIdCounter = 0;
    setSteps(p.steps.map(s => ({ ...s, id: genId() })));
  };

  const updateStep = (id: string, field: 'name' | 'conversionRate', val: string | number) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const addStep = () => {
    setSteps(prev => [...prev, { id: genId(), name: 'New Step', value: 0, conversionRate: 10 }]);
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  // Recalculate funnel from budget
  const calculatedSteps = useMemo(() => {
    if (steps.length === 0) return [];

    // Start from impressions based on CPM estimate
    const cpm = steps.length > 1 && steps[0].value > 0 ? (budget / (steps[0].value / 1000)) : 5;
    const impressions = Math.round((budget / cpm) * 1000);

    const result: Array<FunnelStep & { costPer: number }> = [];
    let currentValue = impressions;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (i === 0) {
        currentValue = impressions;
      } else {
        currentValue = Math.round(currentValue * (step.conversionRate / 100));
      }
      result.push({
        ...step,
        value: currentValue,
        costPer: currentValue > 0 ? budget / currentValue : 0,
      });
    }
    return result;
  }, [steps, budget]);

  const lastStep = calculatedSteps[calculatedSteps.length - 1];
  const revenue = lastStep ? lastStep.value * avgCheck : 0;
  const profit = revenue - budget;
  const roas = budget > 0 ? revenue / budget : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Calculator className="h-6 w-6 text-primary" />
            {t('decomposition.title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t('decomposition.subtitle')}</p>
        </div>
      </motion.div>

      {/* Config row */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Preset</Label>
          <Select value={preset} onValueChange={applyPreset}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRESETS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('decomposition.budget')} ($)</Label>
          <Input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('decomposition.avgCheck')} ($)</Label>
          <Input type="number" value={avgCheck} onChange={e => setAvgCheck(Number(e.target.value))} />
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={addStep}>
            <Plus className="h-4 w-4" />{t('common.add')}
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => applyPreset(preset)}>
            <RotateCcw className="h-4 w-4" />Reset
          </Button>
        </div>
      </motion.div>

      {/* Funnel Table */}
      <motion.div variants={item}>
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[50px]">#</TableHead>
                    <TableHead className="min-w-[180px]">{t('decomposition.step')}</TableHead>
                    <TableHead className="text-right">{t('decomposition.convRate')} %</TableHead>
                    <TableHead className="text-right">{t('decomposition.volume')}</TableHead>
                    <TableHead className="text-right">{t('decomposition.costPer')}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculatedSteps.map((step, i) => (
                    <TableRow key={step.id}>
                      <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={step.name}
                          onChange={e => updateStep(step.id, 'name', e.target.value)}
                          className="h-8 text-sm border-none bg-transparent p-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {i === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Input
                            type="number"
                            step="0.1"
                            value={steps[i]?.conversionRate || 0}
                            onChange={e => updateStep(step.id, 'conversionRate', Number(e.target.value))}
                            className="h-8 text-sm text-right border-none bg-transparent p-0 focus-visible:ring-0 w-20 ml-auto"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatNumber(step.value)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(step.costPer)}
                      </TableCell>
                      <TableCell>
                        {steps.length > 2 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeStep(step.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="py-4 px-4">
            <p className="text-xs text-muted-foreground mb-1">{t('decomposition.budget')}</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(budget)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="py-4 px-4">
            <p className="text-xs text-muted-foreground mb-1">{t('decomposition.projectedRevenue')}</p>
            <p className="text-xl font-bold text-success">{formatCurrency(revenue)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="py-4 px-4">
            <p className="text-xs text-muted-foreground mb-1">{t('decomposition.projectedProfit')}</p>
            <p className={`text-xl font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(profit)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="py-4 px-4">
            <p className="text-xs text-muted-foreground mb-1">ROAS</p>
            <p className={`text-xl font-bold ${roas >= 1 ? 'text-success' : 'text-destructive'}`}>{roas.toFixed(2)}x</p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

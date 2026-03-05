import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Save, Download, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

interface Step {
  type: string;
  text: string;
  assignee: string;
}

interface Program {
  name: string;
  steps: Step[];
}

interface ScaleData {
  name: string;
  goal: string;
  intentions: string[];
  policies: string[];
  plans: string[];
  programs: Program[];
  projects: Program[];
  orders: string[];
  idealPicture: string;
  statistics: string[];
  vfp: string;
}

const emptyScale: ScaleData = {
  name: '', goal: '', intentions: [''], policies: [''], plans: [''],
  programs: [{ name: '', steps: [{ type: 'operating', text: '', assignee: '' }] }],
  projects: [], orders: [''], idealPicture: '', statistics: [''], vfp: '',
};

const stepTypes = [
  { value: 'priority', label: '👥 Первоочередная', color: 'text-blue-400' },
  { value: 'vital', label: '⚠ Жизненно важная', color: 'text-red-400' },
  { value: 'conditional', label: '🔍 Условная', color: 'text-purple-400' },
  { value: 'operating', label: '⚙ Текущая', color: 'text-emerald-400' },
  { value: 'production', label: '📊 Производственная', color: 'text-amber-400' },
];

const scaleFields: { key: string; label: string; number: number; emoji: string }[] = [
  { key: 'goal', label: 'Цель', number: 1, emoji: '🎯' },
  { key: 'intentions', label: 'Замыслы', number: 2, emoji: '💡' },
  { key: 'policies', label: 'Политика', number: 3, emoji: '📜' },
  { key: 'plans', label: 'Планы', number: 4, emoji: '📋' },
  { key: 'programs', label: 'Программы', number: 5, emoji: '⚡' },
  { key: 'projects', label: 'Проекты', number: 6, emoji: '🔧' },
  { key: 'orders', label: 'Приказы', number: 7, emoji: '📢' },
  { key: 'idealPicture', label: 'Идеальная картина', number: 8, emoji: '🌟' },
  { key: 'statistics', label: 'Статистики', number: 9, emoji: '📈' },
  { key: 'vfp', label: 'ЦКП', number: 10, emoji: '🏆' },
];

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((val, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}.</span>
          <Input
            value={val}
            onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n); }}
            placeholder={placeholder}
            className="h-8 text-sm"
          />
          {items.length > 1 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" className="text-xs text-amber-500 hover:text-amber-400 gap-1 h-7"
        onClick={() => onChange([...items, ''])}>
        <Plus className="h-3 w-3" /> Добавить
      </Button>
    </div>
  );
}

function ProgramEditor({ program, onChange, onRemove, label }: {
  program: Program; onChange: (p: Program) => void; onRemove?: () => void; label: string;
}) {
  const [open, setOpen] = useState(true);

  const addStep = () => onChange({
    ...program,
    steps: [...program.steps, { type: 'operating', text: '', assignee: '' }],
  });

  const updateStep = (i: number, patch: Partial<Step>) => {
    const steps = [...program.steps];
    steps[i] = { ...steps[i], ...patch };
    onChange({ ...program, steps });
  };

  const removeStep = (i: number) => {
    if (program.steps.length <= 1) return;
    onChange({ ...program, steps: program.steps.filter((_, j) => j !== i) });
  };

  return (
    <Card className="border-border">
      <div className="flex items-center gap-2 px-4 py-2 cursor-pointer" onClick={() => setOpen(o => !o)}>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <span className="text-xs font-semibold text-muted-foreground uppercase">{label}</span>
        <div className="flex-1" />
        {onRemove && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={e => { e.stopPropagation(); onRemove(); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {open && (
        <CardContent className="pt-0 space-y-3">
          <Input
            value={program.name}
            onChange={e => onChange({ ...program, name: e.target.value })}
            placeholder="Название программы / проекта"
            className="h-8 text-sm font-medium"
          />

          <div className="space-y-2">
            {program.steps.map((step, i) => {
              const typeInfo = stepTypes.find(t => t.value === step.type);
              return (
                <div key={i} className="flex gap-2 items-start p-2 rounded-lg bg-secondary/30 border border-border">
                  <span className="text-xs text-muted-foreground mt-2 w-5 text-right flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2">
                      <Select value={step.type} onValueChange={v => updateStep(i, { type: v })}>
                        <SelectTrigger className="h-7 text-xs w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stepTypes.map(t => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={step.assignee}
                        onChange={e => updateStep(i, { assignee: e.target.value })}
                        placeholder="Исполнитель"
                        className="h-7 text-xs w-32"
                      />
                    </div>
                    <Input
                      value={step.text}
                      onChange={e => updateStep(i, { text: e.target.value })}
                      placeholder="Описание шага / задачи"
                      className="h-7 text-xs"
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 mt-1 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => removeStep(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button variant="ghost" size="sm" className="text-xs text-amber-500 hover:text-amber-400 gap-1 h-7" onClick={addStep}>
            <Plus className="h-3 w-3" /> Добавить шаг
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export default function AdminScaleEditor() {
  const [scale, setScale] = useState<ScaleData>(emptyScale);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('adminscale_current');
      if (saved) setScale(JSON.parse(saved));
    } catch {}
  }, []);

  const save = () => {
    localStorage.setItem('adminscale_current', JSON.stringify(scale));
    // Also save to history
    try {
      const history: { name: string; date: string; data: ScaleData }[] = JSON.parse(localStorage.getItem('adminscale_history') || '[]');
      history.unshift({ name: scale.name || 'Без названия', date: new Date().toISOString(), data: scale });
      if (history.length > 20) history.length = 20;
      localStorage.setItem('adminscale_history', JSON.stringify(history));
    } catch {}
    toast.success('Шкала сохранена');
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(scale, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scale.name || 'scale'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Экспорт завершён');
  };

  const update = <K extends keyof ScaleData>(key: K, value: ScaleData[K]) => {
    setScale(s => ({ ...s, [key]: value }));
  };

  const addProgram = () => update('programs', [...scale.programs, { name: '', steps: [{ type: 'operating', text: '', assignee: '' }] }]);
  const addProject = () => update('projects', [...scale.projects, { name: '', steps: [{ type: 'operating', text: '', assignee: '' }] }]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 max-w-3xl mx-auto pb-8">
      {/* Top bar */}
      <motion.div variants={item} className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Редактор шкалы</h1>
          <p className="text-xs text-muted-foreground">Заполните все 10 уровней административной шкалы</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportJson}>
            <Download className="h-3.5 w-3.5" /> Экспорт
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={save}>
            <Save className="h-3.5 w-3.5" /> Сохранить
          </Button>
        </div>
      </motion.div>

      {/* Scale name */}
      <motion.div variants={item}>
        <Input
          value={scale.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Название шкалы"
          className="text-lg font-semibold h-11 border-amber-500/30 focus-visible:ring-amber-500/40"
        />
      </motion.div>

      {/* Level 1: Goal */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-amber-500">🎯 1.</span> Цель
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={scale.goal}
              onChange={e => update('goal', e.target.value)}
              placeholder="Зачем играть? Абстрактно и долгосрочно"
              className="min-h-[60px] text-sm"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Level 2: Intentions */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-amber-500">💡 2.</span> Замыслы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ListEditor items={scale.intentions} onChange={v => update('intentions', v)} placeholder="Намерение для конкретного вида деятельности" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Level 3: Policies */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-amber-500">📜 3.</span> Политика
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ListEditor items={scale.policies} onChange={v => update('policies', v)} placeholder="Неизменное правило" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Level 4: Plans */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-amber-500">📋 4.</span> Планы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ListEditor items={scale.plans} onChange={v => update('plans', v)} placeholder="Широкое краткосрочное намерение" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Level 5: Programs */}
      <motion.div variants={item}>
        <Card className="border-amber-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-amber-500">⚡ 5.</span> Программы
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-amber-500 h-7 gap-1" onClick={addProgram}>
                <Plus className="h-3 w-3" /> Добавить
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {scale.programs.map((prog, i) => (
              <ProgramEditor
                key={i}
                program={prog}
                label={`Программа ${i + 1}`}
                onChange={p => { const n = [...scale.programs]; n[i] = p; update('programs', n); }}
                onRemove={scale.programs.length > 1 ? () => update('programs', scale.programs.filter((_, j) => j !== i)) : undefined}
              />
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Level 6: Projects */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-amber-500">🔧 6.</span> Проекты
                <Badge variant="outline" className="text-[9px] ml-1">Только при необходимости</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-amber-500 h-7 gap-1" onClick={addProject}>
                <Plus className="h-3 w-3" /> Добавить
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {scale.projects.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Нет проектов. Проект создаётся только если один шаг программы слишком сложен.</p>
            ) : scale.projects.map((proj, i) => (
              <ProgramEditor
                key={i}
                program={proj}
                label={`Проект ${i + 1}`}
                onChange={p => { const n = [...scale.projects]; n[i] = p; update('projects', n); }}
                onRemove={() => update('projects', scale.projects.filter((_, j) => j !== i))}
              />
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Level 7: Orders */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-amber-500">📢 7.</span> Приказы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ListEditor items={scale.orders} onChange={v => update('orders', v)} placeholder="«Сделай это сейчас» — тактика на местах" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Level 8: Ideal Picture */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-amber-500">🌟 8.</span> Идеальная картина
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={scale.idealPicture}
              onChange={e => update('idealPicture', e.target.value)}
              placeholder="Как должна выглядеть область в идеале"
              className="min-h-[60px] text-sm"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Level 9: Statistics */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-amber-500">📈 9.</span> Статистики
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ListEditor items={scale.statistics} onChange={v => update('statistics', v)} placeholder="Количественный показатель выполненной работы" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Level 10: VFP */}
      <motion.div variants={item}>
        <Card className="border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-amber-500">🏆 10.</span> ЦКП
              <span className="text-xs font-normal text-muted-foreground">(Ценный конечный продукт)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={scale.vfp}
              onChange={e => update('vfp', e.target.value)}
              placeholder="Завершённый результат, который обменивается на ресурсы"
              className="min-h-[60px] text-sm"
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

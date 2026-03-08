import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Save, Download, Upload, ChevronDown, ChevronRight, BookOpen, FileJson, FileText, FileDown, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AdminScaleReferencePanel from './AdminScaleReferencePanel';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

interface Step { type: string; text: string; assignee: string; }
interface Program { name: string; steps: Step[]; }

export interface ScaleData {
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

export const emptyScale: ScaleData = {
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

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((val, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}.</span>
          <Input value={val} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n); }}
            placeholder={placeholder} className="h-8 text-sm" />
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
  const addStep = () => onChange({ ...program, steps: [...program.steps, { type: 'operating', text: '', assignee: '' }] });
  const updateStep = (i: number, patch: Partial<Step>) => {
    const steps = [...program.steps]; steps[i] = { ...steps[i], ...patch }; onChange({ ...program, steps });
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
          <Input value={program.name} onChange={e => onChange({ ...program, name: e.target.value })}
            placeholder="Название программы / проекта" className="h-8 text-sm font-medium" />
          <div className="space-y-2">
            {program.steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start p-2 rounded-lg bg-secondary/30 border border-border">
                <span className="text-xs text-muted-foreground mt-2 w-5 text-right flex-shrink-0">{i + 1}.</span>
                <div className="flex-1 space-y-1.5">
                  <div className="flex gap-2">
                    <Select value={step.type} onValueChange={v => updateStep(i, { type: v })}>
                      <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {stepTypes.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={step.assignee} onChange={e => updateStep(i, { assignee: e.target.value })}
                      placeholder="Исполнитель" className="h-7 text-xs w-32" />
                  </div>
                  <Input value={step.text} onChange={e => updateStep(i, { text: e.target.value })}
                    placeholder="Описание шага / задачи" className="h-7 text-xs" />
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 mt-1 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => removeStep(i)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-amber-500 hover:text-amber-400 gap-1 h-7" onClick={addStep}>
            <Plus className="h-3 w-3" /> Добавить шаг
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

// ── Export helpers ──
function exportAsJson(scale: ScaleData) {
  const blob = new Blob([JSON.stringify(scale, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${scale.name || 'scale'}.json`);
  toast.success('Экспорт JSON завершён');
}

function exportAsText(scale: ScaleData) {
  const lines: string[] = [];
  lines.push(`=== ${scale.name || 'Без названия'} ===\n`);
  lines.push(`🎯 1. ЦЕЛЬ\n${scale.goal}\n`);
  lines.push(`💡 2. ЗАМЫСЛЫ\n${scale.intentions.filter(Boolean).map((v,i)=>`  ${i+1}. ${v}`).join('\n')}\n`);
  lines.push(`📜 3. ПОЛИТИКА\n${scale.policies.filter(Boolean).map((v,i)=>`  ${i+1}. ${v}`).join('\n')}\n`);
  lines.push(`📋 4. ПЛАНЫ\n${scale.plans.filter(Boolean).map((v,i)=>`  ${i+1}. ${v}`).join('\n')}\n`);
  scale.programs.forEach((p, pi) => {
    lines.push(`⚡ 5. ПРОГРАММА ${pi+1}: ${p.name}`);
    p.steps.forEach((s,si) => lines.push(`  ${si+1}. [${s.type.toUpperCase()}] ${s.text} → ${s.assignee}`));
    lines.push('');
  });
  if (scale.projects.length) {
    scale.projects.forEach((p, pi) => {
      lines.push(`🔧 6. ПРОЕКТ ${pi+1}: ${p.name}`);
      p.steps.forEach((s,si) => lines.push(`  ${si+1}. [${s.type.toUpperCase()}] ${s.text} → ${s.assignee}`));
      lines.push('');
    });
  }
  lines.push(`📢 7. ПРИКАЗЫ\n${scale.orders.filter(Boolean).map((v,i)=>`  ${i+1}. ${v}`).join('\n')}\n`);
  lines.push(`🌟 8. ИДЕАЛЬНАЯ КАРТИНА\n${scale.idealPicture}\n`);
  lines.push(`📈 9. СТАТИСТИКИ\n${scale.statistics.filter(Boolean).map((v,i)=>`  ${i+1}. ${v}`).join('\n')}\n`);
  lines.push(`🏆 10. ЦКП\n${scale.vfp}`);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${scale.name || 'scale'}.txt`);
  toast.success('Экспорт TXT завершён');
}

function exportAsMarkdown(scale: ScaleData) {
  const lines: string[] = [];
  lines.push(`# ${scale.name || 'Без названия'}\n`);
  lines.push(`## 🎯 1. Цель\n${scale.goal}\n`);
  lines.push(`## 💡 2. Замыслы\n${scale.intentions.filter(Boolean).map((v,i)=>`${i+1}. ${v}`).join('\n')}\n`);
  lines.push(`## 📜 3. Политика\n${scale.policies.filter(Boolean).map((v,i)=>`${i+1}. ${v}`).join('\n')}\n`);
  lines.push(`## 📋 4. Планы\n${scale.plans.filter(Boolean).map((v,i)=>`${i+1}. ${v}`).join('\n')}\n`);
  scale.programs.forEach((p, pi) => {
    lines.push(`## ⚡ 5. Программа ${pi+1}: ${p.name}`);
    p.steps.forEach((s,si) => lines.push(`${si+1}. **[${s.type}]** ${s.text} → *${s.assignee}*`));
    lines.push('');
  });
  if (scale.projects.length) {
    scale.projects.forEach((p, pi) => {
      lines.push(`## 🔧 6. Проект ${pi+1}: ${p.name}`);
      p.steps.forEach((s,si) => lines.push(`${si+1}. **[${s.type}]** ${s.text} → *${s.assignee}*`));
      lines.push('');
    });
  }
  lines.push(`## 📢 7. Приказы\n${scale.orders.filter(Boolean).map((v,i)=>`${i+1}. ${v}`).join('\n')}\n`);
  lines.push(`## 🌟 8. Идеальная картина\n${scale.idealPicture}\n`);
  lines.push(`## 📈 9. Статистики\n${scale.statistics.filter(Boolean).map((v,i)=>`${i+1}. ${v}`).join('\n')}\n`);
  lines.push(`## 🏆 10. ЦКП\n${scale.vfp}`);
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `${scale.name || 'scale'}.md`);
  toast.success('Экспорт Markdown завершён');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminScaleEditor() {
  const { user } = useAuth();
  const [scale, setScale] = useState<ScaleData>(emptyScale);
  const [currentScaleId, setCurrentScaleId] = useState<string | null>(null);
  const [refOpen, setRefOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current scale from DB on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from('admin_scales')
      .select('id, data')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.data) {
          setScale(data.data as unknown as ScaleData);
          setCurrentScaleId(data.id);
        } else {
          // Migrate from localStorage if exists
          try {
            const saved = localStorage.getItem('adminscale_current');
            if (saved) {
              const parsed = JSON.parse(saved);
              setScale(parsed);
              // Save to DB
              supabase
                .from('admin_scales')
                .insert({ user_id: user.id, name: parsed.name || '', data: parsed as any, is_current: true })
                .select('id')
                .single()
                .then(({ data: inserted }) => {
                  if (inserted) setCurrentScaleId(inserted.id);
                  localStorage.removeItem('adminscale_current');
                });
            }
          } catch {}
        }
        setLoaded(true);
      });
  }, [user]);

  // Auto-save to DB (debounced)
  useEffect(() => {
    if (!loaded || !user) return;
    const timer = setTimeout(() => {
      if (currentScaleId) {
        supabase
          .from('admin_scales')
          .update({ data: scale as any, name: scale.name || '', updated_at: new Date().toISOString() })
          .eq('id', currentScaleId)
          .then(() => {});
      } else {
        supabase
          .from('admin_scales')
          .insert({ user_id: user.id, name: scale.name || '', data: scale as any, is_current: true })
          .select('id')
          .single()
          .then(({ data }) => {
            if (data) setCurrentScaleId(data.id);
          });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [scale, loaded, user, currentScaleId]);

  const save = async () => {
    if (!user) return;
    // Save as a history entry (non-current)
    await supabase.from('admin_scales').insert({
      user_id: user.id,
      name: scale.name || 'Без названия',
      data: scale as any,
      is_current: false,
    });
    toast.success('Шкала сохранена в историю');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(text) as ScaleData;
          if (data.goal !== undefined || data.programs !== undefined) {
            setScale(data);
            toast.success(`Шкала "${data.name || 'Без названия'}" импортирована`);
          } else {
            toast.error('Неверный формат JSON');
          }
        } else {
          toast.info('Импорт текста: загружено как цель шкалы');
          setScale(prev => ({ ...prev, name: file.name.replace(/\.\w+$/, ''), goal: text }));
        }
      } catch { toast.error('Ошибка при импорте файла'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const update = <K extends keyof ScaleData>(key: K, value: ScaleData[K]) => {
    setScale(s => ({ ...s, [key]: value }));
  };

  const addProgram = () => update('programs', [...scale.programs, { name: '', steps: [{ type: 'operating', text: '', assignee: '' }] }]);
  const addProject = () => update('projects', [...scale.projects, { name: '', steps: [{ type: 'operating', text: '', assignee: '' }] }]);

  return (
    <div className="flex gap-0 h-full relative">
      <motion.div variants={container} initial="hidden" animate="show"
        className={cn("space-y-4 pb-8 flex-1 min-w-0 transition-all duration-300", refOpen ? 'mr-[380px]' : 'max-w-3xl mx-auto')}>
        {/* Top bar */}
        <motion.div variants={item} className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground">Редактор шкалы</h1>
            <p className="text-xs text-muted-foreground">Заполните все 10 уровней. Автосохранение включено.</p>
          </div>
          <div className="flex gap-2">
            <Button variant={refOpen ? 'default' : 'outline'} size="sm" className="gap-1.5 text-xs"
              onClick={() => setRefOpen(o => !o)}>
              {refOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
              Справочник
            </Button>
            <input ref={fileInputRef} type="file" accept=".json,.txt,.md" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Импорт
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" /> Экспорт <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportAsJson(scale)} className="text-xs gap-2">
                  <FileJson className="h-3.5 w-3.5" /> JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAsText(scale)} className="text-xs gap-2">
                  <FileText className="h-3.5 w-3.5" /> Текст (.txt)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAsMarkdown(scale)} className="text-xs gap-2">
                  <FileDown className="h-3.5 w-3.5" /> Markdown (.md)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={save}>
              <Save className="h-3.5 w-3.5" /> В историю
            </Button>
          </div>
        </motion.div>

        {/* Scale name */}
        <motion.div variants={item}>
          <Input value={scale.name} onChange={e => update('name', e.target.value)}
            placeholder="Название шкалы" className="text-lg font-semibold h-11 border-amber-500/30 focus-visible:ring-amber-500/40" />
        </motion.div>

        {/* Level 1-10 */}
        <motion.div variants={item}>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <span className="text-amber-500">🎯 1.</span> Цель</CardTitle></CardHeader>
            <CardContent><Textarea value={scale.goal} onChange={e => update('goal', e.target.value)}
              placeholder="Зачем играть? Абстрактно и долгосрочно" className="min-h-[60px] text-sm" /></CardContent></Card>
        </motion.div>

        <motion.div variants={item}>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <span className="text-amber-500">💡 2.</span> Замыслы</CardTitle></CardHeader>
            <CardContent><ListEditor items={scale.intentions} onChange={v => update('intentions', v)} placeholder="Намерение для конкретного вида деятельности" /></CardContent></Card>
        </motion.div>

        <motion.div variants={item}>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <span className="text-amber-500">📜 3.</span> Политика</CardTitle></CardHeader>
            <CardContent><ListEditor items={scale.policies} onChange={v => update('policies', v)} placeholder="Неизменное правило" /></CardContent></Card>
        </motion.div>

        <motion.div variants={item}>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <span className="text-amber-500">📋 4.</span> Планы</CardTitle></CardHeader>
            <CardContent><ListEditor items={scale.plans} onChange={v => update('plans', v)} placeholder="Широкое краткосрочное намерение" /></CardContent></Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><span className="text-amber-500">⚡ 5.</span> Программы</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-amber-500 h-7 gap-1" onClick={addProgram}><Plus className="h-3 w-3" /> Добавить</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {scale.programs.map((prog, i) => (
                <ProgramEditor key={i} program={prog} label={`Программа ${i + 1}`}
                  onChange={p => { const n = [...scale.programs]; n[i] = p; update('programs', n); }}
                  onRemove={scale.programs.length > 1 ? () => update('programs', scale.programs.filter((_, j) => j !== i)) : undefined} />
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-amber-500">🔧 6.</span> Проекты
                  <Badge variant="outline" className="text-[9px] ml-1">Только при необходимости</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-amber-500 h-7 gap-1" onClick={addProject}><Plus className="h-3 w-3" /> Добавить</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {scale.projects.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Нет проектов. Проект создаётся только если один шаг программы слишком сложен.</p>
              ) : scale.projects.map((proj, i) => (
                <ProgramEditor key={i} program={proj} label={`Проект ${i + 1}`}
                  onChange={p => { const n = [...scale.projects]; n[i] = p; update('projects', n); }}
                  onRemove={() => update('projects', scale.projects.filter((_, j) => j !== i))} />
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <span className="text-amber-500">📢 7.</span> Приказы</CardTitle></CardHeader>
            <CardContent><ListEditor items={scale.orders} onChange={v => update('orders', v)} placeholder="«Сделай это сейчас» — тактика на местах" /></CardContent></Card>
        </motion.div>

        <motion.div variants={item}>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <span className="text-amber-500">🌟 8.</span> Идеальная картина</CardTitle></CardHeader>
            <CardContent><Textarea value={scale.idealPicture} onChange={e => update('idealPicture', e.target.value)}
              placeholder="Как должна выглядеть область в идеале" className="min-h-[60px] text-sm" /></CardContent></Card>
        </motion.div>

        <motion.div variants={item}>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <span className="text-amber-500">📈 9.</span> Статистики</CardTitle></CardHeader>
            <CardContent><ListEditor items={scale.statistics} onChange={v => update('statistics', v)} placeholder="Количественный показатель выполненной работы" /></CardContent></Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
              <span className="text-amber-500">🏆 10.</span> ЦКП
              <span className="text-xs font-normal text-muted-foreground">(Ценный конечный продукт)</span></CardTitle></CardHeader>
            <CardContent><Textarea value={scale.vfp} onChange={e => update('vfp', e.target.value)}
              placeholder="Завершённый результат, который обменивается на ресурсы" className="min-h-[60px] text-sm" /></CardContent></Card>
        </motion.div>
      </motion.div>

      {refOpen && (
        <div className="fixed right-0 top-14 bottom-0 w-[380px] bg-sidebar border-l border-sidebar-border overflow-y-auto z-20 shadow-lg">
          <div className="sticky top-0 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between z-10">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-500" /> Справочник
            </h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRefOpen(false)}>
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-4 pb-8">
            <AdminScaleReferencePanel />
          </div>
        </div>
      )}
    </div>
  );
}

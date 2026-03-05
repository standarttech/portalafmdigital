import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

const stepTypeLabels: Record<string, { label: string; color: string }> = {
  priority: { label: 'Первоочередная', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  vital: { label: 'Жизненно важная', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  conditional: { label: 'Условная', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  operating: { label: 'Текущая', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  production: { label: 'Производственная', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
};

interface ScaleData {
  name: string;
  goal: string;
  intentions: string[];
  policies: string[];
  plans: string[];
  programs: { name: string; steps: { type: string; text: string; assignee: string }[] }[];
  projects: { name: string; steps: { type: string; text: string; assignee: string }[] }[];
  orders: string[];
  idealPicture: string;
  statistics: string[];
  vfp: string;
}

export default function AdminScaleOverview() {
  const [scale, setScale] = useState<ScaleData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('adminscale_current');
      if (saved) setScale(JSON.parse(saved));
    } catch {}
  }, []);

  if (!scale || !scale.name) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center text-3xl">📋</div>
        <p className="text-muted-foreground text-sm">Нет открытой шкалы</p>
        <p className="text-xs text-muted-foreground">Создайте новую или выберите пример на главной</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/adminscale')} className="text-amber-500 border-amber-500/30">
          ✦ Создать шкалу
        </Button>
      </div>
    );
  }

  const renderList = (items: string[], emoji: string) => (
    <ul className="space-y-1">
      {items.filter(Boolean).map((item, i) => (
        <li key={i} className="text-sm text-foreground flex gap-2">
          <span className="text-muted-foreground flex-shrink-0">{i + 1}.</span>
          {item}
        </li>
      ))}
    </ul>
  );

  const renderProgram = (prog: { name: string; steps: { type: string; text: string; assignee: string }[] }, i: number, label: string) => (
    <Card key={i} className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{label}: {prog.name || 'Без названия'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {prog.steps.map((step, j) => {
          const typeInfo = stepTypeLabels[step.type] || stepTypeLabels.operating;
          return (
            <div key={j} className="flex items-start gap-2 text-sm">
              <span className="text-xs text-muted-foreground w-5 text-right mt-0.5 flex-shrink-0">{j + 1}.</span>
              <Badge variant="outline" className={cn('text-[9px] flex-shrink-0 mt-0.5', typeInfo.color)}>
                {typeInfo.label}
              </Badge>
              <span className="flex-1 text-foreground">{step.text}</span>
              {step.assignee && (
                <span className="text-xs text-muted-foreground flex-shrink-0">→ {step.assignee}</span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 max-w-3xl mx-auto pb-8">
      <motion.div variants={item} className="text-center space-y-1 pt-2">
        <h1 className="text-2xl font-bold text-foreground">{scale.name}</h1>
        <p className="text-xs text-muted-foreground">Обзор административной шкалы</p>
      </motion.div>

      {/* Goal */}
      <motion.div variants={item}>
        <Card className="border-amber-500/20">
          <CardHeader className="pb-1"><CardTitle className="text-sm">🎯 1. Цель</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-foreground">{scale.goal || '—'}</p></CardContent>
        </Card>
      </motion.div>

      {/* Intentions */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">💡 2. Замыслы</CardTitle></CardHeader>
          <CardContent>{renderList(scale.intentions, '💡')}</CardContent>
        </Card>
      </motion.div>

      {/* Policies */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">📜 3. Политика</CardTitle></CardHeader>
          <CardContent>{renderList(scale.policies, '📜')}</CardContent>
        </Card>
      </motion.div>

      {/* Plans */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">📋 4. Планы</CardTitle></CardHeader>
          <CardContent>{renderList(scale.plans, '📋')}</CardContent>
        </Card>
      </motion.div>

      {/* Programs */}
      <motion.div variants={item}>
        <Card className="border-amber-500/20">
          <CardHeader className="pb-1"><CardTitle className="text-sm">⚡ 5. Программы</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {scale.programs.map((p, i) => renderProgram(p, i, `Программа ${i + 1}`))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Projects */}
      {scale.projects.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-sm">🔧 6. Проекты</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {scale.projects.map((p, i) => renderProgram(p, i, `Проект ${i + 1}`))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Orders */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">📢 7. Приказы</CardTitle></CardHeader>
          <CardContent>{renderList(scale.orders, '📢')}</CardContent>
        </Card>
      </motion.div>

      {/* Ideal Picture */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">🌟 8. Идеальная картина</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-foreground">{scale.idealPicture || '—'}</p></CardContent>
        </Card>
      </motion.div>

      {/* Statistics */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">📈 9. Статистики</CardTitle></CardHeader>
          <CardContent>{renderList(scale.statistics, '📈')}</CardContent>
        </Card>
      </motion.div>

      {/* VFP */}
      <motion.div variants={item}>
        <Card className="border-amber-500/20">
          <CardHeader className="pb-1"><CardTitle className="text-sm">🏆 10. ЦКП</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-foreground font-medium">{scale.vfp || '—'}</p></CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

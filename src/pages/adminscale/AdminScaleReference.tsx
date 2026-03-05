import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex items-center w-full gap-2 px-4 py-3 rounded-lg bg-card border border-border hover:border-amber-500/30 transition-colors group">
        <span className="flex-1 text-left text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-2 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AdminScaleReference() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 max-w-3xl mx-auto pb-8">
      <motion.div variants={item} className="space-y-1 pt-2">
        <h1 className="text-2xl font-bold text-foreground">📚 Справочник</h1>
        <p className="text-sm text-muted-foreground">
          Полное руководство по административным шкалам, программам, типам задач и правилам проектов
        </p>
      </motion.div>

      {/* Key concept */}
      <motion.div variants={item}>
        <Card className="border-amber-500/20">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-bold text-foreground">‼ Ключевая концепция: шаги и задачи</p>
            <p className="text-sm text-muted-foreground">
              Шаги программы и задачи — это <strong className="text-foreground">одно и то же</strong>. 
              Каждый шаг программы называется задачей. Нет отдельных «задач внутри шага» — сам шаг и есть задача определённого типа.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Programs & Steps */}
      <motion.div variants={item}>
        <Section title="📋 Программа, Шаг, Проект" defaultOpen>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="font-semibold text-foreground">📋 Программа</p>
              <p className="text-muted-foreground mt-1">
                Упорядоченная последовательность шагов (= задач) для выполнения плана. 
                Шаги нумеруются: 1, 2, 3 или А, Б, В. Каждый шаг поручается конкретному человеку.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="font-semibold text-foreground">📌 Шаг программы = Задача</p>
              <p className="text-muted-foreground mt-1">
                Конкретное действие. Каждому шагу присваивается тип (первоочередной, жизненно важный и т.д.), 
                исполнитель и дедлайн. Подряд идущие шаги одного типа могут группироваться в раздел.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 italic">
                Пример: «1. Прочитайте программу» — Первоочередная задача. 
                «Условная: Если нет руководителя — назначьте его» — Условная задача.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="font-semibold text-foreground">🔧 Проект</p>
              <p className="text-muted-foreground mt-1">
                Программа меньшего масштаба, создаётся ТОЛЬКО для выполнения одного конкретного шага, 
                если тот оказался слишком объёмным. Позволяет не терять фокус на общей программе.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 italic">
                «Вместо того чтобы зацикливаться на одном шаге — определяете Проект, намечаете шаги, выполняете их.»
              </p>
            </div>
          </div>
        </Section>
      </motion.div>

      {/* 5 Task Types */}
      <motion.div variants={item}>
        <Section title="5 типов задач (шагов программы)" defaultOpen>
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 mb-3">
            <p className="text-xs font-semibold text-amber-500">
              ⚡ Критический порядок: Сначала первоочередные → жизненно важные → условные → текущие. 
              Производственные — только после всех остальных!
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-400 border-blue-500/30">👥 Первоочередные</Badge>
              </div>
              <p className="text-muted-foreground">
                Организационные, кадровые, коммуникационные шаги. «Само собой разумеющиеся» — 
                именно их чаще всего пропускают, и именно из-за этого программа рухнет.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 italic">
                «Прочитайте программу» · «Свяжитесь с офисом» · «Передайте ответственному» · «Изучите ссылки»
              </p>
            </div>

            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/30">⚠ Жизненно важные</Badge>
              </div>
              <p className="text-muted-foreground">
                Формируются после инспекции. Устраняют угрозы выживанию проекта. 
                Что нельзя не делать в процессе выполнения.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 italic">
                «Поддерживайте связь с офисом в процессе» · «Проводите инспекции — смотрите своими глазами»
              </p>
            </div>

            <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-400 border-purple-500/30">🔍 Условные (Если…то)</Badge>
              </div>
              <p className="text-muted-foreground">
                Разведка, сбор данных, проверка осуществимости. Без них план оторван от реальности.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 italic">
                «УСЛОВНАЯ: Если нет ответственного — назначьте одного из руководителей» · 
                «УСЛОВНАЯ: Если завязли — применяйте технологию дебага»
              </p>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">⚙ Текущие (рабочие)</Badge>
              </div>
              <p className="text-muted-foreground">
                Конкретные направления действий с указанием кто, что и когда. Основная масса шагов программы.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 italic">
                «Составьте список из 20 людей» · «Каждую неделю писать письма 5 людям из списка» · «Оформите выставку в приёмной»
              </p>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/30">📊 Производственные</Badge>
              </div>
              <p className="text-muted-foreground">
                Устанавливают квоты и количественные показатели. 
                Работают ТОЛЬКО при наличии всех остальных типов задач.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 italic">
                «Проводить не менее 5 экскурсий в неделю» · «Заключить 50 контрактов к концу месяца»
              </p>
            </div>
          </div>
        </Section>
      </motion.div>

      {/* Administrative Scale */}
      <motion.div variants={item}>
        <Section title="Административная шкала (10 уровней)">
          <div className="space-y-2 text-sm">
            {[
              { n: 1, label: 'Цель', desc: '«Зачем играть?» Абстрактно и долгосрочно.' },
              { n: 2, label: 'Замыслы', desc: 'Намерения для конкретных видов деятельности.' },
              { n: 3, label: 'Политика', desc: 'Неизменные правила. Обеспечивают координацию.' },
              { n: 4, label: 'Планы', desc: 'Широкие краткосрочные намерения. Ещё не разбиты на действия.' },
              { n: 5, label: 'Программы', desc: 'Последовательность задач для выполнения плана.' },
              { n: 6, label: 'Проекты', desc: 'Программа меньшего масштаба для одного сложного шага.' },
              { n: 7, label: 'Приказы', desc: '«Сделай это сейчас». Тактика на местах.' },
              { n: 8, label: 'Идеальная картина', desc: 'Как должна выглядеть область в идеале.' },
              { n: 9, label: 'Статистики', desc: 'Количественные показатели выполненной работы.' },
              { n: 10, label: 'ЦКП', desc: 'Завершённый результат, который обменивается на ресурсы.' },
            ].map(level => (
              <div key={level.n} className="flex gap-3 items-start p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                <span className="text-amber-500 font-bold text-sm w-6 text-right flex-shrink-0">{level.n}.</span>
                <div>
                  <span className="font-semibold text-foreground">{level.label}</span>
                  <span className="text-muted-foreground"> — {level.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </motion.div>

      {/* 12 Principles */}
      <motion.div variants={item}>
        <Section title="12 принципов программирования">
          <ol className="space-y-1.5 text-sm list-decimal list-inside text-muted-foreground">
            <li>Любая идея лучше, чем её полное отсутствие.</li>
            <li>Результата можно добиться только при выполнении программы.</li>
            <li>Запущенная программа требует руководства.</li>
            <li>Программа без руководства провалится.</li>
            <li>Любая программа требует финансирования.</li>
            <li>Программа требует постоянного внимания.</li>
            <li>Лучшая программа затрагивает максимум уровней.</li>
            <li>Программы должны сами себя финансировать.</li>
            <li>Привлекайте помощь своими положительными сторонами.</li>
            <li>Программа плоха, если уводит от работающих программ.</li>
            <li>Не вкладывай больше, чем предполагаемая отдача.</li>
            <li>Новая программа не должна наносить ущерб действующим.</li>
          </ol>
        </Section>
      </motion.div>

      {/* Common Mistakes */}
      <motion.div variants={item}>
        <Section title="Типичные ошибки">
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="font-semibold text-foreground">Пропуск первоочередных</p>
              <p className="text-muted-foreground mt-1">
                Самая частая причина провала. «Само собой разумеется» — не значит «не надо писать». Пишите всё явно.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="font-semibold text-foreground">Производственные без остальных</p>
              <p className="text-muted-foreground mt-1">
                Статистика взлетит и рухнет. Квоты без инфраструктуры не работают.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="font-semibold text-foreground">Разрыв в иерархии шкалы</p>
              <p className="text-muted-foreground mt-1">
                Нет цели → замыслы бессмысленны. Нет плана → программу не к чему прикрепить. 
                Каждый уровень опирается на предыдущий.
              </p>
            </div>
          </div>
        </Section>
      </motion.div>
    </motion.div>
  );
}

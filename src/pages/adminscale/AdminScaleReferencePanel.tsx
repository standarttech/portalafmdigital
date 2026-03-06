import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex items-center w-full gap-2 px-3 py-2.5 rounded-lg bg-card border border-border hover:border-amber-500/30 transition-colors group">
        <span className="flex-1 text-left text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1 pb-3 pt-2 space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AdminScaleReferencePanel() {
  return (
    <div className="space-y-3 pt-2">
      {/* Key concept */}
      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
        <p className="text-sm font-bold text-foreground">‼ Ключевая концепция</p>
        <p className="text-xs text-muted-foreground mt-1">
          Шаги программы и задачи — это <strong className="text-foreground">одно и то же</strong>. 
          Каждый шаг программы называется задачей.
        </p>
      </div>

      <Section title="📋 Программа, Шаг, Проект" defaultOpen>
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-lg bg-secondary/50">
            <p className="font-semibold text-foreground text-sm">📋 Программа</p>
            <p className="text-muted-foreground mt-1">Упорядоченная последовательность шагов (= задач). Каждый шаг поручается конкретному человеку.</p>
          </div>
          <div className="p-2.5 rounded-lg bg-secondary/50">
            <p className="font-semibold text-foreground text-sm">📌 Шаг = Задача</p>
            <p className="text-muted-foreground mt-1">Конкретное действие с типом, исполнителем и дедлайном.</p>
          </div>
          <div className="p-2.5 rounded-lg bg-secondary/50">
            <p className="font-semibold text-foreground text-sm">🔧 Проект</p>
            <p className="text-muted-foreground mt-1">Создаётся ТОЛЬКО если один шаг оказался слишком сложным.</p>
          </div>
        </div>
      </Section>

      <Section title="5 типов задач" defaultOpen>
        <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 mb-2">
          <p className="text-[10px] font-semibold text-amber-500">
            ⚡ Порядок: Первоочередные → жизненно важные → условные → текущие → производственные
          </p>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <Badge variant="outline" className="text-[9px] bg-blue-500/15 text-blue-400 border-blue-500/30 mb-1">👥 Первоочередные</Badge>
            <p className="text-muted-foreground">Организационные, кадровые шаги. Чаще всего пропускают.</p>
          </div>
          <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
            <Badge variant="outline" className="text-[9px] bg-red-500/15 text-red-400 border-red-500/30 mb-1">⚠ Жизненно важные</Badge>
            <p className="text-muted-foreground">Устраняют угрозы выживанию проекта.</p>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <Badge variant="outline" className="text-[9px] bg-purple-500/15 text-purple-400 border-purple-500/30 mb-1">🔍 Условные</Badge>
            <p className="text-muted-foreground">Разведка, проверка осуществимости. «Если…то».</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30 mb-1">⚙ Текущие</Badge>
            <p className="text-muted-foreground">Основная масса шагов. Кто, что и когда.</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/30 mb-1">📊 Производственные</Badge>
            <p className="text-muted-foreground">Квоты и показатели. Только после всех остальных.</p>
          </div>
        </div>
      </Section>

      <Section title="Шкала (10 уровней)">
        <div className="space-y-1 text-xs">
          {[
            { n: 1, l: 'Цель', d: '«Зачем играть?»' },
            { n: 2, l: 'Замыслы', d: 'Намерения для видов деятельности' },
            { n: 3, l: 'Политика', d: 'Неизменные правила' },
            { n: 4, l: 'Планы', d: 'Широкие краткосрочные намерения' },
            { n: 5, l: 'Программы', d: 'Последовательность задач' },
            { n: 6, l: 'Проекты', d: 'Для одного сложного шага' },
            { n: 7, l: 'Приказы', d: '«Сделай это сейчас»' },
            { n: 8, l: 'Идеальная картина', d: 'Как должна выглядеть область' },
            { n: 9, l: 'Статистики', d: 'Показатели работы' },
            { n: 10, l: 'ЦКП', d: 'Ценный конечный продукт' },
          ].map(lv => (
            <div key={lv.n} className="flex gap-2 items-start py-1">
              <span className="text-amber-500 font-bold w-5 text-right flex-shrink-0">{lv.n}.</span>
              <span className="font-semibold text-foreground">{lv.l}</span>
              <span className="text-muted-foreground">— {lv.d}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="12 принципов программирования">
        <ol className="space-y-1 text-xs list-decimal list-inside text-muted-foreground pl-1">
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

      <Section title="Типичные ошибки">
        <div className="space-y-1.5 text-xs">
          <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="font-semibold text-foreground">Пропуск первоочередных</p>
            <p className="text-muted-foreground mt-0.5">Самая частая причина провала.</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="font-semibold text-foreground">Производственные без остальных</p>
            <p className="text-muted-foreground mt-0.5">Квоты без инфраструктуры не работают.</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="font-semibold text-foreground">Разрыв в иерархии шкалы</p>
            <p className="text-muted-foreground mt-0.5">Каждый уровень опирается на предыдущий.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

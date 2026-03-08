import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Building2, Heart, TrendingUp, Users, Upload, History, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AdminScaleReferencePanel from './AdminScaleReferencePanel';
import type { ScaleData } from './AdminScaleEditor';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const examples = [
  {
    icon: Building2,
    title: 'Пример: Экскурсии',
    desc: 'Готовая программа «Проведение экскурсий по компании» — реальный пример.',
    data: {
      name: 'Проведение экскурсий по компании',
      goal: 'Привлечь новых клиентов и сотрудников через экскурсии по офису',
      intentions: ['Показать культуру компании', 'Продемонстрировать рабочие процессы'],
      policies: ['Экскурсии проводятся только по согласованию', 'Максимум 10 человек в группе'],
      plans: ['Провести 20 экскурсий за квартал'],
      programs: [{ name: 'Организация экскурсий', steps: [
        { type: 'priority', text: 'Прочитайте программу', assignee: 'Руководитель' },
        { type: 'priority', text: 'Назначьте ответственного за экскурсии', assignee: 'HR' },
        { type: 'vital', text: 'Поддерживайте связь с офисом в процессе', assignee: 'Координатор' },
        { type: 'conditional', text: 'УСЛОВНАЯ: Если нет гида — назначьте одного из руководителей', assignee: 'HR' },
        { type: 'operating', text: 'Составьте список из 20 потенциальных гостей', assignee: 'Маркетолог' },
        { type: 'operating', text: 'Каждую неделю приглашайте 5 человек из списка', assignee: 'Маркетолог' },
        { type: 'operating', text: 'Оформите выставку в приёмной', assignee: 'Дизайнер' },
        { type: 'production', text: 'Проводить не менее 5 экскурсий в неделю', assignee: 'Гид' },
      ]}],
      projects: [],
      orders: ['Начать проводить экскурсии с понедельника'],
      idealPicture: 'Каждый посетитель уходит с желанием работать с нами или у нас',
      statistics: ['Количество экскурсий в неделю', 'Конверсия посетителей в клиентов'],
      vfp: 'Проведённая экскурсия с положительным отзывом и следующим шагом',
    },
  },
  {
    icon: Heart,
    title: 'Пример: Вечер с женой',
    desc: 'Классический пример из книги: кино, ресторан, прогулка.',
    data: {
      name: 'Романтический вечер с женой',
      goal: 'Укрепить отношения и создать приятное совместное воспоминание',
      intentions: ['Провести качественное время вместе', 'Показать заботу и внимание'],
      policies: ['Телефон в беззвучном режиме', 'Никаких рабочих разговоров'],
      plans: ['Организовать вечер в эту субботу'],
      programs: [{ name: 'Организация вечера', steps: [
        { type: 'priority', text: 'Узнайте предпочтения жены на этот вечер', assignee: 'Вы' },
        { type: 'priority', text: 'Забронируйте столик в ресторане', assignee: 'Вы' },
        { type: 'vital', text: 'Убедитесь что дети под присмотром', assignee: 'Вы' },
        { type: 'conditional', text: 'УСЛОВНАЯ: Если ресторан занят — выберите альтернативу', assignee: 'Вы' },
        { type: 'operating', text: 'Купите цветы по дороге', assignee: 'Вы' },
        { type: 'operating', text: 'Кино → ресторан → прогулка по набережной', assignee: 'Вы' },
      ]}],
      projects: [],
      orders: ['Выезд в 17:00'],
      idealPicture: 'Счастливая жена, приятный вечер без стрессов',
      statistics: ['Настроение жены (1-10)', 'Время, проведённое без телефона'],
      vfp: 'Жена говорит «это был прекрасный вечер» и улыбается',
    },
  },
  {
    icon: TrendingUp,
    title: 'Пример: Маркетинговое агентство',
    desc: 'Полная шкала: увеличить клиентов на 50% через новые соцсети.',
    data: {
      name: 'Рост клиентской базы маркетингового агентства',
      goal: 'Стать ведущим маркетинговым агентством в регионе',
      intentions: ['Увеличить клиентскую базу на 50%', 'Освоить новые каналы продвижения'],
      policies: ['Каждый клиент получает персонального менеджера', 'Минимальный бюджет клиента — $1000/мес'],
      plans: ['Запустить продвижение в 3 новых соцсетях за квартал'],
      programs: [{ name: 'Расширение присутствия в соцсетях', steps: [
        { type: 'priority', text: 'Изучите программу и распределите роли', assignee: 'Директор' },
        { type: 'priority', text: 'Наймите SMM-специалиста по новым платформам', assignee: 'HR' },
        { type: 'vital', text: 'Проводите еженедельные инспекции контента', assignee: 'Директор' },
        { type: 'conditional', text: 'УСЛОВНАЯ: Если бюджет ограничен — начните с одной платформы', assignee: 'Финдир' },
        { type: 'operating', text: 'Создайте контент-план на месяц для каждой платформы', assignee: 'SMM' },
        { type: 'operating', text: 'Запустите таргетированную рекламу на привлечение', assignee: 'Медиабайер' },
        { type: 'production', text: 'Привлекать не менее 5 новых лидов в неделю', assignee: 'Отдел продаж' },
      ]}],
      projects: [{ name: 'Проект: Запуск TikTok-направления', steps: [
        { type: 'priority', text: 'Изучить успешные кейсы конкурентов', assignee: 'SMM' },
        { type: 'operating', text: 'Создать 10 пробных видео', assignee: 'Видеограф' },
        { type: 'operating', text: 'Запустить рекламу на лучшие 3 видео', assignee: 'Медиабайер' },
      ]}],
      orders: ['Начать публикации со следующего понедельника'],
      idealPicture: 'Агентство генерирует 30+ лидов в месяц из 5 каналов',
      statistics: ['Количество лидов в неделю', 'Стоимость лида по каналам', 'Конверсия в клиентов'],
      vfp: 'Подписанный контракт с новым клиентом на $1000+/мес',
    },
  },
  {
    icon: Users,
    title: 'Пример: ТИПы сотрудников',
    desc: 'Программа по составлению технических индивидуальных программ.',
    data: {
      name: 'Технические индивидуальные программы сотрудников',
      goal: 'Каждый сотрудник имеет чёткий план развития и обучения',
      intentions: ['Повысить компетенции команды', 'Снизить текучку кадров'],
      policies: ['ТИП обновляется ежеквартально', 'Каждый ТИП согласуется с руководителем'],
      plans: ['Составить ТИПы для всех сотрудников за 2 месяца'],
      programs: [{ name: 'Составление ТИПов', steps: [
        { type: 'priority', text: 'Соберите данные по текущим навыкам каждого сотрудника', assignee: 'HR' },
        { type: 'priority', text: 'Определите целевые компетенции по должностям', assignee: 'Руководители' },
        { type: 'vital', text: 'Согласуйте каждый ТИП лично с сотрудником', assignee: 'HR' },
        { type: 'operating', text: 'Составьте план обучения на квартал', assignee: 'HR' },
        { type: 'operating', text: 'Назначьте наставников для ключевых навыков', assignee: 'Руководители' },
        { type: 'production', text: 'Составлять не менее 5 ТИПов в неделю', assignee: 'HR' },
      ]}],
      projects: [],
      orders: ['Начать сбор данных с понедельника'],
      idealPicture: 'Каждый сотрудник растёт по индивидуальному плану',
      statistics: ['Количество составленных ТИПов', 'Прогресс выполнения ТИПов (%)'],
      vfp: 'Составленный и согласованный ТИП для каждого сотрудника',
    },
  },
];

export default function AdminScaleHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [refOpen, setRefOpen] = useState(false);
  const [history, setHistory] = useState<{ id: string; name: string; date: string; data: ScaleData }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('admin_scales')
      .select('id, name, data, created_at')
      .eq('user_id', user.id)
      .eq('is_current', false)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setHistory(data.map(d => ({
            id: d.id,
            name: d.name,
            date: d.created_at,
            data: d.data as unknown as ScaleData,
          })));
        }
      });
  }, [user]);

  const loadScale = async (data: ScaleData) => {
    if (!user) return;
    // Set as current
    await supabase.from('admin_scales').update({ is_current: false }).eq('user_id', user.id).eq('is_current', true);
    await supabase.from('admin_scales').upsert({
      user_id: user.id, name: data.name || '', data: data as any, is_current: true,
    }, { onConflict: 'id' });
    navigate('/adminscale/editor');
  };

  const createNew = async () => {
    if (!user) return;
    const blank: ScaleData = {
      name: '', goal: '', intentions: [''], policies: [''], plans: [''],
      programs: [{ name: '', steps: [{ type: 'operating', text: '', assignee: '' }] }],
      projects: [], orders: [''], idealPicture: '', statistics: [''], vfp: '',
    };
    // Mark old current as not current
    await supabase.from('admin_scales').update({ is_current: false }).eq('user_id', user.id).eq('is_current', true);
    await supabase.from('admin_scales').insert({ user_id: user.id, name: '', data: blank as any, is_current: true });
    navigate('/adminscale/editor');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text) as ScaleData;
        if (data.goal !== undefined) {
          await loadScale(data);
          toast.success(`Шкала "${data.name || 'Без названия'}" импортирована`);
        } else {
          toast.error('Неверный формат JSON');
        }
      } catch {
        toast.error('Ошибка при импорте файла');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const deleteHistoryItem = async (id: string, index: number) => {
    await supabase.from('admin_scales').delete().eq('id', id);
    setHistory(h => h.filter((_, i) => i !== index));
    toast.success('Удалено из истории');
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto">
      <motion.div variants={item} className="text-center space-y-2 pt-4">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-amber-500">Добро пожаловать</p>
        <h1 className="text-3xl font-bold text-foreground">AdminScale Pro</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Создавайте административные шкалы — от Цели до ЦКП, с программами и задачами по всем правилам
        </p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="cursor-pointer border-amber-500/30 hover:border-amber-500/60 transition-colors group" onClick={createNew}>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/25 transition-colors">
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Новая шкала</p>
              <p className="text-xs text-muted-foreground mt-0.5">Создайте с нуля</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer border-border hover:border-amber-500/40 transition-colors group" onClick={() => setRefOpen(true)}>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/15 transition-colors">
              <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Справочник</p>
              <p className="text-xs text-muted-foreground mt-0.5">Полное руководство</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer border-border hover:border-amber-500/40 transition-colors group" onClick={() => fileInputRef.current?.click()}>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/15 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Импорт</p>
              <p className="text-xs text-muted-foreground mt-0.5">Загрузить JSON</p>
            </div>
          </CardContent>
        </Card>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </motion.div>

      {history.length > 0 && (
        <motion.div variants={item} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <History className="h-4 w-4" /> Сохранённые шкалы
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {history.slice(0, 6).map((h, i) => (
              <Card key={h.id} className="cursor-pointer border-border hover:border-amber-500/40 transition-colors group">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0" onClick={() => loadScale(h.data)}>
                    <p className="text-sm font-medium text-foreground truncate">{h.name}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(h.date).toLocaleDateString('ru-RU')} {new Date(h.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); deleteHistoryItem(h.id, i); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={item} className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Примеры шкал</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {examples.map((ex, i) => (
            <Card key={i} className="cursor-pointer border-border hover:border-amber-500/40 transition-colors group" onClick={() => loadScale(ex.data)}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/10 transition-colors">
                  <ex.icon className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{ex.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ex.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      <Sheet open={refOpen} onOpenChange={setRefOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[460px] p-0 overflow-y-auto">
          <SheetHeader className="px-6 pt-5 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-amber-500" /> Справочник AdminScale
            </SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-8">
            <AdminScaleReferencePanel />
          </div>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}

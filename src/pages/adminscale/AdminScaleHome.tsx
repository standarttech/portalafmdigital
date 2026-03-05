import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Building2, Heart, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';

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
      programs: [
        { name: 'Организация экскурсий', steps: [
          { type: 'priority', text: 'Прочитайте программу', assignee: 'Руководитель' },
          { type: 'priority', text: 'Назначьте ответственного за экскурсии', assignee: 'HR' },
          { type: 'vital', text: 'Поддерживайте связь с офисом в процессе', assignee: 'Координатор' },
          { type: 'conditional', text: 'УСЛОВНАЯ: Если нет гида — назначьте одного из руководителей', assignee: 'HR' },
          { type: 'operating', text: 'Составьте список из 20 потенциальных гостей', assignee: 'Маркетолог' },
          { type: 'operating', text: 'Каждую неделю приглашайте 5 человек из списка', assignee: 'Маркетолог' },
          { type: 'operating', text: 'Оформите выставку в приёмной', assignee: 'Дизайнер' },
          { type: 'production', text: 'Проводить не менее 5 экскурсий в неделю', assignee: 'Гид' },
        ]},
      ],
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
      programs: [
        { name: 'Организация вечера', steps: [
          { type: 'priority', text: 'Узнайте предпочтения жены на этот вечер', assignee: 'Вы' },
          { type: 'priority', text: 'Забронируйте столик в ресторане', assignee: 'Вы' },
          { type: 'vital', text: 'Убедитесь что дети под присмотром', assignee: 'Вы' },
          { type: 'conditional', text: 'УСЛОВНАЯ: Если ресторан занят — выберите альтернативу', assignee: 'Вы' },
          { type: 'operating', text: 'Купите цветы по дороге', assignee: 'Вы' },
          { type: 'operating', text: 'Кино → ресторан → прогулка по набережной', assignee: 'Вы' },
        ]},
      ],
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
      programs: [
        { name: 'Расширение присутствия в соцсетях', steps: [
          { type: 'priority', text: 'Изучите программу и распределите роли', assignee: 'Директор' },
          { type: 'priority', text: 'Наймите SMM-специалиста по новым платформам', assignee: 'HR' },
          { type: 'vital', text: 'Проводите еженедельные инспекции контента', assignee: 'Директор' },
          { type: 'conditional', text: 'УСЛОВНАЯ: Если бюджет ограничен — начните с одной платформы', assignee: 'Финдир' },
          { type: 'operating', text: 'Создайте контент-план на месяц для каждой платформы', assignee: 'SMM' },
          { type: 'operating', text: 'Запустите таргетированную рекламу на привлечение', assignee: 'Медиабайер' },
          { type: 'production', text: 'Привлекать не менее 5 новых лидов в неделю', assignee: 'Отдел продаж' },
        ]},
      ],
      projects: [
        { name: 'Проект: Запуск TikTok-направления', steps: [
          { type: 'priority', text: 'Изучить успешные кейсы конкурентов', assignee: 'SMM' },
          { type: 'operating', text: 'Создать 10 пробных видео', assignee: 'Видеограф' },
          { type: 'operating', text: 'Запустить рекламу на лучшие 3 видео', assignee: 'Медиабайер' },
        ]},
      ],
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
      programs: [
        { name: 'Составление ТИПов', steps: [
          { type: 'priority', text: 'Соберите данные по текущим навыкам каждого сотрудника', assignee: 'HR' },
          { type: 'priority', text: 'Определите целевые компетенции по должностям', assignee: 'Руководители' },
          { type: 'vital', text: 'Согласуйте каждый ТИП лично с сотрудником', assignee: 'HR' },
          { type: 'operating', text: 'Составьте план обучения на квартал', assignee: 'HR' },
          { type: 'operating', text: 'Назначьте наставников для ключевых навыков', assignee: 'Руководители' },
          { type: 'production', text: 'Составлять не менее 5 ТИПов в неделю', assignee: 'HR' },
        ]},
      ],
      projects: [],
      orders: ['Начать сбор данных с понедельника'],
      idealPicture: 'Каждый сотрудник растёт по индивидуальному плану',
      statistics: ['Количество составленных ТИПов', 'Прогресс выполнения ТИПов (%)'],
      vfp: 'Составленный и согласованный ТИП для каждого сотрудника',
    },
  },
];

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

export default function AdminScaleHome() {
  const navigate = useNavigate();

  const loadExample = (data: ScaleData) => {
    localStorage.setItem('adminscale_current', JSON.stringify(data));
    navigate('/adminscale/editor');
  };

  const createNew = () => {
    const blank: ScaleData = {
      name: '',
      goal: '',
      intentions: [''],
      policies: [''],
      plans: [''],
      programs: [{ name: '', steps: [{ type: 'operating', text: '', assignee: '' }] }],
      projects: [],
      orders: [''],
      idealPicture: '',
      statistics: [''],
      vfp: '',
    };
    localStorage.setItem('adminscale_current', JSON.stringify(blank));
    navigate('/adminscale/editor');
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div variants={item} className="text-center space-y-2 pt-4">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-amber-500">Добро пожаловать</p>
        <h1 className="text-3xl font-bold text-foreground">AdminScale Pro</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Создавайте административные шкалы — от Цели до ЦКП, с программами и задачами по всем правилам
        </p>
      </motion.div>

      {/* Action cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card
          className="cursor-pointer border-amber-500/30 hover:border-amber-500/60 transition-colors group"
          onClick={createNew}
        >
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/25 transition-colors">
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Новая шкала</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Создайте административную шкалу — от Цели до ЦКП, с программами и задачами
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-border hover:border-amber-500/40 transition-colors group"
          onClick={() => navigate('/adminscale/reference')}
        >
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/15 transition-colors">
              <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Справочник</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Полное руководство: структура программ, типы задач, правила проектов
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Examples */}
      <motion.div variants={item} className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Примеры шкал</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {examples.map((ex, i) => (
            <Card
              key={i}
              className="cursor-pointer border-border hover:border-amber-500/40 transition-colors group"
              onClick={() => loadExample(ex.data)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/10 transition-colors">
                  <ex.icon className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{ex.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ex.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Scale hierarchy info */}
      <motion.div variants={item}>
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">Правильная логика: Программа → Шаг (Задача) → Проект</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-secondary/50">
                <span className="text-amber-500 font-bold">📋 ПЛАН</span>
                <p className="text-muted-foreground mt-1">Широкомасштабное намерение. Ещё не разбит на конкретные действия.</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <span className="text-amber-500 font-bold">⚡ ПРОГРАММА</span>
                <p className="text-muted-foreground mt-1">Упорядоченная последовательность шагов для выполнения плана.</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <span className="text-amber-500 font-bold">🔧 ПРОЕКТ</span>
                <p className="text-muted-foreground mt-1">Создаётся только когда один шаг оказался слишком сложным.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

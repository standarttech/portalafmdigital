import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  BookOpen, Rocket, FileCode2, FormInput, ClipboardCheck, Plug,
  GitBranch, TrendingUp, FlaskConical, HeartPulse, ShieldCheck,
  Zap, Target, ArrowRight, BarChart3
} from 'lucide-react';

type SectionDef = { id: string; title: string; icon: any; content: string };

function useSections(): SectionDef[] {
  const { language } = useLanguage();
  const isRu = language === 'ru';

  if (isRu) {
    return [
      {
        id: 'overview',
        title: 'Что такое Growth OS?',
        icon: BookOpen,
        content: `Growth OS — это централизованное рабочее пространство для масштабирования маркетинга. Оно объединяет все инструменты привлечения клиентов в единый управляемый процесс.

**Ключевые возможности:**
- Визуальный редактор лендингов с секциями и live-превью
- Конструктор форм с хранением заявок и встраиванием через iframe
- Мастер онбординга с отслеживанием прогресса клиента
- Хаб интеграций для подключения API-ключей и внешних сервисов
- Маршрутизация лидов с правилами распределения
- Аналитика и эксперименты для оптимизации конверсий

**Зачем это нужно:**
Growth OS устраняет хаос из разрозненных инструментов. Вместо 10 отдельных сервисов — единая панель, где лендинг, форма, маршрутизация и аналитика связаны автоматически.`,
      },
      {
        id: 'quickstart',
        title: 'Быстрый старт — начните за 10 минут',
        icon: Target,
        content: `**Пошаговая настройка:**

1. **Создайте шаблон лендинга**
   - Перейдите в Landing Templates → New Template
   - Добавьте секции: Hero, Features, CTA
   - Настройте контент каждой секции
   - Сохраните и получите ссылку для встраивания

2. **Создайте форму сбора заявок**
   - Перейдите в Form Builder → New Form
   - Добавьте поля: имя, email, телефон, сообщение
   - Настройте страницу благодарности
   - Скопируйте iframe-код для встраивания на лендинг

3. **Настройте маршрутизацию лидов**
   - Перейдите в Lead Routing → Add Rule
   - Создайте правила: по источнику, по гео, по нише
   - Назначьте ответственных менеджеров
   - Включите уведомления

4. **Подключите интеграции**
   - Перейдите в Integrations
   - Добавьте API-ключи для CRM, мессенджеров и аналитики
   - Проверьте соединение

5. **Запустите онбординг клиента**
   - Перейдите в Onboarding → Start New Session
   - Выберите клиента и начните пошаговый процесс
   - Отслеживайте прогресс на дашборде

6. **Отслеживайте результаты**
   - Перейдите в Analytics
   - Смотрите конверсии, просмотры, заявки
   - Запускайте A/B эксперименты для оптимизации

**Ваш Growth OS полностью настроен!**`,
      },
      {
        id: 'landings',
        title: 'Шаблоны лендингов — визуальный редактор',
        icon: FileCode2,
        content: `Страница **Landing Templates** — визуальный конструктор лендинговых страниц.

**Как создать лендинг:**
1. Нажмите "New Template"
2. Введите название шаблона
3. Добавьте секции из библиотеки:
   - **Hero** — заголовок и подзаголовок с CTA
   - **Features** — блок преимуществ
   - **Testimonials** — отзывы клиентов
   - **Form** — встроенная форма заявки
   - **CTA** — призыв к действию
   - **Custom HTML** — произвольный контент
4. Настройте контент каждой секции
5. Используйте live-превью для проверки

**Встраивание:**
- Каждый шаблон получает уникальный URL
- Можно встроить через iframe на любой сайт
- Автоматически адаптируется под мобильные устройства

**Лучшие практики:**
- Один лендинг = одно предложение
- Используйте не более 5-7 секций
- Размещайте форму или CTA вверху и внизу страницы`,
      },
      {
        id: 'forms',
        title: 'Конструктор форм — сбор заявок',
        icon: FormInput,
        content: `**Form Builder** позволяет создавать формы для сбора заявок без разработчика.

**Как создать форму:**
1. Нажмите "New Form"
2. Введите название формы
3. Добавьте поля:
   - **Text** — короткий текст (имя, город)
   - **Email** — email с валидацией
   - **Phone** — номер телефона
   - **Textarea** — длинный текст (сообщение)
   - **Select** — выпадающий список
   - **Checkbox** — чекбокс (согласие и т.д.)
4. Настройте обязательность каждого поля
5. Сохраните форму

**Где используются формы:**
- Встраивание на лендинги через iframe
- Отдельные страницы для сбора заявок
- Виджеты на сайтах клиентов

**Заявки:**
- Все отправленные формы сохраняются в базе
- Можно просматривать и фильтровать заявки
- Настраивается маршрутизация заявок по правилам`,
      },
      {
        id: 'onboarding',
        title: 'Онбординг — пошаговая настройка клиента',
        icon: ClipboardCheck,
        content: `**Onboarding** — мастер пошаговой настройки нового клиента.

**Как работает:**
1. Создайте новую сессию онбординга для клиента
2. Система проведёт через все необходимые шаги:
   - Сбор информации о бизнесе
   - Подключение рекламных аккаунтов
   - Настройка целевых метрик
   - Выбор стратегии продвижения
   - Подписание документов
3. Прогресс отслеживается в реальном времени
4. Незавершённые шаги подсвечиваются

**Преимущества:**
- Стандартизированный процесс для всех клиентов
- Ничего не забывается
- Клиент видит свой прогресс
- История онбордингов сохраняется`,
      },
      {
        id: 'integrations',
        title: 'Интеграции — подключение сервисов',
        icon: Plug,
        content: `Страница **Integrations** — хаб для подключения внешних инструментов.

**Поддерживаемые интеграции:**
- **CRM системы** — передача лидов в воронку продаж
- **Мессенджеры** — Telegram боты, WhatsApp
- **Аналитика** — Google Analytics, Яндекс.Метрика
- **Рекламные платформы** — Meta, Google Ads, TikTok
- **Webhooks** — отправка данных на любой URL

**Как подключить:**
1. Выберите тип интеграции
2. Введите API-ключ или настройте webhook URL
3. Проверьте соединение кнопкой "Test"
4. Активируйте интеграцию

**Безопасность:**
- API-ключи хранятся зашифрованно
- Доступ только у администраторов
- Все действия логируются`,
      },
      {
        id: 'lead-routing',
        title: 'Маршрутизация лидов — автоматическое распределение',
        icon: GitBranch,
        content: `**Lead Routing** автоматически распределяет входящие заявки по правилам.

**Типы правил:**
- **По источнику** — разные менеджеры для разных каналов
- **По гео** — распределение по регионам
- **По нише** — специализированные менеджеры
- **Round-robin** — равномерное распределение
- **По нагрузке** — кто меньше загружен

**Как настроить:**
1. Перейдите в Lead Routing
2. Нажмите "Add Rule"
3. Задайте условие (если источник = Facebook, то...)
4. Назначьте действие:
   - Назначить ответственного
   - Добавить тег
   - Отправить уведомление
   - Переместить в CRM-пайплайн
5. Установите приоритет правила
6. Активируйте

**Порядок выполнения:**
- Правила проверяются по приоритету
- Первое совпавшее правило срабатывает
- Можно настроить несколько действий на одно правило`,
      },
      {
        id: 'analytics',
        title: 'Аналитика — отслеживание результатов',
        icon: TrendingUp,
        content: `**Analytics** отслеживает эффективность всех элементов Growth OS.

**Что отслеживается:**
- Просмотры лендингов
- Конверсия форм (просмотр → отправка)
- Количество заявок по формам и лендингам
- Источники трафика
- Воронка конверсии: просмотр → заявка → лид → клиент

**Как использовать:**
- Сравнивайте конверсию разных лендингов
- Находите формы с низкой конверсией
- Определяйте лучшие источники трафика
- Отслеживайте тренды по периодам

**Фильтры:**
- По дате (сегодня, неделя, месяц, произвольный период)
- По лендингу / форме
- По источнику трафика`,
      },
      {
        id: 'experiments',
        title: 'Эксперименты — A/B тестирование',
        icon: FlaskConical,
        content: `**Experiments** позволяет проводить A/B тесты для оптимизации конверсий.

**Как создать эксперимент:**
1. Нажмите "New Experiment"
2. Выберите объект тестирования (лендинг, форма)
3. Создайте варианты (A — контроль, B — изменение)
4. Настройте распределение трафика (50/50, 70/30 и т.д.)
5. Запустите эксперимент
6. Дождитесь статистически значимых результатов

**Что можно тестировать:**
- Заголовки лендингов
- Тексты CTA-кнопок
- Количество полей в форме
- Порядок секций на странице
- Цвета и дизайн элементов

**Лучшие практики:**
- Тестируйте одну переменную за раз
- Минимальная длительность теста — 7 дней
- Нужно минимум 100 конверсий для статзначимости
- Документируйте результаты вне зависимости от исхода`,
      },
      {
        id: 'health',
        title: 'Здоровье системы и проверки целостности',
        icon: HeartPulse,
        content: `**System Health** и **Integrity Checks** обеспечивают стабильную работу Growth OS.

**System Health мониторит:**
- Ошибки при отправке форм
- Проблемы с интеграциями
- Недоступные лендинги
- Задержки в маршрутизации лидов

**Integrity Checks проверяют:**
- Консистентность данных между таблицами
- Наличие "потерянных" заявок без маршрутизации
- Интеграции с истёкшими токенами
- Формы без привязки к лендингам

**Рекомендации:**
- Проверяйте здоровье системы раз в неделю
- Реагируйте на красные/жёлтые статусы немедленно
- Запускайте integrity checks после крупных изменений`,
      },
      {
        id: 'security',
        title: 'Безопасность и доступ',
        icon: ShieldCheck,
        content: `Growth OS защищён модульной системой доступа.

**Контроль доступа:**
- Модуль доступен только при наличии разрешения can_access_growth_os
- API-ключи интеграций хранятся зашифрованно
- Все действия записываются в аудит-лог
- RLS-политики защищают данные на уровне базы

**Лучшие практики:**
- Регулярно проверяйте права доступа пользователей
- Ротируйте API-ключи каждые 90 дней
- Просматривайте аудит-лог на предмет подозрительной активности
- Отключайте неиспользуемые интеграции`,
      },
    ];
  }

  // English (default)
  return [
    {
      id: 'overview',
      title: 'What is Growth OS?',
      icon: BookOpen,
      content: `Growth OS is a centralized workspace for scaling marketing operations. It brings all client acquisition tools into a single managed workflow.

**Key capabilities:**
- Visual landing page editor with sections and live preview
- Form builder with submission storage and iframe embedding
- Step-by-step client onboarding wizard with progress tracking
- Integration hub for API keys and external services
- Lead routing with distribution rules
- Analytics and experiments for conversion optimization

**Why Growth OS:**
Growth OS eliminates the chaos of disparate tools. Instead of 10 separate services, you get a single panel where landing pages, forms, routing, and analytics are connected automatically.`,
    },
    {
      id: 'quickstart',
      title: 'Quick Start — Get Running in 10 Minutes',
      icon: Target,
      content: `**Step-by-step setup:**

1. **Create a landing template**
   - Go to Landing Templates → New Template
   - Add sections: Hero, Features, CTA
   - Configure content for each section
   - Save and get the embed link

2. **Create a lead capture form**
   - Go to Form Builder → New Form
   - Add fields: name, email, phone, message
   - Configure the thank-you page
   - Copy the iframe code for embedding

3. **Set up lead routing**
   - Go to Lead Routing → Add Rule
   - Create rules: by source, by geo, by niche
   - Assign responsible managers
   - Enable notifications

4. **Connect integrations**
   - Go to Integrations
   - Add API keys for CRM, messengers, and analytics
   - Test the connection

5. **Start client onboarding**
   - Go to Onboarding → Start New Session
   - Select the client and begin the step-by-step process
   - Track progress on the dashboard

6. **Monitor results**
   - Go to Analytics
   - View conversions, page views, submissions
   - Run A/B experiments for optimization

**Your Growth OS is fully set up!**`,
    },
    {
      id: 'landings',
      title: 'Landing Templates — Visual Editor',
      icon: FileCode2,
      content: `The **Landing Templates** page is a visual constructor for landing pages.

**How to create a landing page:**
1. Click "New Template"
2. Enter the template name
3. Add sections from the library:
   - **Hero** — headline and subheadline with CTA
   - **Features** — benefits block
   - **Testimonials** — client reviews
   - **Form** — embedded lead capture form
   - **CTA** — call to action
   - **Custom HTML** — arbitrary content
4. Configure each section's content
5. Use live preview to check the result

**Embedding:**
- Each template gets a unique URL
- Can be embedded via iframe on any website
- Automatically responsive on mobile devices

**Best practices:**
- One landing page = one offer
- Use no more than 5-7 sections
- Place form or CTA at top and bottom of page`,
    },
    {
      id: 'forms',
      title: 'Form Builder — Lead Capture',
      icon: FormInput,
      content: `**Form Builder** lets you create lead capture forms without a developer.

**How to create a form:**
1. Click "New Form"
2. Enter the form name
3. Add fields:
   - **Text** — short text (name, city)
   - **Email** — email with validation
   - **Phone** — phone number
   - **Textarea** — long text (message)
   - **Select** — dropdown list
   - **Checkbox** — checkbox (consent, etc.)
4. Configure required status for each field
5. Save the form

**Where forms are used:**
- Embedding on landing pages via iframe
- Standalone submission pages
- Widgets on client websites

**Submissions:**
- All form submissions are stored in the database
- Can be viewed and filtered
- Submission routing configured via rules`,
    },
    {
      id: 'onboarding',
      title: 'Onboarding — Step-by-Step Client Setup',
      icon: ClipboardCheck,
      content: `**Onboarding** is a step-by-step wizard for setting up new clients.

**How it works:**
1. Create a new onboarding session for the client
2. The system guides through all necessary steps:
   - Collecting business information
   - Connecting ad accounts
   - Setting target metrics
   - Choosing promotion strategy
   - Signing documents
3. Progress is tracked in real-time
4. Incomplete steps are highlighted

**Benefits:**
- Standardized process for all clients
- Nothing gets forgotten
- Client sees their progress
- Onboarding history is preserved`,
    },
    {
      id: 'integrations',
      title: 'Integrations — Connecting Services',
      icon: Plug,
      content: `The **Integrations** page is a hub for connecting external tools.

**Supported integrations:**
- **CRM systems** — push leads to sales pipelines
- **Messengers** — Telegram bots, WhatsApp
- **Analytics** — Google Analytics, Yandex.Metrica
- **Ad platforms** — Meta, Google Ads, TikTok
- **Webhooks** — send data to any URL

**How to connect:**
1. Choose integration type
2. Enter API key or configure webhook URL
3. Test the connection
4. Activate the integration

**Security:**
- API keys stored encrypted
- Admin-only access
- All actions are logged`,
    },
    {
      id: 'lead-routing',
      title: 'Lead Routing — Automatic Distribution',
      icon: GitBranch,
      content: `**Lead Routing** automatically distributes incoming submissions by rules.

**Rule types:**
- **By source** — different managers for different channels
- **By geo** — distribution by region
- **By niche** — specialized managers
- **Round-robin** — even distribution
- **By load** — whoever has the least workload

**How to set up:**
1. Go to Lead Routing
2. Click "Add Rule"
3. Set the condition (if source = Facebook, then...)
4. Assign action:
   - Assign responsible person
   - Add tag
   - Send notification
   - Move to CRM pipeline
5. Set rule priority
6. Activate

**Execution order:**
- Rules are checked by priority
- First matching rule fires
- Multiple actions can be configured per rule`,
    },
    {
      id: 'analytics',
      title: 'Analytics — Tracking Results',
      icon: TrendingUp,
      content: `**Analytics** tracks the performance of all Growth OS assets.

**What's tracked:**
- Landing page views
- Form conversion rate (view → submission)
- Number of submissions by form and landing page
- Traffic sources
- Conversion funnel: view → submission → lead → client

**How to use:**
- Compare conversion rates across landing pages
- Find forms with low conversion
- Identify best traffic sources
- Track trends over time periods

**Filters:**
- By date (today, week, month, custom)
- By landing page / form
- By traffic source`,
    },
    {
      id: 'experiments',
      title: 'Experiments — A/B Testing',
      icon: FlaskConical,
      content: `**Experiments** lets you run A/B tests to optimize conversions.

**How to create an experiment:**
1. Click "New Experiment"
2. Select the test subject (landing page, form)
3. Create variants (A — control, B — change)
4. Configure traffic distribution (50/50, 70/30, etc.)
5. Start the experiment
6. Wait for statistically significant results

**What you can test:**
- Landing page headlines
- CTA button text
- Number of form fields
- Section order on page
- Colors and design elements

**Best practices:**
- Test one variable at a time
- Minimum test duration: 7 days
- Need at least 100 conversions for significance
- Document results regardless of outcome`,
    },
    {
      id: 'health',
      title: 'System Health & Integrity Checks',
      icon: HeartPulse,
      content: `**System Health** and **Integrity Checks** ensure stable Growth OS operations.

**System Health monitors:**
- Form submission errors
- Integration issues
- Unavailable landing pages
- Lead routing delays

**Integrity Checks verify:**
- Data consistency between tables
- "Lost" submissions without routing
- Integrations with expired tokens
- Forms without landing page links

**Recommendations:**
- Check system health weekly
- Respond to red/yellow statuses immediately
- Run integrity checks after major changes`,
    },
    {
      id: 'security',
      title: 'Security & Access Control',
      icon: ShieldCheck,
      content: `Growth OS is protected by the modular access system.

**Access control:**
- Module available only with can_access_growth_os permission
- Integration API keys stored encrypted
- All actions recorded in audit log
- RLS policies protect data at database level

**Best practices:**
- Regularly review user access rights
- Rotate API keys every 90 days
- Review audit log for suspicious activity
- Disable unused integrations`,
    },
  ];
}

function renderContent(content: string) {
  return content.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return <h4 key={i} className="text-foreground font-semibold mt-3 mb-1 text-sm">{trimmed.replace(/\*\*/g, '')}</h4>;
    }
    if (trimmed.startsWith('- **')) {
      const match = trimmed.match(/^- \*\*(.+?)\*\*\s*[—–-]?\s*(.*)$/);
      if (match) {
        return <p key={i} className="ml-4 text-xs my-0.5">• <span className="font-medium text-foreground">{match[1]}</span> — {match[2]}</p>;
      }
    }
    if (trimmed.startsWith('- ')) {
      return <p key={i} className="ml-4 text-xs my-0.5">• {trimmed.slice(2)}</p>;
    }
    if (/^\d+\./.test(trimmed)) {
      return <p key={i} className="ml-2 text-xs my-0.5">{trimmed}</p>;
    }
    if (trimmed === '') return <br key={i} />;
    return <p key={i} className="text-xs my-1">{trimmed}</p>;
  });
}

export default function GosGuidePage() {
  const { language } = useLanguage();
  const isRu = language === 'ru';
  const sections = useSections();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-[hsl(160,70%,45%)]" />
          {isRu ? 'Руководство Growth OS' : 'Growth OS Guide'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isRu
            ? 'Полная документация по использованию рабочего пространства для масштабирования маркетинга'
            : 'Complete documentation for using the marketing scaling workspace'}
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: isRu ? 'Лендинги' : 'Landings', desc: isRu ? 'Визуальный редактор' : 'Visual editor', icon: FileCode2 },
          { label: isRu ? 'Формы' : 'Forms', desc: isRu ? 'Сбор заявок' : 'Lead capture', icon: FormInput },
          { label: isRu ? 'Маршрутизация' : 'Routing', desc: isRu ? 'Распределение лидов' : 'Lead distribution', icon: GitBranch },
          { label: isRu ? 'Аналитика' : 'Analytics', desc: isRu ? 'Результаты' : 'Results tracking', icon: BarChart3 },
        ].map(item => (
          <Card key={item.label} className="text-center">
            <CardContent className="pt-4 pb-3 px-3">
              <item.icon className="h-6 w-6 mx-auto text-[hsl(160,70%,45%)] mb-1.5" />
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Accordion type="multiple" defaultValue={['overview', 'quickstart']} className="space-y-2">
        {sections.map(section => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2.5">
                <section.icon className="h-4 w-4 text-[hsl(160,70%,45%)]" />
                <span className="text-sm font-semibold">{section.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                {renderContent(section.content)}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

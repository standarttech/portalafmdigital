import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  BookOpen, Bot, MonitorSmartphone, BrainCircuit, Lightbulb, FileStack,
  Rocket, TrendingUp, Brain, Zap, ImageIcon, Settings, Users, Target
} from 'lucide-react';

type SectionDef = { id: string; title: string; icon: any; content: string };

function useSections(): SectionDef[] {
  const { language } = useLanguage();
  const isRu = language === 'ru';

  if (isRu) {
    return [
      {
        id: 'overview',
        title: 'Что такое AI Ads Copilot?',
        icon: Bot,
        content: `AI Ads Copilot — это интеллектуальная система управления рекламой, которая использует ИИ для анализа эффективности кампаний, генерации рекомендаций по оптимизации, создания черновиков кампаний и выполнения изменений на рекламных платформах (Meta, Google, TikTok).

**Основной рабочий процесс:**
1. Подключить рекламные аккаунты → 2. ИИ анализирует эффективность → 3. Получить рекомендации → 4. Создать гипотезы → 5. Создать черновики кампаний → 6. Запустить и мониторить → 7. Оптимизировать непрерывно

**Ключевые возможности:**
- Автоматический анализ эффективности по всем подключённым аккаунтам
- ИИ-генерация рекомендаций с приоритизацией
- Фреймворк тестирования гипотез
- Конструктор черновиков кампаний с валидацией
- Запуск кампаний в один клик
- Мониторинг результатов в реальном времени
- Автоматические пресеты оптимизации`,
      },
      {
        id: 'accounts',
        title: 'Рекламные аккаунты — подключение платформ',
        icon: MonitorSmartphone,
        content: `Страница **Рекламные аккаунты** управляет подключениями к рекламным платформам.

**Как подключить аккаунт:**
1. Перейдите в Рекламные аккаунты
2. Нажмите "Connect Account"
3. Выберите клиента и подключение к платформе
4. Введите ID аккаунта на платформе
5. Аккаунт начнёт синхронизировать данные

**Поддерживаемые платформы:**
- Meta (Facebook/Instagram) — через Meta Marketing API
- Google Ads — через Google Ads API
- TikTok Ads — через TikTok Marketing API

**Синхронизация данных:**
- Метрики синхронизируются автоматически каждый час
- Ручная синхронизация доступна через Sync Monitor
- Исторические данные импортируются при первом подключении (до 90 дней)

**Устранение проблем:**
- "Нет данных" — проверьте, действителен ли токен подключения
- "Сбой синхронизации" — проверьте ID аккаунта и разрешения
- "Устаревшие данные" — запустите ручную синхронизацию`,
      },
      {
        id: 'analysis',
        title: 'ИИ Анализ — анализ эффективности',
        icon: BrainCircuit,
        content: `Страница **ИИ Анализ** запускает ИИ-анализ рекламных данных.

**Как запустить анализ:**
1. Выберите клиента из выпадающего списка
2. Выберите тип анализа:
   - **Обзор эффективности** — общая оценка здоровья аккаунта
   - **Аудит кампаний** — детальный анализ на уровне кампаний
   - **Анализ аудиторий** — оценка эффективности таргетинга
   - **Анализ креативов** — сравнение эффективности рекламных материалов
   - **Оптимизация бюджета** — рекомендации по распределению расходов
3. Опционально выберите конкретный рекламный аккаунт
4. Нажмите "Run Analysis"

**Что анализирует ИИ:**
- Эффективность расходов (CPC, CPM, CPL тренды)
- Здоровье воронки конверсии (CTR → Лиды → Покупки)
- Распределение бюджета между кампаниями
- Сигналы усталости от креативов
- Пересечение и насыщение аудиторий
- Паттерны эффективности по дням/времени

**Сессии анализа:**
- Каждый анализ создаёт сессию, группирующую связанные инсайты
- Сессии сохраняются и доступны для повторного просмотра
- Результаты включают структурированные данные и текстовое резюме`,
      },
      {
        id: 'recommendations',
        title: 'Рекомендации — ИИ-инсайты',
        icon: TrendingUp,
        content: `**Рекомендации** — это ИИ-сгенерированные действия на основе результатов анализа.

**Типы рекомендаций:**
- **Бюджет** — перераспределить расходы на более эффективные кампании
- **Таргетинг** — скорректировать аудитории на основе данных конверсий
- **Креативы** — обновить или ротировать рекламные материалы
- **Ставки** — скорректировать стратегию или суммы ставок
- **Расписание** — оптимизировать время показа рекламы

**Уровни приоритета:**
- 🔴 **Высокий** — значительное влияние, действовать немедленно
- 🟡 **Средний** — важно, но не срочно
- 🟢 **Низкий** — полезно, оптимизировать при удобном случае

**Работа с рекомендациями:**
1. Просмотрите детали и обоснование рекомендации
2. Принять → создаёт гипотезу для тестирования
3. Отклонить → помечает как нерелевантную (с указанием причины)
4. Отложить → сохраняет для дальнейшего рассмотрения

**Рекомендации питают систему гипотез, создавая структурированный пайплайн от инсайта к действию.**`,
      },
      {
        id: 'hypotheses',
        title: 'Гипотезы — фреймворк тестирования',
        icon: Lightbulb,
        content: `Страница **Гипотезы** управляет идеями для тестирования и валидирует их через структурированные эксперименты.

**Создание гипотезы:**
1. Нажмите "New Hypothesis"
2. Определите:
   - **Заголовок**: Чёткое, тестируемое утверждение
   - **Описание**: Что вы ожидаете и почему
   - **Тип**: Бюджет, таргетинг, креатив, ставка и т.д.
   - **Ожидаемый эффект**: Количественная оценка улучшения
3. Привяжите к рекомендации (опционально)

**Жизненный цикл гипотезы:**
1. **Черновик** — начальная идея, дорабатывается
2. **Готова** — валидирована и готова к тестированию
3. **Тестируется** — активный эксперимент запущен
4. **Подтверждена** — результаты подтверждают гипотезу
5. **Опровергнута** — результаты опровергают гипотезу
6. **Архивирована** — больше не актуальна

**Лучшие практики:**
- Одна переменная на гипотезу (не тестируйте несколько изменений одновременно)
- Установите чёткие критерии успеха до начала теста
- Проводите тесты достаточно долго для статзначимости (обычно 7-14 дней)
- Документируйте выводы вне зависимости от результата`,
      },
      {
        id: 'drafts',
        title: 'Черновики кампаний — создание кампаний',
        icon: FileStack,
        content: `**Черновики кампаний** — место, где вы создаёте и настраиваете кампании перед запуском.

**Создание черновика:**
1. Нажмите "New Draft"
2. Выберите клиента и платформу
3. Настройте параметры кампании:
   - **Название кампании**: Описательное название
   - **Цель**: Конверсии, Трафик, Узнаваемость и т.д.
   - **Бюджет**: Общий бюджет и режим распределения (дневной/на весь период)
   - **Стратегия ставок**: Минимальная цена, ограничение цены и т.д.
   - **Тип закупки**: Аукцион или Охват и Частота
4. Добавьте группы объявлений с настройкой таргетинга
5. Добавьте объявления с креативами

**Валидация черновика:**
- Черновики автоматически проверяются на соответствие требованиям платформы
- Проверки: лимиты бюджета, полнота таргетинга, спецификации креативов
- Ошибки показываются инлайн с чёткими инструкциями по исправлению

**Источники черновиков:**
- Ручное создание
- Из рекомендации
- Из гипотезы
- ИИ-генерация (из результатов анализа)

**После валидации черновики можно отправить на утверждение и затем запустить на рекламной платформе.**`,
      },
      {
        id: 'creatives',
        title: 'Креативы — библиотека ассетов',
        icon: ImageIcon,
        content: `Страница **Креативы** — централизованная библиотека всех рекламных материалов.

**Поддерживаемые типы ассетов:**
- Изображения (JPG, PNG, WebP)
- Видео (MP4, MOV)
- Внешние ссылки (хостинг медиа)
- Текстовые ссылки

**Управление креативами:**
- Загрузка новых ассетов перетаскиванием
- Тегирование для удобной фильтрации
- Привязка ассетов к конкретным клиентам
- Отслеживание использования в объявлениях
- Архивирование устаревших материалов

**Лучшие практики:**
- Используйте единые правила именования
- Тегируйте ассеты по кампании, теме и формату
- Регулярно проверяйте эффективность ассетов
- Архивируйте слабо работающие креативы`,
      },
      {
        id: 'executions',
        title: 'Запуски — запуск и мониторинг',
        icon: Rocket,
        content: `Страница **Запуски** управляет запуском кампаний и отслеживает их статус.

**Рабочий процесс запуска:**
1. Выберите утверждённый черновик кампании
2. Просмотрите превью (что будет создано на платформе)
3. Подтвердите запуск
4. Мониторьте статус выполнения

**Статусы запуска:**
- **Ожидает** — ждёт утверждения
- **Утверждён** — готов к запуску
- **Запускается** — отправляется на рекламную платформу
- **Активен** — успешно запущен и работает
- **Ошибка** — запуск не удался (смотрите детали ошибки)
- **Приостановлен** — вручную остановлен после запуска

**Мониторинг после запуска:**
- Снимки эффективности синхронизируются автоматически
- Сравнение фактических и ожидаемых результатов
- Рекомендации ИИ обновляются на основе live-данных`,
      },
      {
        id: 'intelligence',
        title: 'Intelligence — рыночные инсайты',
        icon: Brain,
        content: `Страница **Intelligence** предоставляет ИИ-инсайты по рынку и конкурентам.

**Доступная аналитика:**
- Бенчмаркинг эффективности относительно отраслевых стандартов
- Трендовый анализ для вашей рекламной вертикали
- Сезонные паттерны и планирование
- Кросс-клиентское сравнение эффективности (анонимизированное)

**Как использовать:**
- Используйте бенчмарки для установки реалистичных KPI
- Определяйте сезонные возможности раньше конкурентов
- Следите за трендами в форматах рекламных креативов
- Сравнивайте эффективность клиента с группой сверстников`,
      },
      {
        id: 'optimization',
        title: 'Оптимизация — автоматические действия',
        icon: Zap,
        content: `Страница **Оптимизация** управляет автоматическими действиями по оптимизации кампаний.

**Типы действий:**
- **Пауза** — остановить неэффективные объявления/группы
- **Бюджет** — увеличить/уменьшить бюджеты по эффективности
- **Ставки** — изменить суммы ставок или стратегию
- **Расписание** — скорректировать расписание показов
- **Статус** — включить/выключить элементы кампании

**Рабочий процесс:**
1. ИИ или пресеты генерируют предложения оптимизации
2. Каждое действие показывает обоснование и ожидаемый эффект
3. Просмотр и утверждение (или отклонение с причиной)
4. Утверждённые действия выполняются через API платформы
5. Результаты записываются и отслеживаются

**Безопасность:**
- Все действия требуют явного утверждения (без авто-выполнения по умолчанию)
- Ограничения на максимальное изменение бюджета
- Периоды ожидания между последовательными оптимизациями
- Полный аудит-трейл каждого действия`,
      },
      {
        id: 'presets',
        title: 'Пресеты — правила автоматизации',
        icon: Settings,
        content: `**Пресеты** определяют переиспользуемые правила оптимизации, срабатывающие автоматически.

**Создание пресета:**
1. Нажмите "New Preset"
2. Определите условие:
   - **Нет показов** — кампания без показов после X часов
   - **Много расхода без лидов** — расход превышает порог, лидов нет
   - **Низкий CTR** — CTR ниже порога при минимуме показов
   - **Высокий CPC** — CPC превышает порог при минимуме кликов
3. Установите предлагаемое действие (пауза, изменение бюджета и т.д.)
4. Установите приоритет (высокий, средний, низкий)
5. Активируйте пресет

**Как работают пресеты:**
- Пресеты сканируют данные кампаний периодически
- При выполнении условий генерируют действия оптимизации
- Действия требуют утверждения, если не включено авто-выполнение
- Отслеживается количество срабатываний и время последнего срабатывания

**Примеры пресетов:**
- "Пауза объявлений с 0 лидов после $50 расхода" — ловит неконвертящие объявления
- "Алерт если CTR < 0.5% после 1000 показов" — помечает слабые креативы
- "Снизить бюджет если CPC > $5 после 100 кликов" — контролирует расходы`,
      },
      {
        id: 'client-report',
        title: 'Отчёт клиенту — отчёты по эффективности',
        icon: Users,
        content: `Страница **Отчёт клиенту** генерирует клиентские отчёты по эффективности.

**Содержание отчёта:**
- Ключевые метрики (расход, лиды, CPC, CTR, ROAS)
- Тренды эффективности за выбранный период
- Разбивка по кампаниям
- ИИ-инсайты и рекомендации (на клиентском языке)
- Следующие шаги и планируемые оптимизации

**Генерация отчёта:**
1. Выберите клиента
2. Выберите отчётный период
3. Просмотрите и скорректируйте контент
4. Экспортируйте в PDF или поделитесь через клиентский портал

**Лучшие практики:**
- Генерируйте отчёты еженедельно или раз в две недели
- Подчёркивайте победы и улучшения, а не только числа
- Включайте конкретные следующие шаги
- Используйте клиентский портал для самообслуживания`,
      },
      {
        id: 'quickstart',
        title: 'Быстрый старт — начните за 10 минут',
        icon: Target,
        content: `**Пошаговая настройка:**

1. **Подключите рекламный аккаунт**
   - Перейдите в Рекламные аккаунты → Connect Account
   - Подключите ваш Meta/Google/TikTok аккаунт

2. **Дождитесь первой синхронизации**
   - Данные синхронизируются автоматически (может занять несколько минут)
   - Проверьте прогресс в Sync Monitor

3. **Запустите первый анализ**
   - Перейдите в ИИ Анализ
   - Выберите клиента и запустите "Обзор эффективности"
   - Просмотрите ИИ-инсайты

4. **Просмотрите рекомендации**
   - Перейдите в Рекомендации
   - Примите высокоприоритетные рекомендации
   - Они автоматически создадут гипотезы

5. **Создайте черновик кампании**
   - Перейдите в Черновики → New Draft
   - Настройте на основе рекомендации
   - Валидируйте и отправьте на утверждение

6. **Настройте пресеты оптимизации**
   - Перейдите в Пресеты
   - Включите правило "Нет лидов после $50 расхода"
   - Настройте пороги под ваших клиентов

7. **Сгенерируйте отчёт клиенту**
   - Перейдите в Отчёт клиенту
   - Выберите клиента и период
   - Экспортируйте или поделитесь через портал

**Теперь вы управляете рекламой с помощью ИИ!**`,
      },
    ];
  }

  // English (default)
  return [
    {
      id: 'overview', title: 'What is AI Ads Copilot?', icon: Bot,
      content: `AI Ads Copilot is an intelligent advertising management system that uses AI to analyze campaign performance, generate optimization recommendations, create campaign drafts, and execute changes across ad platforms (Meta, Google, TikTok).

**Core workflow:**
1. Connect ad accounts → 2. AI analyzes performance → 3. Get recommendations → 4. Create hypotheses → 5. Draft campaigns → 6. Launch & monitor → 7. Optimize continuously

**Key capabilities:**
- Automated performance analysis across all connected ad accounts
- AI-generated optimization recommendations with priority scoring
- Hypothesis-driven testing framework
- Campaign draft builder with validation
- One-click campaign launching to ad platforms
- Real-time performance monitoring
- Automated optimization presets`,
    },
    {
      id: 'accounts', title: 'Ad Accounts — Connecting Platforms', icon: MonitorSmartphone,
      content: `The **Ad Accounts** page manages connections to advertising platforms.

**Connecting an ad account:**
1. Navigate to Ad Accounts
2. Click "Connect Account"
3. Select the client and platform connection
4. Enter the platform account ID
5. The account will start syncing performance data

**Supported platforms:**
- Meta (Facebook/Instagram) — via Meta Marketing API
- Google Ads — via Google Ads API
- TikTok Ads — via TikTok Marketing API

**Data sync:**
- Performance metrics sync automatically every hour
- Manual sync available via the Sync Monitor
- Historical data imported on first connection (up to 90 days)

**Troubleshooting:**
- "No data" — check if the platform connection token is valid
- "Sync failed" — verify the account ID and permissions
- "Stale data" — trigger a manual sync from the Sync Monitor page`,
    },
    {
      id: 'analysis', title: 'AI Analysis — Performance Intelligence', icon: BrainCircuit,
      content: `The **AI Analysis** page runs AI-powered analysis on your advertising data.

**How to run an analysis:**
1. Select a client from the dropdown
2. Choose analysis type:
   - **Performance Review** — overall account health assessment
   - **Campaign Audit** — detailed campaign-level analysis
   - **Audience Analysis** — targeting effectiveness review
   - **Creative Analysis** — ad creative performance comparison
   - **Budget Optimization** — spend allocation recommendations
3. Optionally select specific ad account
4. Click "Run Analysis"

**What the AI analyzes:**
- Spend efficiency (CPC, CPM, CPL trends)
- Conversion funnel health (CTR → Lead rate → Purchase rate)
- Budget allocation across campaigns
- Creative fatigue signals
- Audience overlap and saturation
- Day/time performance patterns

**Analysis sessions:**
- Each analysis creates a session that groups related insights
- Sessions are saved and can be revisited
- Results include structured data + natural language summary`,
    },
    {
      id: 'recommendations', title: 'Recommendations — AI Insights', icon: TrendingUp,
      content: `**Recommendations** are AI-generated action items based on analysis results.

**Recommendation types:**
- **Budget** — Reallocate spend to better-performing campaigns
- **Targeting** — Adjust audiences based on conversion data
- **Creative** — Refresh or rotate ad creatives
- **Bid** — Adjust bidding strategy or amounts
- **Schedule** — Optimize ad scheduling based on performance patterns

**Priority levels:**
- 🔴 **High** — Significant impact, act immediately
- 🟡 **Medium** — Important but not urgent
- 🟢 **Low** — Nice to have, optimize when convenient

**Working with recommendations:**
1. Review the recommendation details and rationale
2. Accept → creates a hypothesis for testing
3. Dismiss → marks as not relevant (with reason)
4. Defer → keeps for later review

**Recommendations feed into the hypothesis system, creating a structured testing pipeline from insight to execution.**`,
    },
    {
      id: 'hypotheses', title: 'Hypotheses — Testing Framework', icon: Lightbulb,
      content: `The **Hypotheses** page manages your testing ideas and validates them through structured experiments.

**Creating a hypothesis:**
1. Click "New Hypothesis"
2. Define:
   - **Title**: Clear, testable statement
   - **Description**: What you expect to happen and why
   - **Type**: Budget, targeting, creative, bid, etc.
   - **Expected Impact**: Quantify the expected improvement
3. Link to a recommendation (optional)

**Hypothesis lifecycle:**
1. **Draft** — Initial idea, being refined
2. **Ready** — Validated and ready for testing
3. **Testing** — Active experiment running
4. **Validated** — Results confirm the hypothesis
5. **Invalidated** — Results disprove the hypothesis
6. **Archived** — No longer relevant

**Best practices:**
- One variable per hypothesis
- Set clear success criteria before starting the test
- Run tests for a statistically significant duration (usually 7-14 days)
- Document learnings regardless of outcome`,
    },
    {
      id: 'drafts', title: 'Campaign Drafts — Building Campaigns', icon: FileStack,
      content: `**Campaign Drafts** is where you build and configure campaigns before launching them.

**Creating a draft:**
1. Click "New Draft"
2. Select client and platform
3. Configure campaign settings:
   - **Campaign Name**: Descriptive name
   - **Objective**: Conversions, Traffic, Awareness, etc.
   - **Budget**: Total budget and distribution mode
   - **Bid Strategy**: Lowest cost, cost cap, bid cap, etc.
   - **Buying Type**: Auction or Reach & Frequency
4. Add ad sets with targeting configuration
5. Add ads with creative assets

**Draft validation:**
- Drafts are automatically validated against platform requirements
- Validation checks: budget limits, targeting completeness, creative specs
- Errors are shown inline with clear fix instructions

**Once validated, drafts can be sent for approval and then launched to the ad platform.**`,
    },
    {
      id: 'creatives', title: 'Creatives — Asset Library', icon: ImageIcon,
      content: `The **Creatives** page is your centralized library for all advertising assets.

**Supported asset types:**
- Images (JPG, PNG, WebP)
- Videos (MP4, MOV)
- External URLs (hosted media)
- Text-only references

**Managing creatives:**
- Upload new assets with drag-and-drop
- Tag assets for easy filtering
- Link assets to specific clients
- Track which ads use each creative
- Archive outdated assets`,
    },
    {
      id: 'executions', title: 'Executions — Launch & Monitor', icon: Rocket,
      content: `The **Executions** page manages campaign launches and tracks their status.

**Launch workflow:**
1. Select an approved campaign draft
2. Review the launch preview
3. Confirm the launch
4. Monitor the execution status

**Execution statuses:**
- **Pending** — Waiting for approval
- **Approved** — Ready to launch
- **Launching** — Being pushed to the ad platform
- **Active** — Successfully launched and running
- **Failed** — Launch failed (check error details)
- **Paused** — Manually paused after launch

**Post-launch monitoring:**
- Performance snapshots are synced automatically
- Compare actual vs expected performance
- AI recommendations update based on live data`,
    },
    {
      id: 'intelligence', title: 'Intelligence — Market Insights', icon: Brain,
      content: `The **Intelligence** page provides AI-powered market and competitive insights.

**Available intelligence:**
- Performance benchmarking against industry standards
- Trend analysis for your advertising vertical
- Seasonal patterns and planning insights
- Cross-client performance comparisons (anonymized)

**How to use:**
- Use benchmarks to set realistic KPI targets
- Identify seasonal opportunities before competitors
- Spot emerging trends in ad creative formats
- Compare client performance against peer group`,
    },
    {
      id: 'optimization', title: 'Optimization — Automated Actions', icon: Zap,
      content: `The **Optimization** page manages automated optimization actions on live campaigns.

**Optimization action types:**
- **Pause** — Stop underperforming ads/adsets
- **Budget adjust** — Increase/decrease budgets
- **Bid adjust** — Modify bid amounts or strategy
- **Schedule change** — Adjust ad scheduling
- **Status change** — Enable/disable campaign elements

**Safety features:**
- All actions require explicit approval
- Maximum budget change limits
- Cooldown periods between optimizations
- Full audit trail of every action taken`,
    },
    {
      id: 'presets', title: 'Presets — Automation Rules', icon: Settings,
      content: `**Presets** define reusable optimization rules that trigger automatically.

**Creating a preset:**
1. Click "New Preset"
2. Define the rule condition:
   - **No impressions** — Campaign has no impressions after X hours
   - **High spend no leads** — Spend exceeds threshold with zero leads
   - **Low CTR** — CTR below threshold
   - **High CPC** — CPC exceeds threshold
3. Set the proposed action
4. Set priority level
5. Activate the preset

**Preset examples:**
- "Pause ads with 0 leads after $50 spend"
- "Alert if CTR < 0.5% after 1000 impressions"
- "Reduce budget if CPC > $5 after 100 clicks"`,
    },
    {
      id: 'client-report', title: 'Client Report — Shareable Performance Reports', icon: Users,
      content: `The **Client Report** page generates client-facing performance summaries.

**Report contents:**
- Key performance metrics (spend, leads, CPC, CTR, ROAS)
- Performance trends over the selected period
- Campaign-level breakdown
- AI-generated insights and recommendations
- Next steps and planned optimizations

**Generating a report:**
1. Select the client
2. Choose the reporting period
3. Review and customize the content
4. Export as PDF or share via the client portal`,
    },
    {
      id: 'quickstart', title: 'Quick Start — Get Running in 10 Minutes', icon: Target,
      content: `**Step-by-step setup:**

1. **Connect an ad account**
   - Go to Ad Accounts → Connect Account
   - Link your Meta/Google/TikTok ad account

2. **Wait for initial sync**
   - Data syncs automatically (may take a few minutes)
   - Check Sync Monitor for progress

3. **Run your first analysis**
   - Go to AI Analysis
   - Select client and run a "Performance Review"

4. **Review recommendations**
   - Go to Recommendations
   - Accept high-priority items

5. **Create a campaign draft**
   - Go to Campaign Drafts → New Draft
   - Configure based on the recommendation
   - Validate and submit for approval

6. **Set up optimization presets**
   - Go to Presets
   - Enable default rules
   - Customize thresholds for your clients

7. **Generate a client report**
   - Go to Client Report
   - Select client and period
   - Export or share via portal

**You're now running an AI-powered advertising operation!**`,
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

export default function AiAdsGuidePage() {
  const { language } = useLanguage();
  const isRu = language === 'ru';
  const sections = useSections();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-[hsl(270,70%,55%)]" />
          {isRu ? 'Руководство AI Ads Copilot' : 'AI Ads Copilot Guide'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isRu
            ? 'Полная документация по использованию ИИ-системы управления рекламой'
            : 'Complete documentation for using AI-powered advertising management'}
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: isRu ? 'Анализ' : 'Analyze', desc: isRu ? 'ИИ-анализ эффективности' : 'AI performance review', icon: BrainCircuit },
          { label: isRu ? 'Рекомендации' : 'Recommend', desc: isRu ? 'Умные предложения' : 'Smart suggestions', icon: TrendingUp },
          { label: isRu ? 'Черновики' : 'Build', desc: isRu ? 'Создание кампаний' : 'Campaign drafts', icon: FileStack },
          { label: isRu ? 'Оптимизация' : 'Optimize', desc: isRu ? 'Авто-действия' : 'Auto-actions', icon: Zap },
        ].map(item => (
          <Card key={item.label} className="text-center">
            <CardContent className="pt-4 pb-3 px-3">
              <item.icon className="h-6 w-6 mx-auto text-[hsl(270,70%,55%)] mb-1.5" />
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
                <section.icon className="h-4 w-4 text-[hsl(270,70%,55%)]" />
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

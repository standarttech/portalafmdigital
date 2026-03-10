import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  BookOpen, Kanban, Users2, Webhook, Link2, Settings, BarChart3,
  Bot, MessageSquare, Zap, Shield, Target, ArrowRightLeft, Bell
} from 'lucide-react';

type SectionDef = { id: string; title: string; icon: any; content: string };

function useSections(): SectionDef[] {
  const { language } = useLanguage();
  const isRu = language === 'ru';

  if (isRu) {
    return [
      {
        id: 'overview',
        title: 'Что такое CRM модуль?',
        icon: BookOpen,
        content: `CRM модуль — это полноценная система управления лидами и продажами, встроенная в платформу AFM Digital. Она обеспечивает сквозную аналитику от первого контакта до закрытия сделки.

**Основные возможности:**
- Канбан-доска для визуального управления воронкой продаж
- Табличное представление всех лидов с фильтрацией и сортировкой
- Автоматический приём лидов через вебхуки из внешних источников
- Интеграция с Telegram-ботами для уведомлений
- Подключение внешних CRM для двусторонней синхронизации
- Аналитика воронки с расчётом конверсий на каждом этапе
- Кастомные стадии воронки для каждого клиента

**Рабочий процесс:**
1. Настроить воронку (стадии) для клиента
2. Подключить источники лидов (вебхуки, формы, внешние CRM)
3. Управлять лидами на канбан-доске
4. Отслеживать конверсии и метрики в аналитике
5. Получать уведомления о новых лидах в Telegram`,
      },
      {
        id: 'pipeline',
        title: 'Pipeline — канбан-доска',
        icon: Kanban,
        content: `**Pipeline** — основной рабочий экран CRM с визуальным представлением воронки продаж.

**Как работать с канбан-доской:**
- Каждая колонка — стадия воронки (Новый → Квалифицирован → Бронь → Продажа)
- Перетаскивайте карточки лидов между стадиями для обновления статуса
- Клик по карточке открывает детальную панель с полной информацией
- Фильтр по клиенту позволяет видеть только нужные лиды

**Детали лида:**
- Контактная информация (имя, email, телефон)
- Источник (UTM-метки, кампания, реферер)
- История активности и переходов между стадиями
- Заметки команды
- Кастомные поля
- Сумма сделки и приоритет

**Внутреннее пространство AFM Digital:**
Доступен отдельный воркспейс «AFM Digital» для управления собственными лидами агентства, полностью изолированный от клиентских данных.`,
      },
      {
        id: 'leads',
        title: 'Leads — табличный вид',
        icon: Users2,
        content: `**Leads** — табличное представление всех лидов с расширенными возможностями фильтрации.

**Возможности таблицы:**
- Сортировка по любому полю (дата, имя, стадия, источник)
- Фильтрация по клиенту, стадии, источнику, дате
- Быстрый поиск по имени, email или телефону
- Массовые операции (перемещение, удаление)
- Экспорт данных

**Создание лида вручную:**
1. Нажмите «+ Новый лид»
2. Заполните обязательные поля (имя, клиент)
3. Укажите контактные данные, источник и стадию
4. Добавьте заметку при необходимости

**Дедупликация:**
Система автоматически проверяет уникальность по email и телефону. При совпадении — обновляет существующий лид вместо создания дубликата.`,
      },
      {
        id: 'analytics',
        title: 'Аналитика — воронка и метрики',
        icon: BarChart3,
        content: `**Аналитика** показывает ключевые метрики эффективности CRM.

**Основные показатели:**
- **Всего лидов** — общее количество лидов за период
- **Продажи** — количество закрытых сделок (стадия Won)
- **Выручка** — суммарная стоимость закрытых сделок
- **Средний чек** — средняя сумма сделки
- **Конверсия** — процент лидов, дошедших до продажи

**Воронка продаж:**
Визуальная диаграмма показывает конверсию на каждом этапе:
Новый → Квалифицирован → Бронь → Продажа
С процентами перехода между стадиями.

**Разбивка по источникам:**
- Сколько лидов пришло из каждого источника
- Конверсия по источникам
- Помогает определить наиболее качественные каналы привлечения

**Метрики рекламных расходов (при подключении Meta Ads):**
- CPL (стоимость лида)
- CPQL (стоимость квалифицированного лида)
- Cost per Sale
- ROAS`,
      },
      {
        id: 'webhooks',
        title: 'Вебхуки — приём лидов',
        icon: Webhook,
        content: `**Вебхуки** позволяют автоматически принимать лиды из внешних источников.

**Как настроить:**
1. Перейдите в CRM → Webhooks
2. Создайте новый эндпоинт, выбрав клиента
3. Скопируйте сгенерированный URL и Secret Key
4. Вставьте URL в настройки внешнего источника (Meta Ads, лендинг, Zapier)

**Поддерживаемые источники:**
- Meta Lead Ads (Facebook/Instagram)
- Лендинги и формы на сайтах
- Zapier / Make.com
- Любая система с поддержкой исходящих вебхуков
- GoHighLevel, Bitrix24, AmoCRM, HubSpot

**Безопасность:**
- Каждый эндпоинт защищён уникальным Secret Key
- HMAC-подпись для верификации запросов
- Подробные логи каждого входящего запроса
- Автоматические повторы при ошибках

**Формат данных:**
\`\`\`json
{
  "first_name": "Иван",
  "last_name": "Иванов",
  "email": "ivan@example.com",
  "phone": "+7999123456",
  "source": "meta_ads",
  "utm_source": "facebook",
  "utm_campaign": "spring_sale"
}
\`\`\``,
      },
      {
        id: 'integrations',
        title: 'Интеграции — боты и внешние CRM',
        icon: Link2,
        content: `Раздел **Интеграции** управляет подключениями к Telegram-ботам и внешним CRM-системам.

**Telegram-боты:**
- Подключайте несколько ботов для разных клиентов
- Каждый бот хранит токен безопасно в зашифрованном хранилище
- Тестирование подключения одним кликом
- Выбор бота при настройке рассылок

**Как добавить Telegram-бота:**
1. Создайте бота через @BotFather в Telegram
2. Скопируйте полученный токен
3. В разделе «Боты» нажмите «+ Добавить бота»
4. Выберите клиента, введите имя и токен
5. Нажмите «Тест» для проверки подключения

**Внешние CRM:**
- Подключение к GoHighLevel, HubSpot, Bitrix24, AmoCRM
- Автоматическая синхронизация лидов каждый час
- Настройка маппинга полей
- Мониторинг статуса синхронизации
- Возможность отключить или перенастроить в любой момент

**Как подключить внешнюю CRM:**
1. Нажмите «+ Подключить CRM»
2. Выберите провайдера
3. Введите API-ключ и URL (при необходимости)
4. Настройте маппинг полей
5. Протестируйте подключение
6. Лиды начнут синхронизироваться автоматически`,
      },
      {
        id: 'settings',
        title: 'Настройки — воронки и поля',
        icon: Settings,
        content: `**Настройки** позволяют конфигурировать воронки продаж и кастомные поля.

**Управление воронками:**
- Создавайте отдельные воронки для каждого клиента
- Настраивайте стадии: название, порядок, цвет
- Стадии по умолчанию: Новый → Квалифицирован → Бронь → Продажа → Потерян
- Добавляйте промежуточные стадии для более детального отслеживания

**Кастомные поля:**
- Создавайте дополнительные поля для лидов
- Типы полей: текст, число, выбор из списка, дата
- Привязка к конкретной воронке или ко всем
- Обязательные и необязательные поля

**Клиент-специфичные настройки:**
- Каждый клиент может иметь свою уникальную воронку
- Разные стадии = разные бизнес-процессы
- Привязка стадий к бизнес-событиям для расчёта ROAS и CPQL`,
      },
      {
        id: 'notifications',
        title: 'Уведомления и рассылки',
        icon: Bell,
        content: `CRM интегрирован с системой уведомлений и рассылок платформы.

**Автоматические уведомления:**
- Новый лид создан
- Лид перешёл на следующую стадию
- Сделка выиграна / проиграна
- Ошибка синхронизации с внешней CRM

**Каналы уведомлений:**
- Telegram (через подключённых ботов)
- In-app уведомления
- Email уведомления

**Рассылки:**
- В разделе «Рассылки» можно выбрать конкретного бота для отправки
- Поддержка шаблонов сообщений
- Фильтрация получателей по группам

**Настройка:**
1. Подключите Telegram-бота в интеграциях
2. Настройте триггеры событий в вебхуках
3. При создании рассылки выберите нужного бота из выпадающего списка`,
      },
      {
        id: 'security',
        title: 'Безопасность и доступ',
        icon: Shield,
        content: `CRM модуль защищён многоуровневой системой безопасности.

**Контроль доступа:**
- Только авторизованные сотрудники агентства имеют доступ к CRM
- Администраторы видят всех клиентов
- Обычные сотрудники видят только назначенных клиентов
- Row Level Security (RLS) на уровне базы данных

**Защита данных:**
- API-ключи и токены ботов хранятся в зашифрованном хранилище (Vault)
- Вебхуки защищены Secret Key и HMAC-подписями
- Все действия записываются в аудит-лог
- Дедупликация предотвращает дублирование данных

**Лучшие практики:**
- Регулярно проверяйте логи вебхуков на ошибки
- Ротируйте API-ключи внешних CRM каждые 90 дней
- Не делитесь Secret Key вебхуков в открытых каналах
- Используйте отдельных ботов для разных клиентов`,
      },
    ];
  }

  return [
    {
      id: 'overview',
      title: 'What is the CRM Module?',
      icon: BookOpen,
      content: `The CRM module is a full-featured lead management and sales system built into the AFM Digital platform. It provides end-to-end analytics from first contact to deal closure.

**Core capabilities:**
- Kanban board for visual pipeline management
- Table view of all leads with filtering and sorting
- Automatic lead ingestion via webhooks from external sources
- Telegram bot integration for notifications
- External CRM connections for two-way data sync
- Funnel analytics with conversion rates at each stage
- Custom pipeline stages per client

**Workflow:**
1. Configure pipeline stages for the client
2. Connect lead sources (webhooks, forms, external CRMs)
3. Manage leads on the kanban board
4. Track conversions and metrics in analytics
5. Receive notifications about new leads in Telegram`,
    },
    {
      id: 'pipeline',
      title: 'Pipeline — Kanban Board',
      icon: Kanban,
      content: `**Pipeline** is the main CRM workspace with a visual representation of the sales funnel.

**How to use the kanban board:**
- Each column represents a pipeline stage (New → Qualified → Booked → Won)
- Drag and drop lead cards between stages to update status
- Click a card to open the detail panel with full information
- Filter by client to focus on specific leads

**Lead details:**
- Contact information (name, email, phone)
- Source (UTM tags, campaign, referrer)
- Activity history and stage transitions
- Team notes
- Custom fields
- Deal value and priority

**AFM Digital workspace:**
A separate "AFM Digital" workspace is available for managing the agency's own leads, fully isolated from client data.`,
    },
    {
      id: 'leads',
      title: 'Leads — Table View',
      icon: Users2,
      content: `**Leads** provides a tabular view of all leads with advanced filtering capabilities.

**Table features:**
- Sort by any field (date, name, stage, source)
- Filter by client, stage, source, date
- Quick search by name, email, or phone
- Bulk operations (move, delete)
- Data export

**Creating a lead manually:**
1. Click "+ New Lead"
2. Fill in required fields (name, client)
3. Add contact details, source, and stage
4. Add a note if needed

**Deduplication:**
The system automatically checks uniqueness by email and phone. On match — updates the existing lead instead of creating a duplicate.`,
    },
    {
      id: 'analytics',
      title: 'Analytics — Funnel & Metrics',
      icon: BarChart3,
      content: `**Analytics** displays key CRM performance metrics.

**Key indicators:**
- **Total Leads** — total number of leads for the period
- **Sales** — number of closed deals (Won stage)
- **Revenue** — total value of closed deals
- **Avg Deal Value** — average deal amount
- **Close Rate** — percentage of leads reaching sale

**Sales funnel:**
Visual diagram showing conversion at each stage:
New → Qualified → Booked → Won
With percentage transitions between stages.

**Source breakdown:**
- How many leads came from each source
- Conversion rate by source
- Helps identify the highest-quality acquisition channels

**Ad spend metrics (when Meta Ads connected):**
- CPL (Cost Per Lead)
- CPQL (Cost Per Qualified Lead)
- Cost per Sale
- ROAS`,
    },
    {
      id: 'webhooks',
      title: 'Webhooks — Lead Ingestion',
      icon: Webhook,
      content: `**Webhooks** enable automatic lead ingestion from external sources.

**Setup process:**
1. Go to CRM → Webhooks
2. Create a new endpoint by selecting a client
3. Copy the generated URL and Secret Key
4. Paste the URL into your external source settings (Meta Ads, landing page, Zapier)

**Supported sources:**
- Meta Lead Ads (Facebook/Instagram)
- Landing pages and website forms
- Zapier / Make.com
- Any system with outgoing webhook support
- GoHighLevel, Bitrix24, AmoCRM, HubSpot

**Security:**
- Each endpoint is protected with a unique Secret Key
- HMAC signature verification for requests
- Detailed logs of every incoming request
- Automatic retries on failure

**Data format:**
\`\`\`json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "source": "meta_ads",
  "utm_source": "facebook",
  "utm_campaign": "spring_sale"
}
\`\`\``,
    },
    {
      id: 'integrations',
      title: 'Integrations — Bots & External CRMs',
      icon: Link2,
      content: `The **Integrations** section manages connections to Telegram bots and external CRM systems.

**Telegram bots:**
- Connect multiple bots for different clients
- Each bot token is stored securely in encrypted vault
- One-click connection testing
- Bot selection when setting up broadcasts

**How to add a Telegram bot:**
1. Create a bot via @BotFather in Telegram
2. Copy the received token
3. In the "Bots" section, click "+ Add Bot"
4. Select a client, enter name and token
5. Click "Test" to verify the connection

**External CRMs:**
- Connect to GoHighLevel, HubSpot, Bitrix24, AmoCRM
- Automatic lead sync every hour
- Custom field mapping
- Sync status monitoring
- Disconnect or reconfigure anytime

**How to connect an external CRM:**
1. Click "+ Connect CRM"
2. Select the provider
3. Enter API key and URL (if required)
4. Configure field mapping
5. Test the connection
6. Leads will start syncing automatically`,
    },
    {
      id: 'settings',
      title: 'Settings — Pipelines & Fields',
      icon: Settings,
      content: `**Settings** lets you configure sales pipelines and custom fields.

**Pipeline management:**
- Create separate pipelines for each client
- Configure stages: name, order, color
- Default stages: New → Qualified → Booked → Won → Lost
- Add intermediate stages for more detailed tracking

**Custom fields:**
- Create additional fields for leads
- Field types: text, number, select, date
- Link to specific pipeline or all
- Required and optional fields

**Client-specific settings:**
- Each client can have a unique pipeline
- Different stages = different business processes
- Link stages to business events for ROAS and CPQL calculation`,
    },
    {
      id: 'notifications',
      title: 'Notifications & Broadcasts',
      icon: Bell,
      content: `CRM integrates with the platform's notification and broadcast system.

**Automatic notifications:**
- New lead created
- Lead moved to next stage
- Deal won / lost
- External CRM sync error

**Notification channels:**
- Telegram (via connected bots)
- In-app notifications
- Email notifications

**Broadcasts:**
- In the "Broadcasts" section, select a specific bot for sending
- Message template support
- Filter recipients by groups

**Setup:**
1. Connect a Telegram bot in integrations
2. Configure event triggers in webhooks
3. When creating a broadcast, select the desired bot from the dropdown`,
    },
    {
      id: 'security',
      title: 'Security & Access',
      icon: Shield,
      content: `The CRM module is protected by a multi-layered security system.

**Access control:**
- Only authorized agency staff can access CRM
- Admins see all clients
- Regular staff see only assigned clients
- Row Level Security (RLS) at database level

**Data protection:**
- API keys and bot tokens stored in encrypted vault
- Webhooks protected by Secret Key and HMAC signatures
- All actions recorded in audit log
- Deduplication prevents data duplication

**Best practices:**
- Regularly check webhook logs for errors
- Rotate external CRM API keys every 90 days
- Don't share webhook Secret Keys in open channels
- Use separate bots for different clients`,
    },
  ];
}

export default function CrmGuidePage() {
  const { language } = useLanguage();
  const isRu = language === 'ru';
  const sections = useSections();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          {isRu ? 'Руководство по CRM' : 'CRM Guide'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRu
            ? 'Полное руководство по работе с CRM модулем — воронки, лиды, интеграции и аналитика'
            : 'Complete guide to the CRM module — pipelines, leads, integrations, and analytics'}
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-4 flex items-start gap-3">
          <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {isRu ? 'Быстрый старт' : 'Quick Start'}
            </p>
            <p className="text-muted-foreground mt-1">
              {isRu
                ? '1. Настройте воронку в Настройках → 2. Создайте вебхук для приёма лидов → 3. Подключите Telegram-бота для уведомлений → 4. Управляйте лидами на канбан-доске → 5. Отслеживайте конверсии в Аналитике'
                : '1. Configure pipeline in Settings → 2. Create webhook for lead ingestion → 3. Connect Telegram bot for notifications → 4. Manage leads on kanban board → 5. Track conversions in Analytics'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={['overview']} className="space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border border-border/60 rounded-lg overflow-hidden bg-card px-1"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:bg-muted/30 rounded-t-lg">
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                  {section.title}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                  {section.content.split('\n').map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <br key={i} />;
                    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                      return <p key={i} className="font-semibold text-foreground mt-3 mb-1">{trimmed.replace(/\*\*/g, '')}</p>;
                    }
                    if (trimmed.startsWith('- ')) {
                      return <li key={i} className="ml-4 list-disc">{renderBold(trimmed.slice(2))}</li>;
                    }
                    if (/^\d+\./.test(trimmed)) {
                      return <li key={i} className="ml-4 list-decimal">{renderBold(trimmed.replace(/^\d+\.\s*/, ''))}</li>;
                    }
                    if (trimmed.startsWith('```')) return null;
                    return <p key={i}>{renderBold(trimmed)}</p>;
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

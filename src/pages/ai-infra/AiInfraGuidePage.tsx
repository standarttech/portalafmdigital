import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/i18n/LanguageContext';
import { BookOpen, Server, GitBranch, ListTodo, ScrollText, HeartPulse, Shield, Zap, Settings, Plug, Key, ArrowRight } from 'lucide-react';

type SectionDef = {
  id: string;
  title: string;
  icon: any;
  content: string;
};

function useSections(): SectionDef[] {
  const { language } = useLanguage();
  const isRu = language === 'ru';

  if (isRu) {
    return [
      {
        id: 'overview',
        title: 'Что такое ИИ Инфраструктура?',
        icon: BookOpen,
        content: `ИИ Инфраструктура — это централизованный слой управления всеми ИИ-провайдерами платформы. Она позволяет администраторам регистрировать, настраивать, мониторить и маршрутизировать ИИ-задачи к различным провайдерам (OpenAI, Google, Anthropic и др.) без изменения кода приложения.

**Ключевые преимущества:**
- Единое место для управления всеми API-ключами и конфигурациями
- Интеллектуальная маршрутизация задач к лучшему доступному провайдеру
- Мониторинг здоровья в реальном времени и автоматический failover
- Полный аудит-лог каждого выполнения ИИ-задачи
- Оптимизация расходов через стратегии выбора провайдера`,
      },
      {
        id: 'quickstart',
        title: 'Быстрый старт',
        icon: Zap,
        content: `**Начните за 5 минут:**

1. **Добавьте провайдера**
   - Перейдите в Провайдеры → Добавить провайдера
   - Введите имя, slug и тип провайдера
   - Добавьте ваш API-ключ через "Управление секретами"

2. **Создайте маршрут**
   - Перейдите в Маршруты → Добавить маршрут
   - Выберите тип задачи (например, "text_generation")
   - Назначьте провайдера основным
   - Установите таймаут 30 секунд и лимит повторов 2

3. **Проверьте здоровье**
   - Перейдите на страницу Здоровье
   - Запустите проверку здоровья для вашего провайдера
   - Убедитесь, что статус "healthy"

4. **Тестируйте**
   - Перейдите в AI Ads Copilot или любой модуль с ИИ
   - Запустите анализ — он автоматически использует настроенного провайдера
   - Проверьте Задачи для просмотра результата`,
      },
      {
        id: 'add-ai-step-by-step',
        title: '🔧 Пошаговая инструкция: Подключение нового ИИ',
        icon: Plug,
        content: `**Как подключить нового ИИ-провайдера (ChatGPT, Gemini, Claude и т.д.):**

**Шаг 1 — Получите API-ключ**
- Перейдите на сайт провайдера:
  - OpenAI: https://platform.openai.com/api-keys
  - Google AI (Gemini): https://aistudio.google.com/apikey
  - Anthropic (Claude): https://console.anthropic.com/settings/keys
- Создайте новый API-ключ
- Скопируйте ключ (он показывается только один раз!)

**Шаг 2 — Зарегистрируйте провайдера в платформе**
- Перейдите в AI Infra → Провайдеры
- Нажмите "Add Provider"
- Заполните:
  - Name: например "OpenAI GPT-4" или "Google Gemini"
  - Slug: например "openai-gpt4" (уникальный идентификатор)
  - Provider Type: openai / google / anthropic
  - Category: llm
  - Base URL: оставьте пустым (используется по умолчанию)
  - Auth Type: api_key
- Включите нужные возможности (Chat, Text и т.д.)
- Сохраните

**Шаг 3 — Добавьте API-ключ**
- На карточке провайдера нажмите "Manage Secrets"
- Добавьте ваш API-ключ
- Ключ будет зашифрован и сохранён безопасно

**Шаг 4 — Создайте маршрут**
- Перейдите в Маршруты → Add Route
- Task Type: выберите тип задачи (text_generation, campaign_analysis и т.д.)
- Primary Provider: ваш новый провайдер
- Fallback Provider: опционально (для резервирования)
- Timeout: 30-60 секунд
- Retry Limit: 2-3
- Активируйте маршрут

**Шаг 5 — Проверьте работоспособность**
- Перейдите в Здоровье
- Нажмите "Run Health Check" для вашего провайдера
- Убедитесь, что статус зелёный (Healthy)

**Шаг 6 — Используйте в задачах**
- Теперь все ИИ-задачи с выбранным типом будут автоматически использовать вашего провайдера
- Перейдите в AI Ads Copilot → AI Analysis и запустите анализ
- Проверьте результат в Задачах

**💡 Совет по экономии:**
- Google Gemini Flash — быстрый и почти бесплатный (большой бесплатный лимит)
- OpenAI GPT-4o-mini — дешевле GPT-4, но достаточно мощный
- Подписка ChatGPT Plus НЕ даёт API-доступ — нужен отдельный API-ключ

**⚠️ Важно:**
- API-ключ ≠ подписка. Даже если у вас есть ChatGPT Plus, для API нужен отдельный ключ на platform.openai.com
- Google Gemini Flash имеет бесплатный tier ~1500 запросов/день
- Anthropic Claude даёт $5 бесплатных кредитов при регистрации`,
      },
      {
        id: 'how-to-use',
        title: '📋 Как использовать ИИ в рабочих задачах',
        icon: ArrowRight,
        content: `**После подключения провайдера, ИИ автоматически доступен в следующих модулях:**

**1. AI Ads Copilot → AI Analysis**
- Выберите клиента → Тип анализа → "Run Analysis"
- ИИ проанализирует рекламные данные и выдаст инсайты
- Результаты включают рекомендации по оптимизации

**2. AI Ads Copilot → Recommendations**
- ИИ автоматически генерирует рекомендации по улучшению кампаний
- Приоритизированные действия: бюджет, таргетинг, креативы

**3. AI Ads Copilot → Intelligence**
- Рыночные инсайты и бенчмаркинг на основе ИИ
- Сравнение с индустриальными стандартами

**4. AI Ads Copilot → Client Report**
- Автоматическая генерация клиентских отчётов с ИИ-инсайтами
- Экспорт в PDF или через портал

**5. Общие ИИ-задачи**
- Любой модуль, отправляющий задачу с типом, совпадающим с вашим маршрутом
- Система автоматически выбирает лучшего провайдера

**Мониторинг использования:**
- Задачи → все выполненные ИИ-запросы
- Логи → детальные трассировки каждого вызова
- Здоровье → статус провайдеров в реальном времени`,
      },
      {
        id: 'providers',
        title: 'Провайдеры — Управление ИИ-сервисами',
        icon: Server,
        content: `Страница **Провайдеры** — место регистрации и настройки ИИ-сервисов.

**Как добавить провайдера:**
1. Нажмите "Add Provider"
2. Заполните данные:
   - **Name**: Отображаемое имя (например, "OpenAI Production")
   - **Slug**: Уникальный идентификатор (например, "openai-prod")
   - **Provider Type**: Базовый сервис (openai, google, anthropic и т.д.)
   - **Category**: Классификация (llm, image, embedding и т.д.)
   - **Base URL**: API endpoint (опционально)
   - **Auth Type**: Способ аутентификации (api_key, oauth и т.д.)
3. Настройте возможности (chat, text, images, structured output, workflows)
4. Сохраните

**Лучшие практики:**
- Зарегистрируйте минимум 2 провайдера для резервирования
- Отметьте одного провайдера как "Default" для каждой категории
- Отключайте провайдеров на время обслуживания вместо удаления`,
      },
      {
        id: 'routes',
        title: 'Маршруты — Конфигурация маршрутизации задач',
        icon: GitBranch,
        content: `**Маршруты** определяют, как ИИ-задачи распределяются между провайдерами.

**Как работает маршрутизация:**
1. ИИ-задача отправляется с определённым типом
2. Маршрутизатор находит все активные маршруты для этого типа
3. Маршруты сортируются по приоритету
4. Выбирается основной провайдер маршрута с наивысшим приоритетом
5. При сбое используется резервный провайдер

**Советы:**
- Создавайте отдельные маршруты для разных типов задач
- Используйте дешёвые провайдеры для простых задач
- Устанавливайте подходящие таймауты`,
      },
      {
        id: 'security',
        title: 'Безопасность и контроль доступа',
        icon: Shield,
        content: `ИИ Инфраструктура доступна только администраторам.

**Контроль доступа:**
- Модуль защищён правом can_access_ai_infra
- Только AgencyAdmin имеет доступ по умолчанию
- Секреты провайдеров хранятся в зашифрованном хранилище
- API-ключи никогда не показываются на фронтенде

**Лучшие практики безопасности:**
- Регулярно ротируйте API-ключи
- Используйте отдельные ключи для продакшена и разработки
- Мониторьте аудит-лог на предмет несанкционированного доступа`,
      },
    ];
  }

  // English (default)
  return [
    {
      id: 'overview',
      title: 'What is AI Infrastructure?',
      icon: BookOpen,
      content: `AI Infrastructure is the centralized management layer for all AI providers used across the platform. It allows administrators to register, configure, monitor, and route AI tasks to different providers (OpenAI, Google, Anthropic, etc.) without changing application code.

**Key benefits:**
- Single place to manage all AI provider credentials and configurations
- Intelligent routing of AI tasks to the best available provider
- Real-time health monitoring and automatic failover
- Complete audit trail of every AI task execution
- Cost optimization through provider selection strategies`,
    },
    {
      id: 'quickstart',
      title: 'Quick Start Guide',
      icon: Zap,
      content: `**Get started in 5 minutes:**

1. **Add a provider**
   - Go to Providers → Add Provider
   - Enter name, slug, and provider type
   - Add your API key via "Manage Secrets"

2. **Create a route**
   - Go to Routes → Add Route
   - Select task type (e.g., "text_generation")
   - Assign your provider as primary
   - Set timeout to 30 seconds and retry limit to 2

3. **Verify health**
   - Go to Health page
   - Run a health check on your new provider
   - Confirm status shows "healthy"

4. **Test it**
   - Go to AI Ads Copilot or any module that uses AI
   - Run an analysis — it will automatically use your configured provider
   - Check Tasks page to see the execution result`,
    },
    {
      id: 'add-ai-step-by-step',
      title: '🔧 Step-by-Step: Adding a New AI Provider',
      icon: Plug,
      content: `**How to connect a new AI provider (ChatGPT, Gemini, Claude, etc.):**

**Step 1 — Get an API key**
- Go to the provider's website:
  - OpenAI: https://platform.openai.com/api-keys
  - Google AI (Gemini): https://aistudio.google.com/apikey
  - Anthropic (Claude): https://console.anthropic.com/settings/keys
- Create a new API key
- Copy the key (it's shown only once!)

**Step 2 — Register the provider in the platform**
- Go to AI Infra → Providers
- Click "Add Provider"
- Fill in:
  - Name: e.g. "OpenAI GPT-4" or "Google Gemini"
  - Slug: e.g. "openai-gpt4" (unique identifier)
  - Provider Type: openai / google / anthropic
  - Category: llm
  - Base URL: leave blank (uses default)
  - Auth Type: api_key
- Enable needed capabilities (Chat, Text, etc.)
- Save

**Step 3 — Add the API key**
- On the provider card, click "Manage Secrets"
- Add your API key
- The key will be encrypted and stored securely

**Step 4 — Create a route**
- Go to Routes → Add Route
- Task Type: choose the task type (text_generation, campaign_analysis, etc.)
- Primary Provider: your new provider
- Fallback Provider: optional (for redundancy)
- Timeout: 30-60 seconds
- Retry Limit: 2-3
- Activate the route

**Step 5 — Verify it works**
- Go to Health
- Click "Run Health Check" for your provider
- Make sure the status is green (Healthy)

**Step 6 — Use in tasks**
- Now all AI tasks matching that type will automatically use your provider
- Go to AI Ads Copilot → AI Analysis and run an analysis
- Check results in Tasks

**💡 Cost-saving tip:**
- Google Gemini Flash — fast and nearly free (generous free tier)
- OpenAI GPT-4o-mini — cheaper than GPT-4 but still powerful
- ChatGPT Plus subscription does NOT give API access — you need a separate API key

**⚠️ Important:**
- API key ≠ subscription. Even with ChatGPT Plus, you need a separate key at platform.openai.com
- Google Gemini Flash has a free tier of ~1500 requests/day
- Anthropic Claude gives $5 free credits on signup`,
    },
    {
      id: 'how-to-use',
      title: '📋 How to Use AI in Your Tasks',
      icon: ArrowRight,
      content: `**After connecting a provider, AI is automatically available in these modules:**

**1. AI Ads Copilot → AI Analysis**
- Select client → Analysis type → "Run Analysis"
- AI analyzes advertising data and provides insights
- Results include optimization recommendations

**2. AI Ads Copilot → Recommendations**
- AI automatically generates campaign improvement recommendations
- Prioritized actions: budget, targeting, creatives

**3. AI Ads Copilot → Intelligence**
- AI-powered market insights and benchmarking
- Comparison with industry standards

**4. AI Ads Copilot → Client Report**
- Auto-generate client reports with AI insights
- Export as PDF or share via portal

**5. General AI Tasks**
- Any module submitting a task matching your route's task type
- The system automatically selects the best provider

**Monitoring usage:**
- Tasks → all executed AI requests
- Logs → detailed traces of every call
- Health → real-time provider status`,
    },
    {
      id: 'providers',
      title: 'Providers — Managing AI Services',
      icon: Server,
      content: `The **Providers** page is where you register and configure AI service providers.

**How to add a provider:**
1. Click "Add Provider"
2. Fill in the provider details:
   - **Name**: Display name (e.g., "OpenAI Production")
   - **Slug**: Unique identifier (e.g., "openai-prod")
   - **Provider Type**: The underlying service (openai, google, anthropic, etc.)
   - **Category**: Classification (llm, image, embedding, etc.)
   - **Base URL**: API endpoint (optional, uses default if blank)
   - **Auth Type**: How to authenticate (api_key, oauth, etc.)
3. Configure capabilities (chat, text, images, structured output, workflows)
4. Save the provider

**Best practices:**
- Register at least 2 providers for redundancy
- Mark one provider as "Default" for each category
- Disable providers during maintenance instead of deleting them`,
    },
    {
      id: 'routes',
      title: 'Routes — Task Routing Configuration',
      icon: GitBranch,
      content: `**Routes** define how AI tasks are distributed across providers.

**How routing works:**
1. An AI task is submitted with a specific task type
2. The router finds all active routes matching that task type
3. Routes are sorted by priority
4. The primary provider of the highest-priority route is selected
5. If it fails, the fallback provider is tried

**Tips:**
- Create separate routes for different task types to optimize cost vs quality
- Use faster/cheaper providers for simple tasks
- Set appropriate timeouts`,
    },
    {
      id: 'security',
      title: 'Security & Access Control',
      icon: Shield,
      content: `AI Infrastructure is restricted to administrators only.

**Access control:**
- Module is guarded by can_access_ai_infra permission
- Only AgencyAdmin role has access by default
- Provider secrets are stored encrypted
- API keys are never exposed in the frontend

**Security best practices:**
- Rotate API keys regularly
- Use separate API keys for production and development
- Monitor the audit log for unauthorized access attempts`,
    },
  ];
}

export default function AiInfraGuidePage() {
  const sections = useSections();
  const { language } = useLanguage();
  const isRu = language === 'ru';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-[hsl(200,70%,55%)]" />
          {isRu ? 'Руководство по ИИ Инфраструктуре' : 'AI Infrastructure Guide'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isRu
            ? 'Полная документация по настройке и управлению ИИ-провайдерами, маршрутизации и мониторингу'
            : 'Complete documentation for configuring and managing AI providers, routing, and monitoring'}
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: isRu ? 'Провайдеры' : 'Providers', desc: isRu ? 'Настройка' : 'Register & configure', icon: Server },
          { label: isRu ? 'Маршруты' : 'Routes', desc: isRu ? 'Маршрутизация' : 'Task routing', icon: GitBranch },
          { label: isRu ? 'Задачи' : 'Tasks', desc: isRu ? 'Очередь' : 'Execution queue', icon: ListTodo },
          { label: isRu ? 'Здоровье' : 'Health', desc: isRu ? 'Мониторинг' : 'Monitoring', icon: HeartPulse },
        ].map(item => (
          <Card key={item.label} className="text-center">
            <CardContent className="pt-4 pb-3 px-3">
              <item.icon className="h-6 w-6 mx-auto text-[hsl(200,70%,55%)] mb-1.5" />
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Accordion type="multiple" defaultValue={['overview', 'quickstart', 'add-ai-step-by-step']} className="space-y-2">
        {sections.map(section => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2.5">
                <section.icon className="h-4 w-4 text-[hsl(200,70%,55%)]" />
                <span className="text-sm font-semibold">{section.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                    return <h4 key={i} className="text-foreground font-semibold mt-3 mb-1 text-sm">{trimmed.replace(/\*\*/g, '')}</h4>;
                  }
                  if (trimmed.startsWith('- **')) {
                    const match = trimmed.match(/^- \*\*(.+?)\*\*\s*[—–:-]?\s*(.*)$/);
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
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

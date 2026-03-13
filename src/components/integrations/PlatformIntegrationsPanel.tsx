import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Palette, Globe, Loader2, CheckCircle2, Key, Settings, Link2, ShieldCheck, Eye, EyeOff,
  ImageIcon, BarChart3, Target, Megaphone, Zap, Brain, Search, Video, FileText, Layout, Webhook,
  DollarSign, ExternalLink, Info, HardDrive, Cloud, Workflow, Bot,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';

interface Integration {
  id: string;
  integration_type: string;
  display_name: string;
  is_active: boolean;
  config: any;
  secret_ref: string | null;
}

interface IntegrationField {
  key: string;
  label: string;
  labelRu: string;
  placeholder: string;
}

interface IntegrationConfig {
  type: string;
  name: string;
  icon: React.ReactNode;
  category: 'ads' | 'creative' | 'analytics' | 'automation' | 'landing' | 'storage';
  description: string;
  descriptionRu: string;
  docsUrl: string;
  secretLabel: string;
  pricing: string;
  pricingRu: string;
  setupSteps: string[];
  setupStepsRu: string[];
  useCases: string[];
  useCasesRu: string[];
  fields: IntegrationField[];
}

const INTEGRATIONS_CONFIG: IntegrationConfig[] = [
  // ── Ads Platforms ──
  {
    type: 'meta_ads_management',
    name: 'Meta Ads Management',
    icon: <Globe className="h-5 w-5 text-blue-400" />,
    category: 'ads',
    description: 'Full access to campaign management: create/edit campaigns, pixels, audiences, lookalikes, lead forms. Requires Meta App with ads_management permission.',
    descriptionRu: 'Полный доступ к управлению кампаниями: создание/редактирование кампаний, пикселей, аудиторий, лукэлайков, лид-форм. Требуется Meta App с разрешением ads_management.',
    docsUrl: 'https://developers.facebook.com/docs/marketing-apis/',
    secretLabel: 'Meta Management Access Token',
    pricing: 'Free (Meta Business). System User Token required with ads_management scope.',
    pricingRu: 'Бесплатно (Meta Business). Нужен System User Token с правом ads_management.',
    setupSteps: [
      '1. Go to business.facebook.com → Business Settings → System Users',
      '2. Create System User with Admin role',
      '3. Generate Token with scopes: ads_management, ads_read, pages_read_engagement, leads_retrieval',
      '4. Copy App ID from your Meta App settings',
      '5. Paste Token and App ID below',
    ],
    setupStepsRu: [
      '1. Перейдите в business.facebook.com → Настройки бизнеса → Системные пользователи',
      '2. Создайте System User с ролью Администратор',
      '3. Сгенерируйте токен с правами: ads_management, ads_read, pages_read_engagement, leads_retrieval',
      '4. Скопируйте App ID из настроек Meta App',
      '5. Вставьте Token и App ID ниже',
    ],
    useCases: ['Campaign creation & management', 'Pixel setup & configuration', 'Custom & Lookalike Audiences', 'Lead Form creation', 'Automated rules & budgets'],
    useCasesRu: ['Создание и управление кампаниями', 'Настройка пикселей', 'Кастомные и Lookalike аудитории', 'Создание лид-форм', 'Автоматические правила и бюджеты'],
    fields: [
      { key: 'app_id', label: 'Meta App ID', labelRu: 'ID Meta App', placeholder: 'e.g. 123456789' },
      { key: 'default_pixel_id', label: 'Default Pixel ID (optional)', labelRu: 'ID пикселя по умолчанию (необязательно)', placeholder: 'e.g. 987654321' },
      { key: 'business_id', label: 'Business Manager ID', labelRu: 'ID Business Manager', placeholder: 'e.g. 1122334455' },
    ],
  },
  {
    type: 'google_ads',
    name: 'Google Ads',
    icon: <Megaphone className="h-5 w-5 text-yellow-400" />,
    category: 'ads',
    description: 'Connect Google Ads for campaign analysis, keyword performance, and budget optimization.',
    descriptionRu: 'Подключите Google Ads для анализа кампаний, оценки ключевых слов и оптимизации бюджетов.',
    docsUrl: 'https://developers.google.com/google-ads/api/docs/start',
    secretLabel: 'Google Ads Developer Token',
    pricing: 'Free API access with approved Developer Token (Basic or Standard).',
    pricingRu: 'Бесплатный доступ к API с одобренным Developer Token (Basic или Standard).',
    setupSteps: [
      '1. Sign in to Google Ads Manager account',
      '2. Go to Tools & Settings → API Center → Apply for Developer Token',
      '3. Create OAuth 2.0 credentials in Google Cloud Console',
      '4. Generate refresh token with google-ads scope',
      '5. Enter Developer Token and Customer ID below',
    ],
    setupStepsRu: [
      '1. Войдите в аккаунт Google Ads Manager',
      '2. Перейдите в Инструменты → API-центр → Подайте заявку на Developer Token',
      '3. Создайте OAuth 2.0 credentials в Google Cloud Console',
      '4. Сгенерируйте refresh token с google-ads scope',
      '5. Введите Developer Token и Customer ID ниже',
    ],
    useCases: ['Campaign performance analysis', 'Keyword research & bidding', 'Budget optimization', 'Conversion tracking'],
    useCasesRu: ['Анализ эффективности кампаний', 'Исследование ключевых слов и ставок', 'Оптимизация бюджетов', 'Отслеживание конверсий'],
    fields: [
      { key: 'customer_id', label: 'Customer ID', labelRu: 'Customer ID', placeholder: 'e.g. 123-456-7890' },
      { key: 'manager_id', label: 'Manager Account ID (MCC)', labelRu: 'ID MCC-аккаунта', placeholder: 'Optional' },
    ],
  },
  {
    type: 'tiktok_ads',
    name: 'TikTok Ads',
    icon: <Video className="h-5 w-5 text-pink-400" />,
    category: 'ads',
    description: 'TikTok Marketing API for campaign management, audience targeting, and performance tracking.',
    descriptionRu: 'TikTok Marketing API для управления кампаниями, таргетинга аудиторий и трекинга эффективности.',
    docsUrl: 'https://business-api.tiktok.com/portal/docs',
    secretLabel: 'TikTok Access Token',
    pricing: 'Free. Apply for Marketing API access via TikTok for Business Developer Portal.',
    pricingRu: 'Бесплатно. Подайте заявку на Marketing API через TikTok for Business Developer Portal.',
    setupSteps: [
      '1. Register at TikTok for Business Developer Portal',
      '2. Create App and submit for review',
      '3. After approval, generate long-lived Access Token',
      '4. Get your Advertiser ID from TikTok Ads Manager',
      '5. Enter Access Token and Advertiser ID below',
    ],
    setupStepsRu: [
      '1. Зарегистрируйтесь на TikTok for Business Developer Portal',
      '2. Создайте App и отправьте на ревью',
      '3. После одобрения сгенерируйте долгоживущий Access Token',
      '4. Получите Advertiser ID из TikTok Ads Manager',
      '5. Введите Access Token и Advertiser ID ниже',
    ],
    useCases: ['TikTok campaign creation', 'Video ad performance analysis', 'Audience insights & targeting', 'Automated bidding'],
    useCasesRu: ['Создание TikTok-кампаний', 'Анализ эффективности видеорекламы', 'Инсайты по аудитории и таргетинг', 'Автоматические ставки'],
    fields: [
      { key: 'advertiser_id', label: 'Advertiser ID', labelRu: 'ID рекламодателя', placeholder: 'e.g. 7012345678901234567' },
    ],
  },

  // ── Creative Tools ──
  {
    type: 'freepik',
    name: 'Freepik AI',
    icon: <Palette className="h-5 w-5 text-emerald-400" />,
    category: 'creative',
    description: 'AI-powered image generation and editing via Freepik API. Create ad creatives, backgrounds, and product visuals.',
    descriptionRu: 'Генерация и редактирование изображений через Freepik AI API. Создание рекламных креативов, фонов и визуалов продуктов.',
    docsUrl: 'https://www.freepik.com/api',
    secretLabel: 'Freepik API Key',
    pricing: 'From $9.99/mo (Starter: 100 images). Pro: $29.99/mo (500 images). Enterprise: custom.',
    pricingRu: 'От $9.99/мес (Starter: 100 изображений). Pro: $29.99/мес (500). Enterprise: индивидуально.',
    setupSteps: [
      '1. Register at freepik.com and subscribe to API plan',
      '2. Go to freepik.com/api → Dashboard',
      '3. Copy your API Key',
      '4. Paste it below',
    ],
    setupStepsRu: [
      '1. Зарегистрируйтесь на freepik.com и подпишитесь на тариф API',
      '2. Перейдите на freepik.com/api → Dashboard',
      '3. Скопируйте свой API Key',
      '4. Вставьте его ниже',
    ],
    useCases: ['AI image generation for ads', 'Background removal & editing', 'Product mockups', 'Banner & story creation'],
    useCasesRu: ['ИИ-генерация изображений для рекламы', 'Удаление и замена фона', 'Мокапы продуктов', 'Создание баннеров и сторис'],
    fields: [
      { key: 'workspace_id', label: 'Workspace / Space ID', labelRu: 'Workspace / Space ID', placeholder: 'Optional' },
    ],
  },
  {
    type: 'openai_dalle',
    name: 'OpenAI DALL-E / GPT Vision',
    icon: <Brain className="h-5 w-5 text-violet-400" />,
    category: 'creative',
    description: 'GPT-4 Vision for creative analysis & scoring, DALL-E 3 for ad image generation. Evaluate creatives and generate variations.',
    descriptionRu: 'GPT-4 Vision для анализа и оценки креативов, DALL-E 3 для генерации изображений. Оценка креативов и создание вариаций.',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    secretLabel: 'OpenAI API Key',
    pricing: 'Pay-per-use. GPT-4 Vision: ~$0.01/image. DALL-E 3: $0.04–$0.12/image. GPT-4o: $2.50/1M input tokens.',
    pricingRu: 'Оплата по использованию. GPT-4 Vision: ~$0.01/изобр. DALL-E 3: $0.04–$0.12/изобр. GPT-4o: $2.50/1M токенов.',
    setupSteps: [
      '1. Go to platform.openai.com → API Keys',
      '2. Click "Create new secret key"',
      '3. Copy the key (starts with sk-...)',
      '4. Add billing: Settings → Billing → Add payment method',
      '5. Paste the key below',
    ],
    setupStepsRu: [
      '1. Перейдите на platform.openai.com → API Keys',
      '2. Нажмите "Create new secret key"',
      '3. Скопируйте ключ (начинается с sk-...)',
      '4. Добавьте биллинг: Settings → Billing → Add payment method',
      '5. Вставьте ключ ниже',
    ],
    useCases: ['Creative scoring & analysis', 'Ad copy generation', 'Image generation (DALL-E 3)', 'A/B test hypothesis generation', 'Competitor ad analysis'],
    useCasesRu: ['Оценка и анализ креативов', 'Генерация рекламных текстов', 'Генерация изображений (DALL-E 3)', 'Генерация гипотез A/B тестов', 'Анализ рекламы конкурентов'],
    fields: [
      { key: 'org_id', label: 'Organization ID (optional)', labelRu: 'ID организации (необязательно)', placeholder: 'org-...' },
    ],
  },
  {
    type: 'stability_ai',
    name: 'Stability AI (Stable Diffusion)',
    icon: <ImageIcon className="h-5 w-5 text-orange-400" />,
    category: 'creative',
    description: 'Stable Diffusion API for high-quality ad image generation, inpainting, and upscaling.',
    descriptionRu: 'Stable Diffusion API для генерации качественных рекламных изображений, инпейнтинга и увеличения разрешения.',
    docsUrl: 'https://platform.stability.ai/docs/api-reference',
    secretLabel: 'Stability AI API Key',
    pricing: 'Pay-per-use. SD3: $0.035/image. SDXL: $0.002/image. Upscale: $0.02/image.',
    pricingRu: 'Оплата по использованию. SD3: $0.035/изобр. SDXL: $0.002/изобр. Upscale: $0.02/изобр.',
    setupSteps: [
      '1. Go to platform.stability.ai → Account',
      '2. Generate API Key',
      '3. Add credits: Billing → Add credits',
      '4. Paste API Key below',
    ],
    setupStepsRu: [
      '1. Перейдите на platform.stability.ai → Account',
      '2. Сгенерируйте API Key',
      '3. Пополните баланс: Billing → Add credits',
      '4. Вставьте API Key ниже',
    ],
    useCases: ['Ad creative generation', 'Image variations & editing', 'Background generation', 'Image upscaling for print'],
    useCasesRu: ['Генерация рекламных креативов', 'Вариации и редактирование изображений', 'Генерация фонов', 'Увеличение разрешения для печати'],
    fields: [],
  },
  {
    type: 'canva',
    name: 'Canva Connect',
    icon: <Layout className="h-5 w-5 text-cyan-400" />,
    category: 'creative',
    description: 'Canva Connect API for template-based design automation, brand kit integration, and bulk creative export.',
    descriptionRu: 'Canva Connect API для автоматизации дизайна по шаблонам, интеграции бренд-кита и пакетного экспорта креативов.',
    docsUrl: 'https://www.canva.dev/docs/connect/',
    secretLabel: 'Canva API Key',
    pricing: 'Canva Pro required ($12.99/mo per user). API access included in Pro/Enterprise plans.',
    pricingRu: 'Нужен Canva Pro ($12.99/мес). API доступ включён в тарифы Pro/Enterprise.',
    setupSteps: [
      '1. Go to canva.dev → Create Integration',
      '2. Configure OAuth scopes: design:read, design:write, asset:read',
      '3. Generate API credentials',
      '4. Paste API Key below',
    ],
    setupStepsRu: [
      '1. Перейдите на canva.dev → Create Integration',
      '2. Настройте OAuth scopes: design:read, design:write, asset:read',
      '3. Сгенерируйте API-ключ',
      '4. Вставьте API Key ниже',
    ],
    useCases: ['Template-based bulk creative generation', 'Brand kit consistency', 'Auto-export to ad platforms', 'Multi-format adaptation'],
    useCasesRu: ['Пакетная генерация креативов по шаблонам', 'Единообразие бренд-кита', 'Автоэкспорт на рекламные платформы', 'Адаптация форматов'],
    fields: [
      { key: 'brand_id', label: 'Brand Kit ID (optional)', labelRu: 'ID бренд-кита (необязательно)', placeholder: 'Optional' },
    ],
  },

  // ── Analytics & Research ──
  {
    type: 'google_analytics',
    name: 'Google Analytics 4',
    icon: <BarChart3 className="h-5 w-5 text-amber-400" />,
    category: 'analytics',
    description: 'GA4 Data API for conversion analysis, funnel metrics, landing page performance, and attribution modeling.',
    descriptionRu: 'GA4 Data API для анализа конверсий, метрик воронки, эффективности лендингов и моделирования атрибуции.',
    docsUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
    secretLabel: 'GA4 Service Account JSON Key',
    pricing: 'Free. GA4 is free. API has quota of 10,000 requests/day per project.',
    pricingRu: 'Бесплатно. GA4 бесплатный. API-квота: 10,000 запросов/день на проект.',
    setupSteps: [
      '1. Go to Google Cloud Console → Create Project',
      '2. Enable Google Analytics Data API',
      '3. Create Service Account → Generate JSON key',
      '4. In GA4: Admin → Property Access → Add service account email as Viewer',
      '5. Paste the JSON key contents below',
    ],
    setupStepsRu: [
      '1. Перейдите в Google Cloud Console → Создайте проект',
      '2. Включите Google Analytics Data API',
      '3. Создайте Service Account → Скачайте JSON-ключ',
      '4. В GA4: Администратор → Доступ → Добавьте email сервисного аккаунта как Читатель',
      '5. Вставьте содержимое JSON-ключа ниже',
    ],
    useCases: ['Landing page conversion analysis', 'Traffic source attribution', 'Funnel drop-off analysis', 'Custom event tracking'],
    useCasesRu: ['Анализ конверсий лендингов', 'Атрибуция источников трафика', 'Анализ отвалов воронки', 'Отслеживание кастомных событий'],
    fields: [
      { key: 'property_id', label: 'GA4 Property ID', labelRu: 'ID свойства GA4', placeholder: 'e.g. 123456789' },
    ],
  },
  {
    type: 'apify',
    name: 'Apify (Competitor Research)',
    icon: <Search className="h-5 w-5 text-teal-400" />,
    category: 'analytics',
    description: 'Web scraping platform for competitor ad research, ad library monitoring, and market intelligence.',
    descriptionRu: 'Платформа веб-скрапинга для исследования рекламы конкурентов, мониторинга библиотеки объявлений и аналитики рынка.',
    docsUrl: 'https://docs.apify.com/api/v2',
    secretLabel: 'Apify API Token',
    pricing: 'Free tier: $5/mo credits. Starter: $49/mo. Scale: $499/mo.',
    pricingRu: 'Бесплатно: $5/мес кредитов. Starter: $49/мес. Scale: $499/мес.',
    setupSteps: [
      '1. Register at apify.com',
      '2. Go to Settings → Integrations → API Token',
      '3. Copy your API Token',
      '4. Paste it below',
    ],
    setupStepsRu: [
      '1. Зарегистрируйтесь на apify.com',
      '2. Перейдите в Settings → Integrations → API Token',
      '3. Скопируйте API Token',
      '4. Вставьте его ниже',
    ],
    useCases: ['Facebook Ad Library scraping', 'Competitor landing page analysis', 'Market price monitoring', 'Lead data enrichment'],
    useCasesRu: ['Скрапинг Facebook Ad Library', 'Анализ лендингов конкурентов', 'Мониторинг цен на рынке', 'Обогащение данных о лидах'],
    fields: [],
  },

  // ── Automation & Webhooks ──
  {
    type: 'make_integromat',
    name: 'Make (Integromat)',
    icon: <Zap className="h-5 w-5 text-purple-400" />,
    category: 'automation',
    description: 'Visual automation platform for connecting ad platforms, CRMs, sheets, and notifications into workflows.',
    descriptionRu: 'Визуальная платформа автоматизации для связи рекламных платформ, CRM, таблиц и уведомлений в рабочие потоки.',
    docsUrl: 'https://www.make.com/en/api-documentation',
    secretLabel: 'Make API Token',
    pricing: 'Free: 1,000 ops/mo. Core: $9/mo (10,000 ops). Pro: $16/mo (10,000 ops + advanced).',
    pricingRu: 'Бесплатно: 1,000 операций/мес. Core: $9/мес (10,000). Pro: $16/мес (10,000 + расширенные).',
    setupSteps: [
      '1. Go to make.com → Your Profile → API',
      '2. Create new API Token',
      '3. Copy the token',
      '4. Paste it below',
    ],
    setupStepsRu: [
      '1. Перейдите на make.com → Профиль → API',
      '2. Создайте новый API Token',
      '3. Скопируйте токен',
      '4. Вставьте его ниже',
    ],
    useCases: ['Auto-sync leads to CRM', 'Trigger notifications on budget thresholds', 'Auto-pause underperforming campaigns', 'Cross-platform reporting'],
    useCasesRu: ['Авто-синхронизация лидов в CRM', 'Уведомления при превышении бюджета', 'Авто-пауза неэффективных кампаний', 'Кросс-платформенная отчётность'],
    fields: [
      { key: 'team_id', label: 'Team ID (optional)', labelRu: 'ID команды (необязательно)', placeholder: 'Optional' },
    ],
  },
  {
    type: 'zapier',
    name: 'Zapier',
    icon: <Webhook className="h-5 w-5 text-orange-500" />,
    category: 'automation',
    description: 'Connect 6,000+ apps. Automate lead routing, notification workflows, and data sync between platforms.',
    descriptionRu: 'Подключите 6,000+ приложений. Автоматизируйте маршрутизацию лидов, уведомления и синхронизацию данных между платформами.',
    docsUrl: 'https://platform.zapier.com/docs/api',
    secretLabel: 'Zapier Webhook URL or API Key',
    pricing: 'Free: 100 tasks/mo. Starter: $19.99/mo (750 tasks). Pro: $49/mo (2,000 tasks).',
    pricingRu: 'Бесплатно: 100 задач/мес. Starter: $19.99/мес (750). Pro: $49/мес (2,000).',
    setupSteps: [
      '1. Go to zapier.com → Settings → Developer',
      '2. Or create Webhook Zap and copy the Catch Hook URL',
      '3. For API Key: Settings → API',
      '4. Paste URL or Key below',
    ],
    setupStepsRu: [
      '1. Перейдите на zapier.com → Settings → Developer',
      '2. Или создайте Webhook Zap и скопируйте URL Catch Hook',
      '3. Для API Key: Settings → API',
      '4. Вставьте URL или Key ниже',
    ],
    useCases: ['Lead notifications in Slack/Telegram', 'Auto-add leads to Google Sheets', 'CRM sync on new conversions', 'Email alerts on spend anomalies'],
    useCasesRu: ['Уведомления о лидах в Slack/Telegram', 'Авто-добавление лидов в Google Sheets', 'Синхронизация CRM при конверсиях', 'Email-алерты об аномалиях расхода'],
    fields: [
      { key: 'webhook_url', label: 'Webhook URL (optional)', labelRu: 'URL вебхука (необязательно)', placeholder: 'https://hooks.zapier.com/...' },
    ],
  },

  // ── Landing Pages & Forms ──
  {
    type: 'carrd',
    name: 'Carrd',
    icon: <Layout className="h-5 w-5 text-cyan-400" />,
    category: 'landing',
    description: 'Simple, free, fully responsive one-page sites. Ideal for quick ad landing pages with forms.',
    descriptionRu: 'Простые, бесплатные, адаптивные одностраничные сайты. Идеальны для лендингов под рекламу с формами.',
    docsUrl: 'https://carrd.co/',
    secretLabel: 'Carrd Webhook URL',
    pricing: 'Free (3 sites). Pro Lite: $9/yr. Pro Standard: $19/yr. Pro Plus: $49/yr.',
    pricingRu: 'Бесплатно (3 сайта). Pro Lite: $9/год. Pro Standard: $19/год. Pro Plus: $49/год.',
    setupSteps: [
      '1. Create landing page at carrd.co',
      '2. Add Form element → set action to Webhook',
      '3. Copy the webhook URL from your form settings',
      '4. Paste webhook URL below to receive leads',
    ],
    setupStepsRu: [
      '1. Создайте лендинг на carrd.co',
      '2. Добавьте элемент Form → выберите Webhook',
      '3. Скопируйте webhook URL из настроек формы',
      '4. Вставьте URL вебхука ниже для получения лидов',
    ],
    useCases: ['Quick ad landing pages', 'Lead capture forms', 'Product launches', 'Event registrations'],
    useCasesRu: ['Быстрые лендинги под рекламу', 'Формы сбора лидов', 'Запуск продуктов', 'Регистрация на мероприятия'],
    fields: [
      { key: 'webhook_url', label: 'Form Webhook URL', labelRu: 'URL вебхука формы', placeholder: 'https://...' },
    ],
  },
  {
    type: 'unbounce',
    name: 'Unbounce',
    icon: <Target className="h-5 w-5 text-blue-300" />,
    category: 'landing',
    description: 'AI-powered landing page builder with Smart Traffic. Built for conversion rate optimization.',
    descriptionRu: 'Конструктор лендингов с ИИ и Smart Traffic. Создан для оптимизации конверсий.',
    docsUrl: 'https://developer.unbounce.com/api_reference/',
    secretLabel: 'Unbounce API Key',
    pricing: 'Build: $74/mo. Experiment: $112/mo. Optimize: $187/mo.',
    pricingRu: 'Build: $74/мес. Experiment: $112/мес. Optimize: $187/мес.',
    setupSteps: [
      '1. Go to Unbounce → Account → API Access',
      '2. Generate API Key',
      '3. Paste it below',
    ],
    setupStepsRu: [
      '1. Перейдите в Unbounce → Account → API Access',
      '2. Сгенерируйте API Key',
      '3. Вставьте его ниже',
    ],
    useCases: ['Lead form data sync', 'AI-optimized page variants', 'Conversion rate tracking', 'Smart Traffic routing'],
    useCasesRu: ['Синхронизация лид-форм', 'ИИ-оптимизация вариантов', 'Трекинг конверсий', 'Smart Traffic маршрутизация'],
    fields: [
      { key: 'account_id', label: 'Account ID', labelRu: 'ID аккаунта', placeholder: 'Optional' },
    ],
  },
  {
    type: 'leadpages',
    name: 'Leadpages',
    icon: <FileText className="h-5 w-5 text-green-400" />,
    category: 'landing',
    description: 'Landing page builder with 200+ templates, popups, and alert bars. Optimized for small business lead gen.',
    descriptionRu: 'Конструктор лендингов с 200+ шаблонами, попапами и алерт-барами. Оптимизирован для лидогенерации.',
    docsUrl: 'https://www.leadpages.com/',
    secretLabel: 'Leadpages Webhook URL',
    pricing: 'Standard: $37/mo. Pro: $74/mo (A/B testing, payments).',
    pricingRu: 'Standard: $37/мес. Pro: $74/мес (A/B тесты, платежи).',
    setupSteps: [
      '1. Create page in Leadpages',
      '2. Integrations → Add Webhook integration',
      '3. Set your webhook endpoint URL',
      '4. Paste the URL below',
    ],
    setupStepsRu: [
      '1. Создайте страницу в Leadpages',
      '2. Integrations → Добавьте Webhook',
      '3. Укажите URL вебхука',
      '4. Вставьте URL ниже',
    ],
    useCases: ['High-converting landing pages', 'Popup lead capture', 'A/B testing', 'Facebook ad landing pages'],
    useCasesRu: ['Конвертирующие лендинги', 'Попапы для сбора лидов', 'A/B тестирование', 'Лендинги под рекламу Facebook'],
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', labelRu: 'URL вебхука', placeholder: 'https://...' },
    ],
  },
  {
    type: 'typeform',
    name: 'Typeform',
    icon: <FileText className="h-5 w-5 text-indigo-400" />,
    category: 'landing',
    description: 'Beautiful conversational forms and surveys. High completion rates for lead generation.',
    descriptionRu: 'Красивые диалоговые формы и опросы. Высокий процент заполнения для лидогенерации.',
    docsUrl: 'https://www.typeform.com/developers/',
    secretLabel: 'Typeform Personal Access Token',
    pricing: 'Free (10 responses/mo). Basic: $25/mo. Plus: $50/mo. Business: $83/mo.',
    pricingRu: 'Бесплатно (10 ответов/мес). Basic: $25/мес. Plus: $50/мес. Business: $83/мес.',
    setupSteps: [
      '1. Go to typeform.com → Account → Personal Tokens',
      '2. Generate new Personal Access Token',
      '3. Enable scopes: forms:read, responses:read, webhooks:write',
      '4. Paste token below',
    ],
    setupStepsRu: [
      '1. Перейдите на typeform.com → Account → Personal Tokens',
      '2. Создайте Personal Access Token',
      '3. Включите scopes: forms:read, responses:read, webhooks:write',
      '4. Вставьте токен ниже',
    ],
    useCases: ['Lead qualification forms', 'Survey-style landing pages', 'Interactive quizzes for ads', 'Client onboarding forms'],
    useCasesRu: ['Формы квалификации лидов', 'Лендинги-опросы', 'Интерактивные квизы для рекламы', 'Формы онбординга'],
    fields: [
      { key: 'workspace_id', label: 'Workspace ID (optional)', labelRu: 'ID workspace (необязательно)', placeholder: 'Optional' },
    ],
  },

  // ── Automation & AI Agents ──
  {
    type: 'n8n',
    name: 'n8n',
    icon: <Workflow className="h-5 w-5 text-orange-400" />,
    category: 'automation',
    description: 'Open-source workflow automation with AI agents. Build complex ad management workflows, lead routing, and AI-powered optimizations.',
    descriptionRu: 'Опенсорсная автоматизация рабочих процессов с ИИ-агентами. Сложные воркфлоу управления рекламой, маршрутизация лидов и ИИ-оптимизации.',
    docsUrl: 'https://docs.n8n.io/api/',
    secretLabel: 'n8n API Key',
    pricing: 'Self-hosted: Free (open source). Cloud Starter: $20/mo. Cloud Pro: $50/mo.',
    pricingRu: 'Self-hosted: бесплатно (open source). Cloud Starter: $20/мес. Cloud Pro: $50/мес.',
    setupSteps: [
      '1. Deploy n8n (self-hosted or n8n.cloud)',
      '2. Go to Settings → API → Create API Key',
      '3. Copy the API key',
      '4. Paste your n8n instance URL and API key below',
    ],
    setupStepsRu: [
      '1. Разверните n8n (self-hosted или n8n.cloud)',
      '2. Перейдите в Settings → API → Create API Key',
      '3. Скопируйте API-ключ',
      '4. Вставьте URL инстанса и API-ключ ниже',
    ],
    useCases: ['AI agent workflows for ad optimization', 'Multi-step lead routing', 'Automated creative generation pipelines', 'Cross-platform data sync', 'Scheduled campaign management'],
    useCasesRu: ['ИИ-агенты для оптимизации рекламы', 'Многоэтапная маршрутизация лидов', 'Пайплайны генерации креативов', 'Кросс-платформенная синхронизация', 'Расписание управления кампаниями'],
    fields: [
      { key: 'instance_url', label: 'n8n Instance URL', labelRu: 'URL инстанса n8n', placeholder: 'https://your-n8n.example.com' },
    ],
  },

  // ── Cloud Storage ──
  {
    type: 'google_drive',
    name: 'Google Drive',
    icon: <Cloud className="h-5 w-5 text-blue-400" />,
    category: 'storage',
    description: 'Store and organize creatives, reports, and campaign assets in Google Drive. Auto-sync files.',
    descriptionRu: 'Хранение и организация креативов, отчётов и ассетов кампаний в Google Drive. Авто-синхронизация файлов.',
    docsUrl: 'https://developers.google.com/drive/api/v3/about-sdk',
    secretLabel: 'Google Service Account JSON Key',
    pricing: 'Free: 15 GB. Google Workspace: $6/mo (30 GB) — $18/mo (5 TB).',
    pricingRu: 'Бесплатно: 15 ГБ. Google Workspace: $6/мес (30 ГБ) — $18/мес (5 ТБ).',
    setupSteps: [
      '1. Go to Google Cloud Console → Enable Drive API',
      '2. Create Service Account → Generate JSON key',
      '3. Share target folder with service account email',
      '4. Paste JSON key contents below',
    ],
    setupStepsRu: [
      '1. Перейдите в Google Cloud Console → Включите Drive API',
      '2. Создайте Service Account → Скачайте JSON-ключ',
      '3. Откройте доступ к папке для email сервисного аккаунта',
      '4. Вставьте содержимое JSON-ключа ниже',
    ],
    useCases: ['Creative asset storage', 'Report auto-upload', 'Team file sharing', 'Campaign asset backup'],
    useCasesRu: ['Хранение креативов', 'Авто-загрузка отчётов', 'Командный обмен файлами', 'Бэкап ассетов кампаний'],
    fields: [
      { key: 'folder_id', label: 'Root Folder ID', labelRu: 'ID корневой папки', placeholder: 'Google Drive folder ID' },
    ],
  },
  {
    type: 'dropbox',
    name: 'Dropbox',
    icon: <HardDrive className="h-5 w-5 text-blue-500" />,
    category: 'storage',
    description: 'Cloud storage for creative assets, video files, and campaign materials. Share links for client review.',
    descriptionRu: 'Облачное хранилище для креативов, видео и рекламных материалов. Ссылки для ревью клиентом.',
    docsUrl: 'https://www.dropbox.com/developers/documentation/http/overview',
    secretLabel: 'Dropbox Access Token',
    pricing: 'Basic: Free (2 GB). Plus: $9.99/mo (2 TB). Professional: $16.58/mo (3 TB).',
    pricingRu: 'Basic: бесплатно (2 ГБ). Plus: $9.99/мес (2 ТБ). Professional: $16.58/мес (3 ТБ).',
    setupSteps: [
      '1. Go to dropbox.com/developers → Create App',
      '2. Choose Scoped access → Full Dropbox or App folder',
      '3. Generate access token in app settings',
      '4. Paste token below',
    ],
    setupStepsRu: [
      '1. Перейдите на dropbox.com/developers → Create App',
      '2. Выберите Scoped access → Full Dropbox или App folder',
      '3. Сгенерируйте access token в настройках приложения',
      '4. Вставьте токен ниже',
    ],
    useCases: ['Video creative storage', 'Client asset sharing', 'Campaign material backup', 'Creative review links'],
    useCasesRu: ['Хранение видео-креативов', 'Обмен ассетами с клиентом', 'Бэкап рекламных материалов', 'Ссылки для ревью креативов'],
    fields: [
      { key: 'root_path', label: 'Root Path (optional)', labelRu: 'Корневая папка (необязательно)', placeholder: '/CreativeAssets' },
    ],
  },
  {
    type: 'aws_s3',
    name: 'Amazon S3',
    icon: <Cloud className="h-5 w-5 text-orange-400" />,
    category: 'storage',
    description: 'Scalable object storage for large creative libraries, video assets, and CDN distribution.',
    descriptionRu: 'Масштабируемое хранилище для больших библиотек креативов, видео и CDN-доставки.',
    docsUrl: 'https://docs.aws.amazon.com/s3/',
    secretLabel: 'AWS Secret Access Key',
    pricing: 'Pay-per-use. ~$0.023/GB/mo storage. ~$0.09/GB transfer.',
    pricingRu: 'Оплата по использованию. ~$0.023/ГБ/мес хранение. ~$0.09/ГБ трафик.',
    setupSteps: [
      '1. Go to AWS Console → IAM → Create User',
      '2. Attach S3FullAccess policy',
      '3. Generate Access Key ID and Secret Access Key',
      '4. Create S3 bucket for assets',
      '5. Paste Secret Access Key below',
    ],
    setupStepsRu: [
      '1. Перейдите в AWS Console → IAM → Create User',
      '2. Назначьте политику S3FullAccess',
      '3. Сгенерируйте Access Key ID и Secret Access Key',
      '4. Создайте S3 bucket для ассетов',
      '5. Вставьте Secret Access Key ниже',
    ],
    useCases: ['Large creative library storage', 'Video ad hosting', 'CDN for landing page assets', 'Automated backup'],
    useCasesRu: ['Хранилище больших библиотек креативов', 'Хостинг видеорекламы', 'CDN для ассетов лендингов', 'Автоматический бэкап'],
    fields: [
      { key: 'access_key_id', label: 'Access Key ID', labelRu: 'Access Key ID', placeholder: 'AKIA...' },
      { key: 'bucket_name', label: 'Bucket Name', labelRu: 'Имя бакета', placeholder: 'my-creatives-bucket' },
      { key: 'region', label: 'Region', labelRu: 'Регион', placeholder: 'us-east-1' },
    ],
  },
];

const CATEGORY_META: Record<string, { label: string; labelRu: string; icon: React.ReactNode }> = {
  ads: { label: 'Ad Platforms', labelRu: 'Рекламные платформы', icon: <Megaphone className="h-4 w-4" /> },
  creative: { label: 'Creative Tools', labelRu: 'Инструменты для креативов', icon: <Palette className="h-4 w-4" /> },
  analytics: { label: 'Analytics & Research', labelRu: 'Аналитика и исследования', icon: <BarChart3 className="h-4 w-4" /> },
  automation: { label: 'Automation', labelRu: 'Автоматизация', icon: <Zap className="h-4 w-4" /> },
  landing: { label: 'Landing & Forms', labelRu: 'Лендинги и формы', icon: <Layout className="h-4 w-4" /> },
  storage: { label: 'Cloud Storage', labelRu: 'Облачное хранилище', icon: <Cloud className="h-4 w-4" /> },
};

export default function PlatformIntegrationsPanel() {
  const { agencyRole } = useAuth();
  const { language } = useLanguage();
  const isRu = language === 'ru';
  const isAdmin = agencyRole === 'AgencyAdmin';
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupType, setSetupType] = useState<string | null>(null);
  const [secretValue, setSecretValue] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [configFields, setConfigFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const load = useCallback(async () => {
    const { data } = await supabase.from('platform_integrations' as any).select('*');
    setIntegrations((data || []) as unknown as Integration[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getIntegration = (type: string) => integrations.find(i => i.integration_type === type);
  const getConfig = (type: string) => INTEGRATIONS_CONFIG.find(c => c.type === type)!;

  const openSetup = (type: string) => {
    const existing = getIntegration(type);
    setSetupType(type);
    setSecretValue('');
    setShowSecret(false);
    const cfg = getConfig(type);
    const fields: Record<string, string> = {};
    cfg.fields.forEach(f => {
      fields[f.key] = (existing?.config as any)?.[f.key] || '';
    });
    setConfigFields(fields);
  };

  const handleSave = async () => {
    if (!setupType) return;
    setSaving(true);

    try {
      if (secretValue) {
        const { error } = await supabase.rpc('store_platform_integration_secret', {
          _integration_type: setupType,
          _secret_value: secretValue,
        });
        if (error) throw error;
      }

      const cfg = getConfig(setupType);
      const existing = getIntegration(setupType);
      const configUpdate = { ...((existing?.config as any) || {}), ...configFields };

      if (existing) {
        await supabase.from('platform_integrations' as any)
          .update({ config: configUpdate, is_active: true, display_name: cfg.name })
          .eq('id', existing.id);
      } else if (!secretValue) {
        await supabase.from('platform_integrations' as any).insert({
          integration_type: setupType,
          display_name: cfg.name,
          config: configUpdate,
          is_active: true,
        });
      }

      toast.success(isRu ? `${cfg.name} подключён` : `${cfg.name} connected`);
      setSetupType(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleIntegration = async (type: string, active: boolean) => {
    const existing = getIntegration(type);
    if (!existing) return;
    await supabase.from('platform_integrations' as any)
      .update({ is_active: active })
      .eq('id', existing.id);
    toast.success(active
      ? (isRu ? 'Интеграция включена' : 'Integration enabled')
      : (isRu ? 'Интеграция отключена' : 'Integration disabled'));
    load();
  };

  if (!isAdmin) return null;

  const filteredConfigs = activeTab === 'all'
    ? INTEGRATIONS_CONFIG
    : INTEGRATIONS_CONFIG.filter(c => c.category === activeTab);

  const connectedCount = INTEGRATIONS_CONFIG.filter(c => {
    const i = getIntegration(c.type);
    return i?.is_active && i?.secret_ref;
  }).length;

  const setupConfig = setupType ? getConfig(setupType) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            {isRu ? 'Интеграции платформы' : 'Platform Integrations'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isRu ? 'Подключайте и управляйте внешними сервисами.' : 'Connect and manage external services.'}
            {' '}
            <span className="text-primary font-medium">{connectedCount}/{INTEGRATIONS_CONFIG.length}</span>{' '}
            {isRu ? 'подключено' : 'connected'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8 bg-secondary/30">
          <TabsTrigger value="all" className="text-xs">{isRu ? 'Все' : 'All'}</TabsTrigger>
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <TabsTrigger key={key} value={key} className="text-xs gap-1">
              {meta.icon}
              <span className="hidden sm:inline">{isRu ? meta.labelRu : meta.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3">
          {filteredConfigs.map(cfg => {
            const integration = getIntegration(cfg.type);
            const isConnected = integration?.is_active && integration?.secret_ref;
            const catMeta = CATEGORY_META[cfg.category];

            return (
              <Card key={cfg.type} className={isConnected ? 'border-emerald-500/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{cfg.name}</span>
                        {isConnected ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> {isRu ? 'Подключено' : 'Connected'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            {isRu ? 'Не подключено' : 'Not connected'}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[9px]">
                          {isRu ? catMeta.labelRu : catMeta.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {isRu ? cfg.descriptionRu : cfg.description}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{isRu ? cfg.pricingRu : cfg.pricing}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isConnected && (
                        <Switch
                          checked={integration.is_active}
                          onCheckedChange={v => toggleIntegration(cfg.type, v)}
                        />
                      )}
                      <Button size="sm" variant={isConnected ? "outline" : "default"} className="text-xs gap-1"
                        onClick={() => openSetup(cfg.type)}>
                        <Settings className="h-3 w-3" />
                        {isConnected ? (isRu ? 'Настройки' : 'Settings') : (isRu ? 'Подключить' : 'Connect')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Setup dialog */}
      <Dialog open={!!setupType} onOpenChange={v => { if (!v) setSetupType(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {setupConfig?.name} — {isRu ? 'Настройка' : 'Setup'}
            </DialogTitle>
            <DialogDescription>
              {isRu
                ? 'Ключ будет зашифрован и сохранён в Vault. Только администраторы имеют доступ.'
                : 'Key will be encrypted and stored in Vault. Only admins have access.'}
            </DialogDescription>
          </DialogHeader>

          {setupConfig && (
            <div className="space-y-4">
              {/* Setup steps */}
              <div className="rounded-lg bg-muted/20 p-3 space-y-1.5">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  {isRu ? 'Как подключить' : 'How to connect'}
                </h4>
                {(isRu ? setupConfig.setupStepsRu : setupConfig.setupSteps).map((step, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{step}</p>
                ))}
              </div>

              {/* Use cases */}
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                <h4 className="text-xs font-semibold mb-1.5">{isRu ? 'Возможности' : 'Use Cases'}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(isRu ? setupConfig.useCasesRu : setupConfig.useCases).map((uc, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{uc}</Badge>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Key className="h-3.5 w-3.5" />
                  {setupConfig.secretLabel}
                </Label>
                <div className="relative">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={secretValue}
                    onChange={e => setSecretValue(e.target.value)}
                    placeholder={getIntegration(setupType!)?.secret_ref
                      ? (isRu ? '••••••••• (уже настроен)' : '••••••••• (already set)')
                      : (isRu ? 'Введите API ключ' : 'Enter API key')}
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowSecret(!showSecret)}>
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Extra fields */}
              {setupConfig.fields.map(field => (
                <div key={field.key} className="space-y-2">
                  <Label className="text-xs">{isRu ? field.labelRu : field.label}</Label>
                  <Input
                    value={configFields[field.key] || ''}
                    onChange={e => setConfigFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

              {/* Pricing & Docs */}
              <div className="rounded-lg bg-muted/20 p-3 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <strong>{isRu ? 'Стоимость:' : 'Pricing:'}</strong> {isRu ? setupConfig.pricingRu : setupConfig.pricing}
                </p>
                <p className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  <span>{isRu ? 'Документация:' : 'Docs:'}</span>{' '}
                  <a href={setupConfig.docsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {setupConfig.docsUrl}
                  </a>
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupType(null)}>
              {isRu ? 'Отмена' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isRu ? 'Сохранить' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

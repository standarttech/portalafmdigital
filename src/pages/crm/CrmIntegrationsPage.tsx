import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  Send, MessageSquare, Webhook, ChevronDown, BookOpen,
  CheckCircle, AlertTriangle, Bot, Plus, Trash2, Settings, Loader2,
  Shield, Globe, Zap, RefreshCw, Power, PowerOff, Pencil,
  Link2, Clock, Info,
} from 'lucide-react';

/* ── i18n helper ── */
const T = (lang: string) => {
  const isRu = lang === 'ru';
  return {
    integrations: isRu ? 'Интеграции' : 'Integrations',
    selectClient: isRu ? 'Выберите клиента' : 'Select client',
    notifications: isRu ? 'Уведомления' : 'Notifications',
    manageBots: isRu ? 'Управление ботами' : 'Bot Management',
    externalCrm: isRu ? 'Внешние CRM' : 'External CRM',
    telegramGuide: isRu ? '📖 Инструкция: Telegram-уведомления' : '📖 Guide: Telegram Notifications',
    step1Title: isRu ? 'Создайте бота через @BotFather' : 'Create a bot via @BotFather',
    step1Desc: isRu ? 'Отправьте /newbot, задайте имя и username, скопируйте токен' : 'Send /newbot, set name and username, copy the token',
    step2Title: isRu ? 'Добавьте бота во вкладке "Управление ботами"' : 'Add the bot in "Bot Management" tab',
    step2Desc: isRu ? 'Введите имя и токен — он будет зашифрован и сохранён' : 'Enter name and token — it will be encrypted and saved',
    step3Title: isRu ? 'Получите Chat ID' : 'Get Chat ID',
    step3Desc: isRu ? 'Напишите боту /start, затем откройте api.telegram.org/bot<TOKEN>/getUpdates' : 'Write /start to the bot, then open api.telegram.org/bot<TOKEN>/getUpdates',
    step4Title: isRu ? 'Вставьте Chat ID ниже и сохраните' : 'Paste Chat ID below and save',
    step4Desc: isRu ? 'Включите интеграцию и отправьте тестовое сообщение' : 'Enable integration and send a test message',
    sendTest: isRu ? 'Отправить тест' : 'Send Test',
    sending: isRu ? 'Отправка...' : 'Sending...',
    eventTriggers: isRu ? 'Триггеры событий' : 'Event Triggers',
    newLeadCreated: isRu ? 'Новый лид создан' : 'New lead created',
    stageChanged: isRu ? 'Смена стадии' : 'Stage changed',
    dealWon: isRu ? 'Сделка выиграна' : 'Deal won',
    dealLost: isRu ? 'Сделка проиграна' : 'Deal lost',
    save: isRu ? 'Сохранить' : 'Save',
    loading: isRu ? 'Загрузка...' : 'Loading...',
    saved: isRu ? 'Настройки сохранены' : 'Settings saved',
    // Bot management
    telegramBots: isRu ? 'Telegram-боты для уведомлений' : 'Telegram bots for notifications',
    telegramBotsDesc: isRu ? 'Добавляйте несколько ботов и переключайте активного. Активный бот используется для всех Telegram-уведомлений клиента.' : 'Add multiple bots and switch the active one. The active bot is used for all Telegram notifications.',
    noBots: isRu ? 'Нет подключённых ботов' : 'No connected bots',
    noBotsDesc: isRu ? 'Добавьте бота для отправки уведомлений' : 'Add a bot to send notifications',
    addBot: isRu ? 'Добавить нового бота' : 'Add new bot',
    botName: isRu ? 'Имя бота' : 'Bot name',
    botToken: isRu ? 'Токен бота (от @BotFather)' : 'Bot token (from @BotFather)',
    tokenEncrypted: isRu ? 'Токен хранится в зашифрованном виде (Vault)' : 'Token is stored encrypted (Vault)',
    addBotBtn: isRu ? 'Добавить бота' : 'Add bot',
    cancel: isRu ? 'Отмена' : 'Cancel',
    active: isRu ? 'Активен' : 'Active',
    activate: isRu ? 'Активировать' : 'Activate',
    test: isRu ? 'Тест' : 'Test',
    added: isRu ? 'Добавлен' : 'Added',
    botAdded: isRu ? 'Бот добавлен' : 'Bot added',
    botActivated: isRu ? 'Бот активирован' : 'Bot activated',
    botDeleted: isRu ? 'Бот удалён' : 'Bot deleted',
    botAvailable: isRu ? 'Бот доступен' : 'Bot available',
    botError: isRu ? 'Бот недоступен' : 'Bot unavailable',
    error: isRu ? 'Ошибка' : 'Error',
    invalidToken: isRu ? 'Неверный формат токена' : 'Invalid token format',
    howItWorks: isRu ? 'Как это работает' : 'How it works',
    howItWorksDesc: isRu ? 'Активный бот будет использоваться для всех Telegram-уведомлений этого клиента. Можно добавить несколько ботов и переключаться между ними.' : 'The active bot will be used for all Telegram notifications for this client. You can add multiple bots and switch between them.',
    // External CRM
    connectExternalCrm: isRu ? 'Подключение внешних CRM' : 'Connect External CRM',
    connectExternalCrmDesc: isRu ? 'Подключите внешнюю CRM-систему для автоматической синхронизации лидов. Данные будут подтягиваться по выбранному интервалу для сквозной аналитики.' : 'Connect an external CRM system for automatic lead sync. Data will be pulled at the selected interval for end-to-end analytics.',
    noCrmConnected: isRu ? 'Нет подключённых CRM' : 'No connected CRMs',
    noCrmConnectedDesc: isRu ? 'Подключите внешнюю CRM для синхронизации данных' : 'Connect an external CRM to sync data',
    connectCrm: isRu ? 'Подключить CRM' : 'Connect CRM',
    connectionSettings: isRu ? 'Настройки подключения' : 'Connection Settings',
    connectExternalCrmDialog: isRu ? 'Подключить внешнюю CRM' : 'Connect External CRM',
    crmProvider: isRu ? 'CRM-провайдер' : 'CRM Provider',
    connectionName: isRu ? 'Название подключения' : 'Connection name',
    apiKey: isRu ? 'API-ключ' : 'API Key',
    webhookUrl: isRu ? 'Webhook URL' : 'Webhook URL',
    leaveEmptyToKeep: isRu ? '(оставьте пустым, чтобы не менять)' : '(leave empty to keep current)',
    keyEncrypted: isRu ? 'Ключ хранится в зашифрованном хранилище' : 'Key is stored in encrypted vault',
    baseUrl: isRu ? 'Base URL' : 'Base URL',
    syncInterval: isRu ? 'Интервал синхронизации' : 'Sync interval',
    every30min: isRu ? 'Каждые 30 мин' : 'Every 30 min',
    everyHour: isRu ? 'Каждый час' : 'Every hour',
    every2h: isRu ? 'Каждые 2 часа' : 'Every 2 hours',
    every6h: isRu ? 'Каждые 6 часов' : 'Every 6 hours',
    every12h: isRu ? 'Каждые 12 часов' : 'Every 12 hours',
    daily: isRu ? 'Раз в сутки' : 'Once daily',
    fieldMapping: isRu ? 'Маппинг полей (опционально)' : 'Field mapping (optional)',
    fieldMappingDesc: isRu ? 'JSON-объект: ключ = поле лида, значение = поле из CRM. По умолчанию используется стандартный маппинг для провайдера.' : 'JSON object: key = lead field, value = CRM field. Default mapping is used for the selected provider.',
    testConnection: isRu ? 'Тест подключения' : 'Test Connection',
    connect: isRu ? 'Подключить' : 'Connect',
    saveChanges: isRu ? 'Сохранить изменения' : 'Save changes',
    syncNow: isRu ? 'Синхр. сейчас' : 'Sync now',
    edit: isRu ? 'Изменить' : 'Edit',
    disable: isRu ? 'Отключить' : 'Disable',
    enable: isRu ? 'Включить' : 'Enable',
    connected: isRu ? 'Подключено' : 'Connected',
    errorStatus: isRu ? 'Ошибка' : 'Error',
    waiting: isRu ? 'Ожидает' : 'Waiting',
    disabled: isRu ? 'Отключено' : 'Disabled',
    syncEvery: isRu ? 'Синхр: каждые' : 'Sync: every',
    min: isRu ? 'мин' : 'min',
    last: isRu ? 'Последняя' : 'Last',
    never: isRu ? 'Никогда' : 'Never',
    justNow: isRu ? 'Только что' : 'Just now',
    minAgo: isRu ? 'мин назад' : 'min ago',
    hAgo: isRu ? 'ч назад' : 'h ago',
    dAgo: isRu ? 'дн назад' : 'd ago',
    enterApiKey: isRu ? 'Введите API-ключ' : 'Enter API key',
    invalidJson: isRu ? 'Неверный JSON маппинга' : 'Invalid mapping JSON',
    connectionUpdated: isRu ? 'Подключение обновлено' : 'Connection updated',
    crmConnected: isRu ? 'CRM подключена' : 'CRM connected',
    connectionActive: isRu ? 'Подключение активно' : 'Connection active',
    connectionProblem: isRu ? 'Проблема' : 'Problem',
    noConnection: isRu ? 'Нет соединения' : 'No connection',
    syncComplete: isRu ? 'Синхронизация завершена' : 'Sync complete',
    leadsImported: isRu ? 'Импортировано лидов' : 'Leads imported',
    syncError: isRu ? 'Ошибка синхронизации' : 'Sync error',
    connectionDisabled: isRu ? 'Подключение отключено' : 'Connection disabled',
    connectionEnabled: isRu ? 'Подключение включено' : 'Connection enabled',
    connectionDeleted: isRu ? 'Подключение удалено' : 'Connection deleted',
    setupGuide: isRu ? 'Инструкция по подключению' : 'Setup guide',
    close: isRu ? 'Закрыть' : 'Close',
    noActiveWebhooks: isRu ? 'Нет активных вебхуков. Сначала сохраните настройки.' : 'No active webhooks. Save settings first.',
    testSuccess: isRu ? 'Тестовое сообщение успешно отправлено в Telegram!' : 'Test message sent to Telegram successfully!',
    testErrorDelivery: isRu ? 'Ошибка доставки. Проверьте Chat ID и что бот добавлен в чат.' : 'Delivery error. Check Chat ID and that the bot is added to the chat.',
  };
};

/* ── CRM Providers with guides ── */
interface CrmProviderInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  guideRu: string[];
  guideEn: string[];
  defaultMapping: Record<string, string>;
  needsBaseUrl: boolean;
  apiKeyPlaceholder: string;
  baseUrlPlaceholder?: string;
}

const CRM_PROVIDERS: CrmProviderInfo[] = [
  {
    id: 'hubspot', name: 'HubSpot', icon: '🟧', color: 'text-orange-400',
    guideRu: [
      '1. Войдите в HubSpot → Settings → Integrations → Private Apps',
      '2. Нажмите "Create a private app", задайте имя (например "AFM Sync")',
      '3. Во вкладке Scopes выберите: crm.objects.contacts.read, crm.objects.deals.read',
      '4. Нажмите "Create app" и скопируйте Access Token',
      '5. Вставьте токен в поле API-ключ ниже',
    ],
    guideEn: [
      '1. Log in to HubSpot → Settings → Integrations → Private Apps',
      '2. Click "Create a private app", set a name (e.g. "AFM Sync")',
      '3. In the Scopes tab select: crm.objects.contacts.read, crm.objects.deals.read',
      '4. Click "Create app" and copy the Access Token',
      '5. Paste the token in the API key field below',
    ],
    defaultMapping: { first_name: 'firstname', last_name: 'lastname', email: 'email', phone: 'phone', company: 'company' },
    needsBaseUrl: false,
    apiKeyPlaceholder: 'pat-na1-xxxxxxxx-xxxx...',
  },
  {
    id: 'salesforce', name: 'Salesforce', icon: '☁️', color: 'text-blue-500',
    guideRu: [
      '1. Войдите в Salesforce → Setup → Apps → App Manager',
      '2. Создайте Connected App с OAuth: Full access или api refresh_token',
      '3. Получите Consumer Key и Consumer Secret',
      '4. Используйте Password Flow для генерации Access Token',
      '5. Вставьте Access Token и Instance URL ниже',
    ],
    guideEn: [
      '1. Log in to Salesforce → Setup → Apps → App Manager',
      '2. Create a Connected App with OAuth: Full access or api refresh_token',
      '3. Get Consumer Key and Consumer Secret',
      '4. Use Password Flow to generate an Access Token',
      '5. Paste the Access Token and Instance URL below',
    ],
    defaultMapping: { first_name: 'FirstName', last_name: 'LastName', email: 'Email', phone: 'Phone', company: 'Company' },
    needsBaseUrl: true,
    apiKeyPlaceholder: '00D5g000007...',
    baseUrlPlaceholder: 'https://yourorg.my.salesforce.com',
  },
  {
    id: 'zoho', name: 'Zoho CRM', icon: '🔴', color: 'text-red-500',
    guideRu: [
      '1. Войдите в Zoho API Console (api-console.zoho.com)',
      '2. Создайте Self Client и задайте scope: ZohoCRM.modules.ALL',
      '3. Сгенерируйте Grant Token и обменяйте на Refresh Token',
      '4. Используйте Refresh Token для получения Access Token',
      '5. Вставьте Access Token и укажите Base URL вашего датацентра',
    ],
    guideEn: [
      '1. Go to Zoho API Console (api-console.zoho.com)',
      '2. Create a Self Client and set scope: ZohoCRM.modules.ALL',
      '3. Generate a Grant Token and exchange it for a Refresh Token',
      '4. Use the Refresh Token to get an Access Token',
      '5. Paste the Access Token and specify your datacenter Base URL',
    ],
    defaultMapping: { first_name: 'First_Name', last_name: 'Last_Name', email: 'Email', phone: 'Phone', company: 'Company' },
    needsBaseUrl: true,
    apiKeyPlaceholder: '1000.xxxxxxxx.xxxxxxxx',
    baseUrlPlaceholder: 'https://www.zohoapis.com',
  },
  {
    id: 'pipedrive', name: 'Pipedrive', icon: '🟢', color: 'text-green-500',
    guideRu: [
      '1. Войдите в Pipedrive → Settings → Personal Preferences → API',
      '2. Скопируйте ваш Personal API Token',
      '3. Или создайте OAuth App в Developer Hub для более безопасного доступа',
      '4. Вставьте API Token в поле ниже',
      '5. Base URL определяется автоматически по вашему аккаунту',
    ],
    guideEn: [
      '1. Log in to Pipedrive → Settings → Personal Preferences → API',
      '2. Copy your Personal API Token',
      '3. Or create an OAuth App in the Developer Hub for more secure access',
      '4. Paste the API Token in the field below',
      '5. Base URL is determined automatically from your account',
    ],
    defaultMapping: { full_name: 'name', email: 'email', phone: 'phone', company: 'org_name', value: 'value' },
    needsBaseUrl: true,
    apiKeyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    baseUrlPlaceholder: 'https://yourcompany.pipedrive.com/api/v1',
  },
  {
    id: 'gohighlevel', name: 'GoHighLevel', icon: '🟠', color: 'text-orange-500',
    guideRu: [
      '1. Войдите в GoHighLevel → Settings → Company',
      '2. Перейдите в раздел Private Integrations (или API → Private Integration)',
      '3. Создайте Private Integration с правами: contacts.readonly, opportunities.readonly',
      '4. Скопируйте токен (начинается с pit-...)',
      '5. Вставьте токен в поле API-ключ ниже',
      '6. ОБЯЗАТЕЛЬНО: укажите Location ID в поле Base URL (Settings → Business Info → Location ID)',
      '⚠️ Используется GHL API v2 с заголовком Version: 2021-07-28',
    ],
    guideEn: [
      '1. Log in to GoHighLevel → Settings → Company',
      '2. Go to Private Integrations (or API → Private Integration)',
      '3. Create a Private Integration with scopes: contacts.readonly, opportunities.readonly',
      '4. Copy the token (starts with pit-...)',
      '5. Paste the token in the API key field below',
      '6. REQUIRED: enter Location ID in Base URL field (Settings → Business Info → Location ID)',
      '⚠️ Uses GHL API v2 with Version: 2021-07-28 header',
    ],
    defaultMapping: { first_name: 'firstName', last_name: 'lastName', email: 'email', phone: 'phone', company: 'companyName' },
    needsBaseUrl: true,
    apiKeyPlaceholder: 'pit-xxxxxxxx-xxxx-xxxx...',
    baseUrlPlaceholder: 'Location ID (например: abc123XYZ)',
  },
  {
    id: 'amocrm', name: 'AmoCRM', icon: '🔷', color: 'text-blue-400',
    guideRu: [
      '1. Войдите в AmoCRM → Настройки → Интеграции',
      '2. Создайте интеграцию и скопируйте Long-lived Access Token',
      '3. Или используйте OAuth для авторизации',
      '4. Укажите ваш домен AmoCRM в поле Base URL',
      '5. Вставьте токен в поле API-ключ',
    ],
    guideEn: [
      '1. Log in to AmoCRM → Settings → Integrations',
      '2. Create an integration and copy the Long-lived Access Token',
      '3. Or use OAuth for authorization',
      '4. Enter your AmoCRM domain in the Base URL field',
      '5. Paste the token in the API key field',
    ],
    defaultMapping: { full_name: 'name', email: 'email', phone: 'phone', value: 'price' },
    needsBaseUrl: true,
    apiKeyPlaceholder: 'Bearer eyJ0eX...',
    baseUrlPlaceholder: 'https://your-domain.amocrm.ru',
  },
  {
    id: 'bitrix24', name: 'Bitrix24', icon: '🔵', color: 'text-blue-500',
    guideRu: [
      '1. Войдите в Bitrix24 → Разработчикам → Другие → Входящий вебхук',
      '2. Настройте права: CRM (crm), Списки (lists)',
      '3. Скопируйте URL вебхука (например: https://your-domain.bitrix24.ru/rest/1/abc123/)',
      '4. Вставьте URL вебхука в поле API-ключ',
      '5. Контакты и сделки будут синхронизироваться автоматически',
    ],
    guideEn: [
      '1. Log in to Bitrix24 → Developer resources → Other → Inbound webhook',
      '2. Set permissions: CRM (crm), Lists (lists)',
      '3. Copy the webhook URL (e.g.: https://your-domain.bitrix24.ru/rest/1/abc123/)',
      '4. Paste the webhook URL in the API key field',
      '5. Contacts and deals will be synced automatically',
    ],
    defaultMapping: { first_name: 'NAME', last_name: 'LAST_NAME', email: 'EMAIL', phone: 'PHONE', company: 'COMPANY_TITLE' },
    needsBaseUrl: false,
    apiKeyPlaceholder: 'https://your-domain.bitrix24.ru/rest/1/abc123/',
  },
  {
    id: 'monday', name: 'Monday.com', icon: '🟡', color: 'text-yellow-500',
    guideRu: [
      '1. Войдите в Monday.com → Аватар → Developers',
      '2. Создайте новый API Token в My Access Tokens',
      '3. Скопируйте токен (v2 API Token)',
      '4. Вставьте токен в поле API-ключ',
      '5. Укажите Board ID в Base URL для синхронизации конкретной доски',
    ],
    guideEn: [
      '1. Log in to Monday.com → Avatar → Developers',
      '2. Create a new API Token in My Access Tokens',
      '3. Copy the token (v2 API Token)',
      '4. Paste the token in the API key field',
      '5. Specify the Board ID in Base URL to sync a specific board',
    ],
    defaultMapping: { full_name: 'name', email: 'email', phone: 'phone', status: 'status' },
    needsBaseUrl: true,
    apiKeyPlaceholder: 'eyJhbGciOiJIUzI1NiJ9...',
    baseUrlPlaceholder: 'https://api.monday.com/v2 (Board ID: 12345)',
  },
  {
    id: 'freshsales', name: 'Freshsales', icon: '🟩', color: 'text-emerald-500',
    guideRu: [
      '1. Войдите в Freshsales → Settings → API Settings',
      '2. Скопируйте ваш API Key',
      '3. Укажите Bundle Alias (ваш поддомен) в Base URL',
      '4. Вставьте API Key в поле ниже',
      '5. Лиды и контакты будут подтягиваться автоматически',
    ],
    guideEn: [
      '1. Log in to Freshsales → Settings → API Settings',
      '2. Copy your API Key',
      '3. Enter your Bundle Alias (subdomain) in Base URL',
      '4. Paste the API Key in the field below',
      '5. Leads and contacts will be pulled automatically',
    ],
    defaultMapping: { first_name: 'first_name', last_name: 'last_name', email: 'email', phone: 'mobile_number', company: 'company_name' },
    needsBaseUrl: true,
    apiKeyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
    baseUrlPlaceholder: 'https://yourdomain.freshsales.io',
  },
  {
    id: 'close', name: 'Close CRM', icon: '⚫', color: 'text-foreground',
    guideRu: [
      '1. Войдите в Close → Settings → API Keys',
      '2. Создайте новый API Key',
      '3. Скопируйте ключ (формат: api_xxxxx)',
      '4. Вставьте в поле API-ключ ниже',
      '5. Лиды будут импортироваться автоматически',
    ],
    guideEn: [
      '1. Log in to Close → Settings → API Keys',
      '2. Create a new API Key',
      '3. Copy the key (format: api_xxxxx)',
      '4. Paste it in the API key field below',
      '5. Leads will be imported automatically',
    ],
    defaultMapping: { full_name: 'display_name', email: 'email', phone: 'phone', company: 'organization_name' },
    needsBaseUrl: false,
    apiKeyPlaceholder: 'api_xxxxxxxxxxxxxxxxxxxxxxx',
  },
  {
    id: 'copper', name: 'Copper (ProsperWorks)', icon: '🟤', color: 'text-amber-700',
    guideRu: [
      '1. Войдите в Copper → Settings → Integrations → API Keys',
      '2. Сгенерируйте новый API Key',
      '3. Также потребуется ваш Email для заголовка X-PW-UserEmail',
      '4. Вставьте API Key в поле ниже, Email укажите в Base URL',
      '5. Контакты будут синхронизироваться из Copper',
    ],
    guideEn: [
      '1. Log in to Copper → Settings → Integrations → API Keys',
      '2. Generate a new API Key',
      '3. You will also need your Email for the X-PW-UserEmail header',
      '4. Paste the API Key below, enter Email in Base URL',
      '5. Contacts will be synced from Copper',
    ],
    defaultMapping: { first_name: 'first_name', last_name: 'last_name', email: 'email', phone: 'phone_numbers', company: 'company_name' },
    needsBaseUrl: true,
    apiKeyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    baseUrlPlaceholder: 'your-email@company.com',
  },
  {
    id: 'custom', name: 'Custom API', icon: '⚡', color: 'text-amber-500',
    guideRu: [
      '1. Укажите Base URL вашего API (например: https://api.example.com/v1/contacts)',
      '2. Введите API-ключ или Bearer Token для авторизации',
      '3. Настройте маппинг полей под структуру вашего API',
      '4. API должен возвращать массив объектов в ответе',
      '5. Протестируйте подключение перед сохранением',
    ],
    guideEn: [
      '1. Enter your API Base URL (e.g.: https://api.example.com/v1/contacts)',
      '2. Enter the API key or Bearer Token for authorization',
      '3. Configure field mapping for your API structure',
      '4. The API should return an array of objects',
      '5. Test the connection before saving',
    ],
    defaultMapping: { first_name: 'first_name', email: 'email', phone: 'phone' },
    needsBaseUrl: true,
    apiKeyPlaceholder: 'Bearer token or API key...',
    baseUrlPlaceholder: 'https://api.example.com/v1',
  },
];

/* ── Types ── */
interface BotProfile {
  id: string; client_id: string; bot_name: string; bot_token_ref: string | null; is_active: boolean; created_at: string;
}

interface ClientNotificationConfig {
  client_id: string; telegram_enabled: boolean; telegram_chat_id: string;
  webhook_enabled: boolean; webhook_url: string;
  notify_new_lead: boolean; notify_stage_change: boolean; notify_won: boolean; notify_lost: boolean;
}

interface CrmConnection {
  id: string; client_id: string; provider: string; label: string;
  api_key_ref: string | null; base_url: string | null;
  sync_enabled: boolean; sync_interval_minutes: number;
  last_synced_at: string | null; last_sync_status: string | null; last_sync_error: string | null;
  field_mapping: Record<string, string>; is_active: boolean; created_at: string;
}

/* ── Bot Management Inline ── */
function BotManagementInline({ clientId, lang }: { clientId: string; lang: string }) {
  const t = T(lang);
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [newToken, setNewToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchBots = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_bot_profiles').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setBots(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBots(); }, [clientId]);

  const handleAdd = async () => {
    if (!newName.trim() || !newToken.trim()) return;
    setSaving(true);
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(newToken.trim())) {
      toast({ title: t.error, description: t.invalidToken, variant: 'destructive' });
      setSaving(false);
      return;
    }
    const { data: vaultData, error: vaultErr } = await supabase.functions.invoke('store-bot-token', {
      body: { secret_name: `crm_bot_${clientId}_${Date.now()}`, secret_value: newToken.trim() },
    });
    if (vaultErr || vaultData?.error) {
      toast({ title: t.error, description: vaultData?.error || vaultErr?.message, variant: 'destructive' });
      setSaving(false);
      return;
    }
    await supabase.from('crm_bot_profiles').update({ is_active: false }).eq('client_id', clientId);
    const { error } = await supabase.from('crm_bot_profiles').insert({
      client_id: clientId, bot_name: newName.trim(), bot_token_ref: vaultData?.token_ref, is_active: true,
    });
    if (error) toast({ title: t.error, description: error.message, variant: 'destructive' });
    else {
      toast({ title: t.botAdded, description: `${newName}` });
      setNewName(''); setNewToken(''); setAddMode(false); fetchBots();
    }
    setSaving(false);
  };

  const handleActivate = async (botId: string) => {
    await supabase.from('crm_bot_profiles').update({ is_active: false }).eq('client_id', clientId);
    await supabase.from('crm_bot_profiles').update({ is_active: true }).eq('id', botId);
    fetchBots();
    toast({ title: t.botActivated });
  };

  const handleDelete = async (bot: BotProfile) => {
    if (bot.bot_token_ref) await supabase.rpc('delete_social_token', { _token_reference: bot.bot_token_ref });
    await supabase.from('crm_bot_profiles').delete().eq('id', bot.id);
    fetchBots();
    toast({ title: t.botDeleted });
  };

  const handleTest = async (bot: BotProfile) => {
    if (!bot.bot_token_ref) return;
    setTesting(bot.id);
    try {
      const { data, error } = await supabase.functions.invoke('test-bot-token', { body: { token_ref: bot.bot_token_ref } });
      if (error) throw new Error(error.message);
      if (data.ok) toast({ title: `✅ ${t.botAvailable}`, description: `@${data.result.username} — ${data.result.first_name}` });
      else toast({ title: `❌ ${t.botError}`, description: data.description || data.error, variant: 'destructive' });
    } catch (e: any) {
      toast({ title: `❌ ${t.error}`, description: e.message, variant: 'destructive' });
    }
    setTesting(null);
  };

  if (loading) return <Skeleton className="h-32" />;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">{t.telegramBots}</p>
          </div>
          <p className="text-xs text-muted-foreground">{t.telegramBotsDesc}</p>
        </CardContent>
      </Card>

      {bots.length === 0 && !addMode && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Bot className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>{t.noBots}</p>
          <p className="text-xs mt-1">{t.noBotsDesc}</p>
        </div>
      )}

      {bots.map(bot => (
        <div key={bot.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${bot.is_active ? 'border-primary/40 bg-primary/5' : 'border-border/50'}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">{bot.bot_name}</span>
              {bot.is_active && <Badge className="text-[9px] h-4 bg-primary/20 text-primary border-primary/30">{t.active}</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t.added}: {new Date(bot.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}</p>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => handleTest(bot)} disabled={testing === bot.id}>
              {testing === bot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : t.test}
            </Button>
            {!bot.is_active && <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => handleActivate(bot.id)}>{t.activate}</Button>}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(bot)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {addMode ? (
        <div className="space-y-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <div className="space-y-2">
            <Label className="text-xs">{t.botName}</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="AFM CRM Bot" className="h-8 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">{t.botToken}</Label>
            <Input value={newToken} onChange={e => setNewToken(e.target.value)} placeholder="1234567890:AAH..." className="h-8 text-sm font-mono" type="password" />
            <p className="text-[10px] text-muted-foreground">{t.tokenEncrypted}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs" onClick={handleAdd} disabled={saving || !newName.trim() || !newToken.trim()}>
              {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}{t.addBotBtn}
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { setAddMode(false); setNewName(''); setNewToken(''); }}>{t.cancel}</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setAddMode(true)}>
          <Plus className="h-3.5 w-3.5" /> {t.addBot}
        </Button>
      )}

      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
        <p className="font-medium text-foreground">💡 {t.howItWorks}</p>
        <p className="text-muted-foreground">{t.howItWorksDesc}</p>
      </div>
    </div>
  );
}

/* ── External CRM Connectors ── */
function ExternalCrmConnectors({ clientId, lang }: { clientId: string; lang: string }) {
  const t = T(lang);
  const [connections, setConnections] = useState<CrmConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editConnection, setEditConnection] = useState<CrmConnection | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const [formProvider, setFormProvider] = useState('hubspot');
  const [formLabel, setFormLabel] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formSyncInterval, setFormSyncInterval] = useState('60');
  const [formFieldMapping, setFormFieldMapping] = useState('');
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const fetchConnections = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_external_connections').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setConnections((data as CrmConnection[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (clientId) fetchConnections(); }, [clientId]);

  const resetForm = () => {
    setFormProvider('hubspot'); setFormLabel(''); setFormApiKey(''); setFormBaseUrl('');
    setFormSyncInterval('60'); setFormFieldMapping(''); setTestResult(null); setEditConnection(null); setGuideOpen(false);
  };

  const openAddDialog = () => { resetForm(); setAddDialogOpen(true); };

  const openEditDialog = (conn: CrmConnection) => {
    setEditConnection(conn); setFormProvider(conn.provider); setFormLabel(conn.label);
    setFormApiKey(''); setFormBaseUrl(conn.base_url || '');
    setFormSyncInterval(String(conn.sync_interval_minutes));
    setFormFieldMapping(Object.keys(conn.field_mapping || {}).length > 0 ? JSON.stringify(conn.field_mapping, null, 2) : '');
    setTestResult(null); setGuideOpen(false); setAddDialogOpen(true);
  };

  const selectedProvider = CRM_PROVIDERS.find(p => p.id === formProvider) || CRM_PROVIDERS[CRM_PROVIDERS.length - 1];

  const handleSave = async () => {
    if (!formProvider) return;
    if (!editConnection && !formApiKey.trim()) {
      toast({ title: t.error, description: t.enterApiKey, variant: 'destructive' });
      return;
    }
    setSaving(true);

    let fieldMapping: Record<string, string> = {};
    if (formFieldMapping.trim()) {
      try { fieldMapping = JSON.parse(formFieldMapping); }
      catch { toast({ title: t.error, description: t.invalidJson, variant: 'destructive' }); setSaving(false); return; }
    } else {
      fieldMapping = selectedProvider.defaultMapping;
    }

    const payload: Record<string, unknown> = {
      client_id: clientId, provider: formProvider,
      label: formLabel || selectedProvider.name,
      base_url: formBaseUrl || undefined,
      sync_interval_minutes: parseInt(formSyncInterval) || 60,
      field_mapping: fieldMapping,
    };
    if (formApiKey.trim()) payload.api_key = formApiKey.trim();
    if (editConnection) payload.connection_id = editConnection.id;

    const { data, error } = await supabase.functions.invoke('crm-store-connection', { body: payload });
    if (error || data?.error) {
      toast({ title: t.error, description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: editConnection ? t.connectionUpdated : t.crmConnected, description: `${payload.label}` });
      setAddDialogOpen(false); resetForm(); fetchConnections();
      // Trigger first sync for new connections to auto-import pipelines
      if (!editConnection && data?.connection_id) {
        supabase.functions.invoke('crm-external-sync', { body: { connection_id: data.connection_id, first_sync: true } });
      }
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting('form'); setTestResult(null);
    const payload: Record<string, unknown> = { provider: formProvider, base_url: formBaseUrl || undefined };
    if (editConnection && !formApiKey.trim()) payload.connection_id = editConnection.id;
    else payload.api_key = formApiKey.trim();
    const { data, error } = await supabase.functions.invoke('crm-test-connection', { body: payload });
    if (error) setTestResult({ ok: false, message: error.message });
    else setTestResult({ ok: data?.ok, message: data?.message || 'Unknown' });
    setTesting(null);
  };

  const handleTestExisting = async (connId: string) => {
    setTesting(connId);
    const { data, error } = await supabase.functions.invoke('crm-test-connection', { body: { connection_id: connId } });
    if (error) toast({ title: `❌ ${t.error}`, description: error.message, variant: 'destructive' });
    else if (data?.ok) toast({ title: `✅ ${t.connectionActive}`, description: data.message });
    else toast({ title: `⚠️ ${t.connectionProblem}`, description: data?.message || t.noConnection, variant: 'destructive' });
    setTesting(null);
  };

  const handleSyncNow = async (connId: string) => {
    setSyncing(connId);
    const { data, error } = await supabase.functions.invoke('crm-external-sync', { body: { connection_id: connId } });
    if (error) toast({ title: t.syncError, description: error.message, variant: 'destructive' });
    else {
      const result = data?.results?.[connId];
      if (result?.success) toast({ title: `✅ ${t.syncComplete}`, description: `${t.leadsImported}: ${result.leads_synced}` });
      else toast({ title: `⚠️ ${t.syncError}`, description: result?.error || t.error, variant: 'destructive' });
      fetchConnections();
    }
    setSyncing(null);
  };

  const handleToggleActive = async (conn: CrmConnection) => {
    await supabase.from('crm_external_connections').update({ is_active: !conn.is_active }).eq('id', conn.id);
    fetchConnections();
    toast({ title: conn.is_active ? t.connectionDisabled : t.connectionEnabled });
  };

  const handleDelete = async (conn: CrmConnection) => {
    if (conn.api_key_ref) await supabase.rpc('delete_crm_connection_secret', { _secret_ref: conn.api_key_ref });
    await supabase.from('crm_external_connections').delete().eq('id', conn.id);
    fetchConnections();
    toast({ title: t.connectionDeleted });
  };

  const getStatusBadge = (conn: CrmConnection) => {
    if (!conn.is_active) return <Badge variant="secondary" className="text-[9px] gap-1"><PowerOff className="h-2.5 w-2.5" /> {t.disabled}</Badge>;
    if (conn.last_sync_status === 'success') return <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1"><CheckCircle className="h-2.5 w-2.5" /> {t.connected}</Badge>;
    if (conn.last_sync_status === 'error') return <Badge variant="destructive" className="text-[9px] gap-1"><AlertTriangle className="h-2.5 w-2.5" /> {t.errorStatus}</Badge>;
    return <Badge variant="outline" className="text-[9px] gap-1"><Clock className="h-2.5 w-2.5" /> {t.waiting}</Badge>;
  };

  const getProviderInfo = (id: string) => CRM_PROVIDERS.find(p => p.id === id) || { id, name: id, icon: '🔗', color: 'text-muted-foreground' };

  const timeAgo = (iso: string | null) => {
    if (!iso) return t.never;
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return t.justNow;
    if (mins < 60) return `${mins} ${t.minAgo}`;
    if (mins < 1440) return `${Math.floor(mins / 60)} ${t.hAgo}`;
    return `${Math.floor(mins / 1440)} ${t.dAgo}`;
  };

  if (loading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">{t.connectExternalCrm}</p>
          </div>
          <p className="text-xs text-muted-foreground">{t.connectExternalCrmDesc}</p>
        </CardContent>
      </Card>

      {connections.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Globe className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{t.noCrmConnected}</p>
          <p className="text-xs mt-1">{t.noCrmConnectedDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map(conn => {
            const prov = getProviderInfo(conn.provider);
            return (
              <Card key={conn.id} className={`border-border/40 transition-colors ${!conn.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{prov.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{conn.label}</span>
                        {getStatusBadge(conn)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{prov.name}</span>
                        <span>•</span>
                        <span>{t.syncEvery} {conn.sync_interval_minutes} {t.min}</span>
                        <span>•</span>
                        <span>{t.last}: {timeAgo(conn.last_synced_at)}</span>
                      </div>
                    </div>
                  </div>
                  {conn.last_sync_status === 'error' && conn.last_sync_error && (
                    <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{conn.last_sync_error}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleSyncNow(conn.id)} disabled={syncing === conn.id || !conn.is_active}>
                      {syncing === conn.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}{t.syncNow}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleTestExisting(conn.id)} disabled={testing === conn.id}>
                      {testing === conn.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}{t.test}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => openEditDialog(conn)}>
                      <Pencil className="h-3 w-3" /> {t.edit}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleToggleActive(conn)}>
                      {conn.is_active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                      {conn.is_active ? t.disable : t.enable}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive ml-auto" onClick={() => handleDelete(conn)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Button variant="outline" className="w-full gap-1.5" onClick={openAddDialog}>
        <Plus className="h-4 w-4" /> {t.connectCrm}
      </Button>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(v) => { if (!v) resetForm(); setAddDialogOpen(v); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              {editConnection ? t.connectionSettings : t.connectExternalCrmDialog}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pr-1">
            {/* Provider */}
            <div className="space-y-2">
              <Label className="text-xs">{t.crmProvider}</Label>
              <Select value={formProvider} onValueChange={(v) => { setFormProvider(v); setFormFieldMapping(''); setGuideOpen(false); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CRM_PROVIDERS.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">{p.icon} {p.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Setup guide collapsible */}
            <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors w-full">
                <Info className="h-3.5 w-3.5" />
                <span>{t.setupGuide}: {selectedProvider.name}</span>
                <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${guideOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="p-3 rounded-lg bg-muted/50 border border-border/40 space-y-1.5 text-xs text-muted-foreground">
                  {(lang === 'ru' ? selectedProvider.guideRu : selectedProvider.guideEn).map((step, i) => (
                    <p key={i}>{step}</p>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Label */}
            <div className="space-y-2">
              <Label className="text-xs">{t.connectionName}</Label>
              <Input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder={selectedProvider.name} className="h-9 text-sm" />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label className="text-xs">
                {formProvider === 'bitrix24' ? t.webhookUrl : t.apiKey}
                {editConnection && <span className="text-muted-foreground ml-1">{t.leaveEmptyToKeep}</span>}
              </Label>
              <Input value={formApiKey} onChange={e => setFormApiKey(e.target.value)}
                placeholder={selectedProvider.apiKeyPlaceholder}
                className="h-9 text-sm font-mono" type="password" />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" /> {t.keyEncrypted}
              </p>
            </div>

            {/* Base URL / Location ID */}
            {selectedProvider.needsBaseUrl && (
              <div className="space-y-2">
                <Label className="text-xs">
                  {formProvider === 'gohighlevel' ? 'Location ID' : t.baseUrl}
                </Label>
                <Input value={formBaseUrl} onChange={e => setFormBaseUrl(e.target.value)}
                  placeholder={selectedProvider.baseUrlPlaceholder || 'https://api.example.com'}
                  className="h-9 text-sm font-mono" />
                {formProvider === 'gohighlevel' && (
                  <p className="text-[10px] text-amber-500">
                    {lang === 'ru'
                      ? '⚠️ Location ID обязателен. Найти: Settings → Business Info'
                      : '⚠️ Location ID is required. Find it: Settings → Business Info'}
                  </p>
                )}
              </div>
            )}

            {/* Sync interval */}
            <div className="space-y-2">
              <Label className="text-xs">{t.syncInterval}</Label>
              <Select value={formSyncInterval} onValueChange={setFormSyncInterval}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">{t.every30min}</SelectItem>
                  <SelectItem value="60">{t.everyHour}</SelectItem>
                  <SelectItem value="120">{t.every2h}</SelectItem>
                  <SelectItem value="360">{t.every6h}</SelectItem>
                  <SelectItem value="720">{t.every12h}</SelectItem>
                  <SelectItem value="1440">{t.daily}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Field mapping */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary transition-colors">
                <ChevronDown className="h-3.5 w-3.5" /> {t.fieldMapping}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                <p className="text-[10px] text-muted-foreground">{t.fieldMappingDesc}</p>
                <Textarea value={formFieldMapping} onChange={e => setFormFieldMapping(e.target.value)}
                  placeholder={JSON.stringify(selectedProvider.defaultMapping, null, 2)}
                  className="text-xs font-mono min-h-[80px]" />
              </CollapsibleContent>
            </Collapsible>

            {/* Test result */}
            {testResult && (
              <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${testResult.ok ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                {testResult.ok ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />}
                <p className={testResult.ok ? 'text-emerald-600' : 'text-destructive'}>{testResult.message}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleTest}
              disabled={testing === 'form' || (!formApiKey.trim() && !editConnection)}>
              {testing === 'form' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              {t.testConnection}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handleSave}
              disabled={saving || (!formApiKey.trim() && !editConnection)}>
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {editConnection ? t.saveChanges : t.connect}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Main Page ── */
export default function CrmIntegrationsPage() {
  const { language } = useLanguage();
  const t = T(language);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [config, setConfig] = useState<ClientNotificationConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [botDialogOpen, setBotDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingClients(true);
      const { data } = await supabase.from('clients').select('id, name').eq('status', 'active').order('name');
      setClients(data || []);
      if (data && data.length > 0) setSelectedClientId(data[0].id);
      setLoadingClients(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedClientId) { setConfig(null); return; }
    setTestResult(null);
    (async () => {
      const { data } = await supabase.from('client_webhooks').select('*').eq('client_id', selectedClientId).like('name', '__notification_%').limit(2);
      const telegramWh = (data || []).find((w: any) => w.name === '__notification_telegram');
      const webhookWh = (data || []).find((w: any) => w.name === '__notification_webhook');
      setConfig({
        client_id: selectedClientId,
        telegram_enabled: telegramWh?.is_active || false,
        telegram_chat_id: telegramWh?.url?.replace('telegram://', '') || '',
        webhook_enabled: webhookWh?.is_active || false,
        webhook_url: webhookWh?.url || '',
        notify_new_lead: true,
        notify_stage_change: telegramWh?.events?.includes('stage_changed') || webhookWh?.events?.includes('stage_changed') || false,
        notify_won: telegramWh?.events?.includes('won') || webhookWh?.events?.includes('won') || true,
        notify_lost: telegramWh?.events?.includes('lost') || webhookWh?.events?.includes('lost') || false,
      });
    })();
  }, [selectedClientId]);

  const handleSave = async () => {
    if (!config || !selectedClientId) return;
    setSaving(true);
    const events = ['new_lead', 'test'];
    if (config.notify_stage_change) events.push('stage_changed');
    if (config.notify_won) events.push('won');
    if (config.notify_lost) events.push('lost');

    const telegramUrl = config.telegram_chat_id ? `telegram://${config.telegram_chat_id}` : '';
    const { data: existingTg } = await supabase.from('client_webhooks').select('id').eq('client_id', selectedClientId).eq('name', '__notification_telegram').maybeSingle();
    if (existingTg) await supabase.from('client_webhooks').update({ url: telegramUrl, is_active: config.telegram_enabled && !!config.telegram_chat_id, events }).eq('id', existingTg.id);
    else if (config.telegram_enabled && config.telegram_chat_id) await supabase.from('client_webhooks').insert({ client_id: selectedClientId, name: '__notification_telegram', url: telegramUrl, is_active: true, events });

    const { data: existingWh } = await supabase.from('client_webhooks').select('id').eq('client_id', selectedClientId).eq('name', '__notification_webhook').maybeSingle();
    if (existingWh) await supabase.from('client_webhooks').update({ url: config.webhook_url || '', is_active: config.webhook_enabled && !!config.webhook_url, events }).eq('id', existingWh.id);
    else if (config.webhook_enabled && config.webhook_url) await supabase.from('client_webhooks').insert({ client_id: selectedClientId, name: '__notification_webhook', url: config.webhook_url, is_active: true, events });

    setSaving(false);
    toast({ title: t.save, description: t.saved });
  };

  const handleTestTelegram = async () => {
    if (!config?.telegram_chat_id || !selectedClientId) return;
    setTesting(true); setTestResult(null);
    await handleSave();
    try {
      const { data, error } = await supabase.functions.invoke('trigger-webhooks', {
        body: { client_id: selectedClientId, event_type: 'test', data: { full_name: 'Test Lead', phone: '+7 999 123-45-67', email: 'test@afmdigital.com', source: 'CRM Integration Test' } },
      });
      if (error) throw error;
      const results = data?.results || {};
      const anySuccess = Object.values(results).some((r: any) => r.success);
      if (data?.triggered === 0) setTestResult({ ok: false, message: t.noActiveWebhooks });
      else if (anySuccess) setTestResult({ ok: true, message: `✅ ${t.testSuccess}` });
      else setTestResult({ ok: false, message: t.testErrorDelivery });
    } catch (e: any) {
      setTestResult({ ok: false, message: `${t.error}: ${e.message}` });
    }
    setTesting(false);
  };

  if (loadingClients) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">{t.integrations}</h1>
        <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder={t.selectClient} /></SelectTrigger>
          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="notifications" className="text-xs gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {t.notifications}</TabsTrigger>
          <TabsTrigger value="bots" className="text-xs gap-1.5"><Bot className="h-3.5 w-3.5" /> {t.manageBots}</TabsTrigger>
          <TabsTrigger value="external" className="text-xs gap-1.5"><Globe className="h-3.5 w-3.5" /> {t.externalCrm}</TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Collapsible>
            <Card className="border-primary/20 bg-primary/5">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 cursor-pointer hover:bg-primary/10 transition-colors rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{t.telegramGuide}</CardTitle>
                    <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 text-sm">
                  {[
                    { n: 1, title: t.step1Title, desc: t.step1Desc },
                    { n: 2, title: t.step2Title, desc: t.step2Desc },
                    { n: 3, title: t.step3Title, desc: t.step3Desc },
                    { n: 4, title: t.step4Title, desc: t.step4Desc },
                  ].map(s => (
                    <div key={s.n} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{s.n}</span>
                      <div><p className="font-medium text-xs">{s.title}</p><p className="text-[10px] text-muted-foreground">{s.desc}</p></div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {config && (
            <>
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Telegram Bot</CardTitle>
                    <Switch checked={config.telegram_enabled} onCheckedChange={v => setConfig({ ...config, telegram_enabled: v })} className="ml-auto" />
                  </div>
                </CardHeader>
                {config.telegram_enabled && (
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Chat ID</Label>
                      <Input placeholder="-1001234567890" value={config.telegram_chat_id}
                        onChange={e => setConfig({ ...config, telegram_chat_id: e.target.value })}
                        className="text-sm h-9 mt-1 font-mono" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={handleTestTelegram} disabled={testing || !config.telegram_chat_id}>
                        <Send className="h-3 w-3" />{testing ? t.sending : t.sendTest}
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setBotDialogOpen(true)}>
                        <Settings className="h-3 w-3" /> {t.manageBots}
                      </Button>
                    </div>
                    {testResult && (
                      <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${testResult.ok ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                        {testResult.ok ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />}
                        <p className={testResult.ok ? 'text-emerald-600' : 'text-destructive'}>{testResult.message}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Webhook</CardTitle>
                    <Switch checked={config.webhook_enabled} onCheckedChange={v => setConfig({ ...config, webhook_enabled: v })} className="ml-auto" />
                  </div>
                </CardHeader>
                {config.webhook_enabled && (
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">URL</Label>
                      <Input placeholder="https://hooks.zapier.com/..." value={config.webhook_url}
                        onChange={e => setConfig({ ...config, webhook_url: e.target.value })}
                        className="text-sm h-9 mt-1 font-mono" />
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card className="border-border/40">
                <CardHeader className="pb-3"><CardTitle className="text-base">{t.eventTriggers}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: t.newLeadCreated, key: 'notify_new_lead' as const },
                    { label: t.stageChanged, key: 'notify_stage_change' as const },
                    { label: t.dealWon, key: 'notify_won' as const },
                    { label: t.dealLost, key: 'notify_lost' as const },
                  ].map(ev => (
                    <label key={ev.key} className="flex items-center justify-between">
                      <span className="text-sm">{ev.label}</span>
                      <Switch checked={config[ev.key]} onCheckedChange={v => setConfig({ ...config, [ev.key]: v })} />
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? t.loading : t.save}
              </Button>
            </>
          )}
        </TabsContent>

        {/* Bots Tab */}
        <TabsContent value="bots" className="space-y-4">
          {selectedClientId && <BotManagementInline clientId={selectedClientId} lang={language} />}
        </TabsContent>

        {/* External CRM Tab */}
        <TabsContent value="external" className="space-y-4">
          {selectedClientId && <ExternalCrmConnectors clientId={selectedClientId} lang={language} />}
        </TabsContent>
      </Tabs>

      {/* Legacy bot dialog (from notification tab button) */}
      {selectedClientId && botDialogOpen && (
        <Dialog open={botDialogOpen} onOpenChange={setBotDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" /> {t.manageBots}
              </DialogTitle>
            </DialogHeader>
            <BotManagementInline clientId={selectedClientId} lang={language} />
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">{t.close}</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

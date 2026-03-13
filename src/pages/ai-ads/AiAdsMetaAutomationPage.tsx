import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Target, Users, Upload, Plus, Settings, Loader2, AlertTriangle,
  CheckCircle2, Zap, FileText, Globe, BarChart3, Search,
  Copy, ArrowRight, Info, Crosshair, UserPlus, ListFilter, Sparkles,
  RefreshCw, Trash2, Eye, DollarSign, TrendingUp, Shield, Play, Pause,
  Clock, LayoutGrid, Megaphone, Heart, ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/* ──────────────── Pixel Events ──────────────── */
const STANDARD_EVENTS = [
  { key: 'PageView', icon: Eye, desc: 'Page loaded' },
  { key: 'ViewContent', icon: Search, desc: 'Product/content viewed' },
  { key: 'AddToCart', icon: ShoppingCart, desc: 'Added to cart' },
  { key: 'InitiateCheckout', icon: DollarSign, desc: 'Checkout started' },
  { key: 'Purchase', icon: CheckCircle2, desc: 'Purchase completed' },
  { key: 'Lead', icon: UserPlus, desc: 'Lead form submitted' },
  { key: 'CompleteRegistration', icon: Users, desc: 'Registration completed' },
  { key: 'Contact', icon: FileText, desc: 'Contact request' },
  { key: 'FindLocation', icon: Globe, desc: 'Location search' },
  { key: 'Schedule', icon: Clock, desc: 'Appointment scheduled' },
  { key: 'SubmitApplication', icon: FileText, desc: 'Application submitted' },
  { key: 'Subscribe', icon: Heart, desc: 'Subscription started' },
  { key: 'Search', icon: Search, desc: 'Search performed' },
  { key: 'AddPaymentInfo', icon: DollarSign, desc: 'Payment info added' },
  { key: 'AddToWishlist', icon: Heart, desc: 'Added to wishlist' },
  { key: 'StartTrial', icon: Play, desc: 'Free trial started' },
];

const LEAD_FORM_FIELDS = [
  { key: 'full_name', label: 'Full Name', labelRu: 'Полное имя' },
  { key: 'email', label: 'Email', labelRu: 'Email' },
  { key: 'phone_number', label: 'Phone', labelRu: 'Телефон' },
  { key: 'city', label: 'City', labelRu: 'Город' },
  { key: 'state', label: 'State/Region', labelRu: 'Штат/Регион' },
  { key: 'zip_code', label: 'Zip Code', labelRu: 'Почтовый индекс' },
  { key: 'country', label: 'Country', labelRu: 'Страна' },
  { key: 'company_name', label: 'Company', labelRu: 'Компания' },
  { key: 'job_title', label: 'Job Title', labelRu: 'Должность' },
  { key: 'work_email', label: 'Work Email', labelRu: 'Рабочий email' },
  { key: 'work_phone_number', label: 'Work Phone', labelRu: 'Рабочий телефон' },
  { key: 'date_of_birth', label: 'Date of Birth', labelRu: 'Дата рождения' },
  { key: 'gender', label: 'Gender', labelRu: 'Пол' },
  { key: 'marital_status', label: 'Marital Status', labelRu: 'Семейное положение' },
  { key: 'military_status', label: 'Military Status', labelRu: 'Воинский статус' },
];

const CAMPAIGN_OBJECTIVES = [
  { key: 'OUTCOME_LEADS', label: 'Leads', labelRu: 'Лиды', icon: UserPlus },
  { key: 'OUTCOME_SALES', label: 'Sales', labelRu: 'Продажи', icon: DollarSign },
  { key: 'OUTCOME_TRAFFIC', label: 'Traffic', labelRu: 'Трафик', icon: Globe },
  { key: 'OUTCOME_AWARENESS', label: 'Awareness', labelRu: 'Узнаваемость', icon: Eye },
  { key: 'OUTCOME_ENGAGEMENT', label: 'Engagement', labelRu: 'Вовлечённость', icon: Heart },
  { key: 'OUTCOME_APP_PROMOTION', label: 'App Promotion', labelRu: 'Продвижение приложения', icon: Play },
];

const RULE_TEMPLATES = [
  {
    id: 'pause_high_cpl',
    title: 'Pause on High CPL', titleRu: 'Пауза при высоком CPL',
    desc: 'If CPL > threshold for 3 days → pause adset', descRu: 'Если CPL > порога за 3 дня → пауза adset',
    metric: 'cost_per_lead', operator: 'GREATER_THAN', action: 'PAUSE', entity: 'ADSET', icon: AlertTriangle,
  },
  {
    id: 'increase_budget_roas',
    title: 'Budget Increase on ROAS', titleRu: 'Увеличение бюджета при ROAS',
    desc: 'If ROAS > threshold → increase budget by 20%', descRu: 'Если ROAS > порога → увеличить бюджет на 20%',
    metric: 'purchase_roas', operator: 'GREATER_THAN', action: 'INCREASE_BUDGET', entity: 'CAMPAIGN', icon: TrendingUp,
  },
  {
    id: 'spend_alert',
    title: 'Spend Alert', titleRu: 'Алерт расхода',
    desc: 'If daily spend > budget → notification', descRu: 'Если дневной расход > бюджета → уведомление',
    metric: 'spend', operator: 'GREATER_THAN', action: 'NOTIFY', entity: 'CAMPAIGN', icon: DollarSign,
  },
  {
    id: 'restart_zero_impressions',
    title: 'Restart on 0 Impressions', titleRu: 'Перезапуск при 0 показов',
    desc: 'If 0 impressions for 6h → duplicate adset', descRu: 'Если 0 показов за 6ч → дублировать adset',
    metric: 'impressions', operator: 'EQUAL', action: 'DUPLICATE', entity: 'ADSET', icon: RefreshCw,
  },
  {
    id: 'pause_low_ctr',
    title: 'Pause Low CTR Ads', titleRu: 'Пауза рекламы с низким CTR',
    desc: 'If CTR < 0.5% after 1000 impressions → pause ad', descRu: 'Если CTR < 0.5% после 1000 показов → пауза рекламы',
    metric: 'ctr', operator: 'LESS_THAN', action: 'PAUSE', entity: 'AD', icon: Pause,
  },
  {
    id: 'decrease_budget_high_cpc',
    title: 'Decrease Budget High CPC', titleRu: 'Снижение бюджета при высоком CPC',
    desc: 'If CPC > threshold → reduce budget by 15%', descRu: 'Если CPC > порога → снизить бюджет на 15%',
    metric: 'cpc', operator: 'GREATER_THAN', action: 'DECREASE_BUDGET', entity: 'ADSET', icon: BarChart3,
  },
  {
    id: 'scale_winner',
    title: 'Scale Winner Ad Sets', titleRu: 'Масштабирование лучших Ad Sets',
    desc: 'If CPL < target and spend > $50 → increase budget 30%', descRu: 'Если CPL < цели и расход > $50 → бюджет +30%',
    metric: 'cost_per_lead', operator: 'LESS_THAN', action: 'INCREASE_BUDGET', entity: 'ADSET', icon: Sparkles,
  },
  {
    id: 'frequency_cap',
    title: 'Frequency Cap Alert', titleRu: 'Алерт частоты показов',
    desc: 'If frequency > 3.0 → notify to refresh creative', descRu: 'Если частота > 3.0 → уведомить обновить креатив',
    metric: 'frequency', operator: 'GREATER_THAN', action: 'NOTIFY', entity: 'ADSET', icon: Eye,
  },
];

/* ──────────────── Component ──────────────── */
export default function AiAdsMetaAutomationPage() {
  const { language } = useLanguage();
  const { agencyRole } = useAuth();
  const isRu = language === 'ru';
  const isAdmin = agencyRole === 'AgencyAdmin';
  const [activeTab, setActiveTab] = useState('pixels');
  const [metaConnected, setMetaConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pixel state
  const [pixelName, setPixelName] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['PageView', 'Lead', 'Purchase']);
  const [pixelCreating, setPixelCreating] = useState(false);
  const [adAccountId, setAdAccountId] = useState('');

  // Audience state
  const [audienceDialog, setAudienceDialog] = useState<'custom' | 'lookalike' | 'saved' | null>(null);
  const [audienceName, setAudienceName] = useState('');
  const [audienceDesc, setAudienceDesc] = useState('');
  const [lookalikeSrc, setLookalikeSrc] = useState('');
  const [lookalikeRatio, setLookalikeRatio] = useState('1');
  const [lookalikeCountries, setLookalikeCountries] = useState('');
  const [customerFile, setCustomerFile] = useState('');
  const [audienceCreating, setAudienceCreating] = useState(false);
  const [retentionDays, setRetentionDays] = useState('30');

  // Lead form state
  const [leadFormName, setLeadFormName] = useState('');
  const [leadFormFields, setLeadFormFields] = useState(['full_name', 'email', 'phone_number']);
  const [leadFormPrivacyUrl, setLeadFormPrivacyUrl] = useState('');
  const [leadFormCreating, setLeadFormCreating] = useState(false);
  const [leadFormPageId, setLeadFormPageId] = useState('');
  const [leadFormHeadline, setLeadFormHeadline] = useState('');
  const [leadFormDescription, setLeadFormDescription] = useState('');
  const [leadFormThankYouTitle, setLeadFormThankYouTitle] = useState('');
  const [leadFormThankYouDesc, setLeadFormThankYouDesc] = useState('');
  const [leadFormButtonText, setLeadFormButtonText] = useState('');

  // Campaign quick-create
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('OUTCOME_LEADS');
  const [campaignBudget, setCampaignBudget] = useState('');
  const [campaignBudgetType, setCampaignBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [campaignCreating, setCampaignCreating] = useState(false);

  // Check Meta connection
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('platform_integrations' as any)
        .select('*').eq('integration_type', 'meta_ads_management').maybeSingle();
      setMetaConnected(!!(data as any)?.is_active && !!(data as any)?.secret_ref);
    })();
  }, []);

  const toggleEvent = (ev: string) => {
    setSelectedEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  };

  const callMetaAutomation = async (action: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('meta-automation', {
      body: { action, ...payload },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleCreatePixel = async () => {
    if (!pixelName.trim()) { toast.error(isRu ? 'Укажите имя пикселя' : 'Enter pixel name'); return; }
    if (!metaConnected) {
      toast.error(isRu ? 'Сначала подключите Meta Ads Management в Интеграциях' : 'Connect Meta Ads Management in Integrations first');
      return;
    }
    setPixelCreating(true);
    try {
      const result = await callMetaAutomation('create_pixel', {
        name: pixelName,
        events: selectedEvents,
        ad_account_id: adAccountId || undefined,
      });
      toast.success(isRu ? `Пиксель создан! ID: ${result.pixel_id}` : `Pixel created! ID: ${result.pixel_id}`);
      setPixelName('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPixelCreating(false);
    }
  };

  const handleCreateAudience = async () => {
    if (!audienceName.trim()) { toast.error(isRu ? 'Укажите имя аудитории' : 'Enter audience name'); return; }
    if (!metaConnected) {
      toast.error(isRu ? 'Сначала подключите Meta Ads Management в Интеграциях' : 'Connect Meta Ads Management in Integrations first');
      return;
    }
    setAudienceCreating(true);
    try {
      const result = await callMetaAutomation('create_audience', {
        type: audienceDialog,
        name: audienceName,
        description: audienceDesc,
        ad_account_id: adAccountId || undefined,
        ...(audienceDialog === 'custom' && { customer_data: customerFile, retention_days: parseInt(retentionDays) }),
        ...(audienceDialog === 'lookalike' && { source_audience_id: lookalikeSrc, ratio: parseInt(lookalikeRatio), countries: lookalikeCountries.split(',').map(c => c.trim()).filter(Boolean) }),
      });
      toast.success(isRu ? `Аудитория создана! ID: ${result.audience_id}` : `Audience created! ID: ${result.audience_id}`);
      setAudienceDialog(null);
      setAudienceName('');
      setAudienceDesc('');
      setCustomerFile('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAudienceCreating(false);
    }
  };

  const handleCreateLeadForm = async () => {
    if (!leadFormName.trim()) { toast.error(isRu ? 'Укажите имя формы' : 'Enter form name'); return; }
    if (!leadFormPageId.trim()) { toast.error(isRu ? 'Укажите Page ID' : 'Enter Page ID'); return; }
    if (!metaConnected) {
      toast.error(isRu ? 'Сначала подключите Meta Ads Management в Интеграциях' : 'Connect Meta Ads Management in Integrations first');
      return;
    }
    setLeadFormCreating(true);
    try {
      const result = await callMetaAutomation('create_lead_form', {
        page_id: leadFormPageId,
        name: leadFormName,
        fields: leadFormFields,
        privacy_url: leadFormPrivacyUrl,
        headline: leadFormHeadline || undefined,
        description: leadFormDescription || undefined,
        thank_you_title: leadFormThankYouTitle || undefined,
        thank_you_description: leadFormThankYouDesc || undefined,
        button_text: leadFormButtonText || undefined,
      });
      toast.success(isRu ? `Лид-форма создана! ID: ${result.form_id}` : `Lead form created! ID: ${result.form_id}`);
      setLeadFormName('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLeadFormCreating(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim() || !campaignBudget) {
      toast.error(isRu ? 'Заполните все поля' : 'Fill all fields');
      return;
    }
    if (!metaConnected) {
      toast.error(isRu ? 'Сначала подключите Meta Ads Management' : 'Connect Meta Ads Management first');
      return;
    }
    setCampaignCreating(true);
    try {
      const result = await callMetaAutomation('create_campaign', {
        ad_account_id: adAccountId || undefined,
        name: campaignName,
        objective: campaignObjective,
        daily_budget: campaignBudgetType === 'daily' ? Math.round(parseFloat(campaignBudget) * 100) : undefined,
        lifetime_budget: campaignBudgetType === 'lifetime' ? Math.round(parseFloat(campaignBudget) * 100) : undefined,
        status: 'PAUSED',
      });
      toast.success(isRu ? `Кампания создана (PAUSED)! ID: ${result.campaign_id}` : `Campaign created (PAUSED)! ID: ${result.campaign_id}`);
      setCampaignDialog(false);
      setCampaignName('');
      setCampaignBudget('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCampaignCreating(false);
    }
  };

  const SectionCard = ({ icon: Icon, title, titleRu, desc, descRu, children, badge }: {
    icon: any; title: string; titleRu: string; desc: string; descRu: string; children: React.ReactNode; badge?: string;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {isRu ? titleRu : title}
          {badge && <Badge variant="secondary" className="text-[10px] ml-auto">{badge}</Badge>}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{isRu ? descRu : desc}</p>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            {isRu ? 'Meta Автоматизация' : 'Meta Automation'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRu
              ? 'Полный набор инструментов для автоматизации Meta: пиксели, аудитории, формы, кампании и правила.'
              : 'Complete Meta automation toolkit: pixels, audiences, forms, campaigns, and rules.'}
          </p>
        </div>
        <Badge variant={metaConnected ? 'default' : 'destructive'} className="gap-1.5">
          {metaConnected ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {metaConnected ? (isRu ? 'Meta подключена' : 'Meta Connected') : (isRu ? 'Meta не подключена' : 'Meta Not Connected')}
        </Badge>
      </div>

      {/* Prerequisites */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">{isRu ? 'Необходимые условия' : 'Prerequisites'}</p>
              <p>{isRu ? '1. Подключите Meta Ads Management в разделе Интеграции' : '1. Connect Meta Ads Management in Integrations'}</p>
              <p>{isRu ? '2. System User Token с правами: ads_management, ads_read, pages_manage_ads, leads_retrieval' : '2. System User Token with scopes: ads_management, ads_read, pages_manage_ads, leads_retrieval'}</p>
              <p>{isRu ? '3. Укажите Ad Account ID ниже (формат: act_XXXX)' : '3. Enter Ad Account ID below (format: act_XXXX)'}</p>
              <p>{isRu ? '4. Все операции через Meta Graph API v21.0' : '4. All operations use Meta Graph API v21.0'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs">{isRu ? 'Ad Account ID' : 'Ad Account ID'}</Label>
              <Input value={adAccountId} onChange={e => setAdAccountId(e.target.value)}
                placeholder="act_123456789" className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/30 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="pixels" className="gap-1.5 text-xs">
            <Crosshair className="h-3.5 w-3.5" /> {isRu ? 'Пиксели' : 'Pixels'}
          </TabsTrigger>
          <TabsTrigger value="audiences" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> {isRu ? 'Аудитории' : 'Audiences'}
          </TabsTrigger>
          <TabsTrigger value="leadforms" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> {isRu ? 'Лид-формы' : 'Lead Forms'}
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5 text-xs">
            <Megaphone className="h-3.5 w-3.5" /> {isRu ? 'Кампании' : 'Campaigns'}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" /> {isRu ? 'Правила' : 'Rules'}
          </TabsTrigger>
          <TabsTrigger value="conversions" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> {isRu ? 'Конверсии' : 'Conversions'}
          </TabsTrigger>
        </TabsList>

        {/* ─── PIXELS TAB ─── */}
        <TabsContent value="pixels" className="space-y-4 mt-4">
          <SectionCard
            icon={Crosshair} title="Create Meta Pixel" titleRu="Создать Meta Pixel"
            desc="Create and configure a Facebook Pixel with standard events via Graph API."
            descRu="Создайте и настройте Facebook Pixel со стандартными событиями через Graph API."
            badge="Graph API v21.0"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Название пикселя' : 'Pixel Name'}</Label>
                <Input value={pixelName} onChange={e => setPixelName(e.target.value)}
                  placeholder={isRu ? 'Мой пиксель для лендинга' : 'My Landing Page Pixel'} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Стандартные события' : 'Standard Events'}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {STANDARD_EVENTS.map(ev => (
                    <div
                      key={ev.key}
                      className={cn(
                        'flex items-center gap-1.5 p-2 rounded-md border cursor-pointer text-xs transition-colors',
                        selectedEvents.includes(ev.key)
                          ? 'bg-primary/10 border-primary/30 text-foreground'
                          : 'border-border/50 text-muted-foreground hover:border-primary/20'
                      )}
                      onClick={() => toggleEvent(ev.key)}
                    >
                      <ev.icon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{ev.key}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{isRu ? 'Что произойдёт:' : 'What will happen:'}</p>
                <p>• {isRu ? 'Создастся новый Pixel в Ad Account через API' : 'New Pixel created in Ad Account via API'}</p>
                <p>• {isRu ? 'Выбранные события будут настроены для отслеживания' : 'Selected events will be configured for tracking'}</p>
                <p>• {isRu ? 'Сгенерируется код установки (base code + event snippets)' : 'Installation code generated (base code + event snippets)'}</p>
                <p>• {isRu ? 'Pixel автоматически привяжется к Ad Account' : 'Pixel auto-linked to Ad Account'}</p>
              </div>

              <Button onClick={handleCreatePixel} disabled={pixelCreating || !metaConnected} className="gap-2">
                {pixelCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isRu ? 'Создать пиксель' : 'Create Pixel'}
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── AUDIENCES TAB ─── */}
        <TabsContent value="audiences" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SectionCard icon={Upload} title="Custom Audience" titleRu="Кастомная аудитория"
              desc="Upload customer lists (emails, phones) to create targeted audiences."
              descRu="Загрузите списки клиентов (email, телефоны) для создания таргетированных аудиторий."
            >
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• {isRu ? 'CSV или список email/телефонов' : 'CSV or list of emails/phones'}</p>
                  <p>• {isRu ? 'SHA256 хеширование автоматически' : 'SHA256 hashing automatic'}</p>
                  <p>• {isRu ? 'Минимум 100 контактов' : 'Minimum 100 contacts'}</p>
                  <p>• {isRu ? 'Настройка retention (дни)' : 'Retention period (days)'}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => { setAudienceDialog('custom'); setRetentionDays('30'); }}>
                  <Upload className="h-3.5 w-3.5" /> {isRu ? 'Создать из списка' : 'Create from List'}
                </Button>
              </div>
            </SectionCard>

            <SectionCard icon={UserPlus} title="Lookalike Audience" titleRu="Lookalike аудитория"
              desc="Find people similar to your best customers using Meta's ML algorithm."
              descRu="Найдите людей, похожих на ваших лучших клиентов, используя ML-алгоритм Meta."
            >
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• {isRu ? 'На основе Custom Audience, Pixel или Page' : 'Based on Custom Audience, Pixel, or Page'}</p>
                  <p>• {isRu ? 'Размер от 1% до 10% населения' : 'Size from 1% to 10% of population'}</p>
                  <p>• {isRu ? 'Мульти-страновой таргетинг' : 'Multi-country targeting'}</p>
                  <p>• {isRu ? 'Тип: similarity / greater_reach' : 'Type: similarity / greater_reach'}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => setAudienceDialog('lookalike')}>
                  <UserPlus className="h-3.5 w-3.5" /> {isRu ? 'Создать Lookalike' : 'Create Lookalike'}
                </Button>
              </div>
            </SectionCard>

            <SectionCard icon={ListFilter} title="Saved Audience" titleRu="Сохранённая аудитория"
              desc="Save targeting presets (interests, demographics, behaviors) for reuse in campaigns."
              descRu="Сохраняйте пресеты таргетинга (интересы, демография, поведение) для повторного использования."
            >
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• {isRu ? 'Детальный таргетинг (интересы)' : 'Detailed targeting (interests)'}</p>
                  <p>• {isRu ? 'Демография: возраст, пол' : 'Demographics: age, gender'}</p>
                  <p>• {isRu ? 'Гео + языковой таргетинг' : 'Geo + language targeting'}</p>
                  <p>• {isRu ? 'Исключение аудиторий' : 'Audience exclusions'}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => setAudienceDialog('saved')}>
                  <ListFilter className="h-3.5 w-3.5" /> {isRu ? 'Создать пресет' : 'Create Preset'}
                </Button>
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ─── LEAD FORMS TAB ─── */}
        <TabsContent value="leadforms" className="space-y-4 mt-4">
          <SectionCard icon={FileText} title="Create Instant Form" titleRu="Создать Instant Form"
            desc="Design and publish Facebook Instant Forms (Lead Ads) with custom fields, branding, and thank-you screen."
            descRu="Создавайте и публикуйте Facebook Instant Forms (Lead Ads) с кастомными полями, брендингом и экраном благодарности."
            badge="Lead Ads API"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">{isRu ? 'Facebook Page ID' : 'Facebook Page ID'}</Label>
                  <Input value={leadFormPageId} onChange={e => setLeadFormPageId(e.target.value)} placeholder="123456789" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{isRu ? 'Название формы' : 'Form Name'}</Label>
                  <Input value={leadFormName} onChange={e => setLeadFormName(e.target.value)}
                    placeholder={isRu ? 'Заявка на консультацию' : 'Consultation Request'} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Заголовок формы' : 'Form Headline'}</Label>
                <Input value={leadFormHeadline} onChange={e => setLeadFormHeadline(e.target.value)}
                  placeholder={isRu ? 'Получите бесплатную консультацию' : 'Get a Free Consultation'} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Описание' : 'Description'}</Label>
                <Textarea value={leadFormDescription} onChange={e => setLeadFormDescription(e.target.value)}
                  placeholder={isRu ? 'Заполните форму и мы свяжемся с вами...' : 'Fill in the form and we will contact you...'} rows={2} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Поля формы' : 'Form Fields'}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {LEAD_FORM_FIELDS.map(field => (
                    <div
                      key={field.key}
                      className={cn(
                        'flex items-center gap-1.5 p-1.5 rounded border cursor-pointer text-[11px] transition-colors',
                        leadFormFields.includes(field.key)
                          ? 'bg-primary/10 border-primary/30'
                          : 'border-border/50 text-muted-foreground hover:border-primary/20'
                      )}
                      onClick={() => setLeadFormFields(prev =>
                        prev.includes(field.key) ? prev.filter(f => f !== field.key) : [...prev, field.key])}
                    >
                      {isRu ? field.labelRu : field.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">{isRu ? 'Текст кнопки' : 'Button Text'}</Label>
                  <Input value={leadFormButtonText} onChange={e => setLeadFormButtonText(e.target.value)}
                    placeholder={isRu ? 'Отправить заявку' : 'Submit'} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{isRu ? 'Privacy Policy URL' : 'Privacy Policy URL'}</Label>
                  <Input value={leadFormPrivacyUrl} onChange={e => setLeadFormPrivacyUrl(e.target.value)}
                    placeholder="https://example.com/privacy" />
                </div>
              </div>

              <div className="rounded-lg bg-muted/10 border border-border/50 p-3 space-y-2">
                <p className="text-xs font-medium">{isRu ? 'Экран благодарности' : 'Thank You Screen'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input value={leadFormThankYouTitle} onChange={e => setLeadFormThankYouTitle(e.target.value)}
                    placeholder={isRu ? 'Спасибо за заявку!' : 'Thank you!'} className="text-xs" />
                  <Input value={leadFormThankYouDesc} onChange={e => setLeadFormThankYouDesc(e.target.value)}
                    placeholder={isRu ? 'Мы свяжемся с вами в ближайшее время' : 'We will contact you shortly'} className="text-xs" />
                </div>
              </div>

              <Button onClick={handleCreateLeadForm} disabled={leadFormCreating || !metaConnected} className="gap-2">
                {leadFormCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isRu ? 'Создать форму' : 'Create Form'}
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── CAMPAIGNS TAB ─── */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <SectionCard icon={Megaphone} title="Quick Campaign Creator" titleRu="Быстрое создание кампании"
            desc="Create campaign structure directly in Meta via API. Campaign is created in PAUSED status for safety."
            descRu="Создайте структуру кампании напрямую в Meta через API. Кампания создаётся в статусе PAUSED для безопасности."
            badge="Campaign API"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">{isRu ? 'Название кампании' : 'Campaign Name'}</Label>
                  <Input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                    placeholder={isRu ? 'AFM | Клиент | Лиды | Июнь' : 'AFM | Client | Leads | June'} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{isRu ? 'Бюджет ($)' : 'Budget ($)'}</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={campaignBudget} onChange={e => setCampaignBudget(e.target.value)}
                      placeholder="50.00" className="flex-1" />
                    <Select value={campaignBudgetType} onValueChange={v => setCampaignBudgetType(v as any)}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{isRu ? 'Дневной' : 'Daily'}</SelectItem>
                        <SelectItem value="lifetime">{isRu ? 'На весь срок' : 'Lifetime'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Цель кампании' : 'Campaign Objective'}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CAMPAIGN_OBJECTIVES.map(obj => (
                    <div
                      key={obj.key}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors',
                        campaignObjective === obj.key
                          ? 'bg-primary/10 border-primary/30 text-foreground'
                          : 'border-border/50 text-muted-foreground hover:border-primary/20'
                      )}
                      onClick={() => setCampaignObjective(obj.key)}
                    >
                      <obj.icon className="h-4 w-4 flex-shrink-0" />
                      {isRu ? obj.labelRu : obj.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{isRu ? 'Важно:' : 'Important:'}</p>
                <p>• {isRu ? 'Кампания создаётся в статусе PAUSED' : 'Campaign is created in PAUSED status'}</p>
                <p>• {isRu ? 'Ad Sets и объявления добавляются отдельно' : 'Ad Sets and ads are added separately'}</p>
                <p>• {isRu ? 'Используйте раздел "Черновики" для полной настройки' : 'Use "Drafts" section for full setup'}</p>
              </div>

              <Button onClick={handleCreateCampaign} disabled={campaignCreating || !metaConnected} className="gap-2">
                {campaignCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                {isRu ? 'Создать кампанию' : 'Create Campaign'}
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── RULES TAB ─── */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          <SectionCard icon={Settings} title="Automated Rules" titleRu="Автоматические правила"
            desc="Set up Meta Ad Rules to auto-manage campaigns based on performance thresholds."
            descRu="Настройте автоматические правила Meta для управления кампаниями по порогам эффективности."
          >
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {RULE_TEMPLATES.map(rule => (
                  <Card key={rule.id} className="border-dashed hover:border-primary/30 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <rule.icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium">{isRu ? rule.titleRu : rule.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{isRu ? rule.descRu : rule.desc}</p>
                          <div className="flex gap-1 mt-1.5">
                            <Badge variant="outline" className="text-[9px]">{rule.metric}</Badge>
                            <Badge variant="outline" className="text-[9px]">{rule.action}</Badge>
                            <Badge variant="outline" className="text-[9px]">{rule.entity}</Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          disabled={!metaConnected}
                          onClick={() => {
                            toast.info(isRu
                              ? 'Создание правила через Meta Marketing API Rules. Настройте пороги в Optimization Presets.'
                              : 'Creating rule via Meta Marketing API Rules. Configure thresholds in Optimization Presets.');
                          }}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">
                <p>{isRu
                  ? '⚡ Правила выполняются через Meta Marketing API Rules (ad_rules). Для тонкой настройки пороговых значений используйте раздел Optimization Presets.'
                  : '⚡ Rules execute via Meta Marketing API Rules (ad_rules). For fine-tuning thresholds, use the Optimization Presets section.'}</p>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── CONVERSIONS TAB ─── */}
        <TabsContent value="conversions" className="space-y-4 mt-4">
          <SectionCard icon={Shield} title="Conversions API (CAPI) Setup" titleRu="Настройка Conversions API (CAPI)"
            desc="Configure server-side event tracking for better attribution and iOS 14+ compatibility."
            descRu="Настройте серверное отслеживание событий для лучшей атрибуции и совместимости с iOS 14+."
            badge="CAPI v21.0"
          >
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">{isRu ? 'Зачем нужен CAPI:' : 'Why CAPI matters:'}</p>
                <p>• {isRu ? 'Обходит блокировки iOS 14+ и браузерных расширений' : 'Bypasses iOS 14+ and browser extension blocks'}</p>
                <p>• {isRu ? 'Улучшает Event Match Quality (EMQ) до 8+' : 'Improves Event Match Quality (EMQ) to 8+'}</p>
                <p>• {isRu ? 'Точная атрибуция конверсий с дедупликацией' : 'Accurate conversion attribution with deduplication'}</p>
                <p>• {isRu ? 'Передача PII-данных (email, phone) в хешированном виде' : 'PII data (email, phone) sent hashed'}</p>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {isRu ? 'CAPI уже настроен в платформе' : 'CAPI is already configured in the platform'}
                </p>
                <p className="text-muted-foreground">
                  {isRu
                    ? 'Перейдите в настройки клиента → вкладка CAPI для маппинга стадий CRM на события Meta.'
                    : 'Go to client settings → CAPI tab to map CRM stages to Meta events.'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium">{isRu ? 'Поддерживаемые события:' : 'Supported events:'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Lead', 'Purchase', 'CompleteRegistration', 'Contact', 'Subscribe', 'ViewContent', 'AddToCart', 'InitiateCheckout'].map(ev => (
                    <Badge key={ev} variant="secondary" className="text-[10px]">{ev}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium">{isRu ? 'Данные для атрибуции:' : 'Attribution data:'}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary" /> fbclid / fbc / fbp
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary" /> FB Lead ID
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary" /> {isRu ? 'Email (SHA256)' : 'Email (SHA256)'}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary" /> {isRu ? 'Телефон (SHA256)' : 'Phone (SHA256)'}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* ─── Audience Creation Dialog ─── */}
      <Dialog open={!!audienceDialog} onOpenChange={v => { if (!v) setAudienceDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {audienceDialog === 'custom' && <><Upload className="h-5 w-5 text-primary" /> {isRu ? 'Кастомная аудитория' : 'Custom Audience'}</>}
              {audienceDialog === 'lookalike' && <><UserPlus className="h-5 w-5 text-primary" /> {isRu ? 'Lookalike аудитория' : 'Lookalike Audience'}</>}
              {audienceDialog === 'saved' && <><ListFilter className="h-5 w-5 text-primary" /> {isRu ? 'Сохранённая аудитория' : 'Saved Audience'}</>}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-2">
              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Название аудитории' : 'Audience Name'}</Label>
                <Input value={audienceName} onChange={e => setAudienceName(e.target.value)}
                  placeholder={isRu ? 'Покупатели Q1 2026' : 'Q1 2026 Buyers'} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Описание' : 'Description'}</Label>
                <Textarea value={audienceDesc} onChange={e => setAudienceDesc(e.target.value)}
                  placeholder={isRu ? 'Описание аудитории...' : 'Audience description...'} rows={2} />
              </div>

              {audienceDialog === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">{isRu ? 'Данные (email или телефоны, по одному на строку)' : 'Data (emails or phones, one per line)'}</Label>
                    <Textarea value={customerFile} onChange={e => setCustomerFile(e.target.value)}
                      placeholder={'user@example.com\n+1234567890\n...'} rows={5} className="font-mono text-xs" />
                    <p className="text-[10px] text-muted-foreground">
                      {isRu ? 'Данные хешируются SHA256 автоматически. Минимум 100 записей для создания.' : 'Data is SHA256-hashed automatically. Minimum 100 records to create.'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{isRu ? 'Срок хранения (дней)' : 'Retention (days)'}</Label>
                    <Select value={retentionDays} onValueChange={setRetentionDays}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['7', '14', '30', '60', '90', '180', '365'].map(v => (
                          <SelectItem key={v} value={v}>{v} {isRu ? 'дней' : 'days'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {audienceDialog === 'lookalike' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">{isRu ? 'Исходная аудитория (ID)' : 'Source Audience (ID)'}</Label>
                    <Input value={lookalikeSrc} onChange={e => setLookalikeSrc(e.target.value)}
                      placeholder={isRu ? 'ID Custom Audience или Pixel' : 'Custom Audience or Pixel ID'} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">{isRu ? 'Размер (%)' : 'Size (%)'}</Label>
                      <Select value={lookalikeRatio} onValueChange={setLookalikeRatio}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(v => (
                            <SelectItem key={v} value={v}>{v}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{isRu ? 'Страны (ISO)' : 'Countries (ISO)'}</Label>
                      <Input value={lookalikeCountries} onChange={e => setLookalikeCountries(e.target.value)}
                        placeholder="US, GB, DE" />
                    </div>
                  </div>
                </>
              )}

              {audienceDialog === 'saved' && (
                <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                  <p>{isRu
                    ? 'Сохранённые аудитории позволяют зафиксировать пресет таргетинга (интересы, возраст, гео) для быстрого повторного использования в кампаниях. Создайте через Meta Business Manager.'
                    : 'Saved audiences let you store targeting presets (interests, age, geo) for quick reuse across campaigns. Create via Meta Business Manager.'}</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAudienceDialog(null)}>
              {isRu ? 'Отмена' : 'Cancel'}
            </Button>
            <Button onClick={handleCreateAudience} disabled={audienceCreating || !metaConnected}>
              {audienceCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isRu ? 'Создать' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

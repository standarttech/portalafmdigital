import { useState, useEffect, useCallback, memo } from 'react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Target, Users, Upload, Plus, Settings, Loader2, AlertTriangle,
  CheckCircle2, Zap, FileText, Globe, BarChart3, Search,
  Copy, ArrowRight, Info, Crosshair, UserPlus, ListFilter, Sparkles,
  RefreshCw, Trash2, Eye, DollarSign, TrendingUp, Shield, Play, Pause,
  Clock, LayoutGrid, Megaphone, Heart, ShoppingCart, Rocket, BookOpen,
  Code, Layers, ChevronRight, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/* ──────────────── Constants (outside component to avoid re-creation) ──────────────── */
const STANDARD_EVENTS = [
  { key: 'PageView', icon: Eye, desc: 'Page loaded', descRu: 'Страница загружена' },
  { key: 'ViewContent', icon: Search, desc: 'Product/content viewed', descRu: 'Просмотр контента' },
  { key: 'AddToCart', icon: ShoppingCart, desc: 'Added to cart', descRu: 'Добавлено в корзину' },
  { key: 'InitiateCheckout', icon: DollarSign, desc: 'Checkout started', descRu: 'Начало оформления' },
  { key: 'Purchase', icon: CheckCircle2, desc: 'Purchase completed', descRu: 'Покупка завершена' },
  { key: 'Lead', icon: UserPlus, desc: 'Lead form submitted', descRu: 'Лид отправлен' },
  { key: 'CompleteRegistration', icon: Users, desc: 'Registration completed', descRu: 'Регистрация завершена' },
  { key: 'Contact', icon: FileText, desc: 'Contact request', descRu: 'Запрос контакта' },
  { key: 'FindLocation', icon: Globe, desc: 'Location search', descRu: 'Поиск локации' },
  { key: 'Schedule', icon: Clock, desc: 'Appointment scheduled', descRu: 'Запись запланирована' },
  { key: 'SubmitApplication', icon: FileText, desc: 'Application submitted', descRu: 'Заявка отправлена' },
  { key: 'Subscribe', icon: Heart, desc: 'Subscription started', descRu: 'Подписка оформлена' },
  { key: 'Search', icon: Search, desc: 'Search performed', descRu: 'Поиск выполнен' },
  { key: 'AddPaymentInfo', icon: DollarSign, desc: 'Payment info added', descRu: 'Платёж добавлен' },
  { key: 'AddToWishlist', icon: Heart, desc: 'Added to wishlist', descRu: 'Добавлено в избранное' },
  { key: 'StartTrial', icon: Play, desc: 'Free trial started', descRu: 'Пробный период начат' },
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
  { id: 'pause_high_cpl', title: 'Pause on High CPL', titleRu: 'Пауза при высоком CPL', desc: 'If CPL > threshold for 3 days → pause adset', descRu: 'Если CPL > порога за 3 дня → пауза adset', metric: 'cost_per_lead', operator: 'GREATER_THAN', action: 'PAUSE', entity: 'ADSET', icon: AlertTriangle },
  { id: 'increase_budget_roas', title: 'Budget Increase on ROAS', titleRu: 'Увеличение бюджета при ROAS', desc: 'If ROAS > threshold → increase budget by 20%', descRu: 'Если ROAS > порога → увеличить бюджет на 20%', metric: 'purchase_roas', operator: 'GREATER_THAN', action: 'INCREASE_BUDGET', entity: 'CAMPAIGN', icon: TrendingUp },
  { id: 'spend_alert', title: 'Spend Alert', titleRu: 'Алерт расхода', desc: 'If daily spend > budget → notification', descRu: 'Если дневной расход > бюджета → уведомление', metric: 'spend', operator: 'GREATER_THAN', action: 'NOTIFY', entity: 'CAMPAIGN', icon: DollarSign },
  { id: 'restart_zero_impressions', title: 'Restart on 0 Impressions', titleRu: 'Перезапуск при 0 показов', desc: 'If 0 impressions for 6h → duplicate adset', descRu: 'Если 0 показов за 6ч → дублировать adset', metric: 'impressions', operator: 'EQUAL', action: 'DUPLICATE', entity: 'ADSET', icon: RefreshCw },
  { id: 'pause_low_ctr', title: 'Pause Low CTR Ads', titleRu: 'Пауза рекламы с низким CTR', desc: 'If CTR < 0.5% after 1000 impressions → pause ad', descRu: 'Если CTR < 0.5% после 1000 показов → пауза рекламы', metric: 'ctr', operator: 'LESS_THAN', action: 'PAUSE', entity: 'AD', icon: Pause },
  { id: 'decrease_budget_high_cpc', title: 'Decrease Budget High CPC', titleRu: 'Снижение бюджета при высоком CPC', desc: 'If CPC > threshold → reduce budget by 15%', descRu: 'Если CPC > порога → снизить бюджет на 15%', metric: 'cpc', operator: 'GREATER_THAN', action: 'DECREASE_BUDGET', entity: 'ADSET', icon: BarChart3 },
  { id: 'scale_winner', title: 'Scale Winner Ad Sets', titleRu: 'Масштабирование лучших Ad Sets', desc: 'If CPL < target and spend > $50 → increase budget 30%', descRu: 'Если CPL < цели и расход > $50 → бюджет +30%', metric: 'cost_per_lead', operator: 'LESS_THAN', action: 'INCREASE_BUDGET', entity: 'ADSET', icon: Sparkles },
  { id: 'frequency_cap', title: 'Frequency Cap Alert', titleRu: 'Алерт частоты показов', desc: 'If frequency > 3.0 → notify to refresh creative', descRu: 'Если частота > 3.0 → уведомить обновить креатив', metric: 'frequency', operator: 'GREATER_THAN', action: 'NOTIFY', entity: 'ADSET', icon: Eye },
];

/* ──────────────── SectionCard — DEFINED OUTSIDE to prevent focus loss ──────────────── */
const SectionCard = memo(({ icon: Icon, title, desc, children, badge }: {
  icon: any; title: string; desc: string; children: React.ReactNode; badge?: string;
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-semibold flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
        {badge && <Badge variant="secondary" className="text-[10px] ml-auto">{badge}</Badge>}
      </CardTitle>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </CardHeader>
    <CardContent className="pt-0">{children}</CardContent>
  </Card>
));
SectionCard.displayName = 'SectionCard';

/* ──────────────── Main Component ──────────────── */
export default function AiAdsMetaAutomationPage() {
  const { language } = useLanguage();
  const { agencyRole } = useAuth();
  const isRu = language === 'ru';
  const isAdmin = agencyRole === 'AgencyAdmin';
  const [activeTab, setActiveTab] = useState('pixels');
  const [metaConnected, setMetaConnected] = useState(false);

  // Ad account selector — fetched from Meta API via management token
  const [adAccounts, setAdAccounts] = useState<Array<{ account_id: string; act_id: string; name: string; status: number; currency?: string; business_name?: string }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Pixels for selected account
  const [availablePixels, setAvailablePixels] = useState<Array<{ pixel_id: string; name: string }>>([]);
  const [loadingPixels, setLoadingPixels] = useState(false);

  // Pixel state
  const [pixelName, setPixelName] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['PageView', 'Lead', 'Purchase']);
  const [pixelCreating, setPixelCreating] = useState(false);
  const [createdPixelId, setCreatedPixelId] = useState<string | null>(null);
  const [showPixelSetup, setShowPixelSetup] = useState(false);

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
  const [leadFormTemplateName, setLeadFormTemplateName] = useState('');
  const [showSaveLeadFormTemplate, setShowSaveLeadFormTemplate] = useState(false);

  // Campaign (autoupload) state
  const [campaignName, setCampaignName] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('OUTCOME_LEADS');
  const [campaignBudget, setCampaignBudget] = useState('');
  const [campaignBudgetType, setCampaignBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [campaignCreating, setCampaignCreating] = useState(false);

  // Load Meta connection status + fetch ad accounts from Meta API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Check if meta_ads_management integration exists
      const metaRes = await supabase.from('platform_integrations' as any)
        .select('*').eq('integration_type', 'meta_ads_management').maybeSingle();
      if (cancelled) return;
      const connected = !!(metaRes.data as any)?.is_active && !!(metaRes.data as any)?.secret_ref;
      setMetaConnected(connected);

      if (connected) {
        try {
          const { data, error } = await supabase.functions.invoke('meta-automation', {
            body: { action: 'list_ad_accounts' },
          });
          if (!cancelled && data?.accounts) {
            setAdAccounts(data.accounts);
            if (data.accounts.length) setSelectedAccountId(data.accounts[0].account_id);
          }
        } catch (e) {
          console.error('Failed to load ad accounts from Meta API:', e);
        }
      }
      setLoadingAccounts(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Load pixels when account changes
  useEffect(() => {
    if (!selectedAccountId || !metaConnected) {
      setAvailablePixels([]);
      return;
    }
    let cancelled = false;
    setLoadingPixels(true);
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('meta-automation', {
          body: { action: 'list_pixels', ad_account_id: selectedAccountId },
        });
        if (!cancelled && data?.pixels) setAvailablePixels(data.pixels);
      } catch (e) {
        console.error('Failed to load pixels:', e);
      }
      if (!cancelled) setLoadingPixels(false);
    })();
    return () => { cancelled = true; };
  }, [selectedAccountId, metaConnected]);

  const selectedActId = selectedAccountId.startsWith('act_') ? selectedAccountId : selectedAccountId ? `act_${selectedAccountId}` : '';

  const filteredAccounts = adAccounts.filter(a =>
    !accountSearch || (a.name || a.account_id).toLowerCase().includes(accountSearch.toLowerCase())
  );

  const toggleEvent = useCallback((ev: string) => {
    setSelectedEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  }, []);

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
    if (!metaConnected) { toast.error(isRu ? 'Сначала подключите Meta Ads в Интеграциях' : 'Connect Meta Ads in Integrations first'); return; }
    if (!selectedAccountId) { toast.error(isRu ? 'Выберите рекламный аккаунт' : 'Select an ad account'); return; }
    setPixelCreating(true);
    try {
      const result = await callMetaAutomation('create_pixel', {
        name: pixelName, events: selectedEvents, ad_account_id: selectedActId,
      });
      setCreatedPixelId(result.pixel_id);
      setShowPixelSetup(true);
      toast.success(isRu ? `Пиксель создан! ID: ${result.pixel_id}` : `Pixel created! ID: ${result.pixel_id}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setPixelCreating(false); }
  };

  const handleCreateAudience = async () => {
    if (!audienceName.trim()) { toast.error(isRu ? 'Укажите имя аудитории' : 'Enter audience name'); return; }
    if (!metaConnected) { toast.error(isRu ? 'Подключите Meta Ads' : 'Connect Meta Ads first'); return; }
    setAudienceCreating(true);
    try {
      const result = await callMetaAutomation('create_audience', {
        type: audienceDialog, name: audienceName, description: audienceDesc, ad_account_id: selectedActId,
        ...(audienceDialog === 'custom' && { customer_data: customerFile, retention_days: parseInt(retentionDays) }),
        ...(audienceDialog === 'lookalike' && { source_audience_id: lookalikeSrc, ratio: parseInt(lookalikeRatio), countries: lookalikeCountries.split(',').map(c => c.trim()).filter(Boolean) }),
      });
      toast.success(isRu ? `Аудитория создана! ID: ${result.audience_id}` : `Audience created! ID: ${result.audience_id}`);
      setAudienceDialog(null);
      setAudienceName('');
      setAudienceDesc('');
      setCustomerFile('');
    } catch (e: any) { toast.error(e.message); }
    finally { setAudienceCreating(false); }
  };

  const handleCreateLeadForm = async () => {
    if (!leadFormName.trim()) { toast.error(isRu ? 'Укажите имя формы' : 'Enter form name'); return; }
    if (!leadFormPageId.trim()) { toast.error(isRu ? 'Укажите Page ID' : 'Enter Page ID'); return; }
    if (!metaConnected) { toast.error(isRu ? 'Подключите Meta Ads' : 'Connect Meta Ads first'); return; }
    setLeadFormCreating(true);
    try {
      const result = await callMetaAutomation('create_lead_form', {
        page_id: leadFormPageId, name: leadFormName, fields: leadFormFields,
        privacy_url: leadFormPrivacyUrl, headline: leadFormHeadline || undefined,
        description: leadFormDescription || undefined,
        thank_you_title: leadFormThankYouTitle || undefined,
        thank_you_description: leadFormThankYouDesc || undefined,
        button_text: leadFormButtonText || undefined,
      });
      toast.success(isRu ? `Лид-форма создана! ID: ${result.form_id}` : `Lead form created! ID: ${result.form_id}`);
      setLeadFormName('');
    } catch (e: any) { toast.error(e.message); }
    finally { setLeadFormCreating(false); }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim() || !campaignBudget) { toast.error(isRu ? 'Заполните все поля' : 'Fill all fields'); return; }
    if (!metaConnected) { toast.error(isRu ? 'Подключите Meta Ads' : 'Connect Meta Ads first'); return; }
    setCampaignCreating(true);
    try {
      const result = await callMetaAutomation('create_campaign', {
        ad_account_id: selectedActId, name: campaignName, objective: campaignObjective,
        daily_budget: campaignBudgetType === 'daily' ? Math.round(parseFloat(campaignBudget) * 100) : undefined,
        lifetime_budget: campaignBudgetType === 'lifetime' ? Math.round(parseFloat(campaignBudget) * 100) : undefined,
        status: 'PAUSED',
      });
      toast.success(isRu ? `Кампания создана (PAUSED)! ID: ${result.campaign_id}` : `Campaign created (PAUSED)! ID: ${result.campaign_id}`);
      setCampaignName(''); setCampaignBudget('');
    } catch (e: any) { toast.error(e.message); }
    finally { setCampaignCreating(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isRu ? 'Скопировано!' : 'Copied!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            {isRu ? 'Meta Автоматизация' : 'Meta Automation'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRu ? 'Полный набор инструментов: пиксели, аудитории, формы, автозалив и правила.' : 'Complete toolkit: pixels, audiences, forms, auto-upload, and rules.'}
          </p>
        </div>
        <Badge variant={metaConnected ? 'default' : 'destructive'} className="gap-1.5">
          {metaConnected ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {metaConnected ? (isRu ? 'Meta подключена' : 'Meta Connected') : (isRu ? 'Meta не подключена' : 'Not Connected')}
        </Badge>
      </div>

      {/* Account Selector — from Meta API (management token) */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">{isRu ? 'Рекламный аккаунт (Meta Ads Management)' : 'Ad Account (Meta Ads Management)'}</p>
                <p>{isRu ? 'Аккаунты загружаются из интеграции Meta Ads Management. Подключите в Интеграциях → Meta Ads Management.' : 'Accounts loaded from Meta Ads Management integration. Set up in Integrations → Meta Ads Management.'}</p>
              </div>
            </div>

            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> {isRu ? 'Загрузка аккаунтов из Meta API...' : 'Loading accounts from Meta API...'}
              </div>
            ) : !metaConnected ? (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <p>{isRu ? 'Meta Ads Management не подключена.' : 'Meta Ads Management not connected.'}</p>
                <Button size="sm" variant="outline" className="mt-2 gap-1.5 text-xs" onClick={() => window.location.href = '/ai-ads/integrations'}>
                  <ExternalLink className="h-3 w-3" /> {isRu ? 'Подключить' : 'Connect'}
                </Button>
              </div>
            ) : adAccounts.length === 0 ? (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <p>{isRu ? 'Нет активных рекламных аккаунтов на этом токене Meta.' : 'No active ad accounts on this Meta token.'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {adAccounts.length > 3 && (
                  <Input
                    value={accountSearch}
                    onChange={e => setAccountSearch(e.target.value)}
                    placeholder={isRu ? 'Поиск по названию или ID...' : 'Search by name or ID...'}
                    className="h-8 text-xs"
                  />
                )}
                <ScrollArea className={adAccounts.length > 4 ? 'max-h-40' : ''}>
                  <div className="flex flex-wrap gap-2">
                    {filteredAccounts.map(acc => (
                      <div
                        key={acc.account_id}
                        onClick={() => setSelectedAccountId(acc.account_id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-all',
                          selectedAccountId === acc.account_id
                            ? 'bg-primary/15 border-primary/40 text-foreground ring-1 ring-primary/20'
                            : 'border-border/50 text-muted-foreground hover:border-primary/25 hover:bg-muted/30'
                        )}
                      >
                        <Target className="h-3.5 w-3.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">{acc.name}</span>
                          <span className="text-muted-foreground ml-1">({acc.account_id})</span>
                          {acc.currency && <Badge variant="outline" className="ml-1.5 text-[9px] py-0">{acc.currency}</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Pixels on selected account */}
                {selectedAccountId && (
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Crosshair className="h-3 w-3" /> {isRu ? 'Пиксели на аккаунте:' : 'Pixels on account:'}
                      {loadingPixels && <Loader2 className="h-3 w-3 animate-spin" />}
                    </p>
                    {!loadingPixels && availablePixels.length === 0 && (
                      <p className="text-[10px] text-muted-foreground">{isRu ? 'Пиксели не найдены' : 'No pixels found'}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {availablePixels.map(px => (
                        <Badge key={px.pixel_id} variant="secondary" className="text-[10px] gap-1 cursor-pointer"
                          onClick={() => { setCreatedPixelId(px.pixel_id); setShowPixelSetup(true); }}>
                          <Crosshair className="h-2.5 w-2.5" /> {px.name} ({px.pixel_id})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
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
          <TabsTrigger value="autoupload" className="gap-1.5 text-xs">
            <Rocket className="h-3.5 w-3.5" /> {isRu ? 'Автозалив' : 'Auto-Upload'}
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
          <SectionCard icon={Crosshair}
            title={isRu ? 'Создать Meta Pixel' : 'Create Meta Pixel'}
            desc={isRu ? 'Создайте пиксель через Graph API и получите код установки.' : 'Create a pixel via Graph API and get installation code.'}
            badge="Graph API v21.0"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Название пикселя' : 'Pixel Name'}</Label>
                <Input
                  value={pixelName}
                  onChange={e => setPixelName(e.target.value)}
                  placeholder={isRu ? 'Мой пиксель для лендинга' : 'My Landing Page Pixel'}
                />
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

              <Button onClick={handleCreatePixel} disabled={pixelCreating || !metaConnected || !selectedAccountId} className="gap-2">
                {pixelCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isRu ? 'Создать пиксель' : 'Create Pixel'}
              </Button>
            </div>
          </SectionCard>

          {/* Pixel Setup & Installation Guide */}
          {showPixelSetup && createdPixelId && (
            <SectionCard icon={Code}
              title={isRu ? 'Настройка и установка пикселя' : 'Pixel Setup & Installation'}
              desc={isRu ? 'Полное руководство по установке и настройке событий' : 'Complete guide for pixel installation and event configuration'}
            >
              <div className="space-y-4">
                <Accordion type="single" collapsible defaultValue="install">
                  <AccordionItem value="install">
                    <AccordionTrigger className="text-xs font-medium">
                      {isRu ? '1. Установка базового кода на сайт' : '1. Install Base Code on Website'}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {isRu ? 'Вставьте этот код перед закрывающим тегом </head> на всех страницах сайта:' : 'Paste this code before the closing </head> tag on all pages:'}
                        </p>
                        <div className="relative bg-muted/30 rounded-lg p-3">
                          <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">{`<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${createdPixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${createdPixelId}&ev=PageView&noscript=1"/>
</noscript>`}</pre>
                          <Button size="sm" variant="ghost" className="absolute top-2 right-2 h-7 w-7 p-0"
                            onClick={() => copyToClipboard(`fbq('init', '${createdPixelId}'); fbq('track', 'PageView');`)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="events">
                    <AccordionTrigger className="text-xs font-medium">
                      {isRu ? '2. Настройка событий конверсий' : '2. Configure Conversion Events'}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          {isRu ? 'Добавьте трекинг событий на соответствующие страницы/кнопки:' : 'Add event tracking to corresponding pages/buttons:'}
                        </p>
                        {selectedEvents.filter(e => e !== 'PageView').map(ev => (
                          <div key={ev} className="bg-muted/20 rounded p-2 space-y-1">
                            <p className="text-xs font-medium">{ev}</p>
                            <div className="flex items-center gap-2">
                              <code className="text-[10px] font-mono bg-background px-2 py-1 rounded flex-1">
                                {`fbq('track', '${ev}'${ev === 'Purchase' ? ", {value: 100.00, currency: 'USD'}" : ''});`}
                              </code>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(`fbq('track', '${ev}');`)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="crm">
                    <AccordionTrigger className="text-xs font-medium">
                      {isRu ? '3. Связь с CRM (серверные события)' : '3. CRM Integration (Server Events)'}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p>{isRu
                          ? 'Для серверного отслеживания используйте вкладку "Конверсии" (CAPI). Это позволяет:'
                          : 'For server-side tracking, use the "Conversions" tab (CAPI). This allows:'}</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>{isRu ? 'Автоматически отправлять события при смене стадии лида в CRM' : 'Auto-send events when lead stage changes in CRM'}</li>
                          <li>{isRu ? 'Передавать хешированные данные клиента (email, телефон)' : 'Send hashed customer data (email, phone)'}</li>
                          <li>{isRu ? 'Дедупликацию с браузерными событиями по event_id' : 'Deduplicate with browser events via event_id'}</li>
                          <li>{isRu ? 'Улучшить EMQ (Event Match Quality) до 8+' : 'Improve EMQ (Event Match Quality) to 8+'}</li>
                        </ul>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs mt-2" onClick={() => setActiveTab('conversions')}>
                          <ArrowRight className="h-3 w-3" /> {isRu ? 'Перейти к CAPI' : 'Go to CAPI'}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="gtm">
                    <AccordionTrigger className="text-xs font-medium">
                      {isRu ? '4. Установка через Google Tag Manager' : '4. Install via Google Tag Manager'}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <ol className="list-decimal list-inside space-y-1">
                          <li>{isRu ? 'Откройте GTM → Теги → Новый тег' : 'Open GTM → Tags → New Tag'}</li>
                          <li>{isRu ? 'Выберите "Пользовательский HTML" и вставьте код пикселя' : 'Select "Custom HTML" and paste pixel code'}</li>
                          <li>{isRu ? 'Триггер: All Pages (для PageView)' : 'Trigger: All Pages (for PageView)'}</li>
                          <li>{isRu ? 'Для событий создайте отдельные теги с триггерами на кнопки/формы' : 'For events, create separate tags with button/form triggers'}</li>
                          <li>{isRu ? 'Опубликуйте контейнер GTM' : 'Publish the GTM container'}</li>
                        </ol>
                        <div className="bg-primary/5 border border-primary/20 rounded p-2 mt-2">
                          <p className="font-medium text-foreground">💡 {isRu ? 'Совет' : 'Tip'}</p>
                          <p>{isRu
                            ? 'Используйте режим предпросмотра GTM и Meta Events Manager для проверки что события приходят корректно.'
                            : 'Use GTM Preview mode and Meta Events Manager to verify events are firing correctly.'}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="verify">
                    <AccordionTrigger className="text-xs font-medium">
                      {isRu ? '5. Верификация и отладка' : '5. Verification & Debugging'}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <ul className="list-disc list-inside space-y-1">
                          <li>{isRu ? 'Meta Pixel Helper (расширение Chrome) — проверка в реальном времени' : 'Meta Pixel Helper (Chrome extension) — real-time verification'}</li>
                          <li>{isRu ? 'Events Manager → Test Events — отправка тестовых событий' : 'Events Manager → Test Events — send test events'}</li>
                          <li>{isRu ? 'Diagnostics tab — автоматическая проверка ошибок' : 'Diagnostics tab — automatic error checking'}</li>
                        </ul>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] cursor-pointer" onClick={() => window.open('https://www.facebook.com/events_manager2/overview', '_blank')}>
                            <ExternalLink className="h-2.5 w-2.5 mr-1" /> Events Manager
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            Pixel ID: {createdPixelId}
                          </Badge>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </SectionCard>
          )}
        </TabsContent>

        {/* ─── AUDIENCES TAB ─── */}
        <TabsContent value="audiences" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SectionCard icon={Upload}
              title={isRu ? 'Кастомная аудитория' : 'Custom Audience'}
              desc={isRu ? 'Загрузите списки клиентов для таргетинга.' : 'Upload customer lists for targeting.'}
            >
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• {isRu ? 'CSV или список email/телефонов' : 'CSV or list of emails/phones'}</p>
                  <p>• {isRu ? 'SHA256 хеширование автоматически' : 'SHA256 hashing automatic'}</p>
                  <p>• {isRu ? 'Минимум 100 контактов' : 'Minimum 100 contacts'}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => { setAudienceDialog('custom'); setRetentionDays('30'); }}>
                  <Upload className="h-3.5 w-3.5" /> {isRu ? 'Создать из списка' : 'Create from List'}
                </Button>
              </div>
            </SectionCard>

            <SectionCard icon={UserPlus}
              title={isRu ? 'Lookalike аудитория' : 'Lookalike Audience'}
              desc={isRu ? 'Найдите похожих людей с помощью ML Meta.' : 'Find similar people with Meta ML.'}
            >
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• {isRu ? 'На основе Custom Audience или Pixel' : 'Based on Custom Audience or Pixel'}</p>
                  <p>• {isRu ? 'Размер от 1% до 10%' : 'Size from 1% to 10%'}</p>
                  <p>• {isRu ? 'Мульти-страновой таргетинг' : 'Multi-country targeting'}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => setAudienceDialog('lookalike')}>
                  <UserPlus className="h-3.5 w-3.5" /> {isRu ? 'Создать Lookalike' : 'Create Lookalike'}
                </Button>
              </div>
            </SectionCard>

            <SectionCard icon={ListFilter}
              title={isRu ? 'Сохранённая аудитория' : 'Saved Audience'}
              desc={isRu ? 'Пресеты таргетинга для повторного использования.' : 'Targeting presets for reuse.'}
            >
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• {isRu ? 'Интересы, демография, поведение' : 'Interests, demographics, behavior'}</p>
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
          <SectionCard icon={FileText}
            title={isRu ? 'Создать Instant Form' : 'Create Instant Form'}
            desc={isRu ? 'Полноценный конструктор лид-форм Facebook с шаблонами.' : 'Full lead form builder with templates.'}
            badge="Lead Ads API"
          >
            <div className="space-y-4">
              {/* Template quick-start */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">{isRu ? 'Быстрый старт из шаблона' : 'Quick Start from Template'}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: isRu ? 'Консультация' : 'Consultation', fields: ['full_name', 'email', 'phone_number'], headline: isRu ? 'Бесплатная консультация' : 'Free Consultation' },
                    { name: isRu ? 'Вебинар' : 'Webinar', fields: ['full_name', 'email'], headline: isRu ? 'Запись на вебинар' : 'Webinar Registration' },
                    { name: isRu ? 'B2B Лид' : 'B2B Lead', fields: ['full_name', 'work_email', 'company_name', 'job_title', 'phone_number'], headline: isRu ? 'Деловое предложение' : 'Business Inquiry' },
                    { name: isRu ? 'E-com' : 'E-commerce', fields: ['full_name', 'email', 'phone_number', 'city'], headline: isRu ? 'Специальное предложение' : 'Special Offer' },
                  ].map(tmpl => (
                    <Button key={tmpl.name} size="sm" variant="outline" className="text-xs h-auto py-2 justify-start"
                      onClick={() => {
                        setLeadFormFields(tmpl.fields);
                        setLeadFormHeadline(tmpl.headline);
                        setLeadFormName(tmpl.name);
                        toast.info(isRu ? `Шаблон "${tmpl.name}" применён` : `Template "${tmpl.name}" applied`);
                      }}>
                      <Layers className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      {tmpl.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Facebook Page ID</Label>
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
                  placeholder={isRu ? 'Заполните форму и мы свяжемся...' : 'Fill in the form and we will contact you...'} rows={2} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Поля формы' : 'Form Fields'}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {LEAD_FORM_FIELDS.map(field => (
                    <div key={field.key}
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
                  <Label className="text-xs">Privacy Policy URL</Label>
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
                    placeholder={isRu ? 'Мы свяжемся с вами' : 'We will contact you shortly'} className="text-xs" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateLeadForm} disabled={leadFormCreating || !metaConnected} className="gap-2">
                  {leadFormCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {isRu ? 'Создать форму' : 'Create Form'}
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── AUTO-UPLOAD (CAMPAIGNS) TAB ─── */}
        <TabsContent value="autoupload" className="space-y-4 mt-4">
          <SectionCard icon={Rocket}
            title={isRu ? 'Автозалив кампаний' : 'Campaign Auto-Upload'}
            desc={isRu ? 'Создавайте полные структуры кампаний с адсетами и объявлениями через API. Кампании создаются в PAUSED.' : 'Create full campaign structures with adsets and ads via API. Campaigns start PAUSED.'}
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
                    <div key={obj.key}
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
                <p className="font-medium text-foreground">{isRu ? 'Как это работает:' : 'How it works:'}</p>
                <p>• {isRu ? 'Кампания создаётся в статусе PAUSED для безопасности' : 'Campaign is created in PAUSED status for safety'}</p>
                <p>• {isRu ? 'Для полной настройки с адсетами и объявлениями используйте раздел "Черновики кампаний"' : 'For full setup with adsets and ads, use "Campaign Drafts"'}</p>
                <p>• {isRu ? 'AI рекомендации доступны в разделе "Рекомендации" для оптимальной структуры' : 'AI recommendations available in "Recommendations" for optimal structure'}</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleCreateCampaign} disabled={campaignCreating || !metaConnected || !selectedAccountId} className="gap-2">
                  {campaignCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  {isRu ? 'Создать кампанию' : 'Create Campaign'}
                </Button>
                <Button variant="outline" className="gap-2 text-xs" onClick={() => window.location.href = '/ai-ads/drafts'}>
                  <Layers className="h-3.5 w-3.5" /> {isRu ? 'Черновики (полная настройка)' : 'Drafts (full setup)'}
                </Button>
                <Button variant="outline" className="gap-2 text-xs" onClick={() => window.location.href = '/ai-ads/recommendations'}>
                  <Sparkles className="h-3.5 w-3.5" /> {isRu ? 'AI рекомендации' : 'AI Recommendations'}
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── RULES TAB ─── */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          <SectionCard icon={Settings}
            title={isRu ? 'Автоматические правила' : 'Automated Rules'}
            desc={isRu ? 'Правила автоуправления кампаниями по порогам эффективности.' : 'Auto-management rules based on performance thresholds.'}
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
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={!metaConnected}
                          onClick={() => toast.info(isRu ? 'Настройте пороги в Optimization Presets.' : 'Configure thresholds in Optimization Presets.')}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── CONVERSIONS TAB ─── */}
        <TabsContent value="conversions" className="space-y-4 mt-4">
          <SectionCard icon={Shield}
            title={isRu ? 'Conversions API (CAPI)' : 'Conversions API (CAPI)'}
            desc={isRu ? 'Серверное отслеживание для лучшей атрибуции и iOS 14+.' : 'Server-side tracking for better attribution and iOS 14+.'}
            badge="CAPI v21.0"
          >
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">{isRu ? 'Зачем нужен CAPI:' : 'Why CAPI matters:'}</p>
                <p>• {isRu ? 'Обходит блокировки iOS 14+ и браузерных расширений' : 'Bypasses iOS 14+ and browser extension blocks'}</p>
                <p>• {isRu ? 'Улучшает Event Match Quality (EMQ) до 8+' : 'Improves Event Match Quality (EMQ) to 8+'}</p>
                <p>• {isRu ? 'Точная атрибуция с дедупликацией' : 'Accurate attribution with deduplication'}</p>
                <p>• {isRu ? 'Передача PII-данных (email, phone) в SHA256' : 'PII data (email, phone) sent as SHA256'}</p>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {isRu ? 'CAPI настроен в платформе' : 'CAPI is configured in the platform'}
                </p>
                <p className="text-muted-foreground">
                  {isRu
                    ? 'Перейдите в карточку клиента → вкладка CAPI для маппинга CRM стадий на события Meta.'
                    : 'Go to client card → CAPI tab to map CRM stages to Meta events.'}
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
                  {['fbclid / fbc / fbp', 'FB Lead ID', isRu ? 'Email (SHA256)' : 'Email (SHA256)', isRu ? 'Телефон (SHA256)' : 'Phone (SHA256)'].map(item => (
                    <div key={item} className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-primary" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* ─── Audience Dialog ─── */}
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
                      placeholder={isRu ? 'ID Custom Audience' : 'Custom Audience ID'} />
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
                <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p>{isRu
                    ? 'Сохранённые аудитории фиксируют пресет таргетинга для быстрого повторного использования.'
                    : 'Saved audiences store targeting presets for quick reuse across campaigns.'}</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAudienceDialog(null)}>{isRu ? 'Отмена' : 'Cancel'}</Button>
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

import { useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
  Target, Users, Upload, Eye, Plus, Settings, Loader2, AlertTriangle,
  CheckCircle2, Zap, FileText, Globe, BarChart3, Search, ShieldCheck,
  Copy, ArrowRight, Info, Crosshair, UserPlus, ListFilter, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/* ──────────────── Types ──────────────── */
interface PixelConfig {
  name: string;
  events: string[];
}

interface AudienceConfig {
  name: string;
  type: 'custom' | 'lookalike' | 'saved';
  source?: string;
  ratio?: string;
  countries?: string;
  description?: string;
  customerFileData?: string;
}

/* ──────────────── Pixel Events ──────────────── */
const STANDARD_EVENTS = [
  'PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout',
  'Purchase', 'Lead', 'CompleteRegistration', 'Contact',
  'FindLocation', 'Schedule', 'SubmitApplication', 'Subscribe',
];

/* ──────────────── Component ──────────────── */
export default function AiAdsMetaAutomationPage() {
  const { language } = useLanguage();
  const { agencyRole } = useAuth();
  const isRu = language === 'ru';
  const isAdmin = agencyRole === 'AgencyAdmin';
  const [activeTab, setActiveTab] = useState('pixels');

  // Pixel state
  const [pixelName, setPixelName] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['PageView', 'Lead', 'Purchase']);
  const [pixelCreating, setPixelCreating] = useState(false);

  // Audience state
  const [audienceDialog, setAudienceDialog] = useState<'custom' | 'lookalike' | 'saved' | null>(null);
  const [audienceName, setAudienceName] = useState('');
  const [audienceDesc, setAudienceDesc] = useState('');
  const [lookalikeSrc, setLookalikeSrc] = useState('');
  const [lookalikeRatio, setLookalikeRatio] = useState('1');
  const [lookalikeCountries, setLookalikeCountries] = useState('');
  const [customerFile, setCustomerFile] = useState('');
  const [audienceCreating, setAudienceCreating] = useState(false);

  // Lead form state
  const [leadFormName, setLeadFormName] = useState('');
  const [leadFormFields, setLeadFormFields] = useState(['full_name', 'email', 'phone_number']);
  const [leadFormPrivacyUrl, setLeadFormPrivacyUrl] = useState('');
  const [leadFormCreating, setLeadFormCreating] = useState(false);

  const toggleEvent = (ev: string) => {
    setSelectedEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  };

  const handleCreatePixel = async () => {
    if (!pixelName.trim()) { toast.error(isRu ? 'Укажите имя пикселя' : 'Enter pixel name'); return; }
    setPixelCreating(true);
    // This would call Meta Graph API via edge function
    toast.info(isRu
      ? 'Для создания пикселя через API необходимо подключить Meta Ads Management в Интеграциях'
      : 'To create pixel via API, connect Meta Ads Management in Integrations');
    setPixelCreating(false);
  };

  const handleCreateAudience = async () => {
    if (!audienceName.trim()) { toast.error(isRu ? 'Укажите имя аудитории' : 'Enter audience name'); return; }
    setAudienceCreating(true);
    toast.info(isRu
      ? 'Для создания аудитории через API необходимо подключить Meta Ads Management в Интеграциях'
      : 'To create audience via API, connect Meta Ads Management in Integrations');
    setAudienceCreating(false);
    setAudienceDialog(null);
  };

  const handleCreateLeadForm = async () => {
    if (!leadFormName.trim()) { toast.error(isRu ? 'Укажите имя формы' : 'Enter form name'); return; }
    setLeadFormCreating(true);
    toast.info(isRu
      ? 'Для создания лид-формы через API необходимо подключить Meta Ads Management в Интеграциях'
      : 'To create lead form via API, connect Meta Ads Management in Integrations');
    setLeadFormCreating(false);
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
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          {isRu ? 'Meta Автоматизация' : 'Meta Automation'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isRu
            ? 'Автоматическое создание пикселей, аудиторий, лукэлайков и лид-форм через Meta Marketing API.'
            : 'Automated pixel setup, audience creation, lookalikes, and lead forms via Meta Marketing API.'}
        </p>
      </div>

      {/* Prerequisites */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">
                {isRu ? 'Необходимые условия' : 'Prerequisites'}
              </p>
              <p>{isRu
                ? '1. Подключите Meta Ads Management в разделе Интеграции (нужен System User Token с правом ads_management)'
                : '1. Connect Meta Ads Management in Integrations (System User Token with ads_management scope required)'}</p>
              <p>{isRu
                ? '2. Укажите Business Manager ID и App ID в настройках интеграции'
                : '2. Set Business Manager ID and App ID in integration settings'}</p>
              <p>{isRu
                ? '3. Все операции выполняются через Meta Graph API v21.0'
                : '3. All operations use Meta Graph API v21.0'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/30">
          <TabsTrigger value="pixels" className="gap-1.5 text-xs">
            <Crosshair className="h-3.5 w-3.5" />
            {isRu ? 'Пиксели' : 'Pixels'}
          </TabsTrigger>
          <TabsTrigger value="audiences" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            {isRu ? 'Аудитории' : 'Audiences'}
          </TabsTrigger>
          <TabsTrigger value="leadforms" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            {isRu ? 'Лид-формы' : 'Lead Forms'}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" />
            {isRu ? 'Правила' : 'Rules'}
          </TabsTrigger>
        </TabsList>

        {/* ─── PIXELS TAB ─── */}
        <TabsContent value="pixels" className="space-y-4 mt-4">
          <SectionCard
            icon={Crosshair}
            title="Create Meta Pixel"
            titleRu="Создать Meta Pixel"
            desc="Auto-create and configure a Facebook Pixel with standard events for your ad account."
            descRu="Автоматически создайте и настройте Facebook Pixel со стандартными событиями для рекламного кабинета."
            badge="Graph API"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Название пикселя' : 'Pixel Name'}</Label>
                <Input value={pixelName} onChange={e => setPixelName(e.target.value)}
                  placeholder={isRu ? 'Мой пиксель для лендинга' : 'My Landing Page Pixel'} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Стандартные события для отслеживания' : 'Standard Events to Track'}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_EVENTS.map(ev => (
                    <Badge
                      key={ev}
                      variant={selectedEvents.includes(ev) ? 'default' : 'outline'}
                      className={cn('cursor-pointer text-[10px] transition-colors',
                        selectedEvents.includes(ev) && 'bg-primary text-primary-foreground')}
                      onClick={() => toggleEvent(ev)}
                    >
                      {ev}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{isRu ? 'Что произойдёт:' : 'What will happen:'}</p>
                <p>• {isRu ? 'Создастся новый Pixel в выбранном Ad Account' : 'New Pixel created in selected Ad Account'}</p>
                <p>• {isRu ? 'Сконфигурируются выбранные стандартные события' : 'Selected standard events will be configured'}</p>
                <p>• {isRu ? 'Сгенерируется код установки для вашего сайта' : 'Installation code generated for your website'}</p>
              </div>

              <Button onClick={handleCreatePixel} disabled={pixelCreating} className="gap-2">
                {pixelCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isRu ? 'Создать пиксель' : 'Create Pixel'}
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── AUDIENCES TAB ─── */}
        <TabsContent value="audiences" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Custom Audience */}
            <SectionCard
              icon={Upload}
              title="Custom Audience"
              titleRu="Кастомная аудитория"
              desc="Upload customer lists (emails, phones) to create targeted audiences."
              descRu="Загрузите списки клиентов (email, телефоны) для создания таргетированных аудиторий."
            >
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• {isRu ? 'CSV с email / телефонами' : 'CSV with emails / phones'}</p>
                  <p>• {isRu ? 'Хеширование SHA256 автоматически' : 'SHA256 hashing automatic'}</p>
                  <p>• {isRu ? 'Минимум 100 контактов' : 'Minimum 100 contacts'}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => setAudienceDialog('custom')}>
                  <Upload className="h-3.5 w-3.5" />
                  {isRu ? 'Создать из списка' : 'Create from List'}
                </Button>
              </div>
            </SectionCard>

            {/* Lookalike */}
            <SectionCard
              icon={UserPlus}
              title="Lookalike Audience"
              titleRu="Lookalike аудитория"
              desc="Find people similar to your best customers using Meta's ML algorithm."
              descRu="Найдите людей, похожих на ваших лучших клиентов, используя ML-алгоритм Meta."
            >
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• {isRu ? 'На основе Custom Audience или Pixel' : 'Based on Custom Audience or Pixel'}</p>
                  <p>• {isRu ? 'Размер от 1% до 10%' : 'Size from 1% to 10%'}</p>
                  <p>• {isRu ? 'Выбор целевых стран' : 'Target country selection'}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => setAudienceDialog('lookalike')}>
                  <UserPlus className="h-3.5 w-3.5" />
                  {isRu ? 'Создать Lookalike' : 'Create Lookalike'}
                </Button>
              </div>
            </SectionCard>

            {/* Saved Audience */}
            <SectionCard
              icon={ListFilter}
              title="Saved Audience"
              titleRu="Сохранённая аудитория"
              desc="Save targeting presets (interests, demographics, behaviors) for reuse."
              descRu="Сохраняйте пресеты таргетинга (интересы, демография, поведение) для повторного использования."
            >
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• {isRu ? 'Интересы и поведение' : 'Interests & behaviors'}</p>
                  <p>• {isRu ? 'Демографические фильтры' : 'Demographic filters'}</p>
                  <p>• {isRu ? 'Гео-таргетинг' : 'Geo-targeting'}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => setAudienceDialog('saved')}>
                  <ListFilter className="h-3.5 w-3.5" />
                  {isRu ? 'Создать пресет' : 'Create Preset'}
                </Button>
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ─── LEAD FORMS TAB ─── */}
        <TabsContent value="leadforms" className="space-y-4 mt-4">
          <SectionCard
            icon={FileText}
            title="Create Lead Form"
            titleRu="Создать лид-форму"
            desc="Design and publish Facebook Lead Ad forms with custom fields and branding."
            descRu="Создавайте и публикуйте лид-формы Facebook с кастомными полями и брендингом."
            badge="Instant Forms"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Название формы' : 'Form Name'}</Label>
                <Input value={leadFormName} onChange={e => setLeadFormName(e.target.value)}
                  placeholder={isRu ? 'Заявка на консультацию' : 'Consultation Request'} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Поля формы' : 'Form Fields'}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {['full_name', 'email', 'phone_number', 'city', 'company_name', 'job_title'].map(field => (
                    <Badge
                      key={field}
                      variant={leadFormFields.includes(field) ? 'default' : 'outline'}
                      className={cn('cursor-pointer text-[10px] transition-colors',
                        leadFormFields.includes(field) && 'bg-primary text-primary-foreground')}
                      onClick={() => setLeadFormFields(prev =>
                        prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field])}
                    >
                      {field.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Ссылка на политику конфиденциальности' : 'Privacy Policy URL'}</Label>
                <Input value={leadFormPrivacyUrl} onChange={e => setLeadFormPrivacyUrl(e.target.value)}
                  placeholder="https://example.com/privacy" />
              </div>

              <Button onClick={handleCreateLeadForm} disabled={leadFormCreating} className="gap-2">
                {leadFormCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isRu ? 'Создать форму' : 'Create Form'}
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── RULES TAB ─── */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          <SectionCard
            icon={Settings}
            title="Automated Rules"
            titleRu="Автоматические правила"
            desc="Set up rules to auto-pause, adjust budgets, or notify based on performance thresholds."
            descRu="Настройте правила для авто-паузы, корректировки бюджетов или уведомлений по порогам эффективности."
          >
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    title: isRu ? 'Пауза при высоком CPL' : 'Pause on High CPL',
                    desc: isRu ? 'Если CPL > порога за 3 дня → пауза adset' : 'If CPL > threshold for 3 days → pause adset',
                    icon: AlertTriangle,
                  },
                  {
                    title: isRu ? 'Увеличение бюджета' : 'Budget Increase',
                    desc: isRu ? 'Если ROAS > порога → увеличить бюджет на 20%' : 'If ROAS > threshold → increase budget by 20%',
                    icon: BarChart3,
                  },
                  {
                    title: isRu ? 'Уведомление о расходах' : 'Spend Alert',
                    desc: isRu ? 'Если дневной расход > бюджета → Telegram-алерт' : 'If daily spend > budget → Telegram alert',
                    icon: Sparkles,
                  },
                  {
                    title: isRu ? 'Перезапуск при 0 показов' : 'Restart on 0 Impressions',
                    desc: isRu ? 'Если 0 показов за 6ч → дублировать adset' : 'If 0 impressions for 6h → duplicate adset',
                    icon: Zap,
                  },
                ].map((rule, i) => (
                  <Card key={i} className="border-dashed">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <rule.icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs font-medium">{rule.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{rule.desc}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="mt-2 text-[10px]">
                        {isRu ? 'Скоро' : 'Coming Soon'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">
                <p>{isRu
                  ? '⚡ Автоматические правила будут доступны после подключения Meta Ads Management с правами ads_management. Правила выполняются через Meta Marketing API Rules.'
                  : '⚡ Automated rules will be available after connecting Meta Ads Management with ads_management permission. Rules execute via Meta Marketing API Rules.'}</p>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* ─── Audience Creation Dialog ─── */}
      <Dialog open={!!audienceDialog} onOpenChange={v => { if (!v) setAudienceDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {audienceDialog === 'custom' && <><Upload className="h-5 w-5 text-primary" /> {isRu ? 'Кастомная аудитория' : 'Custom Audience'}</>}
              {audienceDialog === 'lookalike' && <><UserPlus className="h-5 w-5 text-primary" /> {isRu ? 'Lookalike аудитория' : 'Lookalike Audience'}</>}
              {audienceDialog === 'saved' && <><ListFilter className="h-5 w-5 text-primary" /> {isRu ? 'Сохранённая аудитория' : 'Saved Audience'}</>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
              <div className="space-y-2">
                <Label className="text-xs">{isRu ? 'Данные (email или телефоны, по одному на строку)' : 'Data (emails or phones, one per line)'}</Label>
                <Textarea value={customerFile} onChange={e => setCustomerFile(e.target.value)}
                  placeholder={'user@example.com\n+1234567890\n...'} rows={4} className="font-mono text-xs" />
                <p className="text-[10px] text-muted-foreground">
                  {isRu ? 'Данные хешируются SHA256 перед отправкой в Meta. Минимум 100 записей.' : 'Data is SHA256-hashed before sending to Meta. Minimum 100 records.'}
                </p>
              </div>
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
                    <Label className="text-xs">{isRu ? 'Страны' : 'Countries'}</Label>
                    <Input value={lookalikeCountries} onChange={e => setLookalikeCountries(e.target.value)}
                      placeholder="US, GB, DE" />
                  </div>
                </div>
              </>
            )}

            {audienceDialog === 'saved' && (
              <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">
                <p>{isRu
                  ? 'Сохранённые аудитории позволяют зафиксировать пресет таргетинга (интересы, возраст, гео) для быстрого повторного использования в кампаниях.'
                  : 'Saved audiences let you store targeting presets (interests, age, geo) for quick reuse across campaigns.'}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAudienceDialog(null)}>
              {isRu ? 'Отмена' : 'Cancel'}
            </Button>
            <Button onClick={handleCreateAudience} disabled={audienceCreating}>
              {audienceCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isRu ? 'Создать' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

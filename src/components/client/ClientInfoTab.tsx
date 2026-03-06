import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Loader2, ExternalLink, Globe, Instagram, Facebook, Linkedin, Youtube, MessageSquare, FileText, Users, MapPin, Target, Briefcase, Phone, Mail, Calendar } from 'lucide-react';
import type { TranslationKey } from '@/i18n/translations';

interface ClientInfo {
  brief_url: string;
  monthly_budget: number;
  website_url: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  linkedin_url: string;
  youtube_url: string;
  twitter_url: string;
  telegram_url: string;
  business_niche: string;
  target_audience: string;
  geo_targeting: string;
  key_competitors: string;
  brand_guidelines_url: string;
  landing_pages: string;
  crm_system: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  payment_terms: string;
  contract_start: string | null;
  contract_end: string | null;
  additional_notes: string;
}

const defaultInfo: ClientInfo = {
  brief_url: '', monthly_budget: 0, website_url: '', instagram_url: '', facebook_url: '',
  tiktok_url: '', linkedin_url: '', youtube_url: '', twitter_url: '', telegram_url: '',
  business_niche: '', target_audience: '', geo_targeting: '', key_competitors: '',
  brand_guidelines_url: '', landing_pages: '', crm_system: '', contact_person: '',
  contact_phone: '', contact_email: '', payment_terms: '', contract_start: null,
  contract_end: null, additional_notes: '',
};

export default function ClientInfoTab({ clientId, isAdmin }: { clientId: string; isAdmin: boolean }) {
  const { t } = useLanguage();
  const [info, setInfo] = useState<ClientInfo>(defaultInfo);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('client_info')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (data) {
        setInfo({
          brief_url: data.brief_url || '',
          monthly_budget: data.monthly_budget || 0,
          website_url: data.website_url || '',
          instagram_url: data.instagram_url || '',
          facebook_url: data.facebook_url || '',
          tiktok_url: data.tiktok_url || '',
          linkedin_url: data.linkedin_url || '',
          youtube_url: data.youtube_url || '',
          twitter_url: data.twitter_url || '',
          telegram_url: data.telegram_url || '',
          business_niche: data.business_niche || '',
          target_audience: data.target_audience || '',
          geo_targeting: data.geo_targeting || '',
          key_competitors: data.key_competitors || '',
          brand_guidelines_url: data.brand_guidelines_url || '',
          landing_pages: data.landing_pages || '',
          crm_system: data.crm_system || '',
          contact_person: data.contact_person || '',
          contact_phone: data.contact_phone || '',
          contact_email: data.contact_email || '',
          payment_terms: data.payment_terms || '',
          contract_start: data.contract_start || null,
          contract_end: data.contract_end || null,
          additional_notes: data.additional_notes || '',
        });
      }
      setLoading(false);
    })();
  }, [clientId]);

  const handleSave = async () => {
    setSaving(true);
    const payload = { client_id: clientId, ...info, updated_at: new Date().toISOString() };
    const { data: existing } = await supabase
      .from('client_info').select('id').eq('client_id', clientId).maybeSingle();
    
    if (existing) {
      const { error } = await supabase.from('client_info').update(payload as any).eq('client_id', clientId);
      if (error) { toast.error(error.message); } else { toast.success(t('common.save')); }
    } else {
      const { error } = await supabase.from('client_info').insert(payload as any);
      if (error) { toast.error(error.message); } else { toast.success(t('common.save')); }
    }
    setSaving(false);
  };

  const u = (key: keyof ClientInfo, value: string | number) => setInfo(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Brief & Budget */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Бриф и бюджет</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ссылка на бриф</Label>
              <div className="flex gap-1.5">
                <Input value={info.brief_url} onChange={e => u('brief_url', e.target.value)} placeholder="https://docs.google.com/..." className="text-sm h-8" />
                {info.brief_url && <a href={info.brief_url} target="_blank" rel="noreferrer"><Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-3.5 w-3.5" /></Button></a>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ежемесячный бюджет ($)</Label>
              <Input type="number" value={info.monthly_budget || ''} onChange={e => u('monthly_budget', Number(e.target.value))} placeholder="5000" className="text-sm h-8" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Брендбук / гайдлайны</Label>
              <Input value={info.brand_guidelines_url} onChange={e => u('brand_guidelines_url', e.target.value)} placeholder="https://..." className="text-sm h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CRM клиента</Label>
              <Input value={info.crm_system} onChange={e => u('crm_system', e.target.value)} placeholder="GoHighLevel, HubSpot..." className="text-sm h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Info */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> О бизнесе</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ниша / сфера</Label>
              <Input value={info.business_niche} onChange={e => u('business_niche', e.target.value)} placeholder="Недвижимость, e-com..." className="text-sm h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Гео таргетинг</Label>
              <Input value={info.geo_targeting} onChange={e => u('geo_targeting', e.target.value)} placeholder="USA, EU, CIS..." className="text-sm h-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Целевая аудитория</Label>
            <Textarea value={info.target_audience} onChange={e => u('target_audience', e.target.value)} placeholder="Мужчины 25-45, доход средний+, интересы..." className="text-sm min-h-[60px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Основные конкуренты</Label>
            <Textarea value={info.key_competitors} onChange={e => u('key_competitors', e.target.value)} placeholder="Конкурент 1, Конкурент 2..." className="text-sm min-h-[50px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Посадочные страницы</Label>
            <Textarea value={info.landing_pages} onChange={e => u('landing_pages', e.target.value)} placeholder="https://landing1.com, https://landing2.com" className="text-sm min-h-[50px]" />
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Соцсети и ссылки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'website_url' as const, label: 'Сайт', icon: Globe, placeholder: 'https://...' },
              { key: 'instagram_url' as const, label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/...' },
              { key: 'facebook_url' as const, label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/...' },
              { key: 'tiktok_url' as const, label: 'TikTok', icon: Globe, placeholder: 'https://tiktok.com/@...' },
              { key: 'linkedin_url' as const, label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/...' },
              { key: 'youtube_url' as const, label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/...' },
              { key: 'telegram_url' as const, label: 'Telegram', icon: MessageSquare, placeholder: 'https://t.me/...' },
              { key: 'twitter_url' as const, label: 'X (Twitter)', icon: Globe, placeholder: 'https://x.com/...' },
            ].map(s => (
              <div key={s.key} className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><s.icon className="h-3 w-3" />{s.label}</Label>
                <Input value={info[s.key]} onChange={e => u(s.key, e.target.value)} placeholder={s.placeholder} className="text-sm h-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Контактное лицо и договор</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> Контактное лицо</Label>
              <Input value={info.contact_person} onChange={e => u('contact_person', e.target.value)} placeholder="Имя Фамилия" className="text-sm h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Телефон</Label>
              <Input value={info.contact_phone} onChange={e => u('contact_phone', e.target.value)} placeholder="+1 234 567 8900" className="text-sm h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
              <Input value={info.contact_email} onChange={e => u('contact_email', e.target.value)} placeholder="client@company.com" className="text-sm h-8" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Условия оплаты</Label>
              <Input value={info.payment_terms} onChange={e => u('payment_terms', e.target.value)} placeholder="Предоплата, %" className="text-sm h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Начало контракта</Label>
              <Input type="date" value={info.contract_start || ''} onChange={e => u('contract_start', e.target.value)} className="text-sm h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Конец контракта</Label>
              <Input type="date" value={info.contract_end || ''} onChange={e => u('contract_end', e.target.value)} className="text-sm h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Дополнительные заметки</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={info.additional_notes} onChange={e => u('additional_notes', e.target.value)}
            placeholder="Любая важная информация о клиенте..." className="text-sm min-h-[80px]" />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Сохранить информацию
      </Button>
    </div>
  );
}

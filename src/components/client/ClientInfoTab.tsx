import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Save, Loader2, ExternalLink, Globe, Instagram, Facebook, Linkedin, Youtube, MessageSquare, FileText, Users, MapPin, Target, Briefcase, Phone, Mail, Calendar, Lock, TrendingUp, Sparkles, Upload } from 'lucide-react';
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

interface ClientTarget {
  target_cpl: number | null;
  target_ctr: number | null;
  target_leads: number | null;
  target_roas: number | null;
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
  const canEdit = true; // Only agency users see this tab now

  const [info, setInfo] = useState<ClientInfo>(defaultInfo);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Targets state
  const [targetCpl, setTargetCpl] = useState('');
  const [targetCtr, setTargetCtr] = useState('');
  const [targetLeads, setTargetLeads] = useState('');
  const [targetRoas, setTargetRoas] = useState('');
  const [savingTargets, setSavingTargets] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [infoRes, targetsRes] = await Promise.all([
        supabase.from('client_info').select('*').eq('client_id', clientId).maybeSingle(),
        supabase.from('client_targets').select('*').eq('client_id', clientId).maybeSingle(),
      ]);

      if (infoRes.data) {
        const data = infoRes.data;
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

      if (targetsRes.data) {
        const t = targetsRes.data as ClientTarget;
        setTargetCpl(t.target_cpl?.toString() || '');
        setTargetCtr(t.target_ctr?.toString() || '');
        setTargetLeads(t.target_leads?.toString() || '');
        setTargetRoas(t.target_roas?.toString() || '');
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

  const handleSaveTargets = async () => {
    setSavingTargets(true);
    const targetsPayload = {
      client_id: clientId,
      target_cpl: targetCpl ? parseFloat(targetCpl) : null,
      target_ctr: targetCtr ? parseFloat(targetCtr) : null,
      target_leads: targetLeads ? parseInt(targetLeads) : null,
      target_roas: targetRoas ? parseFloat(targetRoas) : null,
    };

    const { data: existing } = await supabase
      .from('client_targets').select('id').eq('client_id', clientId).maybeSingle();

    if (existing) {
      const { error } = await supabase.from('client_targets').update(targetsPayload).eq('client_id', clientId);
      if (error) toast.error(error.message);
      else toast.success(t('common.save'));
    } else {
      const { error } = await supabase.from('client_targets').insert(targetsPayload);
      if (error) toast.error(error.message);
      else toast.success(t('common.save'));
    }
    setSavingTargets(false);
  };

  const u = (key: keyof ClientInfo, value: string | number) => setInfo(prev => ({ ...prev, [key]: value }));

  const isFieldEditable = (_key: keyof ClientInfo) => true;

  const renderField = (key: keyof ClientInfo, label: string, opts?: { type?: string; placeholder?: string; icon?: any; textarea?: boolean }) => {
    const editable = isFieldEditable(key);
    const Icon = opts?.icon;
    return (
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
          {!editable && <Lock className="h-2.5 w-2.5 text-muted-foreground ml-0.5" />}
        </Label>
        {opts?.textarea ? (
          <Textarea
            value={String(info[key] || '')}
            onChange={e => u(key, e.target.value)}
            placeholder={opts?.placeholder}
            className="text-sm min-h-[60px]"
            disabled={!editable}
          />
        ) : (
          <div className="flex gap-1.5">
            <Input
              type={opts?.type || 'text'}
              value={info[key] === null ? '' : String(info[key])}
              onChange={e => u(key, opts?.type === 'number' ? Number(e.target.value) : e.target.value)}
              placeholder={opts?.placeholder}
              className="text-sm h-8"
              disabled={!editable}
            />
            {typeof info[key] === 'string' && (info[key] as string).startsWith('http') && (
              <a href={info[key] as string} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-3.5 w-3.5" /></Button>
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 max-w-3xl">

      {/* Targets */}
      {isAdmin && (
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> {t('targets.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('targets.cpl')}</Label>
                <Input type="number" step="0.01" value={targetCpl} onChange={e => setTargetCpl(e.target.value)} placeholder="$0.00" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('targets.ctr')}</Label>
                <Input type="number" step="0.01" value={targetCtr} onChange={e => setTargetCtr(e.target.value)} placeholder="0.00%" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('targets.leads')}</Label>
                <Input type="number" step="1" value={targetLeads} onChange={e => setTargetLeads(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('targets.roas')}</Label>
                <Input type="number" step="0.01" value={targetRoas} onChange={e => setTargetRoas(e.target.value)} placeholder="0.00x" className="h-8 text-sm" />
              </div>
            </div>
            <Button size="sm" onClick={handleSaveTargets} disabled={savingTargets} className="gap-1.5">
              {savingTargets ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {t('common.save')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Brief & Budget */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> {t('clientInfo.briefBudget' as TranslationKey)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderField('brief_url', t('clientInfo.briefUrl' as TranslationKey), { placeholder: 'https://docs.google.com/...' })}
            {renderField('monthly_budget', t('clientInfo.monthlyBudget' as TranslationKey), { type: 'number', placeholder: '5000' })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderField('brand_guidelines_url', t('clientInfo.brandGuidelines' as TranslationKey), { placeholder: 'https://...' })}
            {renderField('crm_system', t('clientInfo.crmSystem' as TranslationKey), { placeholder: 'GoHighLevel, HubSpot...' })}
          </div>
        </CardContent>
      </Card>

      {/* Business Info */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> {t('clientInfo.aboutBusiness' as TranslationKey)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderField('business_niche', t('clientInfo.niche' as TranslationKey), { placeholder: 'Real estate, e-com...' })}
            {renderField('geo_targeting', t('clientInfo.geoTargeting' as TranslationKey), { placeholder: 'USA, EU, CIS...' })}
          </div>
          {renderField('target_audience', t('clientInfo.targetAudience' as TranslationKey), { textarea: true, placeholder: 'Males 25-45, income mid+...' })}
          {renderField('key_competitors', t('clientInfo.competitors' as TranslationKey), { textarea: true, placeholder: 'Competitor 1, Competitor 2...' })}
          {renderField('landing_pages', t('clientInfo.landingPages' as TranslationKey), { textarea: true, placeholder: 'https://landing1.com, https://landing2.com' })}
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> {t('clientInfo.socialLinks' as TranslationKey)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderField('website_url', t('clientInfo.website' as TranslationKey), { icon: Globe, placeholder: 'https://...' })}
            {renderField('instagram_url', 'Instagram', { icon: Instagram, placeholder: 'https://instagram.com/...' })}
            {renderField('facebook_url', 'Facebook', { icon: Facebook, placeholder: 'https://facebook.com/...' })}
            {renderField('tiktok_url', 'TikTok', { icon: Globe, placeholder: 'https://tiktok.com/@...' })}
            {renderField('linkedin_url', 'LinkedIn', { icon: Linkedin, placeholder: 'https://linkedin.com/...' })}
            {renderField('youtube_url', 'YouTube', { icon: Youtube, placeholder: 'https://youtube.com/...' })}
            {renderField('telegram_url', 'Telegram', { icon: MessageSquare, placeholder: 'https://t.me/...' })}
            {renderField('twitter_url', 'X (Twitter)', { icon: Globe, placeholder: 'https://x.com/...' })}
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> {t('clientInfo.contactContract' as TranslationKey)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {renderField('contact_person', t('clientInfo.contactPerson' as TranslationKey), { icon: Users, placeholder: 'Name' })}
            {renderField('contact_phone', t('clientInfo.phone' as TranslationKey), { icon: Phone, placeholder: '+1 234 567 8900' })}
            {renderField('contact_email', t('clientInfo.email' as TranslationKey), { icon: Mail, placeholder: 'client@company.com' })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {renderField('payment_terms', t('clientInfo.paymentTerms' as TranslationKey), { placeholder: 'Prepaid, %' })}
            {renderField('contract_start', t('clientInfo.contractStart' as TranslationKey), { type: 'date', icon: Calendar })}
            {renderField('contract_end', t('clientInfo.contractEnd' as TranslationKey), { type: 'date', icon: Calendar })}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> {t('clientInfo.notes' as TranslationKey)}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderField('additional_notes', '', { textarea: true, placeholder: t('clientInfo.notesPlaceholder' as TranslationKey) })}
        </CardContent>
      </Card>

      {canEdit && (
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('common.save')}
        </Button>
      )}
    </div>
  );
}
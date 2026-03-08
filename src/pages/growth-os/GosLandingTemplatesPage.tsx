import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileCode2, Eye, Copy, Trash2, Loader2 } from 'lucide-react';
import type { TranslationKey } from '@/i18n/translations';

export default function GosLandingTemplatesPage() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from('gos_landing_templates').select('*').order('updated_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };

  const createTemplate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('gos_landing_templates').insert({
      name: 'New Template',
      created_by: user.id,
      sections: [
        { type: 'hero', config: { headline: 'Your Headline', subheadline: 'Your subheadline', cta: 'Get Started' } },
        { type: 'features', config: { items: [] } },
        { type: 'cta', config: { text: 'Ready to grow?', button: 'Contact Us' } },
      ],
    });
    loadTemplates();
  };

  const statusColor: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    archived: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('gos.landingTemplates' as TranslationKey)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('gos.landingTemplatesDesc' as TranslationKey)}</p>
        </div>
        <Button size="sm" onClick={createTemplate} className="gap-1.5">
          <Plus className="h-4 w-4" /> {t('common.create')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileCode2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">{t('common.noData')}</p>
            <Button size="sm" variant="outline" onClick={createTemplate} className="gap-1.5">
              <Plus className="h-4 w-4" /> {t('common.create')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(tpl => (
            <Card key={tpl.id} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-foreground text-sm truncate flex-1">{tpl.name}</h3>
                  <Badge className={`text-[10px] ${statusColor[tpl.status] || statusColor.draft}`}>{tpl.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{(tpl.sections || []).length} sections</p>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Copy className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

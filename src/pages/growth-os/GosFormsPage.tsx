import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FormInput, Loader2, FileText, Settings2 } from 'lucide-react';
import type { TranslationKey } from '@/i18n/translations';

export default function GosFormsPage() {
  const { t } = useLanguage();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadForms(); }, []);

  const loadForms = async () => {
    setLoading(true);
    const { data } = await supabase.from('gos_forms').select('*').order('updated_at', { ascending: false });
    setForms(data || []);
    setLoading(false);
  };

  const createForm = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('gos_forms').insert({
      name: 'New Form',
      created_by: user.id,
      fields: [
        { id: 'name', type: 'text', label: 'Name', required: true },
        { id: 'email', type: 'email', label: 'Email', required: true },
        { id: 'phone', type: 'tel', label: 'Phone', required: false },
      ],
    });
    loadForms();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('gos.formBuilder' as TranslationKey)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('gos.formBuilderDesc' as TranslationKey)}</p>
        </div>
        <Button size="sm" onClick={createForm} className="gap-1.5">
          <Plus className="h-4 w-4" /> {t('common.create')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : forms.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FormInput className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">{t('common.noData')}</p>
            <Button size="sm" variant="outline" onClick={createForm} className="gap-1.5">
              <Plus className="h-4 w-4" /> {t('common.create')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {forms.map(form => (
            <Card key={form.id} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-foreground text-sm truncate flex-1">{form.name}</h3>
                  <Badge variant="outline" className="text-[10px]">{form.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{(form.fields || []).length} fields · {form.submit_action}</p>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Settings2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><FileText className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Plug, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { TranslationKey } from '@/i18n/translations';

export default function GosIntegrationsPage() {
  const { t } = useLanguage();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [intRes, instRes] = await Promise.all([
      supabase.from('gos_integrations').select('*').order('name'),
      supabase.from('gos_integration_instances').select('*, gos_integrations(name, provider)').order('created_at', { ascending: false }),
    ]);
    setIntegrations(intRes.data || []);
    setInstances(instRes.data || []);
    setLoading(false);
  };

  const categoryColors: Record<string, string> = {
    crm: 'border-blue-500/30 text-blue-400',
    ads: 'border-violet-500/30 text-violet-400',
    analytics: 'border-emerald-500/30 text-emerald-400',
    messaging: 'border-amber-500/30 text-amber-400',
    general: 'border-muted text-muted-foreground',
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('gos.integrations' as TranslationKey)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('gos.integrationsDesc' as TranslationKey)}</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Integration
        </Button>
      </div>

      {integrations.length === 0 && instances.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Plug className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No integrations configured yet</p>
            <p className="text-xs text-muted-foreground">Add CRM, Ad Platform, or Analytics integrations to connect your tools</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map(int => (
              <Card key={int.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-foreground text-sm">{int.name}</h3>
                    <Badge variant="outline" className={`text-[10px] ${categoryColors[int.category] || categoryColors.general}`}>
                      {int.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{int.provider}</p>
                  {int.description && <p className="text-xs text-muted-foreground">{int.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {instances.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Active Connections</h2>
              <div className="space-y-2">
                {instances.map(inst => (
                  <Card key={inst.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {inst.is_active ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm text-foreground">{(inst as any).gos_integrations?.name || 'Integration'}</span>
                      </div>
                      {inst.error_message && <span className="text-xs text-destructive truncate max-w-[200px]">{inst.error_message}</span>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

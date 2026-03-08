import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ClipboardCheck, Loader2, PlayCircle } from 'lucide-react';
import type { TranslationKey } from '@/i18n/translations';

export default function GosOnboardingPage() {
  const { t } = useLanguage();
  const [flows, setFlows] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [flowsRes, sessionsRes] = await Promise.all([
      supabase.from('gos_onboarding_flows').select('*').order('created_at', { ascending: false }),
      supabase.from('gos_onboarding_sessions').select('*, clients(name)').order('created_at', { ascending: false }).limit(50),
    ]);
    setFlows(flowsRes.data || []);
    setSessions(sessionsRes.data || []);
    setLoading(false);
  };

  const createFlow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('gos_onboarding_flows').insert({
      name: 'New Onboarding Flow',
      created_by: user.id,
      steps: [
        { id: 'info', title: 'Business Info', fields: ['company_name', 'niche', 'website'] },
        { id: 'goals', title: 'Goals & KPIs', fields: ['target_cpl', 'monthly_budget', 'target_leads'] },
        { id: 'platforms', title: 'Ad Platforms', fields: ['meta_access', 'google_access', 'tiktok_access'] },
        { id: 'assets', title: 'Brand Assets', fields: ['logo', 'brand_guidelines', 'creatives'] },
      ],
    });
    loadData();
  };

  const sessionStatusColor: Record<string, string> = {
    in_progress: 'bg-blue-500/10 text-blue-400',
    completed: 'bg-emerald-500/10 text-emerald-400',
    abandoned: 'bg-muted text-muted-foreground',
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('gos.onboarding' as TranslationKey)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('gos.onboardingDesc' as TranslationKey)}</p>
        </div>
        <Button size="sm" onClick={createFlow} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Flow
        </Button>
      </div>

      <Tabs defaultValue="flows">
        <TabsList>
          <TabsTrigger value="flows">Flows ({flows.length})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="flows" className="mt-4">
          {flows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No onboarding flows yet</p>
                <Button size="sm" variant="outline" onClick={createFlow} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Create First Flow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {flows.map(flow => (
                <Card key={flow.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-foreground text-sm">{flow.name}</h3>
                      {flow.is_default && <Badge className="text-[10px] bg-primary/10 text-primary">Default</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{(flow.steps || []).length} steps</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active onboarding sessions</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <Card key={s.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-foreground">{(s as any).clients?.name || 'Unknown client'}</span>
                      <span className="text-xs text-muted-foreground ml-2">Step {s.current_step + 1}</span>
                    </div>
                    <Badge className={`text-[10px] ${sessionStatusColor[s.status] || ''}`}>{s.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

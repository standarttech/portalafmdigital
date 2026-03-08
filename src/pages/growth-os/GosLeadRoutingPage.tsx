import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, GitBranch, Loader2, Activity, ArrowRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { TranslationKey } from '@/i18n/translations';

export default function GosLeadRoutingPage() {
  const { t } = useLanguage();
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [rulesRes, logsRes] = await Promise.all([
      supabase.from('gos_routing_rules').select('*').order('priority', { ascending: true }),
      supabase.from('gos_routing_log').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setRules(rulesRes.data || []);
    setLogs(logsRes.data || []);
    setLoading(false);
  };

  const toggleRule = async (id: string, is_active: boolean) => {
    await supabase.from('gos_routing_rules').update({ is_active: !is_active }).eq('id', id);
    loadData();
  };

  const createRule = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('gos_routing_rules').insert({
      name: 'New Routing Rule',
      created_by: user.id,
      priority: rules.length,
      conditions: [
        { field: 'source', operator: 'equals', value: '' }
      ],
      action_type: 'assign_user',
      action_config: { user_id: null, pipeline_id: null },
    });
    loadData();
  };

  const actionLabels: Record<string, string> = {
    assign_user: 'Assign to User',
    assign_pipeline: 'Route to Pipeline',
    tag: 'Add Tag',
    webhook: 'Trigger Webhook',
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('gos.leadRouting' as TranslationKey)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('gos.leadRoutingDesc' as TranslationKey)}</p>
        </div>
        <Button size="sm" onClick={createRule} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Rule
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="log">Routing Log ({logs.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4">
          {rules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <GitBranch className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No routing rules yet</p>
                <Button size="sm" variant="outline" onClick={createRule} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Create First Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <Card key={rule.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <span className="text-xs font-mono text-muted-foreground w-6 text-center">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground text-sm truncate">{rule.name}</h3>
                        <Badge variant="outline" className="text-[10px]">{actionLabels[rule.action_type] || rule.action_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(rule.conditions || []).length} condition(s)
                        <ArrowRight className="h-3 w-3 inline mx-1" />
                        {rule.action_type}
                      </p>
                    </div>
                    <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule.id, rule.is_active)} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="log" className="mt-4">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No routing events yet</p>
          ) : (
            <div className="space-y-1">
              {logs.map(log => (
                <Card key={log.id}>
                  <CardContent className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-foreground">{log.lead_source || 'Unknown'}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-foreground">{log.routed_to || '—'}</span>
                    </div>
                    <span className="text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</span>
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

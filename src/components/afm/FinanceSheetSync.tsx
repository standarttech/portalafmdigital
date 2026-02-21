import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Link2, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface FinanceSheetSyncProps {
  tabKey: 'financial_planning' | 'income_plan';
  onSyncComplete?: () => void;
}

export default function FinanceSheetSync({ tabKey, onSyncComplete }: FinanceSheetSyncProps) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', `finance_sheet_${tabKey}`)
        .maybeSingle();
      if (data?.value) {
        const val = data.value as any;
        setSheetUrl(val.url || '');
        setSavedUrl(val.url || '');
        setLastSynced(val.last_synced || null);
        setAutoSync(val.auto_sync || false);
      }
      setLoading(false);
    };
    load();
  }, [tabKey]);

  const handleSync = useCallback(async () => {
    if (!sheetUrl) {
      toast.error('Вставьте ссылку на Google таблицу');
      return;
    }
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-finance-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ sheet_url: sheetUrl, tab_key: tabKey }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Синхронизировано: ${result.rows_synced} ячеек из ${result.total_rows} строк`);
        setSavedUrl(sheetUrl);
        setLastSynced(new Date().toISOString());
        onSyncComplete?.();
      } else {
        toast.error(result.error || 'Ошибка синхронизации');
      }
    } catch (e: any) {
      toast.error(e.message || 'Ошибка подключения');
    }
    setSyncing(false);
  }, [sheetUrl, tabKey, onSyncComplete]);

  const handleAutoSyncToggle = async (enabled: boolean) => {
    setAutoSync(enabled);
    await supabase.from('platform_settings').upsert({
      key: `finance_sheet_${tabKey}`,
      value: { url: sheetUrl, last_synced: lastSynced, auto_sync: enabled },
    }, { onConflict: 'key' });
    toast.success(enabled ? 'Автосинхронизация включена (каждый час)' : 'Автосинхронизация выключена');
  };

  if (loading) return null;

  return (
    <Card className="glass-card border-border/40">
      <CardContent className="p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Link2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Google Sheets</span>
          </div>
          <Input
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={e => setSheetUrl(e.target.value)}
            className="h-7 text-xs flex-1 min-w-0"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={syncing || !sheetUrl}
            className="h-7 gap-1.5 text-xs shrink-0"
          >
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Синхр.
          </Button>
          <div className="flex items-center gap-1.5 shrink-0">
            <Switch
              id={`auto-sync-${tabKey}`}
              checked={autoSync}
              onCheckedChange={handleAutoSyncToggle}
              className="scale-75"
            />
            <Label htmlFor={`auto-sync-${tabKey}`} className="text-[10px] text-muted-foreground cursor-pointer">
              Авто (1ч)
            </Label>
          </div>
          {lastSynced && savedUrl && (
            <div className="flex items-center gap-1 text-[10px] text-green-400 shrink-0">
              <CheckCircle2 className="h-3 w-3" />
              {new Date(lastSynced).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

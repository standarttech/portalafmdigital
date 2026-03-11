import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, Send, Loader2, Bot, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  isAdmin: boolean;
}

interface Schedule {
  id: string;
  client_id: string;
  report_type: string;
  telegram_chat_id: string | null;
  is_active: boolean;
  sections: string[];
}

export default function ClientReportSchedule({ clientId, isAdmin }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weeklyChat, setWeeklyChat] = useState('');
  const [monthlyChat, setMonthlyChat] = useState('');
  const [weeklyActive, setWeeklyActive] = useState(false);
  const [monthlyActive, setMonthlyActive] = useState(false);
  const [testingSend, setTestingSend] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('client_report_schedules' as any)
      .select('*')
      .eq('client_id', clientId);
    
    const items = (data || []) as unknown as Schedule[];
    setSchedules(items);
    
    const weekly = items.find(s => s.report_type === 'weekly');
    const monthly = items.find(s => s.report_type === 'monthly');
    
    setWeeklyChat(weekly?.telegram_chat_id || '');
    setMonthlyChat(monthly?.telegram_chat_id || '');
    setWeeklyActive(weekly?.is_active || false);
    setMonthlyActive(monthly?.is_active || false);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const saveSchedule = async (type: 'weekly' | 'monthly') => {
    setSaving(true);
    const chatId = type === 'weekly' ? weeklyChat : monthlyChat;
    const active = type === 'weekly' ? weeklyActive : monthlyActive;
    
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('client_report_schedules' as any).upsert({
      client_id: clientId,
      report_type: type,
      telegram_chat_id: chatId || null,
      is_active: active,
      created_by: user?.id,
    }, { onConflict: 'client_id,report_type' });

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${type === 'weekly' ? 'Еженедельный' : 'Ежемесячный'} отчёт настроен`);
    load();
  };

  const testSend = async (type: 'weekly' | 'monthly') => {
    setTestingSend(type);
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-report', {
        body: { report_type: type, client_id: clientId },
      });
      if (error) throw error;
      if (data?.sent > 0) {
        toast.success('Тестовый отчёт отправлен в Telegram');
      } else {
        toast.error(data?.errors?.[0] || 'Не удалось отправить');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTestingSend(null);
    }
  };

  if (!isAdmin) return null;
  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          Автоотчёты в Telegram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weekly */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">Каждый ПН</Badge>
              <span className="text-sm font-medium">Еженедельный</span>
            </div>
            <Switch checked={weeklyActive} onCheckedChange={setWeeklyActive} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Telegram Chat ID</Label>
            <Input
              value={weeklyChat}
              onChange={e => setWeeklyChat(e.target.value)}
              placeholder="-1001234567890"
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              ID чата или группы. Используйте @userinfobot в Telegram для получения ID.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs flex-1" disabled={saving} onClick={() => saveSchedule('weekly')}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Сохранить
            </Button>
            <Button size="sm" variant="outline" className="text-xs gap-1" disabled={!!testingSend || !weeklyChat}
              onClick={() => testSend('weekly')}>
              {testingSend === 'weekly' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Тест
            </Button>
          </div>
        </div>

        {/* Monthly */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">1-е число</Badge>
              <span className="text-sm font-medium">Ежемесячный</span>
            </div>
            <Switch checked={monthlyActive} onCheckedChange={setMonthlyActive} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Telegram Chat ID</Label>
            <Input
              value={monthlyChat}
              onChange={e => setMonthlyChat(e.target.value)}
              placeholder="-1001234567890"
              className="text-xs font-mono"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs flex-1" disabled={saving} onClick={() => saveSchedule('monthly')}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Сохранить
            </Button>
            <Button size="sm" variant="outline" className="text-xs gap-1" disabled={!!testingSend || !monthlyChat}
              onClick={() => testSend('monthly')}>
              {testingSend === 'monthly' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Тест
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

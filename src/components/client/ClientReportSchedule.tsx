import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CalendarClock, Send, Loader2, Bot, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  isAdmin: boolean;
  onReportsChanged?: () => void;
}

interface Schedule {
  id: string;
  client_id: string;
  report_type: string;
  telegram_chat_id: string | null;
  telegram_bot_profile_id: string | null;
  is_active: boolean;
  sections: string[];
  created_by?: string | null;
}

interface BotProfile {
  id: string;
  bot_name: string;
  is_active: boolean;
  bot_token_ref: string | null;
}

export default function ClientReportSchedule({ clientId, isAdmin, onReportsChanged }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weeklyChat, setWeeklyChat] = useState('');
  const [monthlyChat, setMonthlyChat] = useState('');
  const [weeklyActive, setWeeklyActive] = useState(false);
  const [monthlyActive, setMonthlyActive] = useState(false);
  const [weeklyBotId, setWeeklyBotId] = useState('');
  const [monthlyBotId, setMonthlyBotId] = useState('');
  const [testingSend, setTestingSend] = useState<string | null>(null);

  // Add bot dialog
  const [addBotOpen, setAddBotOpen] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotToken, setNewBotToken] = useState('');
  const [savingBot, setSavingBot] = useState(false);

  const load = useCallback(async () => {
    const [schedRes, botRes] = await Promise.all([
      supabase.from('client_report_schedules' as any).select('*').eq('client_id', clientId),
      supabase.from('crm_bot_profiles').select('id, bot_name, is_active, bot_token_ref').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]);

    const items = (schedRes.data || []) as unknown as Schedule[];
    setSchedules(items);
    setBots(botRes.data || []);

    const weekly = items.find(s => s.report_type === 'weekly');
    const monthly = items.find(s => s.report_type === 'monthly');

    setWeeklyChat(weekly?.telegram_chat_id || '');
    setMonthlyChat(monthly?.telegram_chat_id || '');
    setWeeklyActive(weekly?.is_active || false);
    setMonthlyActive(monthly?.is_active || false);
    setWeeklyBotId(weekly?.telegram_bot_profile_id || '');
    setMonthlyBotId(monthly?.telegram_bot_profile_id || '');
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const saveSchedule = async (
    type: 'weekly' | 'monthly',
    overrides?: { chatId?: string; active?: boolean; botId?: string; silent?: boolean }
  ) => {
    const chatId = overrides?.chatId ?? (type === 'weekly' ? weeklyChat : monthlyChat);
    const active = overrides?.active ?? (type === 'weekly' ? weeklyActive : monthlyActive);
    const botId = overrides?.botId ?? (type === 'weekly' ? weeklyBotId : monthlyBotId);

    if (active && (!chatId || !botId)) {
      toast.error('Для активации укажите Telegram Chat ID и выберите бота');
      return false;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const existing = schedules.find(s => s.report_type === type);
    const payload: any = {
      client_id: clientId,
      report_type: type,
      telegram_chat_id: chatId || null,
      telegram_bot_profile_id: botId || null,
      is_active: active,
      created_by: existing?.created_by || user?.id,
    };

    let error;
    if (existing) {
      const res = await supabase.from('client_report_schedules' as any).update(payload).eq('id', existing.id);
      error = res.error;
    } else {
      const res = await supabase.from('client_report_schedules' as any).insert(payload);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }

    if (!overrides?.silent) {
      toast.success(`${type === 'weekly' ? 'Еженедельный' : 'Ежемесячный'} отчёт настроен`);
    }

    await load();
    return true;
  };

  const handleToggleSchedule = async (
    type: 'weekly' | 'monthly',
    nextValue: boolean,
    setActive: (v: boolean) => void,
    chatId: string,
    botId: string,
  ) => {
    if (nextValue && (!chatId || !botId)) {
      toast.error('Сначала выберите бота и укажите Telegram Chat ID');
      return;
    }

    setActive(nextValue);
    const ok = await saveSchedule(type, { active: nextValue, chatId, botId, silent: true });
    if (!ok) setActive(!nextValue);
  };

  const testSend = async (type: 'weekly' | 'monthly') => {
    const chatId = type === 'weekly' ? weeklyChat : monthlyChat;
    const botId = type === 'weekly' ? weeklyBotId : monthlyBotId;

    if (!chatId || !botId) {
      toast.error('Для теста выберите бота и укажите Telegram Chat ID');
      return;
    }

    setTestingSend(type);
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-report', {
        body: {
          report_type: type,
          client_id: clientId,
          test_mode: true,
          telegram_chat_id: chatId,
          telegram_bot_profile_id: botId,
        },
      });

      if (error) throw error;
      if (data?.sent > 0) {
        toast.success('Тестовый отчёт отправлен и сохранён в разделе отчётов');
        onReportsChanged?.();
      } else {
        toast.error(data?.errors?.[0] || data?.message || 'Не удалось отправить тестовый отчёт');
      }
    } catch (e: any) {
      toast.error(e.message || 'Не удалось отправить тестовый отчёт');
    } finally {
      setTestingSend(null);
    }
  };

  const handleAddBot = async () => {
    if (!newBotName.trim() || !newBotToken.trim()) return;
    setSavingBot(true);
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(newBotToken.trim())) {
      toast.error('Неверный формат токена. Формат: 123456:ABC-DEF...');
      setSavingBot(false);
      return;
    }
    const { data: vaultData, error: vaultErr } = await supabase.functions.invoke('store-bot-token', {
      body: { secret_name: `report_bot_${clientId}_${Date.now()}`, secret_value: newBotToken.trim() },
    });
    if (vaultErr || vaultData?.error) {
      toast.error(vaultData?.error || vaultErr?.message);
      setSavingBot(false);
      return;
    }
    const { error } = await supabase.from('crm_bot_profiles').insert({
      client_id: clientId, bot_name: newBotName.trim(), bot_token_ref: vaultData?.token_ref, is_active: true,
    });
    if (error) { toast.error(error.message); }
    else {
      toast.success(`Бот "${newBotName}" добавлен`);
      setNewBotName(''); setNewBotToken(''); setAddBotOpen(false);
      load();
    }
    setSavingBot(false);
  };

  const handleDeleteBot = async (bot: BotProfile) => {
    if (bot.bot_token_ref) await supabase.rpc('delete_social_token', { _token_reference: bot.bot_token_ref });
    await supabase.from('crm_bot_profiles').delete().eq('id', bot.id);
    toast.success('Бот удалён');
    load();
  };

  if (!isAdmin) return null;
  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const activeBotForWeekly = bots.find(b => b.id === weeklyBotId);
  const activeBotForMonthly = bots.find(b => b.id === monthlyBotId);

  const renderScheduleBlock = (
    type: 'weekly' | 'monthly',
    label: string,
    badge: string,
    chatId: string,
    setChatId: (v: string) => void,
    active: boolean,
    setActive: (v: boolean) => void,
    botId: string,
    setBotId: (v: string) => void,
  ) => (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{badge}</Badge>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <Switch
          checked={active}
          onCheckedChange={(checked) => void handleToggleSchedule(type, checked, setActive, chatId, botId)}
        />
      </div>

      {/* Bot selection */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Bot className="h-3 w-3" /> Telegram бот
        </Label>
        {bots.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Нет ботов. Добавьте бота для отправки отчётов.
          </div>
        ) : (
          <Select value={botId} onValueChange={setBotId}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Выберите бота" />
            </SelectTrigger>
            <SelectContent>
              {bots.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  <span className="flex items-center gap-1.5">
                    <Bot className="h-3 w-3" /> {b.bot_name}
                    {b.is_active && <Badge variant="outline" className="text-[8px] ml-1">active</Badge>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Chat ID */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Telegram Chat ID</Label>
        <Input
          value={chatId}
          onChange={e => setChatId(e.target.value)}
          placeholder="-1001234567890"
          className="text-xs font-mono"
        />
        <p className="text-[10px] text-muted-foreground">
          ID чата или группы. Используйте @userinfobot в Telegram для получения ID.
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="text-xs flex-1" disabled={saving} onClick={() => saveSchedule(type)}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Сохранить
        </Button>
        <Button size="sm" variant="outline" className="text-xs gap-1" disabled={!!testingSend || !chatId || !botId}
          onClick={() => testSend(type)}>
          {testingSend === type ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Тест
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Автоотчёты в Telegram
            </CardTitle>
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setAddBotOpen(true)}>
              <Plus className="h-3 w-3" /> Добавить бота
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected bots summary */}
          {bots.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Подключенные боты ({bots.length})</Label>
              <div className="flex flex-wrap gap-2">
                {bots.map(b => (
                  <div key={b.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50 text-xs">
                    <Bot className="h-3 w-3 text-primary" />
                    <span>{b.bot_name}</span>
                    {b.is_active && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive/60 hover:text-destructive"
                      onClick={() => handleDeleteBot(b)}>
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {renderScheduleBlock('weekly', 'Еженедельный', 'Каждый ПН', weeklyChat, setWeeklyChat, weeklyActive, setWeeklyActive, weeklyBotId, setWeeklyBotId)}
          {renderScheduleBlock('monthly', 'Ежемесячный', '1-е число', monthlyChat, setMonthlyChat, monthlyActive, setMonthlyActive, monthlyBotId, setMonthlyBotId)}
        </CardContent>
      </Card>

      {/* Add bot dialog */}
      <Dialog open={addBotOpen} onOpenChange={setAddBotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" /> Добавить Telegram бота
            </DialogTitle>
            <DialogDescription>
              Создайте бота через @BotFather в Telegram и вставьте токен сюда.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Имя бота</Label>
              <Input value={newBotName} onChange={e => setNewBotName(e.target.value)} placeholder="Report Bot" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Bot Token</Label>
              <Input value={newBotToken} onChange={e => setNewBotToken(e.target.value)} placeholder="123456789:ABCdefGHI..." type="password" className="font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBotOpen(false)}>Отмена</Button>
            <Button onClick={handleAddBot} disabled={savingBot || !newBotName.trim() || !newBotToken.trim()}>
              {savingBot && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

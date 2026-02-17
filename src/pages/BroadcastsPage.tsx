import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Megaphone, Send, Loader2, Users, Bell, Mail, MessageCircle, History,
  Clock, CheckCircle2, User,
} from 'lucide-react';

type RecipientsFilter = 'all' | 'team' | 'clients';

const CHANNELS = [
  { id: 'in_app', label: 'In-App', icon: Bell },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'telegram', label: 'Telegram', icon: MessageCircle },
] as const;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

interface BroadcastRecord {
  id: string;
  subject: string;
  body: string;
  channels: string[];
  recipients_filter: string;
  created_at: string;
  sent_at: string | null;
  created_by: string;
  sender_name?: string;
}

export default function BroadcastsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  // Send form
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientsFilter, setRecipientsFilter] = useState<RecipientsFilter>('team');
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [sending, setSending] = useState(false);

  // History
  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Stats
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, lastWeek: 0 });

  const toggleChannel = (ch: string) => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('notification_broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const userIds = [...new Set(data.map(d => d.created_by))];
      const { data: users } = await supabase
        .from('agency_users')
        .select('user_id, display_name')
        .in('user_id', userIds);
      const nameMap = new Map(users?.map(u => [u.user_id, u.display_name || 'Admin']) || []);

      setHistory(data.map(d => ({
        ...d,
        sender_name: nameMap.get(d.created_by) || 'Admin',
      })));

      // Stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStats({
        total: data.length,
        thisMonth: data.filter(d => new Date(d.created_at) >= monthStart).length,
        lastWeek: data.filter(d => new Date(d.created_at) >= weekAgo).length,
      });
    }
    setLoadingHistory(false);
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || channels.length === 0) {
      toast.error(t('broadcast.fillAll'));
      return;
    }
    if (!user) return;

    setSending(true);
    try {
      let userIds: string[] = [];

      if (recipientsFilter === 'all' || recipientsFilter === 'team') {
        const { data: agencyUsers } = await supabase
          .from('agency_users')
          .select('user_id')
          .in('agency_role', recipientsFilter === 'team' ? ['AgencyAdmin', 'MediaBuyer'] : ['AgencyAdmin', 'MediaBuyer', 'Client']);
        if (agencyUsers) userIds.push(...agencyUsers.map(u => u.user_id));
      }

      if (recipientsFilter === 'clients' || recipientsFilter === 'all') {
        const { data: clientUsers } = await supabase
          .from('agency_users')
          .select('user_id')
          .eq('agency_role', 'Client');
        if (clientUsers) {
          const clientIds = clientUsers.map(u => u.user_id);
          userIds.push(...clientIds.filter(id => !userIds.includes(id)));
        }
      }

      // Include the sender too for broadcast
      userIds = [...new Set(userIds)];

      if (userIds.length === 0) {
        toast.error(t('broadcast.noRecipients'));
        setSending(false);
        return;
      }

      await supabase.from('notification_broadcasts').insert({
        created_by: user.id,
        subject,
        body,
        channels,
        recipients_filter: recipientsFilter,
        sent_at: new Date().toISOString(),
      });

      const { data: session } = await supabase.auth.getSession();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            user_ids: userIds,
            type: 'alert',
            title: subject,
            message: body,
            force_channels: channels,
          }),
        }
      );

      toast.success(`${t('broadcast.sent')} ${userIds.length} ${t('broadcast.recipients').toLowerCase()}`);
      setSubject('');
      setBody('');
      fetchHistory();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSending(false);
  };

  const recipientLabel = (filter: string) => {
    switch (filter) {
      case 'team': return t('broadcast.team');
      case 'clients': return t('broadcast.clients');
      case 'all': return t('broadcast.everyone');
      default: return filter;
    }
  };

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            {t('broadcast.title')}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">{t('broadcast.subtitle')}</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-3 gap-3">
        {[
          { label: t('broadcast.totalSent'), value: stats.total, icon: Send },
          { label: t('broadcast.thisMonth'), value: stats.thisMonth, icon: Clock },
          { label: t('broadcast.lastWeek'), value: stats.lastWeek, icon: CheckCircle2 },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs defaultValue="compose">
          <TabsList className="mb-4">
            <TabsTrigger value="compose" className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {t('broadcast.compose')}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              {t('broadcast.history')}
            </TabsTrigger>
          </TabsList>

          {/* Compose */}
          <TabsContent value="compose">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">{t('broadcast.newBroadcast')}</CardTitle>
                <CardDescription>{t('broadcast.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Recipients */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {t('broadcast.recipients')}
                  </Label>
                  <Select value={recipientsFilter} onValueChange={(v) => setRecipientsFilter(v as RecipientsFilter)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">{t('broadcast.team')}</SelectItem>
                      <SelectItem value="clients">{t('broadcast.clients')}</SelectItem>
                      <SelectItem value="all">{t('broadcast.everyone')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Channels */}
                <div className="space-y-2">
                  <Label>{t('broadcast.channels')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {CHANNELS.map(ch => {
                      const Icon = ch.icon;
                      const selected = channels.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          onClick={() => toggleChannel(ch.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            selected
                              ? 'bg-primary/15 border-primary/40 text-primary'
                              : 'bg-muted/30 border-border/50 text-muted-foreground hover:border-border'
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          {ch.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label>{t('broadcast.subject')}</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('broadcast.subjectPlaceholder')} />
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <Label>{t('broadcast.message')}</Label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('broadcast.messagePlaceholder')} rows={5} />
                </div>

                {/* Preview */}
                {subject && (
                  <>
                    <Separator />
                    <div className="bg-muted/20 rounded-lg p-4 border border-border/30 space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('broadcast.preview')}</p>
                      <p className="text-sm font-semibold text-foreground">{subject}</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{body}</p>
                      <div className="flex gap-1.5 pt-1">
                        {channels.map(ch => (
                          <Badge key={ch} variant="outline" className="text-[9px]">{ch}</Badge>
                        ))}
                        <Badge variant="secondary" className="text-[9px]">→ {recipientLabel(recipientsFilter)}</Badge>
                      </div>
                    </div>
                  </>
                )}

                <Button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim() || channels.length === 0} className="w-full gap-2" size="lg">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t('broadcast.send')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  {t('broadcast.history')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {t('broadcast.noHistory')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((record) => (
                      <div key={record.id} className="border border-border/40 rounded-lg p-4 bg-secondary/10 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-foreground truncate">{record.subject}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{record.body}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge variant="outline" className="text-[9px]">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1 text-success" />
                              {t('broadcast.sentLabel')}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{timeAgo(record.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="h-3 w-3" />
                            {record.sender_name}
                          </div>
                          <Badge variant="secondary" className="text-[9px]">
                            → {recipientLabel(record.recipients_filter)}
                          </Badge>
                          {record.channels.map(ch => (
                            <Badge key={ch} variant="outline" className="text-[9px]">{ch}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

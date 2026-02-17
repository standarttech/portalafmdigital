import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Megaphone, Send, Loader2, Users, Bell, Mail, MessageCircle } from 'lucide-react';

type RecipientsFilter = 'all' | 'team' | 'clients';

const CHANNELS = [
  { id: 'in_app', label: 'In-App', icon: Bell },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'telegram', label: 'Telegram', icon: MessageCircle },
] as const;

export default function BroadcastPanel() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientsFilter, setRecipientsFilter] = useState<RecipientsFilter>('team');
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [sending, setSending] = useState(false);

  const toggleChannel = (ch: string) => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || channels.length === 0) {
      toast.error(t('broadcast.fillAll'));
      return;
    }
    if (!user) return;

    setSending(true);
    try {
      // Determine recipients
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

      // Remove self
      userIds = userIds.filter(id => id !== user.id);

      if (userIds.length === 0) {
        toast.error(t('broadcast.noRecipients'));
        setSending(false);
        return;
      }

      // Save broadcast record
      await supabase.from('notification_broadcasts').insert({
        created_by: user.id,
        subject,
        body,
        channels,
        recipients_filter: recipientsFilter,
        sent_at: new Date().toISOString(),
      });

      // Send via dispatcher
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
          }),
        }
      );

      toast.success(t('broadcast.sent') + ` (${userIds.length})`);
      setSubject('');
      setBody('');
    } catch (e: any) {
      toast.error(e.message);
    }
    setSending(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('broadcast.title')}</CardTitle>
        </div>
        <CardDescription>{t('broadcast.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipients */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {t('broadcast.recipients')}
          </Label>
          <Select value={recipientsFilter} onValueChange={(v) => setRecipientsFilter(v as RecipientsFilter)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('broadcast.subjectPlaceholder')}
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label>{t('broadcast.message')}</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('broadcast.messagePlaceholder')}
            rows={4}
          />
        </div>

        {/* Preview */}
        {subject && (
          <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t('broadcast.preview')}</p>
            <p className="text-sm font-medium text-foreground">{subject}</p>
            <p className="text-xs text-muted-foreground mt-1">{body}</p>
            <div className="flex gap-1 mt-2">
              {channels.map(ch => (
                <Badge key={ch} variant="outline" className="text-[9px]">{ch}</Badge>
              ))}
              <Badge variant="outline" className="text-[9px]">→ {recipientsFilter}</Badge>
            </div>
          </div>
        )}

        <Button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim() || channels.length === 0} className="w-full gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t('broadcast.send')}
        </Button>
      </CardContent>
    </Card>
  );
}

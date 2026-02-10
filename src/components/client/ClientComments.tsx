import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TranslationKey } from '@/i18n/translations';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name?: string;
}

interface Props {
  clientId: string;
}

export default function ClientComments({ clientId }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('client_comments')
      .select('id, user_id, content, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      // Fetch display names for comment authors
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: users } = await supabase
        .from('agency_users')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const nameMap = new Map(users?.map(u => [u.user_id, u.display_name]) || []);
      setComments(data.map(c => ({ ...c, display_name: nameMap.get(c.user_id) || 'User' })));
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSend = async () => {
    if (!newComment.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from('client_comments').insert({
      client_id: clientId,
      user_id: user.id,
      content: newComment.trim(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setNewComment('');
    fetchComments();
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from('client_comments').delete().eq('id', commentId);
    fetchComments();
  };

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          {t('comments.title' as TranslationKey)}
          {comments.length > 0 && <span className="text-xs text-muted-foreground">({comments.length})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('comments.placeholder' as TranslationKey)}
            className="text-sm"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <Button size="sm" onClick={handleSend} disabled={sending || !newComment.trim()} className="flex-shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {/* Comments list */}
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : comments.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">{t('comments.noComments' as TranslationKey)}</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2 group">
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">
                  {(c.display_name || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{c.display_name}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.content}</p>
                </div>
                {c.user_id === user?.id && (
                  <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Trash2 className="h-3.5 w-3.5 text-destructive/60 hover:text-destructive" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

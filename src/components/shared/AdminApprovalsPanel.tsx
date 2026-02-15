import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Approval {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  payload: any;
  requested_by: string;
  status: string;
  created_at: string;
  requester_name?: string;
}

const actionLabels: Record<string, { ru: string; en: string }> = {
  delete_client: { ru: 'Удаление клиента', en: 'Delete client' },
  delete_user: { ru: 'Удаление пользователя', en: 'Delete user' },
  change_role: { ru: 'Изменение роли', en: 'Role change' },
};

const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  pending: { color: 'bg-warning/15 text-warning border-warning/20', icon: Clock },
  approved: { color: 'bg-success/15 text-success border-success/20', icon: CheckCircle2 },
  rejected: { color: 'bg-destructive/15 text-destructive border-destructive/20', icon: XCircle },
};

export default function AdminApprovalsPanel() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    const { data } = await supabase
      .from('admin_approvals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const userIds = [...new Set(data.map(a => (a as any).requested_by))];
      const { data: users } = await supabase.from('agency_users').select('user_id, display_name').in('user_id', userIds);
      const nameMap = new Map(users?.map(u => [u.user_id, u.display_name || 'Admin']) || []);

      setApprovals(data.map(a => ({
        ...a as any,
        requester_name: nameMap.get((a as any).requested_by) || 'Admin',
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleApprove = async (approval: Approval) => {
    if (approval.requested_by === user?.id) {
      toast.error('Нельзя подтвердить свой запрос');
      return;
    }
    setProcessing(approval.id);

    // Execute the action
    try {
      if (approval.action_type === 'delete_client') {
        await supabase.from('clients').delete().eq('id', approval.entity_id);
      } else if (approval.action_type === 'delete_user') {
        await Promise.all([
          supabase.from('agency_users').delete().eq('user_id', approval.entity_id),
          supabase.from('user_permissions').delete().eq('user_id', approval.entity_id),
          supabase.from('client_users').delete().eq('user_id', approval.entity_id),
          supabase.from('user_settings').delete().eq('user_id', approval.entity_id),
        ]);
      } else if (approval.action_type === 'change_role' && approval.payload?.new_role) {
        await supabase.from('agency_users').update({ agency_role: approval.payload.new_role as any }).eq('user_id', approval.entity_id);
      }

      await supabase.from('admin_approvals').update({
        status: 'approved',
        approved_by: user?.id,
        resolved_at: new Date().toISOString(),
      } as any).eq('id', approval.id);

      toast.success('Действие подтверждено и выполнено');
    } catch (err: any) {
      toast.error(err.message);
    }
    setProcessing(null);
    fetchApprovals();
  };

  const handleReject = async (approvalId: string) => {
    setProcessing(approvalId);
    await supabase.from('admin_approvals').update({
      status: 'rejected',
      approved_by: user?.id,
      resolved_at: new Date().toISOString(),
    } as any).eq('id', approvalId);
    toast.success('Запрос отклонён');
    setProcessing(null);
    fetchApprovals();
  };

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Запросы на подтверждение
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5">{pendingCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : approvals.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Нет запросов</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {approvals.map(a => {
              const config = statusConfig[a.status] || statusConfig.pending;
              const Icon = config.icon;
              const label = actionLabels[a.action_type] || { ru: a.action_type, en: a.action_type };
              const isMine = a.requested_by === user?.id;

              return (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-secondary/20">
                  <Icon className={cn('h-4 w-4 flex-shrink-0', a.status === 'pending' ? 'text-warning' : a.status === 'approved' ? 'text-success' : 'text-destructive')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium">{label.ru}</span>
                      {a.entity_name && <span className="text-xs text-foreground">"{a.entity_name}"</span>}
                      <Badge variant="outline" className={cn('text-[9px]', config.color)}>{a.status}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">от {a.requester_name}</span>
                      <span className="text-[10px] text-muted-foreground/50">{timeAgo(a.created_at)}</span>
                      {a.action_type === 'change_role' && a.payload && (
                        <span className="text-[10px] text-muted-foreground">
                          {a.payload.old_role} → {a.payload.new_role}
                        </span>
                      )}
                    </div>
                  </div>
                  {a.status === 'pending' && !isMine && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm" variant="outline"
                        className="h-7 px-2 text-[10px] text-success border-success/30 hover:bg-success/10"
                        onClick={() => handleApprove(a)}
                        disabled={processing === a.id}
                      >
                        {processing === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Одобрить
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="h-7 px-2 text-[10px] text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => handleReject(a.id)}
                        disabled={processing === a.id}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Отклонить
                      </Button>
                    </div>
                  )}
                  {a.status === 'pending' && isMine && (
                    <span className="text-[10px] text-muted-foreground italic flex-shrink-0">Ожидает другого админа</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

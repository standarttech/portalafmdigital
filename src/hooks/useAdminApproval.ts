import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ApprovalRequest {
  action_type: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  payload?: Record<string, any>;
}

export function useAdminApproval() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const requestApproval = async (req: ApprovalRequest): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);

    // Check if current user has bypass_dual_approval flag
    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('bypass_dual_approval')
      .eq('user_id', user.id)
      .maybeSingle();

    if ((settingsData as any)?.bypass_dual_approval) {
      setLoading(false);
      return true;
    }

    // Check how many admins exist
    const { count } = await supabase
      .from('agency_users')
      .select('id', { count: 'exact', head: true })
      .eq('agency_role', 'AgencyAdmin');

    // If only 1 admin, allow directly (no second admin to approve)
    if ((count || 0) <= 1) {
      setLoading(false);
      return true;
    }

    // Create approval request
    const { error } = await supabase.from('admin_approvals').insert({
      action_type: req.action_type,
      entity_type: req.entity_type,
      entity_id: req.entity_id,
      entity_name: req.entity_name || null,
      payload: req.payload || {},
      requested_by: user.id,
    } as any);

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return false;
    }

    toast.info('Запрос на подтверждение отправлен другим администраторам');
    return false; // Action not executed yet, pending approval
  };

  const approveRequest = async (approvalId: string, onExecute: (payload: any) => Promise<void>) => {
    if (!user) return;
    setLoading(true);

    const { data: approval } = await supabase
      .from('admin_approvals')
      .select('*')
      .eq('id', approvalId)
      .single();

    if (!approval || (approval as any).status !== 'pending') {
      toast.error('Запрос уже обработан');
      setLoading(false);
      return;
    }

    if ((approval as any).requested_by === user.id) {
      toast.error('Нельзя подтвердить свой собственный запрос');
      setLoading(false);
      return;
    }

    // Execute the action
    await onExecute((approval as any).payload);

    // Mark as approved
    await supabase.from('admin_approvals').update({
      status: 'approved',
      approved_by: user.id,
      resolved_at: new Date().toISOString(),
    } as any).eq('id', approvalId);

    toast.success('Действие подтверждено и выполнено');
    setLoading(false);
  };

  const rejectRequest = async (approvalId: string) => {
    await supabase.from('admin_approvals').update({
      status: 'rejected',
      approved_by: user?.id,
      resolved_at: new Date().toISOString(),
    } as any).eq('id', approvalId);
    toast.success('Запрос отклонён');
  };

  return { requestApproval, approveRequest, rejectRequest, loading };
}
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface CrmPipeline {
  id: string;
  client_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface CrmStage {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  color: string;
  is_closed_stage: boolean;
  is_won_stage: boolean;
  is_lost_stage: boolean;
  is_qualified_stage: boolean;
  is_booked_stage: boolean;
}

export interface CrmLead {
  id: string;
  client_id: string;
  pipeline_id: string;
  stage_id: string;
  assignee_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  priority: string;
  value: number;
  tags: string[];
  notes_summary: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  campaign_name: string | null;
  adset_name: string | null;
  ad_name: string | null;
  form_name: string | null;
  landing_page: string | null;
  external_lead_id: string | null;
  fbclid: string | null;
  fbc: string | null;
  fbp: string | null;
  fb_lead_id: string | null;
  fb_ad_id: string | null;
  fb_adset_id: string | null;
  fb_campaign_id: string | null;
  raw_payload: any;
  is_duplicate: boolean;
  duplicate_of: string | null;
  won_at: string | null;
  lost_at: string | null;
  won_reason: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmLeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  note: string;
  created_at: string;
}

export interface CrmLeadActivity {
  id: string;
  lead_id: string;
  user_id: string | null;
  type: string;
  payload: any;
  created_at: string;
}

export interface CrmWebhookEndpoint {
  id: string;
  client_id: string;
  pipeline_id: string;
  name: string;
  secret_key: string;
  endpoint_slug: string;
  default_stage_id: string | null;
  source_label: string;
  is_active: boolean;
  field_mapping: any;
  created_at: string;
}

export interface CrmWebhookLog {
  id: string;
  endpoint_id: string;
  status: string;
  request_payload: any;
  response_message: string | null;
  created_at: string;
}

export function useCrmPipelines(clientId: string | null) {
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!clientId) { setPipelines([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_pipelines')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at');
    if (!error && data) setPipelines(data as any);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createPipeline = async (name: string) => {
    if (!clientId) return null;
    const isFirst = pipelines.length === 0;
    const { data, error } = await supabase
      .from('crm_pipelines')
      .insert({ client_id: clientId, name, is_default: isFirst })
      .select()
      .single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    
    // Create default stages
    if (data) {
      const defaultStages = [
        { name: 'New Lead', position: 0, color: '#6366f1' },
        { name: 'Contacted', position: 1, color: '#3b82f6' },
        { name: 'Qualified', position: 2, color: '#8b5cf6' },
        { name: 'Booked', position: 3, color: '#06b6d4' },
        { name: 'No Show', position: 4, color: '#f59e0b' },
        { name: 'Follow Up', position: 5, color: '#f97316' },
        { name: 'Won', position: 6, color: '#22c55e', is_won_stage: true, is_closed_stage: true },
        { name: 'Lost', position: 7, color: '#ef4444', is_lost_stage: true, is_closed_stage: true },
      ];
      await supabase.from('crm_pipeline_stages').insert(
        defaultStages.map(s => ({ ...s, pipeline_id: (data as any).id }))
      );
    }
    await fetch();
    return data as any as CrmPipeline;
  };

  return { pipelines, loading, refetch: fetch, createPipeline };
}

export function useCrmStages(pipelineId: string | null) {
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!pipelineId) { setStages([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position');
    if (!error && data) setStages(data as any);
    setLoading(false);
  }, [pipelineId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createStage = async (name: string, color: string) => {
    if (!pipelineId) return;
    const maxPos = stages.length > 0 ? Math.max(...stages.map(s => s.position)) + 1 : 0;
    const { error } = await supabase.from('crm_pipeline_stages').insert({
      pipeline_id: pipelineId, name, color, position: maxPos,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await fetch();
  };

  const updateStage = async (id: string, updates: Partial<CrmStage>) => {
    const { error } = await supabase.from('crm_pipeline_stages').update(updates as any).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await fetch();
  };

  const deleteStage = async (id: string) => {
    const { error } = await supabase.from('crm_pipeline_stages').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await fetch();
  };

  const reorderStages = async (reordered: CrmStage[]) => {
    setStages(reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('crm_pipeline_stages').update({ position: i } as any).eq('id', reordered[i].id);
    }
  };

  return { stages, loading, refetch: fetch, createStage, updateStage, deleteStage, reorderStages };
}

export function useCrmLeads(pipelineId: string | null, clientId: string | null) {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetch = useCallback(async () => {
    if (!pipelineId || !clientId) { setLeads([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (!error && data) setLeads(data as any);
    setLoading(false);
  }, [pipelineId, clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createLead = async (lead: Partial<CrmLead>) => {
    if (!pipelineId || !clientId) return null;
    const { data, error } = await supabase
      .from('crm_leads')
      .insert({ ...lead, pipeline_id: pipelineId, client_id: clientId } as any)
      .select()
      .single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    // Log activity
    if (data) {
      await supabase.from('crm_lead_activities').insert({
        lead_id: (data as any).id, user_id: user?.id, type: 'created',
        payload: { message: 'Lead created' },
      } as any);
    }
    await fetch();
    return data as any as CrmLead;
  };

  const updateLead = async (id: string, updates: Partial<CrmLead>) => {
    const { error } = await supabase.from('crm_leads').update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    await fetch();
    return true;
  };

  const moveLeadToStage = async (leadId: string, newStageId: string, oldStageId: string) => {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: newStageId } : l));
    
    const { error } = await supabase.from('crm_leads')
      .update({ stage_id: newStageId, updated_at: new Date().toISOString() } as any)
      .eq('id', leadId);
    
    if (error) {
      // Revert
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: oldStageId } : l));
      toast({ title: 'Error moving lead', description: error.message, variant: 'destructive' });
      return false;
    }
    
    // Log activity
    await supabase.from('crm_lead_activities').insert({
      lead_id: leadId, user_id: user?.id, type: 'stage_changed',
      payload: { old_stage_id: oldStageId, new_stage_id: newStageId },
    } as any);
    
    return true;
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from('crm_leads').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await fetch();
  };

  return { leads, loading, refetch: fetch, createLead, updateLead, moveLeadToStage, deleteLead };
}

export function useCrmLeadNotes(leadId: string | null) {
  const [notes, setNotes] = useState<CrmLeadNote[]>([]);
  const { user } = useAuth();

  const fetch = useCallback(async () => {
    if (!leadId) { setNotes([]); return; }
    const { data } = await supabase
      .from('crm_lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (data) setNotes(data as any);
  }, [leadId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addNote = async (note: string) => {
    if (!leadId || !user) return;
    const { error } = await supabase.from('crm_lead_notes').insert({
      lead_id: leadId, author_id: user.id, note,
    } as any);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      await supabase.from('crm_lead_activities').insert({
        lead_id: leadId, user_id: user.id, type: 'note_added',
        payload: { note: note.substring(0, 100) },
      } as any);
      await fetch();
    }
  };

  return { notes, refetch: fetch, addNote };
}

export function useCrmLeadActivities(leadId: string | null) {
  const [activities, setActivities] = useState<CrmLeadActivity[]>([]);

  const fetch = useCallback(async () => {
    if (!leadId) { setActivities([]); return; }
    const { data } = await supabase
      .from('crm_lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (data) setActivities(data as any);
  }, [leadId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { activities, refetch: fetch };
}

export function useCrmWebhookEndpoints(clientId: string | null) {
  const [endpoints, setEndpoints] = useState<CrmWebhookEndpoint[]>([]);

  const fetch = useCallback(async () => {
    if (!clientId) { setEndpoints([]); return; }
    const { data } = await supabase
      .from('crm_webhook_endpoints')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at');
    if (data) setEndpoints(data as any);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createEndpoint = async (ep: Partial<CrmWebhookEndpoint>) => {
    if (!clientId) return;
    const { error } = await supabase.from('crm_webhook_endpoints').insert({
      ...ep, client_id: clientId,
    } as any);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await fetch();
  };

  const updateEndpoint = async (id: string, updates: Partial<CrmWebhookEndpoint>) => {
    const { error } = await supabase.from('crm_webhook_endpoints').update(updates as any).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await fetch();
  };

  return { endpoints, refetch: fetch, createEndpoint, updateEndpoint };
}

export function useCrmWebhookLogs(endpointId: string | null) {
  const [logs, setLogs] = useState<CrmWebhookLog[]>([]);

  const fetch = useCallback(async () => {
    if (!endpointId) { setLogs([]); return; }
    const { data } = await supabase
      .from('crm_webhook_logs')
      .select('*')
      .eq('endpoint_id', endpointId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setLogs(data as any);
  }, [endpointId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { logs, refetch: fetch };
}

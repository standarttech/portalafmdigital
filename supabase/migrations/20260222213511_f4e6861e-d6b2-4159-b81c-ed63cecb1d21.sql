
-- Create webhooks table for client integrations
CREATE TABLE public.client_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  headers JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_triggered_at TIMESTAMPTZ,
  last_status_code INT,
  failure_count INT NOT NULL DEFAULT 0
);

-- Webhook delivery log
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.client_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  response_status INT,
  response_body TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_client_webhooks_client ON public.client_webhooks(client_id);
CREATE INDEX idx_webhook_logs_webhook ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created ON public.webhook_logs(created_at DESC);

-- RLS
ALTER TABLE public.client_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policies for client_webhooks
CREATE POLICY "Agency admins can manage all webhooks"
  ON public.client_webhooks FOR ALL
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Agency members can view webhooks for their clients"
  ON public.client_webhooks FOR SELECT
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Agency members can manage webhooks for their clients"
  ON public.client_webhooks FOR INSERT
  WITH CHECK (public.is_agency_member(auth.uid()) AND public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Agency members can update webhooks for their clients"
  ON public.client_webhooks FOR UPDATE
  USING (public.is_agency_member(auth.uid()) AND public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Agency members can delete webhooks for their clients"
  ON public.client_webhooks FOR DELETE
  USING (public.is_agency_member(auth.uid()) AND public.has_client_access(auth.uid(), client_id));

-- Policies for webhook_logs
CREATE POLICY "Agency admins can view all webhook logs"
  ON public.webhook_logs FOR ALL
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Agency members can view logs for their webhooks"
  ON public.webhook_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.client_webhooks w
    WHERE w.id = webhook_id AND public.has_client_access(auth.uid(), w.client_id)
  ));

-- Trigger for updated_at
CREATE TRIGGER update_client_webhooks_updated_at
  BEFORE UPDATE ON public.client_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

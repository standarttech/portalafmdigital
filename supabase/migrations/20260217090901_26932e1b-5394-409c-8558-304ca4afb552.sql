
-- Table: notification_preferences
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  telegram_enabled BOOLEAN NOT NULL DEFAULT false,
  telegram_chat_id TEXT,
  telegram_link_code TEXT,
  webpush_enabled BOOLEAN NOT NULL DEFAULT false,
  webpush_subscription JSONB,
  alert_channels TEXT[] NOT NULL DEFAULT '{in_app,email}',
  task_channels TEXT[] NOT NULL DEFAULT '{in_app}',
  chat_channels TEXT[] NOT NULL DEFAULT '{in_app}',
  report_channels TEXT[] NOT NULL DEFAULT '{email}',
  approval_channels TEXT[] NOT NULL DEFAULT '{in_app,email}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (is_agency_admin(auth.uid()));

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: notification_broadcasts
CREATE TABLE public.notification_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{email}',
  recipients_filter TEXT NOT NULL DEFAULT 'all',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage broadcasts"
  ON public.notification_broadcasts FOR ALL
  USING (is_agency_admin(auth.uid()));

-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- 1. client_portal_files table
CREATE TABLE public.client_portal_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT 'document',
  storage_path text,
  external_url text,
  description text DEFAULT '',
  uploaded_by uuid,
  is_visible_in_portal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portal_files ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "admin_full_access_portal_files" ON public.client_portal_files
  FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));

-- Portal users can only SELECT visible files for their client
CREATE POLICY "portal_user_read_own_files" ON public.client_portal_files
  FOR SELECT TO authenticated
  USING (
    is_visible_in_portal = true
    AND EXISTS (
      SELECT 1 FROM public.client_portal_users
      WHERE user_id = auth.uid() AND client_id = client_portal_files.client_id AND status = 'active'
    )
  );

-- 2. portal_notifications table
CREATE TABLE public.portal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  portal_user_id uuid REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_full_portal_notifications" ON public.portal_notifications
  FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));

-- Portal user reads own notifications
CREATE POLICY "portal_user_read_notifications" ON public.portal_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_users
      WHERE user_id = auth.uid() AND client_id = portal_notifications.client_id AND status = 'active'
    )
  );

-- Portal user can update (mark as read) own notifications
CREATE POLICY "portal_user_update_notifications" ON public.portal_notifications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_users
      WHERE user_id = auth.uid() AND client_id = portal_notifications.client_id AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_portal_users
      WHERE user_id = auth.uid() AND client_id = portal_notifications.client_id AND status = 'active'
    )
  );

-- Create storage bucket for portal files
INSERT INTO storage.buckets (id, name, public) VALUES ('portal-files', 'portal-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: agency members can upload
CREATE POLICY "agency_upload_portal_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portal-files' AND public.is_agency_member(auth.uid()));

-- Storage RLS: agency members can read all
CREATE POLICY "agency_read_portal_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'portal-files' AND public.is_agency_member(auth.uid()));

-- Storage RLS: portal users can read files in their client folder
CREATE POLICY "portal_user_read_portal_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'portal-files'
    AND EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.user_id = auth.uid() AND cpu.status = 'active'
        AND (storage.foldername(name))[1] = cpu.client_id::text
    )
  );

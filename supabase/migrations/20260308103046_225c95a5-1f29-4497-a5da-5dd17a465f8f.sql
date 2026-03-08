
-- Allow Client role users to update their own client_info
CREATE POLICY "Client users can update own client_info" ON public.client_info
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      JOIN public.agency_users au ON au.user_id = cu.user_id
      WHERE cu.client_id = client_info.client_id
        AND cu.user_id = auth.uid()
        AND au.agency_role = 'Client'
    )
  );

-- Allow Client role users to view their own client_info
CREATE POLICY "Client users can view own client_info" ON public.client_info
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = client_info.client_id
        AND cu.user_id = auth.uid()
    )
  );

-- Allow Client users to insert client_info for their clients (if not exists yet)
CREATE POLICY "Client users can insert own client_info" ON public.client_info
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      JOIN public.agency_users au ON au.user_id = cu.user_id
      WHERE cu.client_id = client_info.client_id
        AND cu.user_id = auth.uid()
        AND au.agency_role = 'Client'
    )
  );

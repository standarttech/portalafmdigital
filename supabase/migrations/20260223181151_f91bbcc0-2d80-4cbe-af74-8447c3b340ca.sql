
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Agency members view leads" ON public.afm_sales_leads;

-- Create a tighter SELECT policy: admins, sales/account managers, or lead creator
CREATE POLICY "Sales team and creators view leads"
  ON public.afm_sales_leads FOR SELECT
  USING (
    is_agency_admin(auth.uid())
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agency_users
      WHERE user_id = auth.uid()
        AND agency_role IN ('SalesManager', 'AccountManager', 'Manager')
    )
  );

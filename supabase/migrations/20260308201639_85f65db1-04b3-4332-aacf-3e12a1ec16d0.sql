-- Fix: Allow draft creators to delete their own draft items (not just admins)
DROP POLICY IF EXISTS "Delete draft items" ON public.campaign_draft_items;
CREATE POLICY "Delete draft items" ON public.campaign_draft_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campaign_drafts d
    WHERE d.id = campaign_draft_items.draft_id
      AND (is_agency_admin(auth.uid()) OR d.created_by = auth.uid())
  ));
-- Allow proposers to cancel their own proposed actions
CREATE POLICY "Proposers can cancel own proposed actions"
ON public.optimization_actions
FOR UPDATE
TO authenticated
USING (proposed_by = auth.uid() AND status = 'proposed')
WITH CHECK (proposed_by = auth.uid() AND status = 'cancelled');
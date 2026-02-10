
-- Fix overly permissive notification INSERT policy
DROP POLICY "System can create notifications" ON public.notifications;

-- Replace with a proper policy - agency members can create notifications
CREATE POLICY "Agency members can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (is_agency_member(auth.uid()));

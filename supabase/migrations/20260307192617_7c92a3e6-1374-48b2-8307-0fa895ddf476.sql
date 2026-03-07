
CREATE TABLE public.contact_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT DEFAULT '',
  website TEXT DEFAULT '',
  budget TEXT DEFAULT '',
  message TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit
CREATE POLICY "Anyone can insert contact requests"
ON public.contact_requests FOR INSERT
WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can view contact requests"
ON public.contact_requests FOR SELECT
USING (is_agency_admin(auth.uid()));

-- Admins can delete
CREATE POLICY "Admins can delete contact requests"
ON public.contact_requests FOR DELETE
USING (is_agency_admin(auth.uid()));

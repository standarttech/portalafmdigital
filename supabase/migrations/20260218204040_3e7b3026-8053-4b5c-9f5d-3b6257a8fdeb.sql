
-- Finance planning data persistence
CREATE TABLE IF NOT EXISTS public.afm_finance_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tab_key text NOT NULL, -- 'income_plan' | 'financial_planning'
  section text NOT NULL, -- 'revenue' | 'salary' | 'expenses' | 'settings' | 'overrides'
  row_id text NOT NULL,
  row_label text,
  field_name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (tab_key, section, row_id, field_name)
);

ALTER TABLE public.afm_finance_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members view finance data"
  ON public.afm_finance_data FOR SELECT
  USING (is_agency_member(auth.uid()));

CREATE POLICY "Agency members insert finance data"
  ON public.afm_finance_data FOR INSERT
  WITH CHECK (is_agency_member(auth.uid()));

CREATE POLICY "Agency members update finance data"
  ON public.afm_finance_data FOR UPDATE
  USING (is_agency_member(auth.uid()));

CREATE POLICY "Agency admins delete finance data"
  ON public.afm_finance_data FOR DELETE
  USING (is_agency_admin(auth.uid()));

-- Sales CRM data persistence
CREATE TABLE IF NOT EXISTS public.afm_sales_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  company text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  value numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'Website',
  created_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.afm_sales_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members view leads"
  ON public.afm_sales_leads FOR SELECT
  USING (is_agency_member(auth.uid()));

CREATE POLICY "Agency members insert leads"
  ON public.afm_sales_leads FOR INSERT
  WITH CHECK (is_agency_member(auth.uid()));

CREATE POLICY "Agency members update leads"
  ON public.afm_sales_leads FOR UPDATE
  USING (is_agency_member(auth.uid()));

CREATE POLICY "Agency admins delete leads"
  ON public.afm_sales_leads FOR DELETE
  USING (is_agency_admin(auth.uid()) OR created_by = auth.uid());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_afm_finance_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_afm_finance_data_updated_at
  BEFORE UPDATE ON public.afm_finance_data
  FOR EACH ROW EXECUTE FUNCTION public.update_afm_finance_updated_at();

CREATE TRIGGER update_afm_sales_leads_updated_at
  BEFORE UPDATE ON public.afm_sales_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_afm_finance_updated_at();

-- Upsert helper for finance data
CREATE OR REPLACE FUNCTION public.upsert_finance_data(
  _tab_key text,
  _section text,
  _row_id text,
  _row_label text,
  _field_name text,
  _value numeric
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.afm_finance_data (tab_key, section, row_id, row_label, field_name, value, updated_by)
  VALUES (_tab_key, _section, _row_id, _row_label, _field_name, _value, auth.uid())
  ON CONFLICT (tab_key, section, row_id, field_name)
  DO UPDATE SET value = _value, row_label = COALESCE(_row_label, afm_finance_data.row_label), updated_by = auth.uid(), updated_at = now();
END;
$$;

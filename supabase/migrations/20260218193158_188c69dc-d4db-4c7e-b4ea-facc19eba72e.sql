
-- Stats data persistence table
CREATE TABLE IF NOT EXISTS public.afm_stats_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_type text NOT NULL, -- 'weekly' or 'monthly'
  period_key text NOT NULL, -- e.g. '2025-w1' or '2025-m0'
  year_range text NOT NULL, -- e.g. '2025' for monthly, '2025-01-01_2025-03-31' for weekly
  field_name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  note text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(stat_type, period_key, year_range, field_name)
);

ALTER TABLE public.afm_stats_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins full access afm_stats_data"
ON public.afm_stats_data FOR ALL
USING (is_agency_admin(auth.uid()));

CREATE POLICY "Agency members view afm_stats_data"
ON public.afm_stats_data FOR SELECT
USING (is_agency_member(auth.uid()));

CREATE POLICY "Agency members insert afm_stats_data"
ON public.afm_stats_data FOR INSERT
WITH CHECK (is_agency_member(auth.uid()));

CREATE POLICY "Agency members update afm_stats_data"
ON public.afm_stats_data FOR UPDATE
USING (is_agency_member(auth.uid()));

-- Stats change history
CREATE TABLE IF NOT EXISTS public.afm_stats_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_type text NOT NULL,
  period_key text NOT NULL,
  year_range text NOT NULL,
  field_name text NOT NULL,
  old_value numeric,
  new_value numeric NOT NULL,
  changed_by uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.afm_stats_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins full access afm_stats_history"
ON public.afm_stats_history FOR ALL
USING (is_agency_admin(auth.uid()));

CREATE POLICY "Agency members view afm_stats_history"
ON public.afm_stats_history FOR SELECT
USING (is_agency_member(auth.uid()));

CREATE POLICY "Agency members insert afm_stats_history"
ON public.afm_stats_history FOR INSERT
WITH CHECK (is_agency_member(auth.uid()));

-- Function to upsert stat and log history
CREATE OR REPLACE FUNCTION public.upsert_afm_stat(
  _stat_type text,
  _period_key text,
  _year_range text,
  _field_name text,
  _value numeric,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_value numeric;
BEGIN
  -- Get current value for history
  SELECT value INTO _old_value
  FROM public.afm_stats_data
  WHERE stat_type = _stat_type AND period_key = _period_key AND year_range = _year_range AND field_name = _field_name;

  -- Upsert
  INSERT INTO public.afm_stats_data (stat_type, period_key, year_range, field_name, value, note, updated_by, updated_at)
  VALUES (_stat_type, _period_key, _year_range, _field_name, _value, _note, auth.uid(), now())
  ON CONFLICT (stat_type, period_key, year_range, field_name)
  DO UPDATE SET value = _value, note = COALESCE(_note, afm_stats_data.note), updated_by = auth.uid(), updated_at = now();

  -- Log history if value changed
  IF _old_value IS DISTINCT FROM _value THEN
    INSERT INTO public.afm_stats_history (stat_type, period_key, year_range, field_name, old_value, new_value, changed_by)
    VALUES (_stat_type, _period_key, _year_range, _field_name, _old_value, _value, auth.uid());
  END IF;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_afm_stats_data_updated_at
  BEFORE UPDATE ON public.afm_stats_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

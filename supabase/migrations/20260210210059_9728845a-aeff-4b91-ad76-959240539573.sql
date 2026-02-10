
-- Add 'Client' to the agency_role enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Client' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agency_role')) THEN
    ALTER TYPE public.agency_role ADD VALUE 'Client';
  END IF;
END $$;

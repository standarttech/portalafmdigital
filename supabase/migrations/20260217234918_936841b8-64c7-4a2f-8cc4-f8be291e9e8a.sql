-- Allow tasks to be created without a client (for agency-level tasks)
ALTER TABLE public.tasks ALTER COLUMN client_id DROP NOT NULL;

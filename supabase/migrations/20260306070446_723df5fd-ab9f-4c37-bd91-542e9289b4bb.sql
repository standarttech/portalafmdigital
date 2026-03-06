-- Multi-assignee support for tasks
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency admins manage task assignees" ON public.task_assignees;
CREATE POLICY "Agency admins manage task assignees"
ON public.task_assignees
FOR ALL
USING (public.is_agency_admin(auth.uid()))
WITH CHECK (public.is_agency_admin(auth.uid()));

DROP POLICY IF EXISTS "Agency members view task assignees" ON public.task_assignees;
CREATE POLICY "Agency members view task assignees"
ON public.task_assignees
FOR SELECT
USING (
  public.is_agency_member(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_assignees.task_id
      AND (
        (t.client_id IS NULL AND public.is_agency_member(auth.uid()))
        OR public.has_client_access(auth.uid(), t.client_id)
      )
  )
);

DROP POLICY IF EXISTS "Agency members insert task assignees" ON public.task_assignees;
CREATE POLICY "Agency members insert task assignees"
ON public.task_assignees
FOR INSERT
WITH CHECK (
  public.is_agency_member(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_assignees.task_id
      AND (
        (t.client_id IS NULL AND public.is_agency_member(auth.uid()))
        OR public.has_client_access(auth.uid(), t.client_id)
      )
  )
);

DROP POLICY IF EXISTS "Agency members delete task assignees" ON public.task_assignees;
CREATE POLICY "Agency members delete task assignees"
ON public.task_assignees
FOR DELETE
USING (
  public.is_agency_member(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_assignees.task_id
      AND (
        (t.client_id IS NULL AND public.is_agency_member(auth.uid()))
        OR public.has_client_access(auth.uid(), t.client_id)
      )
  )
);

-- Backfill from legacy single-assignee column for existing tasks
INSERT INTO public.task_assignees (task_id, user_id)
SELECT id, assigned_to
FROM public.tasks
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;
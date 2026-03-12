-- Allow clients to self-insert into chat_members for support rooms of their assigned clients
CREATE POLICY "Clients join support rooms"
ON public.chat_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM chat_rooms cr
    JOIN client_users cu ON cu.client_id = cr.client_id
    WHERE cr.id = chat_members.room_id
      AND cr.type = 'support'
      AND cu.user_id = auth.uid()
  )
);

-- Allow clients to create support rooms for their assigned clients
CREATE POLICY "Clients create support rooms"
ON public.chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'support'
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.client_id = chat_rooms.client_id
      AND cu.user_id = auth.uid()
  )
);
-- Create support chat rooms for existing clients that don't have one
-- Admin IDs: a32bf186, c294b490, 0ba048b0, a5395f66
DO $$
DECLARE
  admin_id UUID := 'a32bf186-248d-4b10-8468-f8713ccafa12';
  new_room_id UUID;
  rec RECORD;
BEGIN
  -- For each client without a support room
  FOR rec IN
    SELECT c.id, c.name
    FROM clients c
    WHERE NOT EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.client_id = c.id AND cr.type = 'support'
    )
  LOOP
    INSERT INTO chat_rooms (name, type, client_id, created_by)
    VALUES ('Support: ' || rec.name, 'support', rec.id, admin_id)
    RETURNING id INTO new_room_id;

    -- Add all admins as members
    INSERT INTO chat_members (room_id, user_id, can_write)
    VALUES
      (new_room_id, 'a32bf186-248d-4b10-8468-f8713ccafa12', true),
      (new_room_id, 'c294b490-a76f-4f07-b94e-46ad9e18d94e', true),
      (new_room_id, '0ba048b0-0daf-478a-b467-a94f898718d2', true),
      (new_room_id, 'a5395f66-4042-4007-891c-ab264314f05a', true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

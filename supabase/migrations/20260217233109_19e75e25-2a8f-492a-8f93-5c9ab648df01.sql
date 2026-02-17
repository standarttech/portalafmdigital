
-- Fix: chat_rooms type check constraint was missing 'support' type
-- This caused client creation to fail because the auto_create_client_chat_room trigger
-- tried to insert a room with type='support' which violated the constraint
ALTER TABLE public.chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_type_check;
ALTER TABLE public.chat_rooms ADD CONSTRAINT chat_rooms_type_check 
  CHECK (type = ANY (ARRAY['team'::text, 'client'::text, 'custom'::text, 'support'::text]));


-- Chat rooms
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('team', 'client', 'custom')),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat members (access control)
CREATE TABLE public.chat_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  can_write BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: chat_rooms - users can see rooms they're members of, admins see all
CREATE POLICY "Admins see all rooms" ON public.chat_rooms FOR SELECT
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Members see their rooms" ON public.chat_rooms FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chat_members WHERE room_id = chat_rooms.id AND user_id = auth.uid()));

CREATE POLICY "Admins can create rooms" ON public.chat_rooms FOR INSERT
  WITH CHECK (public.is_agency_admin(auth.uid()));

CREATE POLICY "Admins can update rooms" ON public.chat_rooms FOR UPDATE
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Admins can delete rooms" ON public.chat_rooms FOR DELETE
  USING (public.is_agency_admin(auth.uid()));

-- RLS: chat_members - admins manage, users see own membership
CREATE POLICY "Admins manage members" ON public.chat_members FOR ALL
  USING (public.is_agency_admin(auth.uid()));

CREATE POLICY "Users see own membership" ON public.chat_members FOR SELECT
  USING (user_id = auth.uid());

-- RLS: chat_messages - members can see/send messages in their rooms
CREATE POLICY "Members read messages" ON public.chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chat_members WHERE room_id = chat_messages.room_id AND user_id = auth.uid())
    OR public.is_agency_admin(auth.uid()));

CREATE POLICY "Members send messages" ON public.chat_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND (
      public.is_agency_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.chat_members WHERE room_id = chat_messages.room_id AND user_id = auth.uid() AND can_write = true)
    )
  );

CREATE POLICY "Users delete own messages" ON public.chat_messages FOR DELETE
  USING (user_id = auth.uid() OR public.is_agency_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_chat_members_room ON public.chat_members(room_id);
CREATE INDEX idx_chat_members_user ON public.chat_members(user_id);
CREATE INDEX idx_chat_messages_room ON public.chat_messages(room_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(room_id, created_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Triggers for updated_at
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

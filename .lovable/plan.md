

# Block A Implementation Plan

## Overview
Three quick wins: (1) connect task-reminders to cron via pg_cron, (2) typing indicators in chat, (3) unread badges per chat room.

---

## 1. Task Reminders Cron Jobs

**What:** Schedule `task-reminders` edge function via `pg_cron` + `pg_net`.

**How:**
- Enable `pg_cron` and `pg_net` extensions via migration
- Use the **insert tool** (not migration) to create two cron schedules:
  - `task-reminders-daily`: runs at `0 9 * * *` (9:00 UTC daily), body `{"type":"daily"}`
  - `task-reminders-overdue`: runs at `0 */6 * * *` (every 6 hours), body `{"type":"overdue"}`
- Both call `https://bhwvnmyvebgnxiisloqu.supabase.co/functions/v1/task-reminders` with the anon key

---

## 2. Typing Indicator in Chat

**What:** Show "User is typing..." in real-time using Supabase Realtime broadcast (no DB changes needed).

**How (ChatPage.tsx):**
- Add state: `typingUsers: Record<string, string>` (userId → displayName)
- Subscribe to a broadcast channel `typing-${selectedRoom}`:
  - On input change, broadcast `{ event: 'typing', payload: { userId, displayName } }` (throttled to 1 per 2 seconds)
  - On receive, set `typingUsers[userId] = displayName`, clear after 3s timeout
- Render typing indicator below messages area: "Denis is typing..." with animated dots
- Clean up channel on room change

---

## 3. Unread Badges per Chat Room

**What:** Track last-read timestamp per user per room. Show unread count on room list.

**How:**
- **DB migration:** Create `chat_read_status` table:
  ```sql
  CREATE TABLE public.chat_read_status (
    user_id uuid NOT NULL,
    room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    last_read_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, room_id)
  );
  ALTER TABLE public.chat_read_status ENABLE ROW LEVEL SECURITY;
  -- Users manage own read status
  CREATE POLICY "Users manage own read status" ON public.chat_read_status FOR ALL
    TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  ```

- **ChatPage.tsx changes:**
  - On room select: upsert `chat_read_status` with `last_read_at = now()`
  - On fetchRooms: also fetch `chat_read_status` for current user, then count messages per room where `created_at > last_read_at`
  - Display red badge with unread count on each room item in the sidebar
  - Also update `last_read_at` when new realtime messages arrive in the active room

---

## Technical Notes

- Typing indicator uses Supabase Realtime **broadcast** (ephemeral, no DB writes) — zero overhead
- Unread count query: join `chat_messages` count where `created_at > last_read_at` per room — done in a single query during room list fetch
- All hardcoded Russian strings in the chat area touched by these changes will use translation keys

---

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create `chat_read_status` table + RLS |
| Migration SQL | Enable `pg_cron`, `pg_net` extensions |
| Insert SQL (non-migration) | Two `cron.schedule()` calls for task-reminders |
| `src/pages/ChatPage.tsx` | Typing indicator broadcast + unread badges + read status upsert |
| `src/i18n/translations.ts` | New keys: `chat.typing`, `chat.unread` |


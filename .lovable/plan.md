

## CRM Integrations Overhaul Plan

### Problem Summary
1. **Bots & Broadcasts**: Multiple bots can be added per client, but broadcasts page has no bot selector — always uses "system" bot
2. **External CRM**: Currently just static instruction guides with no real connection management — no API keys, no data sync, no disconnect/reconfigure
3. **No integration lifecycle**: Can't see status, disable, or reconfigure connected integrations

### What Will Be Built

#### 1. Database: `crm_external_connections` table
New table to store external CRM connections per client:

```text
crm_external_connections
├── id (uuid PK)
├── client_id (FK → clients)
├── provider (text: gohighlevel | hubspot | bitrix24 | amocrm | custom)
├── label (text) — display name
├── api_key_ref (uuid, nullable) — vault reference for API key
├── base_url (text, nullable) — API base URL for the provider
├── sync_enabled (boolean, default true)
├── sync_interval_minutes (int, default 60)
├── last_synced_at (timestamptz, nullable)
├── last_sync_status (text: success | error | pending)
├── last_sync_error (text, nullable)
├── field_mapping (jsonb) — maps external fields to CRM lead fields
├── is_active (boolean, default true)
├── created_at / updated_at
```

RLS: agency members with `has_client_access` can read/write.

#### 2. Broadcasts: Bot Selector
- On `BroadcastsPage`, when "Telegram" channel is selected, show a dropdown of all bots across all clients (or filter by recipient group)
- Store selected `bot_id` in the broadcast record (add column `bot_profile_id` to `notification_broadcasts`)
- Pass `bot_profile_id` to `send-notification` edge function so it uses the correct bot token from vault

#### 3. External CRM Integration Management UI
Replace the static guide cards in `CrmIntegrationsPage` → "Внешние CRM" tab with a proper management interface:

- **Connected integrations list**: Cards showing provider, status badge (connected/error/syncing), last sync time, actions (test/sync now/disconnect/edit)
- **Add integration flow**: 
  - Select provider (GoHighLevel, HubSpot, Bitrix24, AmoCRM, Custom)
  - Enter API key → stored in Vault via edge function
  - Enter base URL (for self-hosted like Bitrix24)
  - Configure field mapping (which external fields map to first_name, email, phone, etc.)
  - Test connection → calls edge function that pings the external API
  - Save
- **Each connected integration shows**: status, last sync, error details, sync now button, edit/disconnect

#### 4. Edge Function: `crm-external-sync`
New edge function that:
- Reads `crm_external_connections` where `sync_enabled = true`
- For each connection, fetches leads/deals from the external CRM API using the stored API key
- Upserts into `crm_leads` with proper deduplication (by external_lead_id + source)
- Updates `last_synced_at`, `last_sync_status`
- Scheduled via pg_cron (every hour)

Supported providers (initial):
- **AmoCRM**: `/api/v4/leads` with Bearer token
- **Bitrix24**: REST API with webhook URL
- **HubSpot**: `/crm/v3/objects/contacts` with Bearer token
- **GoHighLevel**: `/v1/contacts` with Bearer token
- **Custom**: configurable URL + headers

#### 5. Edge Function: `crm-store-connection`
Securely stores API key in Vault, creates/updates `crm_external_connections` record. Similar pattern to `store-bot-token`.

#### 6. Edge Function: `crm-test-connection`
Tests connectivity to external CRM by making a lightweight API call (e.g. fetch 1 contact). Returns success/error.

### Files to Create
- `supabase/functions/crm-external-sync/index.ts`
- `supabase/functions/crm-store-connection/index.ts`
- `supabase/functions/crm-test-connection/index.ts`

### Files to Edit
- `src/pages/crm/CrmIntegrationsPage.tsx` — replace static guides with real integration management UI + bot selector for notifications
- `src/pages/BroadcastsPage.tsx` — add bot selector when Telegram channel is active
- `supabase/config.toml` — register new edge functions (auto)
- DB migration: create `crm_external_connections` table, add `bot_profile_id` to `notification_broadcasts`

### UI Flow (External CRM tab)

```text
┌─────────────────────────────────────────┐
│ Внешние CRM                             │
│                                         │
│ ┌─ Connected ──────────────────────────┐│
│ │ 🟠 GoHighLevel    ● Connected       ││
│ │    Last sync: 14:30  ✓ 12 leads     ││
│ │    [Sync Now] [Edit] [Disconnect]   ││
│ ├──────────────────────────────────────┤│
│ │ 🔷 AmoCRM         ⚠ Error          ││
│ │    Auth expired 2h ago              ││
│ │    [Reconnect] [Edit] [Disconnect]  ││
│ └──────────────────────────────────────┘│
│                                         │
│ [+ Подключить CRM]                      │
│                                         │
│ ┌─ Add Dialog ─────────────────────────┐│
│ │ Provider: [GoHighLevel ▾]            ││
│ │ API Key:  [••••••••••••]             ││
│ │ Base URL: [https://...]              ││
│ │ Sync every: [60 min ▾]              ││
│ │ Field mapping:                       ││
│ │   first_name ← {{contact.name}}     ││
│ │   email ← {{contact.email}}         ││
│ │ [Test Connection] [Save]             ││
│ └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Broadcast Bot Selector
When Telegram is selected as a channel, a dropdown appears showing all bots grouped by client with their active status. The selected bot will be used for sending.

### Sync Architecture
- `crm-external-sync` runs hourly via pg_cron
- Each provider has an adapter that handles auth + API format differences
- Leads are upserted by `external_lead_id` to avoid duplicates
- Stage mapping: new external leads go to the default pipeline stage
- All sync results logged for monitoring (reuse `crm_webhook_logs` or dedicated sync_logs)


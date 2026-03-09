# Remaining Limitations

Date: 2026-03-09 (updated after Phase 2 stabilization)

## Database / Types

### 1. `as any` casts for tables not in generated types.ts
- **Scope**: ~100+ casts remain for tables added after types.ts was generated
- **Affected tables**: `launch_requests`, `hypothesis_threads`, `hypothesis_messages`, `creative_assets`, `optimization_actions`, `optimization_action_logs`, `optimization_presets`, `contact_requests`, `notifications`, `portal_notifications`, `portal_notification_preferences`, `crm_*` tables, `gos_*` tables, and ~30 others
- **Impact**: No runtime impact; TypeScript loses type checking for those specific query chains
- **Resolution**: Schema type regeneration (types.ts sync) — eliminates these automatically
- **Already removed**: ~30 unnecessary casts in Phase 1+2 for tables confirmed in types.ts

### 2. Notification preferences per-client (not per-individual)
- When multiple portal users share a client, `portal_notification_enabled()` reads the first active user's preferences
- Low impact in practice (rare multi-user portal scenarios)

## Features

### 3. PDF Export — browser-side only
- Generates print-optimized HTML; requires browser Print → Save as PDF
- No server-side binary PDF generation
- The `portal-pdf-report` edge function generates HTML for this purpose

### 4. Cron Jobs — unverifiable from frontend
- `pg_cron` jobs (sync-meta-ads, scheduled-digest, task-reminders) cannot be confirmed registered from application code
- Infrastructure-level verification required via database console

### 5. Social Media Integration (AFM Internal)
- OAuth connections for Instagram/TikTok/etc. labeled "Coming Soon" in UI
- `social_media_connections` table exists but OAuth flows not implemented
- `store_social_token` / `get_social_token` vault functions are ready

### 6. AFM Internal Tools tab
- Shows 4 tools as "In Development": CRM Pipeline, Lead Tracker, P&L, HR Panel

### 7. Leaked Password Protection
- Must be enabled manually in the Auth settings panel (not configurable via available tooling)
- Go to Lovable Cloud → Authentication → Password → enable "Leaked Password Protection"

## Code Health

### 8. `ClientPortalPage.tsx` — legacy file
- Admin overview page; no longer rendered via any route
- Import removed from App.tsx in Phase 2
- File retained; safe to delete when convenient

### 9. React forwardRef warning on CategoryBreakdown
- Inner `Metric` component triggers cosmetic React warning
- No functional impact

## Architecture

### 10. Client role portal access
- Client role users can access both `/dashboard` (internal) and `/portal` (portal layout)
- By design but may confuse users if not guided properly

## What Was Resolved in Phase 2
- ✅ `AfmInternalPage.tsx` dead file deleted
- ✅ `ClientPortalPage` unused import removed from App.tsx
- ✅ ~21 unnecessary `as any` table casts removed from AI Ads pages
- ✅ `docs/FULL_PLATFORM_TABLES.json` created (100 tables documented)
- ✅ All audit docs updated with accurate figures

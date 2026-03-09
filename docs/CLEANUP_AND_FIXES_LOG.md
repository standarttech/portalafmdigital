# Cleanup & Fixes Log

## Phase 1 — 2026-03-08

### 1. Duplicate `getPreviousPeriod` (Code Deduplication)
- **Problem**: Same function duplicated in `PortalDashboardPage.tsx` and `PortalReportsPage.tsx`
- **Fix**: Extracted to `src/lib/portalPeriod.ts`
- **Files changed**: `src/lib/portalPeriod.ts` (created), `PortalDashboardPage.tsx`, `PortalReportsPage.tsx`

### 2. File Share Notification Bypasses Preferences (Bug Fix)
- **Problem**: `AdminPortalFiles.tsx` inserted `file_shared` notification without checking user preferences
- **Fix**: Added `portal_notification_enabled` RPC check before insert
- **File changed**: `src/components/portal/AdminPortalFiles.tsx`

### 3. Misleading "In Development" Footer (UI Honesty)
- **Problem**: `ClientPortalPage.tsx` footer claimed portal was in development
- **Fix**: Updated text to direct to actual working portal
- **File changed**: `src/pages/portal/ClientPortalPage.tsx`

### 4. Redundant `as any` table casts (AiAdsAnalysisPage, AiAdsOptimizationPage)
- **Problem**: `supabase.from('ai_campaign_sessions' as any)` when table IS in types.ts
- **Fix**: Removed unnecessary casts from tables confirmed in types.ts
- **Files changed**: `AiAdsAnalysisPage.tsx`, `AiAdsOptimizationPage.tsx`

---

## Phase 2 — 2026-03-09

### 5. Dead Code Removed: `AfmInternalPage.tsx`
- **Problem**: Stub page with hardcoded fake data, never referenced in any route
- **Fix**: Deleted file
- **File deleted**: `src/pages/AfmInternalPage.tsx`

### 6. Dead Import Removed: `ClientPortalPage` import in App.tsx
- **Problem**: Component imported but no `<Route>` ever rendered it
- **Fix**: Removed unused import from App.tsx
- **File changed**: `src/App.tsx`

### 7. `as any` Cleanup — AI Ads pages (Phase 2 batch)
- **Problem**: Tables confirmed in types.ts were still cast with `as any`
- **Tables cleaned**: `campaign_performance_snapshots`, `ai_recommendations`, `ai_campaign_sessions`, `campaign_drafts`, `campaign_draft_items`
- **Files changed**:
  - `AiAdsIntelligencePage.tsx` — 2 casts removed
  - `AiAdsOverviewPage.tsx` — 3 casts removed
  - `AiAdsRecommendationsPage.tsx` — 5 casts removed
  - `AiAdsDraftsPage.tsx` — 5 casts removed
  - `AiAdsHypothesesPage.tsx` — 4 casts removed
  - `AiAdsExecutionsPage.tsx` — 2 casts removed
- **Total removed this batch**: ~21 unnecessary table casts
- **Intentionally kept**: `launch_requests`, `hypothesis_threads`, `hypothesis_messages`, `creative_assets`, `optimization_*` — NOT in types.ts; `campaign_drafts UPDATE` with `Record<string, any>` payload — type mismatch would occur

### 8. Leaked Password Protection
- **Status**: Attempted via configure_auth but tool does not expose this parameter directly
- **Blocker**: `supabase--configure_auth` only controls `disable_signup`, `external_anonymous_users_enabled`, `auto_confirm_email` — no leaked_password_protection parameter
- **Required manual step**: Go to Lovable Cloud → Authentication → Password → enable "Leaked Password Protection" manually in the Auth settings panel

---

## Phase 3 — 2026-03-09 (Type Sync + Safe Cleanup)

### 9. Supplementary Types Layer Created
- **Problem**: 10 tables exist in DB but are missing from auto-generated `types.ts`
- **Fix**: Created `src/types/supabase-supplementary.ts` with typed interfaces derived from actual DB schema
- **Tables added**: `launch_requests`, `launch_execution_logs`, `hypothesis_threads`, `hypothesis_messages`, `creative_assets`, `optimization_actions`, `optimization_action_logs`, `optimization_presets`, `portal_notifications`, `portal_notification_preferences`
- **Note**: NOT a fake regen — honest supplementary layer until real types.ts regen is available

### 10. `as any` Table Name Casts Removed (Safe Batch)
- **Tables cleaned** (already in types.ts, casts were unnecessary):
  - `client_portal_files` — 6 casts removed
  - `client_portal_users` — 3 casts removed
  - `client_portal_invites` — 5 casts removed
  - `client_portal_branding` — 3 casts removed
  - `campaign_performance_snapshots` — 5 casts removed
  - `ai_recommendations` — 4 casts removed
- **Files changed**:
  - `src/components/portal/AdminPortalManagement.tsx` — 11 casts removed
  - `src/components/portal/AdminPortalFiles.tsx` — 6 casts removed
  - `src/components/portal/PortalActivityPanel.tsx` — 1 cast removed
  - `src/pages/portal/PortalFilesPage.tsx` — 2 casts removed
  - `src/pages/portal/PortalDashboardPage.tsx` — 3 casts removed
  - `src/pages/portal/PortalReportsPage.tsx` — 2 casts removed
  - `src/pages/portal/PortalRecommendationsPage.tsx` — 2 casts removed
  - `src/pages/portal/PortalCampaignsPage.tsx` — 2 casts removed
  - `src/pages/ai-ads/AiAdsIntelligencePage.tsx` — 1 cast removed
  - `src/pages/ai-ads/AiAdsClientReportPage.tsx` — 2 casts removed
- **Total removed**: ~32 unnecessary `as any` casts

### Intentionally Left (Still Required)
- `launch_requests` — NOT in types.ts (~15 occurrences)
- `hypothesis_threads` / `hypothesis_messages` — NOT in types.ts (~8 occurrences)
- `creative_assets` — NOT in types.ts (~12 occurrences)
- `optimization_actions` / `optimization_action_logs` / `optimization_presets` — NOT in types.ts (~20 occurrences)
- `portal_notifications` / `portal_notification_preferences` — NOT in types.ts (~10 occurrences)
- `buildQ()` helper in PortalReportsPage uses dynamic table name — cast required
- `campaign_drafts` INSERT with dynamic payloads in Intelligence page — cast required
- `campaign_draft_items` INSERT with parent_item_id pattern — cast required
- RPC calls (`portal_notification_enabled`) — cast required (not in RPC types)

---

## Remaining `as any` Casts After Phase 3

### Tables NOT in types.ts — casts are REQUIRED:
- `launch_requests` / `launch_execution_logs` — ~15 occurrences
- `hypothesis_threads` / `hypothesis_messages` — ~8 occurrences
- `creative_assets` — ~12 occurrences
- `optimization_actions` / `optimization_action_logs` / `optimization_presets` — ~20 occurrences
- `portal_notifications` / `portal_notification_preferences` — ~10 occurrences
- GOS / CRM tables not in types.ts — ~60+ occurrences

### Resolution path:
Full types.ts regeneration would eliminate ALL remaining table-name casts. The supplementary types file (`src/types/supabase-supplementary.ts`) provides typed interfaces for use in components.

---

## Notes
- Console warning in `CategoryBreakdown.tsx`: React `forwardRef` on inner `Metric` — cosmetic, no functional impact
- `ClientPortalPage.tsx` file retained (admin portal overview still accessible at legacy route) but no longer imported in App.tsx

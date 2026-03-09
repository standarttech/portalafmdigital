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

## Remaining `as any` Casts After Phase 2

### Tables NOT in types.ts — casts are REQUIRED:
- `launch_requests` — ~15 occurrences in AI Ads pages
- `hypothesis_threads` / `hypothesis_messages` — ~8 occurrences
- `creative_assets` — ~12 occurrences in AiAdsCreativesPage
- `optimization_actions` / `optimization_action_logs` / `optimization_presets` — ~20 occurrences
- Portal, GOS, CRM tables not in types.ts — ~80+ occurrences

### Tables in types.ts with complex payload mismatches — deferred:
- `campaign_drafts UPDATE` with `Record<string, any>` payload in DraftBuilder
- `campaign_draft_items UPDATE` with `Partial<DraftItem>` (has `id` field not in Update type)

### Resolution path:
Schema type regeneration (`types.ts` sync) would eliminate the majority of remaining `as any` casts automatically.

---

## Notes
- Console warning in `CategoryBreakdown.tsx`: React `forwardRef` on inner `Metric` — cosmetic, no functional impact
- `ClientPortalPage.tsx` file retained (admin portal overview still accessible at legacy route) but no longer imported in App.tsx

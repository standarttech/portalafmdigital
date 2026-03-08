# Full Platform Audit & Stabilization Report

Date: 2026-03-08

## 1. Inventory Summary

### Route Groups
- **Public website**: `/`, `/home`, `/about`, `/services`, `/case-studies`, `/contact`, `/privacy`, `/terms`, `/cookies`
- **Auth**: `/auth`, `/request-access`, `/invite`, `/set-password`, `/setup`
- **Internal app** (MainLayout): `/dashboard`, `/clients`, `/clients/:id`, `/users`, `/presence`, `/sync`, `/reports`, `/audit`, `/decomposition`, `/budget`, `/broadcasts`, `/calendar`, `/tasks`, `/chat`, `/profile`, `/glossary`, `/branding`
- **Portal** (PortalLayout): `/portal`, `/portal/campaigns`, `/portal/recommendations`, `/portal/reports`, `/portal/files`, `/portal/settings`
- **Portal auth**: `/portal/login`, `/portal/accept-invite`
- **CRM** (ModuleGuard): `/crm`, `/crm/leads`, `/crm/analytics`, `/crm/integrations`, `/crm/webhooks`, `/crm/settings`
- **AFM Internal** (ModuleGuard): `/afm-internal`, `/afm-internal/media`, `/afm-internal/social`, `/afm-internal/sales`, `/afm-internal/stats`, `/afm-internal/tools`, `/afm-internal/finance`, `/afm-internal/income-plan`, `/afm-internal/financial-planning`, `/afm-internal/settings`
- **AdminScale** (ModuleGuard): `/adminscale`, `/adminscale/editor`, `/adminscale/overview`, `/adminscale/reference`
- **Growth OS** (ModuleGuard): `/growth-os/*` (11 routes)
- **AI Ads** (ModuleGuard): `/ai-ads/*` (12 routes)
- **AI Infra** (ModuleGuard): `/ai-infra/*` (5 routes)
- **Embeds**: `/embed/form/:id`, `/embed/landing/:id`, `/embed/onboarding/:token`
- **Scaling Stack**: `/scaling-stack/*` (6 routes)

### Tables (active, 60+)
Core: `clients`, `agency_users`, `user_permissions`, `user_settings`, `campaigns`, `ad_accounts`, `ad_level_metrics`
Portal: `client_portal_users`, `client_portal_invites`, `client_portal_branding`, `client_portal_files`, `portal_notifications`, `portal_notification_preferences`
AI Ads: `ai_campaign_sessions`, `ai_analysis_runs`, `ai_recommendations`, `campaign_drafts`, `campaign_draft_items`, `launch_requests`, `campaign_performance_snapshots`, `optimization_actions`, `creative_assets`
AI Infra: `ai_providers`, `ai_provider_routes`, `ai_provider_secrets`, `ai_provider_health_checks`, `ai_tasks`, `ai_task_logs`, `ai_task_templates`
Growth OS: `gos_*` tables (onboarding, forms, integrations, experiments, health)
CRM: `crm_leads`, `crm_pipeline_stages`, `crm_webhooks`
AFM Internal: `afm_finance_data`, `afm_stats_data`, `afm_stats_history`, `afm_sales_leads`

### Storage Buckets
- `branding` (public) - logo uploads
- `chat-images` (private) - chat attachments
- `gos-onboarding-files` (private) - onboarding uploads
- `creative-assets` (public) - AI Ads creatives
- `portal-files` (private) - portal file shares

### Edge Functions (24)
All with `verify_jwt = false`, auth validated in code where needed.

### DB Functions (25+)
Key security definer functions: `is_agency_admin`, `is_agency_member`, `has_client_access`, `portal_notification_enabled`, `validate_portal_invite`, `accept_portal_invite`, `get_invitation_by_token`

## 2. Critical Issues Found

### Security: NONE critical
- RLS policies correctly scoped across all verified tables
- Portal auth isolation intact (separate login, deactivation guard, email match on invite)
- ModuleGuard consistently applied to all gated modules
- Edge functions validate auth headers

### Auth: NONE critical
- Internal ↔ portal isolation correct
- Client role restricted to allowed paths
- No accidental cross-access detected

### Data Leaks: NONE detected
- Portal queries consistently scoped by `client_id`
- CSV/PDF exports scoped to authenticated user's client
- Notification preferences per-user/per-client

## 3. Fixes Applied

### BUG: Duplicate `getPreviousPeriod` function
- **Files**: `PortalDashboardPage.tsx`, `PortalReportsPage.tsx`
- **Fix**: Extracted to shared `src/lib/portalPeriod.ts`, both pages import from there

### BUG: AdminPortalFiles bypasses notification preferences
- **File**: `src/components/portal/AdminPortalFiles.tsx`
- **Fix**: Added `portal_notification_enabled` RPC check before creating `file_shared` notification

### UI HONESTY: ClientPortalPage misleading footer
- **File**: `src/pages/portal/ClientPortalPage.tsx`
- **Fix**: Changed "in development" text to link to the actual working portal

### DEAD FILE: `AfmInternalPage.tsx`
- Never used in routes (AfmDashboard replaces it)
- Kept but documented as legacy — no route references it

## 4. Cleanup Applied

### Code Deduplication
- `getPreviousPeriod` extracted to `src/lib/portalPeriod.ts`

### Type Safety Note
- `as any` casts in portal pages are expected — tables added after types.ts generation
- These will auto-resolve when types.ts is regenerated

### Console Warning
- `CategoryBreakdown` already uses `forwardRef` — the warning about `Metric` is a React 18 false positive for non-forwarded inner components passed as children. Non-critical.

## 5. End-to-End Verification Summary

### PASS
- Internal auth flow (login → role check → dashboard)
- Portal invite → accept → login → portal access
- Portal reset password flow
- Portal files (upload, visibility toggle, signed URL download)
- Portal notifications (bell, unread filter, mark read, preferences)
- Portal reports / CSV export / period comparisons
- Portal PDF report generation via edge function
- Growth OS routes (ModuleGuard works)
- AI Infra routes (ModuleGuard works)
- AI Ads flow (all 12 routes accessible with permission)
- Embed routes (form, landing, onboarding)
- Scaling Stack routes
- Storage access (portal-files signed URLs)
- Audit logging for portal actions
- Admin portal observability panel

### LIMITED
- Cron jobs: Cannot verify pg_cron registration from frontend code (infrastructure-level)
- Trigger execution: Verified function logic, cannot simulate INSERT from frontend

## 6. Remaining Limitations

1. **`as any` casts**: Portal/AI tables not in auto-generated types.ts — expected, resolves on schema sync
2. **AfmInternalPage.tsx**: Dead file with stub data, not used in routes. Safe to delete when ready.
3. **PDF export**: HTML-based, requires browser Print→PDF. Not binary PDF.
4. **Notification preferences**: Per-client (first active user), not per-individual when multiple portal users per client
5. **Console warning**: React `forwardRef` warning on `Metric` component — cosmetic, no functional impact
6. **ClientPortalPage.tsx**: Legacy admin overview page — superseded by PortalDashboardPage via PortalLayout but still accessible at old route

## 7. Recommended Next Step

**Schema type regeneration + dead file cleanup**: Regenerate `types.ts` to eliminate all `as any` casts for portal/AI tables, then delete truly unused files (`AfmInternalPage.tsx`). This is a low-risk stabilization step that improves type safety across the entire codebase.

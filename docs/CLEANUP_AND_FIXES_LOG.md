# Cleanup & Fixes Log

Date: 2026-03-08

## Fixes Applied

### 1. Duplicate `getPreviousPeriod` (Code Deduplication)
- **Problem**: Same function duplicated in `PortalDashboardPage.tsx` and `PortalReportsPage.tsx`
- **Fix**: Extracted to `src/lib/portalPeriod.ts`, both files import from shared module
- **Files changed**: 
  - Created: `src/lib/portalPeriod.ts`
  - Modified: `src/pages/portal/PortalDashboardPage.tsx`
  - Modified: `src/pages/portal/PortalReportsPage.tsx`

### 2. File Share Notification Bypasses Preferences (Bug Fix)
- **Problem**: `AdminPortalFiles.tsx` directly inserted `file_shared` notification without checking user preferences
- **Fix**: Added `portal_notification_enabled` RPC check before notification insert
- **File changed**: `src/components/portal/AdminPortalFiles.tsx`

### 3. Misleading "In Development" Footer (UI Honesty)
- **Problem**: `ClientPortalPage.tsx` footer says "Full client portal is in development" but portal is fully functional
- **Fix**: Updated text to link to the actual working portal
- **File changed**: `src/pages/portal/ClientPortalPage.tsx`

## Dead Code Identified (Not Removed — Low Risk)

### `src/pages/AfmInternalPage.tsx`
- Stub page with hardcoded fake data (KPIs, social networks, tools)
- Never referenced in any route — `AfmDashboard` is used instead
- **Recommendation**: Delete when convenient

### `src/pages/portal/ClientPortalPage.tsx`
- Legacy admin overview — imported in App.tsx but never rendered in any `<Route>`
- Superseded by PortalDashboardPage via PortalLayout
- **Recommendation**: Remove import from App.tsx and delete file

## Type Safety Notes
- 159 `as any` casts across portal pages — all for tables added after types.ts generation
- Will auto-resolve when types.ts is regenerated from current schema
- No security or functional impact

## Console Warning
- `CategoryBreakdown.tsx`: React warning about `Metric` component refs — cosmetic only
- CategoryBreakdown itself correctly uses `forwardRef`
- Inner `Metric` function component doesn't receive refs at runtime

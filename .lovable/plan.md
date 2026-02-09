

# Dashboard Real Data + Client Management + Google Sheets Integration

## Overview

This plan covers 4 major areas: connecting KPIs to real database data, fixing the custom date picker UX, full client CRUD management, and Google Sheets integration for pulling report data per client.

---

## 1. Custom Date Picker -- "Apply" Button Fix

**Problem**: Currently, the custom date range auto-applies when both dates are selected, but often the second click selects a single-day range before the user finishes picking. The popover closes too early.

**Solution**: 
- Remove auto-close behavior from `DashboardControls.tsx`
- Add an "Apply" button inside the calendar popover
- Only apply the range and close when user clicks "Apply"
- Add a "Cancel" button to dismiss without applying

---

## 2. KPI Cards Connected to Real `daily_metrics` Data

**Problem**: All KPI values come from hardcoded demo data in `dashboardData.ts` using multipliers.

**Solution**:
- Create a new hook `useDashboardMetrics(filters)` that queries `daily_metrics` table with date range and platform filters
- When real data exists (rows > 0), use it; otherwise fall back to demo data
- The hook will:
  - Calculate date range boundaries (e.g., today, last 7/14/30/90 days, or custom range)
  - Query `daily_metrics` aggregated: `SUM(spend)`, `SUM(leads)`, `SUM(link_clicks)`, `SUM(impressions)`
  - For comparison: query the previous period with the same logic
  - Calculate deltas (% change)
- Also query `clients` count and `campaigns` count for Operations KPIs
- Feed this data into `KpiSection`, `PerformanceChart`, `PlatformBreakdown`, `ClientsPerformanceTable`, and `AttentionRequired`

**Files changed**:
- New: `src/hooks/useDashboardMetrics.ts`
- Modified: `src/components/dashboard/KpiSection.tsx` -- accept real data props
- Modified: `src/components/dashboard/PerformanceChart.tsx` -- accept real chart data
- Modified: `src/components/dashboard/PlatformBreakdown.tsx` -- accept real platform data
- Modified: `src/components/dashboard/ClientsPerformanceTable.tsx` -- query real per-client metrics
- Modified: `src/components/dashboard/AttentionRequired.tsx` -- use real alerts
- Modified: `src/pages/DashboardPage.tsx` -- wire hook to components
- Modified: `src/components/dashboard/dashboardData.ts` -- keep as fallback, add date calculation helpers

**DashboardPage flow**:
- `DashboardPage` passes `filters` (including `customDateRange`) to the hook
- Hook returns `{ kpis, chartData, platformData, clientsData, alerts, loading }`
- Each component receives real data or falls back to demo

---

## 3. Full Client Management (CRUD + Status)

**Problem**: Only "Create" exists. No edit, delete, or status change.

**Solution** in `ClientsPage.tsx`:
- Add **Edit Client** dialog: update name, timezone, currency, notes
- Add **Change Status** dropdown: Active / Paused / Archived
- Add **Delete Client** with confirmation dialog (soft delete = set status to 'archived', or hard delete for AgencyAdmin)
- Add action buttons column to the clients table (three-dot menu with Edit / Change Status / Delete)

**Solution** in `ClientDetailPage.tsx`:
- Add edit button in header to modify client details
- Add status change button in header
- Add delete button with confirmation

---

## 4. Google Sheets Integration

**Architecture**:
1. Add `google_sheet_url` column to `clients` table (nullable text)
2. Create an Edge Function `sync-google-sheet` that:
   - Receives `client_id`
   - Reads the `google_sheet_url` from the client record
   - Fetches the Google Sheet via the public CSV export URL (no OAuth needed -- sheet must be "Anyone with link can view")
   - Parses the CSV data (expects columns: Date, Spend, Impressions, Clicks, Leads, etc.)
   - Upserts rows into `daily_metrics` for that client
3. In `ClientDetailPage.tsx` Connections tab:
   - Show a form to paste Google Sheet URL
   - "Sync Now" button that calls the edge function
   - Show last sync status

**Google Sheet format expected** (first row = headers):
| Date | Campaign | Spend | Impressions | Clicks | Leads |
|------|----------|-------|-------------|--------|-------|
| 2026-02-01 | Campaign A | 1500 | 25000 | 890 | 42 |

**Edge Function logic**:
- Convert Google Sheet URL to CSV export URL: replace `/edit...` with `/export?format=csv`
- Parse CSV rows
- For each row, upsert into `daily_metrics` matching on `client_id + date + campaign`
- Auto-create campaign records if they don't exist

**Database migration**:
- `ALTER TABLE clients ADD COLUMN google_sheet_url text;`

---

## 5. Translations

Add new keys for:
- `clients.editClient`, `clients.deleteClient`, `clients.confirmDelete`, `clients.statusChanged`
- `clients.googleSheetUrl`, `clients.syncSheet`, `clients.syncSheetDesc`, `clients.sheetSynced`
- `dashboard.apply`, `dashboard.applyRange`

---

## Technical Details

### Database Migration
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS google_sheet_url text;
```

### Edge Function: `sync-google-sheet`
- Endpoint: POST with `{ client_id: string }`
- Auth: requires authenticated user with client access
- Reads sheet URL from clients table
- Fetches CSV, parses, upserts into daily_metrics
- Returns `{ success: true, rows_synced: N }`

### Files to Create
- `src/hooks/useDashboardMetrics.ts` -- real data hook
- `supabase/functions/sync-google-sheet/index.ts` -- sheet sync function

### Files to Modify
- `src/components/dashboard/DashboardControls.tsx` -- Apply button for custom range
- `src/components/dashboard/KpiSection.tsx` -- accept real data
- `src/components/dashboard/PerformanceChart.tsx` -- accept real data
- `src/components/dashboard/PlatformBreakdown.tsx` -- accept real data
- `src/components/dashboard/ClientsPerformanceTable.tsx` -- accept real data
- `src/components/dashboard/AttentionRequired.tsx` -- accept real data
- `src/pages/DashboardPage.tsx` -- wire real data hook, pass customDateRange
- `src/pages/ClientsPage.tsx` -- add edit/delete/status actions
- `src/pages/ClientDetailPage.tsx` -- add edit header, Google Sheets in Connections tab
- `src/components/dashboard/dashboardData.ts` -- add date helpers, keep as fallback
- `src/i18n/translations.ts` -- new keys


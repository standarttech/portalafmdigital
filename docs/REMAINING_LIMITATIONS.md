# Remaining Limitations

Date: 2026-03-08

## Database / Types
1. **`as any` casts**: Portal, AI Ads, Growth OS tables not in auto-generated `types.ts`. Requires schema sync/regeneration.
2. **Notification preferences**: Per-client rather than per-individual when multiple portal users share a client.

## Features
3. **PDF Export**: Generates HTML designed for Print→PDF. No server-side binary PDF generation.
4. **Cron Jobs**: Cannot verify pg_cron registration from application code. Infrastructure-level verification needed.
5. **Social Media Integration** (AFM Internal): OAuth connections labeled "Coming Soon" — not yet implemented.
6. **AFM Internal Tools tab**: Shows 4 tools as "In Development" (CRM Pipeline, Lead Tracker, P&L, HR Panel).

## Code Health
7. **AfmInternalPage.tsx**: Dead file with stub data, never used in routes.
8. **ClientPortalPage.tsx**: Legacy file, imported but never rendered in routes.
9. **Console Warning**: React forwardRef warning on CategoryBreakdown's inner Metric component — cosmetic.

## Architecture
10. **Client role portal access**: Client role users can access both `/dashboard` (internal) and `/portal` (portal layout). This is by design but may confuse users if not guided properly.

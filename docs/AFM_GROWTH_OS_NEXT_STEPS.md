# AFM GROWTH OS — NEXT STEPS & PRODUCTION READINESS

---

## CRITICAL FIXES (Must do before any user touches this)

### 1. Fix RLS Policies on ALL GOS Tables
**Impact:** Any authenticated user can read/write ALL Growth OS data including other clients' templates, forms, integrations, and API keys.

**Tables to fix:**
- `gos_landing_templates` — replace `true` with `is_agency_admin(auth.uid()) OR has_client_access(auth.uid(), client_id)`
- `gos_forms` — same pattern
- `gos_form_submissions` — authenticated read restricted by form ownership, public INSERT for form submissions
- `gos_onboarding_flows` — `is_agency_member(auth.uid())` for read, `is_agency_admin(auth.uid())` for write
- `gos_onboarding_sessions` — `has_client_access(auth.uid(), client_id)`
- `gos_integrations` — `is_agency_member(auth.uid())` for read, `is_agency_admin(auth.uid())` for write
- `gos_integration_instances` — `is_agency_admin(auth.uid()) OR has_client_access(auth.uid(), client_id)`
- `gos_routing_rules` — `is_agency_admin(auth.uid()) OR has_client_access(auth.uid(), client_id)`
- `gos_routing_log` — `is_agency_member(auth.uid())` for read only

### 2. Migrate API Keys to Vault
**Current:** `gos_integration_instances.config` stores `{"api_key": "sk-xxx", "account_id": "123"}` in plaintext JSONB.
**Fix:** Use `store_social_token()` DB function (already exists) to store API keys in Vault. Store only the Vault reference UUID in the config column.

### 3. Add Client ID Filtering to GOS Page Queries
**Current:** All GOS pages query all records: `supabase.from('gos_forms').select('*')`
**Fix:** Add `.eq('client_id', selectedClientId)` or implement a client selector in the GOS sidebar.

---

## IMPORTANT FIXES (Required for functional product)

### 4. Create Form Submission Edge Function
**Purpose:** Accept form data from public embed, store submission, trigger routing.
**Path:** `supabase/functions/gos-form-submit/index.ts`
**Logic:**
1. Validate form_id exists and is active
2. Validate required fields
3. Store in `gos_form_submissions`
4. Check `submit_action` on form (store/webhook/crm)
5. If `crm`: create CRM lead via existing `crm-webhook` logic
6. If `webhook`: POST to configured URL
7. Evaluate `gos_routing_rules` against submission data
8. Log routing actions to `gos_routing_log`

### 5. Create Public Form Embed Route
**Path:** `/embed/form/:id`
**Purpose:** Render a public-facing form that submits to the Edge Function.
**Implementation:** Add a React route outside auth guard that renders form fields based on `gos_forms.fields` JSONB.

### 6. Create Public Landing Page Embed Route
**Path:** `/embed/landing/:id`
**Purpose:** Render a public-facing landing page from template sections.
**Implementation:** Add a React route outside auth guard that renders sections from `gos_landing_templates.sections`.

### 7. Build Routing Engine
**Location:** Inside the form submission Edge Function (step 4 above).
**Logic:**
1. Load active `gos_routing_rules` ordered by priority
2. For each rule, evaluate ALL conditions against submission data
3. On first match, execute action (assign_user, assign_pipeline, tag, webhook, notify)
4. Log to `gos_routing_log`

### 8. Build Onboarding Client Wizard
**Purpose:** Client-facing multi-step wizard that advances `current_step` and collects `data`.
**Implementation:** New route `/onboarding/:sessionId` or embed in client dashboard. Renders steps from flow definition, collects field values, updates session.

### 9. Add Overview Page Metrics
**Metrics to show:**
- Total forms / active forms
- Total submissions (last 7/30 days)
- Active onboarding sessions / completion rate
- Active integrations / error count
- Active routing rules / events routed (last 7/30 days)

---

## RECOMMENDED IMPLEMENTATION ORDER

| # | Task | Est. Time | Dependencies |
|---|------|-----------|--------------|
| 1 | Fix RLS on all 9 GOS tables | 30 min | None |
| 2 | Add client_id filtering to GOS queries | 1 hr | None |
| 3 | Migrate integration API keys to Vault | 1 hr | Task 1 |
| 4 | Create `gos-form-submit` Edge Function | 2 hr | Task 1 |
| 5 | Create `/embed/form/:id` public route | 2 hr | Task 4 |
| 6 | Build routing engine in Edge Function | 2 hr | Task 4 |
| 7 | Add overview page metrics queries | 2 hr | Tasks 1-2 |
| 8 | Build onboarding client wizard | 3 hr | Task 1 |
| 9 | Create `/embed/landing/:id` public route | 2 hr | Task 1 |
| 10 | Refactor pages into smaller components + react-query | 3 hr | All above |

---

## PRODUCTION-READINESS CHECKLIST

### Security
- [ ] RLS policies fixed on all 9 GOS tables
- [ ] API keys migrated to Supabase Vault
- [ ] Client_id filtering enforced in all queries
- [ ] Form submission endpoint validates input
- [ ] Public embed routes do not expose admin data
- [ ] Rate limiting on form submission endpoint

### Functionality
- [ ] Form submission works end-to-end (embed → Edge Function → DB → routing)
- [ ] Landing page templates render publicly
- [ ] Onboarding wizard advances steps and saves data
- [ ] At least one routing action works (e.g., tag or assign_user)
- [ ] Integration connection validation exists
- [ ] Overview page shows real metrics

### Code Quality
- [ ] All `any` types replaced with proper interfaces
- [ ] Monolithic pages refactored into <150 line components
- [ ] react-query used for data fetching
- [ ] Error handling on all Supabase queries
- [ ] Loading skeletons instead of spinners
- [ ] Confirmation dialogs on delete actions
- [ ] All UI text uses i18n translation keys

### Data Integrity
- [ ] gos_form_submissions receives actual data via Edge Function
- [ ] gos_routing_log records actual routing events
- [ ] gos_onboarding_sessions.current_step actually advances
- [ ] gos_onboarding_sessions.status changes to completed/abandoned
- [ ] gos_integration_instances.last_sync_at gets updated
- [ ] gos_integration_instances.error_message reflects real errors

---

## WHAT TO BUILD NEXT FIRST

If only one thing can be built next, build the **Form Submission Edge Function** (`gos-form-submit`). This unlocks:
1. Real form submissions via public embed
2. Routing engine evaluation
3. CRM lead creation from forms
4. Webhook triggering from forms
5. Data flowing into gos_form_submissions table
6. Data flowing into gos_routing_log table

This single Edge Function makes 3 out of 5 GOS modules functional (Forms, Lead Routing, and partially Integrations via webhooks).

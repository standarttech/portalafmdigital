# AFM DIGITAL GROWTH OS — CURRENT PROJECT AUDIT

Generated: 2026-03-08

---

## 1. PRODUCT OVERVIEW

**Overall app purpose:** AFM Digital is a multi-tenant marketing agency portal for managing ad campaigns across Meta, Google, TikTok. The Growth OS module is a sub-workspace for scaling marketing operations — landing page templates, form building, client onboarding, integrations, and lead routing.

**Primary user types:**
- `AgencyAdmin` — full access to all modules
- `MediaBuyer` — access to assigned clients and campaigns
- `Manager`, `SalesManager`, `AccountManager`, `Designer`, `Copywriter` — agency staff with configurable permissions
- `Client` — restricted to own dashboard only

**Major modules currently present:**
1. Main Platform (Dashboard, Clients, Users, Chat, Tasks, Reports, Budget, Calendar, Audit, Sync Monitor, Branding, Broadcasts)
2. CRM Module (Pipeline, Leads, Webhooks, Analytics, Integrations, Settings)
3. AFM Internal (Dashboard, Media Buying, Social Media, Sales, Stats, Tools, Finance, Income Plan, Financial Planning, Settings)
4. AdminScale (Home, Editor, Overview, Reference)
5. Growth OS (Overview, Landing Templates, Forms, Onboarding, Integrations, Lead Routing)
6. Public Website (Home, About, Services, Case Studies, Contact, Privacy, Terms, Cookies)
7. Scaling Stack (Landing pages, Apply form, Thanks, Privacy, Terms)

**Stage:** Partial production. Main platform and CRM are more mature. Growth OS is a functional CRUD scaffold — all 5 sub-modules have working UIs that read/write to real database tables, but zero backend automation/logic exists.

---

## 2. ROUTES / PAGES MAP

### Growth OS Routes

| Route | Page | Purpose | Status | Key Components | Data Sources | Actions | Missing |
|-------|------|---------|--------|----------------|--------------|---------|---------|
| `/growth-os` | GosOverviewPage | Module hub with cards linking to sub-modules | **implemented** | Card grid, navigation | None (static) | Navigate to sub-modules | No metrics/stats |
| `/growth-os/landing-templates` | GosLandingTemplatesPage | Create/edit landing page templates with section-based editor | **implemented (CRUD only)** | Section editor, preview iframe, embed code | `gos_landing_templates` | Create, edit, duplicate, delete, preview | No public embed route (`/embed/landing/:id` returns 404), no hosting |
| `/growth-os/forms` | GosFormsPage | Build forms with field editor, view submissions | **implemented (CRUD only)** | Field editor, submissions viewer, embed code | `gos_forms`, `gos_form_submissions` | Create, edit, delete, view submissions | No public embed route (`/embed/form/:id` returns 404), no form submission endpoint, `POST /api/form-submit/:id` does not exist |
| `/growth-os/onboarding` | GosOnboardingPage | Design multi-step onboarding flows and track sessions | **implemented (CRUD only)** | Flow editor with step/field builder, session list with progress bars | `gos_onboarding_flows`, `gos_onboarding_sessions`, `clients` | Create/edit flows, start sessions, view session progress | No client-facing wizard UI, no step progression logic, session `current_step` never advances |
| `/growth-os/integrations` | GosIntegrationsPage | Register third-party integrations and connect instances | **implemented (CRUD only)** | Integration cards, connection dialog with API key input | `gos_integrations`, `gos_integration_instances`, `clients` | Add integration, connect with API key, toggle active, delete | API keys stored in **plaintext JSONB**, no actual sync/validation, no Vault usage |
| `/growth-os/lead-routing` | GosLeadRoutingPage | Define condition-based rules to route incoming leads | **implemented (CRUD only)** | Rule editor with conditions/actions, routing log viewer | `gos_routing_rules`, `gos_routing_log` | Create/edit/delete rules, toggle active, view log | No routing engine — rules are stored but never evaluated. Log table is always empty. |

### Platform Routes (non-Growth-OS, for context)

| Route | Status |
|-------|--------|
| `/dashboard` | implemented |
| `/clients` | implemented |
| `/clients/:id` | implemented |
| `/users` | implemented |
| `/presence` | implemented |
| `/sync` | implemented |
| `/reports` | implemented |
| `/audit` | implemented |
| `/decomposition` | implemented |
| `/budget` | implemented |
| `/broadcasts` | implemented |
| `/calendar` | implemented |
| `/tasks` | implemented |
| `/chat` | implemented |
| `/profile` | implemented |
| `/glossary` | implemented |
| `/branding` | implemented |
| `/crm/*` (6 sub-routes) | implemented |
| `/afm-internal/*` (10 sub-routes) | implemented |
| `/adminscale/*` (4 sub-routes) | implemented |
| `/auth` | implemented |
| `/request-access` | implemented |
| `/invite` | implemented |
| `/set-password` | implemented |
| `/setup` | implemented |
| Public website (8 routes) | implemented |
| `/scaling-stack/*` (6 routes) | implemented |

---

## 3. NAVIGATION / APP STRUCTURE

### Sidebar Structure
Growth OS has its own dedicated sidebar (`GrowthOsLayout.tsx`) with:
- Logo area: "GROWTH OS / AFM DIGITAL" with emerald gradient icon
- "Back to Platform" button → navigates to `/dashboard`
- 6 nav items: Overview, Landing Templates, Form Builder, Onboarding, Integrations, Lead Routing
- Sign Out button at bottom

### Top Navigation
`AppHeader` component is shared across all layouts. Contains user avatar, notifications, search, theme toggle.

### Protected vs Public Routes
- **Public:** Website pages (`/`, `/home`, `/about`, etc.), `/auth`, `/request-access`, `/invite`, `/set-password`, `/scaling-stack/*`
- **Protected:** All other routes require authentication via `AuthProvider`
- **Module-guarded:** Growth OS routes wrapped in `<ModuleGuard module="growth_os">` — checks `can_access_growth_os` permission in `user_permissions` table. AgencyAdmin always has access.

### Layout Hierarchy
```
App
├── BrowserRouter
│   ├── WebsiteLayout (public pages)
│   ├── MainLayout (main platform pages)
│   ├── CrmLayout (guarded by ModuleGuard module="crm")
│   ├── AfmInternalLayout (guarded by ModuleGuard module="afm_internal")
│   ├── AdminScaleLayout (guarded by ModuleGuard module="adminscale")
│   └── GrowthOsLayout (guarded by ModuleGuard module="growth_os")
```

### Workspace / Tenant Switching
- No explicit tenant/workspace switcher exists
- Multi-tenancy is via `client_id` columns on data tables
- Growth OS pages currently do **NOT** filter by `client_id` — they show ALL records for authenticated user (security issue)

---

## 4. MODULE-BY-MODULE AUDIT

### 4.1 Landing Page Template System

**Goal:** Allow agency to create reusable landing page templates with sections that can be embedded via iframe.

**Status:** Partially implemented (CRUD only)

**Frontend:** `src/pages/growth-os/GosLandingTemplatesPage.tsx` (367 lines)
- Section-based editor with 8 section types: hero, features, testimonials, pricing, faq, cta, form embed, custom HTML
- Section reordering (move up/down), add/remove
- `SectionConfigEditor` inline component for each type
- `ArrayItemsEditor` helper for list-based sections
- HTML preview generation (inline `generatePreview()` function)
- Embed code generation (iframe pointing to `/embed/landing/:id`)
- Status management (draft/published/archived)
- Duplicate template functionality

**Backend:** None. Only Supabase table CRUD via client SDK.

**Database:** `gos_landing_templates` table
- Sections stored as JSONB array
- Settings stored as JSONB
- `client_id` nullable (can be global or client-specific)
- `created_by` references auth user

**Gaps:**
- `/embed/landing/:id` route does **NOT exist** — embed code generates 404
- No public rendering of templates — only admin preview via `srcDoc` iframe
- Preview HTML is generated client-side with inline styles, not server-rendered
- No image upload for hero backgrounds
- No custom CSS/theming per template
- No analytics/tracking on landing pages

**What is fake:** Embed code appears functional but links to nonexistent route. Published status has no effect.

### 4.2 Reusable Form Builder

**Goal:** Create forms with configurable fields, embed them, collect submissions.

**Status:** Partially implemented (CRUD + submissions viewer, no submission endpoint)

**Frontend:** `src/pages/growth-os/GosFormsPage.tsx` (295 lines)
- 8 field types: text, email, tel, number, textarea, select, checkbox, url
- Field editor with reorder, required toggle, label, placeholder
- Settings tab: name, status (draft/active/archived), submit action (store/webhook/crm)
- Embed tab: iframe code + API endpoint display
- Submissions viewer dialog

**Backend:** None. No Edge Function for form submission.

**Database:** `gos_forms` + `gos_form_submissions`
- Fields stored as JSONB array
- Settings stored as JSONB
- `submit_action` field exists but is never acted upon

**Gaps:**
- `/embed/form/:id` route does **NOT exist**
- `POST /api/form-submit/:id` endpoint does **NOT exist**
- Submit action types (webhook, crm) are selection options only — no implementation
- No form validation rules beyond required flag
- No spam protection (captcha, honeypot)
- No email notifications on submission
- No webhook firing on submission

**What is fake:** Embed code, API endpoint, submit action types are all UI-only.

### 4.3 Client Onboarding Wizard

**Goal:** Multi-step onboarding flows for new clients with progress tracking.

**Status:** Partially implemented (flow designer + session tracking, no client-facing wizard)

**Frontend:** `src/pages/growth-os/GosOnboardingPage.tsx` (392 lines)
- Flow designer: multi-step editor with fields per step
- 7 field types per step: text, email, tel, url, select, file, checkbox
- Session management: start session for a client, view progress bar
- Session detail viewer (shows collected data as JSON)

**Backend:** None.

**Database:** `gos_onboarding_flows` + `gos_onboarding_sessions`
- Steps stored as JSONB array with nested fields
- Sessions track `current_step`, `data` (JSONB), `status`

**Gaps:**
- No client-facing onboarding UI (wizard for clients to fill in)
- `current_step` is set to 0 on creation and never advances
- `completed_at` never gets set
- No file upload handling for `file` type fields
- No auto-population of `client_info` table from onboarding data
- No notifications when session progresses or completes

**What is fake:** Sessions can be created and viewed, but they never progress. The wizard UI for clients does not exist.

### 4.4 Integrations Hub

**Goal:** Register third-party services and manage connection instances with API keys.

**Status:** Partially implemented (CRUD + connection management, no actual integration logic)

**Frontend:** `src/pages/growth-os/GosIntegrationsPage.tsx` (229 lines)
- Integration catalog: add new integrations with name/provider/category/description
- 5 categories: crm, ads, analytics, messaging, general
- Connect dialog: select client, enter API key + account ID
- Active connections list with toggle and delete

**Backend:** None.

**Database:** `gos_integrations` + `gos_integration_instances`
- `config` column (JSONB) stores **API keys in plaintext** — CRITICAL SECURITY ISSUE
- `config_schema` on integrations table is always set to `{}` (unused)
- `error_message`, `last_sync_at` columns exist but are never populated

**Gaps:**
- **API keys stored in plaintext JSONB** — should use Supabase Vault
- No connection validation/testing
- No actual sync logic for any provider
- No OAuth flows
- No token refresh logic
- `config_schema` is never used for dynamic form generation
- `icon_url` and `is_global` fields are unused

**What is fake:** The entire integration is a storage form. No actual connections to any third-party service.

### 4.5 Lead Routing Center

**Goal:** Define condition-based rules to automatically route leads to users/pipelines/tags.

**Status:** Partially implemented (rule CRUD + log viewer, no routing engine)

**Frontend:** `src/pages/growth-os/GosLeadRoutingPage.tsx` (279 lines)
- Rule editor with conditions (field + operator + value)
- 7 condition fields: source, utm_source, utm_medium, utm_campaign, country, form_id, value
- 6 operators: equals, not_equals, contains, starts_with, greater_than, less_than
- 5 action types: assign_user, assign_pipeline, tag, webhook, notify
- Action config inputs (user ID, pipeline ID, tag name, webhook URL, notification channel)
- Priority ordering
- Routing log viewer

**Backend:** None. No Edge Function or trigger evaluates rules.

**Database:** `gos_routing_rules` + `gos_routing_log`
- Conditions stored as JSONB array
- Action config stored as JSONB
- `gos_routing_log` is always empty — nothing writes to it

**Gaps:**
- No routing engine (Edge Function or DB trigger) to evaluate rules against incoming leads
- No integration with CRM leads or form submissions
- Log table is always empty
- No real-time evaluation
- No fallback/default routing

**What is fake:** Rules are stored but never executed. The log viewer will always be empty.

### 4.6 Dashboard / Reporting (Growth OS specific)

**Status:** Missing

The Growth OS overview page (`GosOverviewPage.tsx`) is a static navigation hub with card links to sub-modules. There are no:
- Metrics or KPIs
- Charts or graphs
- Submission counts
- Active session counts
- Integration health status
- Lead routing activity

### 4.7 Auth / User Management

**Status:** Implemented (platform-wide, not Growth-OS-specific)

- Auth via Supabase Auth (email/password)
- Role stored in `agency_users.agency_role` (enum)
- Permissions matrix in `user_permissions` table
- Module access via `ModuleGuard` component checking `can_access_growth_os`
- MFA support (TOTP)
- Force password change flow
- Invite system with magic links
- Request access with admin approval

**File:** `src/contexts/AuthContext.tsx` (205 lines)

### 4.8 Settings / Admin

Growth OS has no dedicated settings page. Platform-wide settings exist in AFM Internal Settings.

---

## 5. FRONTEND ARCHITECTURE

**Framework:** React 18 + TypeScript + Vite

**Routing:** React Router v6 with nested layouts. Module routes use `<Outlet>` pattern.

**State Management:** React Context API (`AuthContext`, `LanguageContext`, `ThemeContext`, `SidebarContext`). No Redux, no Zustand. Growth OS pages use local `useState` + `useEffect` for data fetching.

**Form Libraries:** No react-hook-form in Growth OS pages. All forms use raw `useState` + controlled inputs.

**UI Component System:** shadcn/ui with Radix primitives. Tailwind CSS for styling. Custom semantic tokens in `index.css`.

**Folder Structure:**
```
src/
├── pages/growth-os/          # 7 page components (including GosIntegrationsPage not in sub-folder)
│   ├── GosOverviewPage.tsx
│   ├── GosLandingTemplatesPage.tsx
│   ├── GosFormsPage.tsx
│   ├── GosOnboardingPage.tsx
│   ├── GosIntegrationsPage.tsx
│   └── GosLeadRoutingPage.tsx
├── components/layout/
│   └── GrowthOsLayout.tsx     # Dedicated layout with sidebar
├── components/guards/
│   └── ModuleGuard.tsx        # Module access control
├── components/futuristic/     # Visual overlays used in GOS layout
│   ├── FuturisticOverlay.tsx
│   ├── GradientOrbs.tsx
│   └── ParticleField.tsx
```

**Reusable Components:** shadcn/ui library. No Growth-OS-specific reusable components — all logic is inline in page files.

**Design System:** Dark theme with emerald accent for Growth OS. Uses `hsl(160,70%,40%)` - `hsl(160,70%,50%)` for active states.

**Major Hooks:** None specific to Growth OS. Platform hooks: `useAuth`, `useLanguage`, `useIsMobile`, `useModuleAccess`.

**Technical Debt:**
- All 5 GOS pages are monolithic (229-392 lines each) with inline state management
- No `react-query` — all data fetching uses raw `useEffect` + `useState`
- No error handling on data loads (only on mutations)
- Heavy use of `any` type throughout
- No loading skeletons — only spinner
- Inline `SectionConfigEditor` and `ArrayItemsEditor` in landing templates page should be separate files

---

## 6. BACKEND / SUPABASE ARCHITECTURE

### Auth Setup
- Supabase Auth with email/password
- MFA (TOTP) support
- Email confirmation NOT auto-enabled (requires manual verification)
- Roles in `agency_users` table (not `auth.users`)

### Database Usage
10 Growth OS tables exist and are actively used:
- `gos_landing_templates`
- `gos_forms`
- `gos_form_submissions`
- `gos_onboarding_flows`
- `gos_onboarding_sessions`
- `gos_integrations`
- `gos_integration_instances`
- `gos_routing_rules`
- `gos_routing_log`

### Edge Functions
**None for Growth OS.** Platform has 13 edge functions but none serve Growth OS:
- `approve-user`, `crm-webhook`, `get-vapid-key`, `meta-oauth`, `scheduled-digest`, `send-notification`, `send-webpush`, `store-bot-token`, `sync-google-sheet`, `sync-meta-ads`, `task-reminders`, `telegram-bot`, `test-bot-token`, `trigger-webhooks`

### Storage
No Growth OS storage buckets. Platform has `branding` (public) and `chat-images` (private).

### Realtime
Not used in Growth OS.

### Triggers
No Growth OS triggers. Platform triggers exist for audit logging, notifications, etc.

### Cron Jobs
None for Growth OS.

### RPC Functions
None for Growth OS. Platform has `upsert_afm_stat`, `upsert_finance_data`, etc.

---

## 7. DATABASE SCHEMA

### Growth OS Tables

#### `gos_landing_templates`
- **Purpose:** Store landing page template configurations
- **Key columns:** id, name, description, sections (jsonb), settings (jsonb), status, client_id, created_by
- **Relationships:** client_id → clients.id (nullable)
- **Status:** Created and actively used
- **RLS:** `true` for ALL authenticated — **CRITICAL: any user can read/write all templates**

#### `gos_forms`
- **Purpose:** Store form configurations with field definitions
- **Key columns:** id, name, description, fields (jsonb), settings (jsonb), status, submit_action, client_id, created_by
- **Relationships:** client_id → clients.id (nullable)
- **Status:** Created and actively used
- **RLS:** Not provided in context but likely same `true` pattern

#### `gos_form_submissions`
- **Purpose:** Store form submission data
- **Key columns:** id, form_id, data (jsonb), source, ip_address, created_at
- **Relationships:** form_id → gos_forms.id
- **Status:** Created, table exists but no submission mechanism to populate it
- **RLS:** `true` for ALL authenticated — **any user can read/write all submissions**

#### `gos_onboarding_flows`
- **Purpose:** Store multi-step onboarding flow definitions
- **Key columns:** id, name, description, steps (jsonb), is_default, created_by
- **Relationships:** None
- **Status:** Created and actively used
- **RLS:** Not shown but likely permissive

#### `gos_onboarding_sessions`
- **Purpose:** Track client onboarding progress
- **Key columns:** id, client_id, flow_id, started_by, current_step, data (jsonb), status, completed_at
- **Relationships:** client_id → clients.id, flow_id → gos_onboarding_flows.id
- **Status:** Created and actively used
- **RLS:** Not shown but likely permissive

#### `gos_integrations`
- **Purpose:** Catalog of available integrations
- **Key columns:** id, name, provider, category, description, config_schema (jsonb), icon_url, is_global
- **Relationships:** None
- **Status:** Created and actively used
- **RLS:** `true` for ALL authenticated — **any user can create/delete integrations**

#### `gos_integration_instances`
- **Purpose:** Active connections to third-party services
- **Key columns:** id, integration_id, client_id, created_by, config (jsonb — **contains plaintext API keys**), is_active, error_message, last_sync_at
- **Relationships:** integration_id → gos_integrations.id, client_id → clients.id
- **Status:** Created and actively used
- **RLS:** Not shown but likely permissive

#### `gos_routing_rules`
- **Purpose:** Lead routing rule definitions
- **Key columns:** id, name, description, conditions (jsonb), action_type, action_config (jsonb), priority, is_active, client_id, created_by
- **Relationships:** client_id → clients.id (nullable)
- **Status:** Created and actively used
- **RLS:** Not shown but likely permissive

#### `gos_routing_log`
- **Purpose:** Audit log of routing actions taken
- **Key columns:** id, rule_id, lead_id, lead_source, routed_to, action_taken, matched_conditions (jsonb)
- **Relationships:** rule_id → gos_routing_rules.id
- **Status:** Created but always empty — nothing writes to it

### Missing Tables
- None missing for current scope — schema is adequate for CRUD

### Schema Problems
1. **`gos_integration_instances.config`** stores API keys as plaintext JSONB
2. All GOS tables use `true` RLS or overly permissive policies — no client isolation
3. `gos_integrations.config_schema` is always `{}` — not used for dynamic form generation
4. No indexes on frequently queried columns (client_id, status, created_by)
5. JSONB columns for sections/fields/steps mean no SQL-level validation

---

## 8. AUTHENTICATION, WORKSPACES, MULTI-TENANCY, AND PERMISSIONS

### Current Auth Flow
1. User visits `/auth` → email + password login
2. `AuthContext` fetches role from `agency_users` table
3. If no admin exists, redirected to `/setup` for first admin creation
4. New users go through invite flow or request access → admin approval
5. MFA check if TOTP enrolled
6. Force password change check via `user_settings` table

### Role System
- Roles: `AgencyAdmin`, `MediaBuyer`, `Manager`, `SalesManager`, `AccountManager`, `Designer`, `Copywriter`, `Client`
- Stored in `agency_users.agency_role` (PostgreSQL enum)
- AgencyAdmin bypass all module guards

### Module Access
- `ModuleGuard` component checks `user_permissions.can_access_growth_os`
- AgencyAdmin always has access
- Other roles need explicit flag set to `true`

### Multi-tenancy
- `client_id` exists on most GOS tables
- **NOT ENFORCED** in UI: GOS pages query all records without filtering by client
- **NOT ENFORCED** in RLS: policies use `true` instead of `has_client_access()`

### Security Issues
1. **CRITICAL:** GOS table RLS policies use `true` — any authenticated user can CRUD all GOS data regardless of client assignment
2. **CRITICAL:** API keys in `gos_integration_instances.config` are stored as plaintext JSONB, readable by any authenticated user
3. **HIGH:** No client_id filtering in UI queries — all users see all data
4. **MEDIUM:** `ModuleGuard` only prevents navigation — doesn't protect API calls. A user without `can_access_growth_os` could still call Supabase directly
5. **LOW:** Role cached in localStorage (`afm_cached_role`) — display only, not used for authorization

---

## 9. INTEGRATIONS AUDIT

### Growth OS Integration Hub (gos_integrations)
- **Status:** Placeholder (CRUD shell only)
- **Auth method:** Plaintext API key in JSONB
- **Config location:** Dialog form in `GosIntegrationsPage.tsx`
- **Storage:** `gos_integration_instances.config` column
- **Sync behavior:** None
- **Error handling:** None (error_message column always null)
- **Reconnect logic:** None
- **Missing:** Everything beyond CRUD — validation, sync, OAuth, Vault storage

### Meta / Facebook Ads
- **Status:** Implemented in platform (not Growth OS)
- **Edge Function:** `sync-meta-ads`, `meta-oauth`
- **Secrets:** META_APP_ID, META_APP_SECRET, META_SYSTEM_USER_TOKEN in Vault

### Google Sheets
- **Status:** Implemented in platform
- **Edge Function:** `sync-google-sheet`

### Telegram Bot
- **Status:** Implemented in platform
- **Edge Function:** `telegram-bot`, `store-bot-token`, `test-bot-token`
- **Secret:** TELEGRAM_BOT_TOKEN

### CRM Webhooks
- **Status:** Implemented in CRM module
- **Edge Function:** `crm-webhook`, `trigger-webhooks`

### Email (Resend)
- **Status:** Implemented in platform
- **Secret:** RESEND_API_KEY
- **Edge Function:** `send-notification`

### Web Push
- **Status:** Implemented in platform
- **Secrets:** VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
- **Edge Functions:** `send-webpush`, `get-vapid-key`

---

## 10. LEAD FLOW / DATA FLOW

### Current State
**No end-to-end lead flow exists in Growth OS.**

What exists:
1. **Form definition** — forms can be created and saved to `gos_forms`
2. **Routing rules** — rules can be created and saved to `gos_routing_rules`
3. **Submission storage** — `gos_form_submissions` table exists but has no data ingestion mechanism

What is missing:
1. Public form rendering endpoint
2. Form submission API (Edge Function)
3. Routing engine to evaluate rules on new submissions
4. Connection between GOS forms and CRM leads
5. Notifications on new submissions
6. Webhook firing on form submit
7. Attribution tracking (UTM → lead)

### Implied Architecture (from code):
```
External Form → POST /api/form-submit/:id → Edge Function → 
  → Store in gos_form_submissions
  → Evaluate gos_routing_rules
  → Execute action (assign user, create CRM lead, tag, webhook, notify)
  → Log to gos_routing_log
```

This flow is **entirely unimplemented**.

---

## 11. AUTOMATIONS / BUSINESS LOGIC

### Existing Automations in Growth OS
**None.**

All Growth OS pages are pure CRUD:
- Create/Read/Update/Delete templates, forms, flows, integrations, rules
- No triggers fire on data changes
- No Edge Functions process GOS data
- No cron jobs poll GOS tables

### Platform Automations (for context)
- `auto_create_client_chat_room` trigger on client creation
- `log_audit_event` trigger on multiple tables
- `notify_admins_new_access_request` trigger
- `notify_admins_approval_request` trigger
- `notify_admins_support_message` trigger on chat messages
- `task-reminders` Edge Function (scheduled)
- `scheduled-digest` Edge Function
- `sync-meta-ads` Edge Function

---

## 12. ANALYTICS / REPORTING MODEL

### Growth OS Analytics
**Missing entirely.**

No metrics are calculated or displayed for:
- Form submission rates
- Landing page views
- Onboarding completion rates
- Integration health / sync status
- Lead routing effectiveness
- Conversion funnels

### Platform Analytics (for context)
Main dashboard has KPIs, performance charts, client tables with metrics from `daily_metrics` and `ad_level_metrics`.

---

## 13. ENVIRONMENT / CONFIG / DEPLOYMENT

### Required Environment Variables
- `VITE_SUPABASE_URL` — auto-configured
- `VITE_SUPABASE_PUBLISHABLE_KEY` — auto-configured
- `VITE_SUPABASE_PROJECT_ID` — auto-configured

### Secrets (in Supabase Vault)
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_DB_URL
- RESEND_API_KEY
- TELEGRAM_BOT_TOKEN
- META_APP_ID
- META_APP_SECRET
- META_SYSTEM_USER_TOKEN
- LOVABLE_API_KEY
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_URL

### What Would Break in Deployment
1. Embed URLs (`/embed/form/:id`, `/embed/landing/:id`) return 404
2. API endpoint `POST /api/form-submit/:id` does not exist
3. GOS RLS allows any authenticated user to access all data
4. API keys in `gos_integration_instances` visible to any authenticated user

### Hardcoded Values
- Emerald HSL colors in `GrowthOsLayout.tsx` (lines 41, 46, 78, 82) — should use design tokens
- `window.location.origin` used for embed codes — correct for dynamic generation

---

## 14. FILES AND CODE AREAS THAT MATTER MOST

| Path | Purpose | Stable? |
|------|---------|---------|
| `src/pages/growth-os/GosFormsPage.tsx` | Form builder + submissions | Needs refactor (295 lines, inline state) |
| `src/pages/growth-os/GosLandingTemplatesPage.tsx` | Landing template editor | Needs refactor (367 lines, inline components) |
| `src/pages/growth-os/GosOnboardingPage.tsx` | Onboarding flow designer | Needs refactor (392 lines) |
| `src/pages/growth-os/GosLeadRoutingPage.tsx` | Routing rules | Needs refactor (279 lines) |
| `src/pages/growth-os/GosIntegrationsPage.tsx` | Integration hub | Needs refactor (229 lines) |
| `src/pages/growth-os/GosOverviewPage.tsx` | Overview hub | Stable (51 lines) |
| `src/components/layout/GrowthOsLayout.tsx` | Layout + sidebar | Stable (142 lines) |
| `src/components/guards/ModuleGuard.tsx` | Module access control | Stable (40 lines) |
| `src/contexts/AuthContext.tsx` | Auth + role management | Stable (205 lines) |
| `src/App.tsx` | All route definitions | Stable but large (467 lines) |

---

## 15. CURRENT PROBLEMS / RISKS / TECHNICAL DEBT

### Critical
1. **RLS on ALL GOS tables uses `true`** — any authenticated user can read/write any data
2. **API keys stored in plaintext** in `gos_integration_instances.config` JSONB column
3. **No client isolation** in UI or database — all users see all GOS data

### High
4. **No backend logic** — all 5 modules are CRUD-only with no automation
5. **Embed routes don't exist** — embed codes generate 404s
6. **Form submission endpoint missing** — forms cannot receive data
7. **No routing engine** — routing rules are stored but never evaluated

### Medium
8. Monolithic page components (229-392 lines each)
9. No `react-query` — stale data, no caching, no optimistic updates
10. Heavy `any` typing throughout GOS pages
11. No error handling on data loads
12. No loading skeletons
13. Onboarding sessions never progress (current_step stuck at 0)
14. `config_schema` on integrations is always empty

### Low
15. Hardcoded emerald colors instead of design tokens
16. No i18n for Growth OS button labels (English only in many places)
17. No confirmation dialogs on delete actions
18. No pagination on data lists

---

## 16. WHAT IS NEEDED TO MAKE THIS PRODUCTION-READY

### Critical
- [ ] Fix RLS policies on ALL GOS tables — replace `true` with `is_agency_admin() OR has_client_access(client_id)`
- [ ] Move API keys from `gos_integration_instances.config` to Supabase Vault
- [ ] Add client_id filtering to all GOS page queries
- [ ] Create Edge Function for form submission (`/functions/v1/gos-form-submit`)
- [ ] Create public routes for form embeds and landing page embeds

### Important
- [ ] Build routing engine (Edge Function or DB trigger) to evaluate rules on new leads
- [ ] Build client-facing onboarding wizard UI
- [ ] Add session progression logic for onboarding
- [ ] Implement integration connection validation/testing
- [ ] Add GOS-specific metrics to overview page
- [ ] Refactor monolithic pages into smaller components
- [ ] Replace `any` types with proper interfaces
- [ ] Implement `react-query` for data fetching

### Nice to Have
- [ ] Real-time updates via Supabase Realtime
- [ ] A/B testing for landing templates
- [ ] Form analytics (views, submissions, conversion rate)
- [ ] Visual landing page builder (drag-and-drop)
- [ ] Integration OAuth flows
- [ ] Routing rule testing/simulation
- [ ] Onboarding email templates

---

## 17. RECOMMENDED NEXT BUILD ORDER

1. **Fix RLS policies** on all 9 GOS tables (30 min) — critical security
2. **Add client_id filtering** to all GOS page queries (1 hr)
3. **Create form submission Edge Function** (`gos-form-submit`) that stores to `gos_form_submissions` and triggers routing (2 hr)
4. **Create public form embed route** (`/embed/form/:id`) with React component (2 hr)
5. **Build routing engine** in the form submission Edge Function (2 hr)
6. **Migrate API keys to Vault** in integration instances (1 hr)
7. **Add overview page metrics** (submission counts, active sessions, integration status) (2 hr)
8. **Build onboarding wizard UI** for clients with step progression (3 hr)
9. **Create landing page public renderer** (`/embed/landing/:id`) (2 hr)
10. **Refactor page components** into smaller files with react-query (3 hr)

---

## 18. AI HANDOFF CONTEXT

### Current Architecture
- React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- Supabase for auth, database, and edge functions (Lovable Cloud)
- Context API for state (AuthContext, LanguageContext, ThemeContext)
- React Router v6 with nested layouts and module guards
- 10 GOS database tables exist and have CRUD operations

### Module Status
| Module | Frontend | Backend | Database | Status |
|--------|----------|---------|----------|--------|
| Landing Templates | ✅ Editor | ❌ None | ✅ Table | CRUD only |
| Form Builder | ✅ Editor + Submissions viewer | ❌ No submission endpoint | ✅ Tables | CRUD only |
| Onboarding | ✅ Flow designer + Session list | ❌ No wizard/progression | ✅ Tables | CRUD only |
| Integrations | ✅ Catalog + Connect | ❌ No sync/validation | ✅ Tables | CRUD only, plaintext keys |
| Lead Routing | ✅ Rule editor + Log viewer | ❌ No routing engine | ✅ Tables | CRUD only |

### Real vs Fake
- **Real:** All table CRUD operations work. Data persists. Auth + module guard works.
- **Fake:** Embed codes (404), API endpoints (don't exist), form submission (no endpoint), routing (rules stored but never evaluated), onboarding progression (stuck at step 0), integration sync (no actual connections).

### Database Expectations
- All GOS tables exist and have correct schema
- RLS needs to be fixed from `true` to proper policies
- `gos_integration_instances.config` needs Vault migration

### Auth and Role Assumptions
- `ModuleGuard` with `can_access_growth_os` permission flag
- AgencyAdmin always has access
- Other roles need explicit permission
- RLS should use `is_agency_admin()` and `has_client_access()` functions (already exist)

### Integration Assumptions
- No third-party integrations are actually connected
- GOS integration hub is a generic CRUD catalog — not connected to platform's real Meta/Google/TikTok integrations

### Immediate Next Priorities
1. Fix RLS (security)
2. Build form submission Edge Function
3. Build public embed routes
4. Build routing engine
5. Add client_id filtering

---

## 19. FINAL JSON SNAPSHOT

```json
{
  "app_type": "Multi-tenant marketing agency portal with Growth OS module",
  "stage": "Partial production — Growth OS is CRUD scaffold only",
  "modules": [
    {
      "name": "Landing Templates",
      "status": "partial",
      "frontend": "Section-based editor with 8 types, preview, embed code generation",
      "backend": "none",
      "database": "gos_landing_templates — JSONB sections, permissive RLS",
      "gaps": ["No public embed route", "No hosting/rendering", "RLS uses true"]
    },
    {
      "name": "Form Builder",
      "status": "partial",
      "frontend": "Field editor with 8 types, submissions viewer, embed code",
      "backend": "none",
      "database": "gos_forms + gos_form_submissions — no ingestion mechanism",
      "gaps": ["No embed route", "No submission endpoint", "No webhook/CRM action", "RLS uses true"]
    },
    {
      "name": "Onboarding",
      "status": "partial",
      "frontend": "Flow designer with steps/fields, session tracking with progress",
      "backend": "none",
      "database": "gos_onboarding_flows + gos_onboarding_sessions",
      "gaps": ["No client wizard UI", "Sessions never progress", "No completion logic"]
    },
    {
      "name": "Integrations Hub",
      "status": "partial",
      "frontend": "Catalog CRUD, connection dialog with API key input",
      "backend": "none",
      "database": "gos_integrations + gos_integration_instances — plaintext API keys",
      "gaps": ["API keys in plaintext", "No sync logic", "No validation", "RLS uses true"]
    },
    {
      "name": "Lead Routing",
      "status": "partial",
      "frontend": "Rule editor with conditions/actions, log viewer",
      "backend": "none",
      "database": "gos_routing_rules + gos_routing_log (always empty)",
      "gaps": ["No routing engine", "Log always empty", "No integration with forms/CRM"]
    }
  ],
  "routes": [
    "/growth-os",
    "/growth-os/landing-templates",
    "/growth-os/forms",
    "/growth-os/onboarding",
    "/growth-os/integrations",
    "/growth-os/lead-routing"
  ],
  "tables": [
    "gos_landing_templates",
    "gos_forms",
    "gos_form_submissions",
    "gos_onboarding_flows",
    "gos_onboarding_sessions",
    "gos_integrations",
    "gos_integration_instances",
    "gos_routing_rules",
    "gos_routing_log"
  ],
  "integrations": [
    {"name": "GOS Integration Hub", "status": "placeholder — CRUD catalog only"},
    {"name": "Meta Ads", "status": "implemented in platform, not GOS"},
    {"name": "Google Sheets", "status": "implemented in platform, not GOS"},
    {"name": "Telegram Bot", "status": "implemented in platform, not GOS"},
    {"name": "CRM Webhooks", "status": "implemented in CRM module, not GOS"}
  ],
  "auth_model": "Supabase Auth + agency_users role + user_permissions flags + ModuleGuard",
  "multi_tenant_status": "Schema supports client_id but NOT enforced in UI or RLS for GOS",
  "rls_status": "CRITICAL — all GOS tables use true for RLS policies",
  "main_risks": [
    "RLS policies use true — any authenticated user can CRUD all GOS data",
    "API keys stored in plaintext JSONB in gos_integration_instances",
    "No client_id filtering in GOS page queries",
    "Embed routes return 404",
    "No form submission endpoint exists",
    "No routing engine — rules stored but never evaluated",
    "Onboarding sessions never progress",
    "Zero backend logic for all 5 GOS modules"
  ],
  "next_priorities": [
    "Fix RLS policies on all GOS tables",
    "Add client_id filtering to GOS queries",
    "Create form submission Edge Function",
    "Create public embed routes for forms and landings",
    "Build routing engine",
    "Migrate API keys to Vault",
    "Build onboarding client wizard",
    "Add overview page metrics",
    "Refactor monolithic components",
    "Add react-query for data fetching"
  ]
}
```

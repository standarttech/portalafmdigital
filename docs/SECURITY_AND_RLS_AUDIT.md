# Security & RLS Audit

Date: 2026-03-09 (updated Phase 2)

## Overall Assessment: SECURE (with one pending manual action)

No critical vulnerabilities. Multi-layer security model with defense-in-depth.

**Pending**: Leaked Password Protection not yet enabled — requires manual step in Auth settings.

---

## What Was Verified

### Auth Architecture
| Layer | Mechanism | Verified |
|---|---|---|
| Internal login | Email/password + Supabase Auth | ✓ |
| Role storage | `agency_users.agency_role` (NOT JWT claims) | ✓ |
| MFA | AAL2 challenge via `MfaChallengePage` | ✓ |
| Force password change | `user_settings.force_password_change` guard | ✓ |
| Session timeout | 15s guard in AuthContext | ✓ |
| Portal auth | Separate flow at `/portal/login` | ✓ |
| Portal invite email match | `accept_portal_invite` verifies `auth.users.email` | ✓ |
| Portal deactivation | `status != 'active'` → Access Suspended screen | ✓ |
| Module access | `ModuleGuard` + `user_permissions` table | ✓ |
| Role simulation | `viewAsRole`/`simulatedUser` admin-only | ✓ |

### RLS Coverage

All 100 tables have RLS enabled. Policies verified for key domains:

**Core tables**:
- `agency_users`: admin ALL, self SELECT/UPDATE own
- `clients`: admin ALL, `has_client_access()` SELECT
- `user_permissions`: admin ALL, self SELECT
- `user_settings`: user ALL own; `protect_user_settings_fields` trigger blocks privilege escalation
- `audit_log`: authenticated INSERT (append-only), admin SELECT

**Portal tables**:
- `portal_notifications`: scoped to `client_id` via portal user's client
- `portal_notification_preferences`: scoped to `portal_user_id`
- `client_portal_users`: agency_member SELECT, portal user SELECT own, admin ALL
- `client_portal_files`: has_client_access ALL; portal user SELECT only visible files
- `client_portal_invites`: admin ALL; validation via `validate_portal_invite`/`accept_portal_invite` RPCs

**AI Ads / AI Infra tables**: is_agency_admin ALL; is_agency_member SELECT/INSERT (confirmed for all tables)

**Growth OS**: service_role for rate limits and health checks; agency_member for most; public INSERT for forms

**Public-facing**:
- `access_requests`: anon INSERT (public registration), admin SELECT/UPDATE
- `contact_requests`: anon INSERT (contact form), admin SELECT
- `gos_form_submissions`: public INSERT, admin SELECT

### Security Definer Functions (all have `SET search_path = public`)
- `is_agency_admin`, `is_agency_member`, `has_client_access` — core RLS helpers
- `portal_notification_enabled` — bypasses RLS safely for preference checks
- `validate_portal_invite`, `accept_portal_invite` — invite flow
- `store_social_token`, `get_social_token`, `delete_social_token` — vault ops
- `log_audit_event` — trigger-based audit, sanitizes tokens/secrets before logging
- `protect_user_settings_fields` — prevents non-admin privilege escalation

### Storage Buckets
| Bucket | Access | Policy |
|---|---|---|
| `portal-files` | Private | Authenticated + has_client_access; signed URLs (300s TTL) |
| `chat-images` | Private | Authenticated upload/download |
| `gos-onboarding-files` | Private | Authenticated |
| `branding` | Public | Anyone read; authenticated upload |
| `creative-assets` | Public | Anyone read; has_client_access upload |

### Edge Functions
- All functions use `verify_jwt = false` in config.toml
- Auth validated in-code: `supabase.auth.getClaims()` or `supabase.auth.getUser()` per function
- Background/cron functions validate `CRON_SECRET` or `service_role` key
- `portal-pdf-report`: validates both portal user AND agency_member access
- `campaign-execute`: validates user has client_access before execution
- `crm-webhook`: validates webhook token signature

### Sensitive Data Protection
- `platform_connections_safe` view hides `token_reference`
- `client_webhooks_safe` view hides `secret`
- `log_audit_event` trigger strips `token` from invitations, `token_reference` from connections
- All API tokens stored in Vault (not plaintext DB columns)

---

## Residual Risks

| Risk | Level | Details |
|---|---|---|
| Leaked Password Protection not enabled | **Medium** | Needs manual enable in Auth settings panel |
| `as any` casts for untyped tables | Low | TypeScript-only; no security impact |
| Client role can access both `/dashboard` and `/portal` | Low | By design; data is still scoped correctly by RLS |
| `gos_rate_limits` — no RLS | Informational | Intentional; service_role only table for server-side rate limiting |
| Cron job registration unverifiable | Informational | Infrastructure-level concern; not a security risk |

---

## Action Required

**Enable Leaked Password Protection manually:**
1. Go to Lovable Cloud → Authentication → Password settings
2. Enable "Leaked Password Protection" (HaveIBeenPwned integration)
3. This prevents users from setting passwords that appear in known breach databases

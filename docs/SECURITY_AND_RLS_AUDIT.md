# Security & RLS Audit

Date: 2026-03-08

## Overall Assessment: SECURE

No critical security vulnerabilities found. The platform uses a well-structured multi-layer security model.

## Authentication Layers

### Internal Auth
- Supabase Auth with email/password
- Role stored in `agency_users` table (not in JWT claims — server-verified)
- MFA support with AAL2 challenge
- Force password change mechanism
- 15-second timeout guard against infinite loading
- Session cleanup on SIGNED_OUT

### Portal Auth  
- Separate login flow at `/portal/login`
- Portal users stored in `client_portal_users` with `user_id` FK
- Email match verification on invite acceptance
- Deactivated users see "Access Suspended" screen
- Admins can preview portal without portal user record

### Access Control
- `ModuleGuard` component checks `user_permissions` table for non-admin users
- AgencyAdmin always has full access
- Client role restricted to: `/dashboard`, `/chat`, `/glossary`, `/profile` + portal routes
- Role simulation (`viewAsRole`, `simulatedUser`) for admin preview

## RLS Policies

### Core Tables
- `agency_users`: Admins can manage, users read own
- `clients`: Scoped via `has_client_access` function
- `user_permissions`: Admin write, self read
- `audit_log`: Insert for authenticated + portal users, read for admins

### Portal Tables
- `portal_notifications`: Scoped to `client_id` matching user's portal user record
- `portal_notification_preferences`: Scoped to `portal_user_id` matching user
- `client_portal_users`: Read via agency membership or own user_id
- `client_portal_files`: Scoped to client_id + is_visible_in_portal for portal users
- `client_portal_invites`: Admin only + validate via RPC functions

### Security Definer Functions
All `SECURITY DEFINER` functions have `SET search_path TO 'public'`:
- `is_agency_admin`, `is_agency_member`, `has_client_access` — core access helpers
- `portal_notification_enabled` — preference checks bypassing RLS
- `validate_portal_invite`, `accept_portal_invite` — invite flow
- `store_social_token`, `get_social_token`, `delete_social_token` — vault operations
- `log_audit_event` — trigger-based audit logging
- `protect_user_settings_fields` — prevents non-admin privilege escalation

### Storage Buckets
- `portal-files`: Private, signed URLs with 300s TTL
- `chat-images`: Private, authenticated access
- `gos-onboarding-files`: Private
- `branding`, `creative-assets`: Public (appropriate for their content)

## Sensitive Data Protection
- `platform_connections_safe` view hides `token_reference`
- `client_webhooks_safe` view hides `secret`
- Invitation tokens hidden from `audit_log` via `log_audit_event` trigger
- Vault used for all API tokens/secrets

## Edge Function Security
- All functions validate auth in code (JWT via `getUser()` or service_role key)
- Portal PDF report validates both portal user AND agency member access
- Campaign execution validates user has client access
- Webhook handlers verify signatures

## Risks: NONE CRITICAL
- **Low**: `as any` casts for untyped tables — no security impact, resolved on type regeneration
- **Low**: Client-side role caching in localStorage — always server-verified before data access

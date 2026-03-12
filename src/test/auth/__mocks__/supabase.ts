import { vi } from 'vitest';

// Supabase mock factory — reusable across all auth tests
export function createSupabaseMock(overrides: Record<string, any> = {}) {
  const mock = {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      setSession: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  };

  // Default: from() returns chainable query builder
  mock.from.mockImplementation(() => createQueryBuilder());

  return { ...mock, ...overrides };
}

export function createQueryBuilder(result: any = { data: null, error: null }) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: any) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

// Preset mock responses for common scenarios
export const mockResponses = {
  // Portal user active
  portalUserActive: { data: [{ id: 'pu-1', status: 'active' }], error: null },
  // Portal user deactivated
  portalUserDeactivated: { data: [{ id: 'pu-1', status: 'deactivated' }], error: null },
  // Portal user invited (not yet activated)
  portalUserInvited: { data: [{ id: 'pu-1', status: 'invited' }], error: null },
  // No portal user record
  portalUserNone: { data: [], error: null },
  // Agency admin
  agencyAdmin: { data: { agency_role: 'AgencyAdmin', display_name: 'Admin', avatar_url: null }, error: null },
  // Agency media buyer
  agencyMediaBuyer: { data: { agency_role: 'MediaBuyer', display_name: 'Buyer', avatar_url: null }, error: null },
  // No agency user
  agencyUserNone: { data: null, error: null },
  // Auth sign-in success
  signInSuccess: { data: { user: { id: 'user-1', email: 'test@test.com' }, session: { access_token: 'tok', refresh_token: 'ref' } }, error: null },
  // Auth sign-in failure
  signInFail: { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } },
  // Sign up success (auto-confirmed)
  signUpAutoConfirmed: {
    data: {
      user: {
        id: 'user-1', email: 'client@test.com',
        confirmed_at: '2026-01-01T00:00:00Z',
        email_confirmed_at: '2026-01-01T00:00:00Z',
        identities: [{ id: 'id-1' }],
      },
      session: { access_token: 'tok', refresh_token: 'ref' },
    },
    error: null,
  },
  // Sign up — email confirmation required
  signUpNeedsConfirm: {
    data: {
      user: {
        id: 'user-1', email: 'client@test.com',
        confirmed_at: null,
        email_confirmed_at: null,
        identities: [{ id: 'id-1' }],
      },
      session: null,
    },
    error: null,
  },
  // Sign up — email already registered
  signUpAlreadyRegistered: {
    data: { user: null, session: null },
    error: { message: 'User already registered' },
  },
  // Valid portal invite
  validPortalInvite: {
    data: {
      id: 'invite-1',
      client_id: 'client-1',
      email: 'client@test.com',
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    },
    error: null,
  },
  // Expired portal invite
  expiredPortalInvite: { data: { error: 'expired' }, error: null },
  // Revoked portal invite
  revokedPortalInvite: { data: { error: 'revoked' }, error: null },
  // Already accepted portal invite
  alreadyAcceptedInvite: { data: { error: 'already_accepted' }, error: null },
  // Accept invite success
  acceptInviteSuccess: { data: { success: true }, error: null },
};

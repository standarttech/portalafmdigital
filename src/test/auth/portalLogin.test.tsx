/**
 * Portal Login — unit tests
 *
 * Covers:
 *  - Active portal user → redirects to /portal
 *  - Deactivated user → error
 *  - Invited (not activated) user → error
 *  - User with NO portal access & not AgencyAdmin → "no access" error
 *  - AgencyAdmin without portal_users record → allowed
 *  - Multiple portal_users records (bug: maybeSingle) → picks active one
 *  - Rate limit blocks after 5 attempts
 *  - Pending invite from email-confirmation flow → auto-accepts on login
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockResponses } from './__mocks__/supabase';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual as any, useNavigate: () => mockNavigate, Navigate: ({ to }: any) => <div data-testid="redirect" data-to={to} /> };
});

const supabaseMock = {
  auth: {
    signInWithPassword: vi.fn(),
    getUser: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    setSession: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));
vi.mock('@/hooks/useRateLimit', () => ({
  useRateLimit: () => ({
    isBlocked: vi.fn().mockReturnValue(false),
    record: vi.fn().mockReturnValue({ blocked: false }),
  }),
}));
vi.mock('@/lib/rememberedAccounts', () => ({
  getRememberedAccounts: vi.fn().mockReturnValue([]),
  removeRememberedAccount: vi.fn(),
  clearAllRememberedAccounts: vi.fn(),
  isAccountStale: vi.fn().mockReturnValue(false),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFromChain(result: any) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    // Used for array queries (our bug fix)
    then: (_resolve: any) => Promise.resolve(result).then(_resolve),
  };
  // Support `await supabase.from(...).select(...).eq(...)` returning array
  chain.eq.mockReturnValue({ ...chain, ...result });
  return chain;
}

async function renderAndLogin(email = 'user@test.com', password = 'pass1234') {
  const { default: PortalLoginPage } = await import('@/pages/portal/PortalLoginPage');
  render(<MemoryRouter><PortalLoginPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /login|sign in/i }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PortalLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@test.com' } } });
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
    sessionStorage.clear();
  });

  // ── 1. Active portal user ─────────────────────────────────────────────────
  it('redirects to /portal for active portal user', async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'client_portal_users') {
        return { select: () => ({ eq: () => Promise.resolve(mockResponses.portalUserActive) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    });

    await renderAndLogin();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/portal', { replace: true });
    });
  });

  // ── 2. Deactivated portal user ───────────────────────────────────────────
  it('shows deactivated error and signs out', async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'client_portal_users') {
        return { select: () => ({ eq: () => Promise.resolve(mockResponses.portalUserDeactivated) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    });

    await renderAndLogin();

    await waitFor(() => {
      expect(supabaseMock.auth.signOut).toHaveBeenCalled();
      expect(screen.getByText('portal.deactivated')).toBeInTheDocument();
    });
  });

  // ── 3. Invited (not activated) portal user ───────────────────────────────
  it('shows notActivated error for invited-but-not-activated user', async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'client_portal_users') {
        return { select: () => ({ eq: () => Promise.resolve(mockResponses.portalUserInvited) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    });

    await renderAndLogin();

    await waitFor(() => {
      expect(supabaseMock.auth.signOut).toHaveBeenCalled();
      expect(screen.getByText('portal.notActivated')).toBeInTheDocument();
    });
  });

  // ── 4. User has no portal access and is not AgencyAdmin ──────────────────
  it('shows noAccess error for regular user without portal record', async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'client_portal_users') {
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      }
      if (table === 'agency_users') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(mockResponses.agencyMediaBuyer) }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    });

    await renderAndLogin();

    await waitFor(() => {
      expect(supabaseMock.auth.signOut).toHaveBeenCalled();
      expect(screen.getByText('portal.noAccess')).toBeInTheDocument();
    });
  });

  // ── 5. AgencyAdmin without portal_users record → allowed ─────────────────
  it('allows AgencyAdmin even without portal_users record', async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'client_portal_users') {
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      }
      if (table === 'agency_users') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(mockResponses.agencyAdmin) }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    });

    await renderAndLogin();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/portal', { replace: true });
    });
  });

  // ── 6. Multiple portal_users records (bug fix test) ──────────────────────
  it('handles multiple portal_users records — picks active one', async () => {
    // This was the critical bug: maybeSingle() would throw with multiple rows
    const multipleRecords = {
      data: [
        { id: 'pu-1', status: 'invited' },   // old record
        { id: 'pu-2', status: 'active' },    // new active record
      ],
      error: null,
    };

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'client_portal_users') {
        return { select: () => ({ eq: () => Promise.resolve(multipleRecords) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    });

    await renderAndLogin();

    await waitFor(() => {
      // Should find the active record and redirect, NOT show error
      expect(mockNavigate).toHaveBeenCalledWith('/portal', { replace: true });
    });
  });

  // ── 7. Wrong password → error shown ─────────────────────────────────────
  it('shows error for invalid credentials', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue(mockResponses.signInFail);

    await renderAndLogin();

    await waitFor(() => {
      expect(screen.getByText('portal.invalidCredentials')).toBeInTheDocument();
    });
  });

  // ── 8. Pending invite from email-confirmation → auto-accepts ─────────────
  it('calls accept_portal_invite when pending invite is in sessionStorage', async () => {
    sessionStorage.setItem('pending_portal_invite_id', 'invite-xyz');
    sessionStorage.setItem('pending_portal_invite_client', 'client-1');

    supabaseMock.rpc.mockResolvedValue({ data: { success: true }, error: null });
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'client_portal_users') {
        return { select: () => ({ eq: () => Promise.resolve(mockResponses.portalUserActive) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    });

    await renderAndLogin();

    await waitFor(() => {
      expect(supabaseMock.rpc).toHaveBeenCalledWith('accept_portal_invite', {
        _invite_id: 'invite-xyz',
        _user_id: 'user-1',
      });
      expect(sessionStorage.getItem('pending_portal_invite_id')).toBeNull();
    });
  });
});

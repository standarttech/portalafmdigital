/**
 * PortalAcceptInvitePage — unit tests
 *
 * Covers BOTH invitation variants:
 *  Variant A — Admin sends invite via email → client clicks link
 *  Variant B — same accept flow after self-request approval
 *
 * Scenarios:
 *  - Valid token → form shown with invite email
 *  - Expired token → expired screen
 *  - Revoked token → revoked screen
 *  - Already accepted → "Already Activated" screen
 *  [Sign-In flow]
 *  - Correct email + password → invite accepted → redirect to /portal
 *  - Email mismatch → error + sign out
 *  - Wrong password → error
 *  [Sign-Up flow]
 *  - New user, auto-confirmed → invite accepted → redirect to /portal
 *  - New user, email confirmation required → pending invite stored in sessionStorage
 *  - Email already registered → switch to sign-in mode + error message
 *  - Passwords do not match → validation error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    // token injected per-test via searchParamsToken
    useSearchParams: () => [new URLSearchParams(`token=${searchParamsToken}`), vi.fn()],
  };
});

let searchParamsToken = 'valid-token-123';

const rpcMock = vi.fn();
const fromMock = vi.fn();
const signInMock = vi.fn();
const signUpMock = vi.fn();
const getUserMock = vi.fn();
const signOutMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => signInMock(...args),
      signUp: (...args: any[]) => signUpMock(...args),
      getUser: (...args: any[]) => getUserMock(...args),
      signOut: (...args: any[]) => signOutMock(...args),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: (...args: any[]) => fromMock(...args),
    rpc: (...args: any[]) => rpcMock(...args),
  },
}));

// ── Import component ONCE ──────────────────────────────────────────────────────

import PortalAcceptInvitePage from '@/pages/portal/PortalAcceptInvitePage';

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_INVITE_DATA = {
  id: 'invite-1',
  client_id: 'client-1',
  email: 'client@test.com',
  expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/portal/accept-invite?token=${searchParamsToken}`]}>
      <PortalAcceptInvitePage />
    </MemoryRouter>
  );
}

function mockAuditLog() {
  fromMock.mockImplementation(() => ({
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PortalAcceptInvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockReset();
    signInMock.mockReset();
    signUpMock.mockReset();
    getUserMock.mockReset();
    sessionStorage.clear();
    searchParamsToken = 'valid-token-123';
    signOutMock.mockResolvedValue({});
    mockAuditLog();
  });

  // ── Token validation states ───────────────────────────────────────────────

  it('shows form with invite email when token is valid', async () => {
    rpcMock.mockResolvedValue({ data: VALID_INVITE_DATA, error: null });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/activate portal access/i)).toBeInTheDocument();
      expect(screen.getByText('client@test.com')).toBeInTheDocument();
    });
  });

  it('shows expired screen for expired invite', async () => {
    rpcMock.mockResolvedValue({ data: { error: 'expired' }, error: null });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/invite expired/i)).toBeInTheDocument();
    });
  });

  it('shows revoked screen for revoked invite', async () => {
    rpcMock.mockResolvedValue({ data: { error: 'revoked' }, error: null });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/invite revoked/i)).toBeInTheDocument();
    });
  });

  it('shows already-activated screen for already-used invite', async () => {
    rpcMock.mockResolvedValue({ data: { error: 'already_accepted' }, error: null });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/already activated/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('shows invalid screen when token is empty', async () => {
    searchParamsToken = '';
    rpcMock.mockResolvedValue({ data: null, error: null });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/invalid invite/i)).toBeInTheDocument();
    });
  });

  // ── Sign-In flow — Variant A: Admin invite, existing account ─────────────

  it('[signin] accepts invite and shows success screen', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: VALID_INVITE_DATA, error: null })  // validate_portal_invite
      .mockResolvedValueOnce({ data: { success: true }, error: null }); // accept_portal_invite

    signInMock.mockResolvedValue({ error: null });
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1', email: 'client@test.com' } } });

    renderPage();
    await waitFor(() => screen.getByText(/activate portal access/i));

    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in.*activate/i }));

    await waitFor(() => {
      // accept_portal_invite must be called with correct args
      expect(rpcMock).toHaveBeenCalledWith('accept_portal_invite', {
        _invite_id: 'invite-1',
        _user_id: 'u1',
      });
      // Success screen shown (before 1500ms redirect)
      expect(screen.getByText(/portal access activated/i)).toBeInTheDocument();
    });
  });

  it('[signin] shows error and signs out when email does not match invite', async () => {
    rpcMock.mockResolvedValueOnce({ data: VALID_INVITE_DATA, error: null });
    signInMock.mockResolvedValue({ error: null });
    getUserMock.mockResolvedValue({ data: { user: { id: 'u2', email: 'other@test.com' } } });

    renderPage();
    await waitFor(() => screen.getByText(/activate portal access/i));

    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in.*activate/i }));

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled();
      expect(screen.getByText(/this invite is for client@test\.com/i)).toBeInTheDocument();
    });
  });

  it('[signin] shows error message for wrong password', async () => {
    rpcMock.mockResolvedValueOnce({ data: VALID_INVITE_DATA, error: null });
    signInMock.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

    renderPage();
    await waitFor(() => screen.getByText(/activate portal access/i));

    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in.*activate/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
    });
  });

  // ── Sign-Up flow — Variant A: Admin invite, new account ──────────────────

  it('[signup] creates account and accepts invite when auto-confirmed', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: VALID_INVITE_DATA, error: null })
      .mockResolvedValueOnce({ data: { success: true }, error: null });

    signUpMock.mockResolvedValue({
      data: {
        user: {
          id: 'u1', email: 'client@test.com',
          confirmed_at: '2026-01-01T00:00:00Z',
          email_confirmed_at: '2026-01-01T00:00:00Z',
          identities: [{ id: 'id-1' }],
        },
      },
      error: null,
    });

    renderPage();
    await waitFor(() => screen.getByText(/activate portal access/i));

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => screen.getByLabelText(/full name/i));

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Client' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'mypassword' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'mypassword' } });
    fireEvent.click(screen.getByRole('button', { name: /create account.*activate/i }));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('accept_portal_invite', {
        _invite_id: 'invite-1',
        _user_id: 'u1',
      });
      expect(screen.getByText(/portal access activated/i)).toBeInTheDocument();
    });
  });

  it('[signup] stores pending invite in sessionStorage when email confirmation required', async () => {
    rpcMock.mockResolvedValueOnce({ data: VALID_INVITE_DATA, error: null });

    signUpMock.mockResolvedValue({
      data: {
        user: {
          id: 'u1', email: 'client@test.com',
          confirmed_at: null,
          email_confirmed_at: null,
          identities: [{ id: 'id-1' }],
        },
      },
      error: null,
    });

    renderPage();
    await waitFor(() => screen.getByText(/activate portal access/i));

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => screen.getByLabelText(/full name/i));

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Client' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'mypassword' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'mypassword' } });
    fireEvent.click(screen.getByRole('button', { name: /create account.*activate/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem('pending_portal_invite_id')).toBe('invite-1');
      expect(sessionStorage.getItem('pending_portal_invite_client')).toBe('client-1');
    });
  });

  it('[signup] switches to sign-in mode when email already registered', async () => {
    rpcMock.mockResolvedValueOnce({ data: VALID_INVITE_DATA, error: null });
    signUpMock.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    renderPage();
    await waitFor(() => screen.getByText(/activate portal access/i));

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => screen.getByLabelText(/full name/i));

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass1234' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'pass1234' } });
    fireEvent.click(screen.getByRole('button', { name: /create account.*activate/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists.*sign in instead/i)).toBeInTheDocument();
    });
  });

  it('[signup] shows validation error when passwords do not match', async () => {
    rpcMock.mockResolvedValueOnce({ data: VALID_INVITE_DATA, error: null });

    renderPage();
    await waitFor(() => screen.getByText(/activate portal access/i));

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => screen.getByLabelText(/full name/i));

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass1234' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'different99' } });
    fireEvent.click(screen.getByRole('button', { name: /create account.*activate/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });
});

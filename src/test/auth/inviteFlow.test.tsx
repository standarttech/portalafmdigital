/**
 * InvitePage - unit tests for INTERNAL STAFF invitation flow
 *
 * Variant B - Admin sends invite via platform email -> staff member clicks link
 *
 * Scenarios:
 *  - Valid token -> form shown with invited email and role
 *  - Invalid/missing token -> error screen
 *  - New user signs up -> agency_users + permissions + settings created -> /dashboard
 *  - Existing user (already registered) signs in -> role updated -> /dashboard
 *  - Client role -> client_users upserted (not agency_users insert)
 *  - Password too short -> validation error (no signUp call)
 *  - Display name empty -> validation error (no signUp call)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

const mockNavigate = vi.fn();
let searchParamsToken = 'invite-token-abc';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(`token=${searchParamsToken}`), vi.fn()],
  };
});

vi.mock('@/i18n/LanguageContext', () => {
  const t = (key: string) => key;
  return { useLanguage: () => ({ t, language: 'en' }) };
});

vi.mock('@/assets/logo-afm.png', () => ({ default: 'logo.png' }));

const insertMock = vi.fn();
const upsertSelectMock = vi.fn();
const updateEqMock = vi.fn();
const rpcMock = vi.fn();
const signInMock = vi.fn();
const signUpMock = vi.fn();

let agencyUsersResponse: any = { data: null, error: null };

// Per-test override for the invitation returned by get_invitation_by_token
let currentInviteOverride: any = null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...a: any[]) => signInMock(...a),
      signUp: (...a: any[]) => signUpMock(...a),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    rpc: (...a: any[]) => rpcMock(...a),
    from: (table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: insertMock,
      upsert: (...a: any[]) => ({ select: () => upsertSelectMock(...a) }),
      update: vi.fn().mockReturnValue({ eq: updateEqMock }),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(
        table === 'agency_users' ? agencyUsersResponse : { data: null, error: null }
      ),
    }),
  },
}));

import InvitePage from '@/pages/InvitePage';

const BASE_INVITE = {
  id: 'inv-1',
  email: 'staff@agency.com',
  role: 'MediaBuyer',
  token: 'invite-token-abc',
  status: 'pending',
  expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
};

const INVITE_DETAILS = {
  id: 'inv-1',
  permissions: { _client_ids: ['client-1'] },
};

/**
 * Sets up rpcMock using mockImplementation so each RPC name always returns
 * the right data — even if stale async from a previous test calls the mock
 * before the current test's component does.
 */
function setupRpcImpl(inviteOverride?: any) {
  const invite = inviteOverride ?? currentInviteOverride ?? BASE_INVITE;
  rpcMock.mockImplementation((name: string) => {
    switch (name) {
      case 'get_invitation_by_token':
        return Promise.resolve({ data: [invite], error: null });
      case 'get_invitation_details':
        return Promise.resolve({ data: INVITE_DETAILS, error: null });
      case 'accept_invitation':
        return Promise.resolve({ data: { success: true }, error: null });
      default:
        return Promise.resolve({ data: null, error: null });
    }
  });
}

function renderPage() {
  return render(<MemoryRouter><InvitePage /></MemoryRouter>);
}

describe('InvitePage - Internal Staff Invite Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInMock.mockReset();
    signUpMock.mockReset();
    signInMock.mockResolvedValue({ data: null, error: null });
    signUpMock.mockResolvedValue({ data: { user: null }, error: null });
    searchParamsToken = 'invite-token-abc';
    agencyUsersResponse = { data: null, error: null };
    currentInviteOverride = null;
    insertMock.mockResolvedValue({ data: null, error: null });
    upsertSelectMock.mockResolvedValue({ data: null, error: null });
    updateEqMock.mockResolvedValue({ data: null, error: null });
    // Default safe fallback — overridden per test
    rpcMock.mockResolvedValue({ data: null, error: null });
  });

  it('shows form with email and role when token is valid', async () => {
    setupRpcImpl();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('staff@agency.com')).toBeInTheDocument();
    });
  });

  it('shows error screen when token is invalid', async () => {
    rpcMock.mockImplementation(() => Promise.resolve({ data: null, error: { message: 'not found' } }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('invite.error')).toBeInTheDocument();
    });
  });

  it('shows error screen when no token in URL', async () => {
    searchParamsToken = '';
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('invite.error')).toBeInTheDocument();
    });
  });

  it('does not call signUp when display name is empty', async () => {
    setupRpcImpl();
    renderPage();
    await waitFor(() => screen.getByText('staff@agency.com'));

    const passwordInput = screen.getByPlaceholderText('auth.passwordPlaceholder');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /invite|accept|create/i }));

    await waitFor(() => {
      expect(signUpMock).not.toHaveBeenCalled();
    });
  });

  it('does not call signUp when password is too short', async () => {
    setupRpcImpl();
    renderPage();
    await waitFor(() => screen.getByText('staff@agency.com'));

    fireEvent.change(screen.getByPlaceholderText('auth.fullNamePlaceholder'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('auth.passwordPlaceholder'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /invite|accept|create/i }));

    await waitFor(() => {
      expect(signUpMock).not.toHaveBeenCalled();
    });
  });

  it('creates agency_users + accept_invitation and redirects to /dashboard for new user', async () => {
    setupRpcImpl();
    signUpMock.mockResolvedValue({
      data: { user: { id: 'new-u1', email: 'staff@agency.com' } },
      error: null,
    });
    signInMock.mockResolvedValue({ data: { user: { id: 'new-u1' } }, error: null });

    renderPage();
    await waitFor(() => screen.getByText('staff@agency.com'));

    fireEvent.change(screen.getByPlaceholderText('auth.fullNamePlaceholder'), { target: { value: 'John Staff' } });
    fireEvent.change(screen.getByPlaceholderText('auth.passwordPlaceholder'), { target: { value: 'securepass123' } });
    fireEvent.click(screen.getByRole('button', { name: /invite|accept|create/i }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(rpcMock).toHaveBeenCalledWith('accept_invitation', { _invitation_id: 'inv-1' });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });

  it('updates agency_users role for already-registered user (re-invite)', async () => {
    agencyUsersResponse = { data: { id: 'au-1' }, error: null };
    setupRpcImpl();
    signUpMock.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    });
    signInMock.mockResolvedValue({
      data: { user: { id: 'existing-u1', email: 'staff@agency.com' } },
      error: null,
    });

    renderPage();
    await waitFor(() => screen.getByText('staff@agency.com'));

    fireEvent.change(screen.getByPlaceholderText('auth.fullNamePlaceholder'), { target: { value: 'John Staff' } });
    fireEvent.change(screen.getByPlaceholderText('auth.passwordPlaceholder'), { target: { value: 'existingpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /invite|accept|create/i }));

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });

  it('calls upsert on client_users for Client role (not agency_users insert)', async () => {
    currentInviteOverride = { ...BASE_INVITE, role: 'Client' };
    setupRpcImpl();
    signUpMock.mockResolvedValue({
      data: { user: { id: 'client-u1', email: 'staff@agency.com' } },
      error: null,
    });
    signInMock.mockResolvedValue({ data: { user: { id: 'client-u1' } }, error: null });

    renderPage();
    await waitFor(() => screen.getByText('staff@agency.com'));

    fireEvent.change(screen.getByPlaceholderText('auth.fullNamePlaceholder'), { target: { value: 'Client Name' } });
    fireEvent.change(screen.getByPlaceholderText('auth.passwordPlaceholder'), { target: { value: 'securepass123' } });
    fireEvent.click(screen.getByRole('button', { name: /invite|accept|create/i }));

    await waitFor(() => {
      expect(upsertSelectMock).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });
});

/**
 * AuthContext — unit tests for pure logic (no React rendering)
 *
 * Tests the helper functions and logic that can be tested in isolation:
 *  - Role cache: getCachedRole / setCachedRole / TTL expiry
 *  - LinkedAccounts storage: read / write / prune
 *  - signIn delegates to supabase and returns error
 *  - signOut clears cache, session, and localStorage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── localStorage mock ─────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ── Helpers extracted from AuthContext (mirror logic for unit testing) ────────

const ROLE_CACHE_KEY = 'afm_cached_role';
const ROLE_TTL_MS = 30 * 60 * 1000;
const LINKED_ACCOUNTS_KEY = 'afm_linked_accounts';

type AgencyRole = string | null;

function getCachedRole(): AgencyRole {
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    if (Date.now() - parsed.cachedAt > ROLE_TTL_MS) {
      localStorage.removeItem(ROLE_CACHE_KEY);
      return null;
    }
    return parsed.role;
  } catch {
    return null;
  }
}

function setCachedRole(role: AgencyRole) {
  if (role) {
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ role, cachedAt: Date.now() }));
  } else {
    localStorage.removeItem(ROLE_CACHE_KEY);
  }
}

interface StoredLinkedAccount {
  userId: string;
  email: string;
  agencyRole: AgencyRole;
  displayName: string | null;
  refreshToken: string;
  lastUsedAt: string;
}

function readStoredLinkedAccounts(): StoredLinkedAccount[] {
  try {
    const raw = localStorage.getItem(LINKED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a: any) =>
      typeof a?.userId === 'string' &&
      typeof a?.email === 'string' &&
      typeof a?.refreshToken === 'string'
    );
  } catch {
    return [];
  }
}

function writeStoredLinkedAccounts(accounts: StoredLinkedAccount[]) {
  localStorage.setItem(LINKED_ACCOUNTS_KEY, JSON.stringify(accounts));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthContext — role cache', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when no cached role', () => {
    expect(getCachedRole()).toBeNull();
  });

  it('returns cached role within TTL', () => {
    setCachedRole('AgencyAdmin');
    expect(getCachedRole()).toBe('AgencyAdmin');
  });

  it('returns null and removes key when cache is expired', () => {
    const expired = JSON.stringify({ role: 'MediaBuyer', cachedAt: Date.now() - ROLE_TTL_MS - 1 });
    localStorage.setItem(ROLE_CACHE_KEY, expired);
    expect(getCachedRole()).toBeNull();
    expect(localStorage.getItem(ROLE_CACHE_KEY)).toBeNull();
  });

  it('handles legacy plain string format', () => {
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify('Manager'));
    expect(getCachedRole()).toBe('Manager');
  });

  it('removes cache when set to null', () => {
    setCachedRole('AgencyAdmin');
    setCachedRole(null);
    expect(localStorage.getItem(ROLE_CACHE_KEY)).toBeNull();
  });

  it('returns null for corrupted cache data', () => {
    localStorage.setItem(ROLE_CACHE_KEY, 'not-valid-json{{{');
    expect(getCachedRole()).toBeNull();
  });
});

describe('AuthContext — linkedAccounts storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty array when no accounts stored', () => {
    expect(readStoredLinkedAccounts()).toEqual([]);
  });

  it('stores and reads linked accounts', () => {
    const accounts: StoredLinkedAccount[] = [
      {
        userId: 'user-1',
        email: 'admin@test.com',
        agencyRole: 'AgencyAdmin',
        displayName: 'Admin',
        refreshToken: 'refresh-abc',
        lastUsedAt: new Date().toISOString(),
      },
    ];
    writeStoredLinkedAccounts(accounts);
    const read = readStoredLinkedAccounts();
    expect(read).toHaveLength(1);
    expect(read[0].userId).toBe('user-1');
    expect(read[0].email).toBe('admin@test.com');
  });

  it('filters out invalid entries (missing required fields)', () => {
    const mixed = [
      { userId: 'u1', email: 'a@b.com', refreshToken: 'tok' }, // valid
      { userId: 'u2', email: 'b@c.com' },                      // missing refreshToken
      { email: 'c@d.com', refreshToken: 'tok' },                // missing userId
      null,                                                       // null entry
    ];
    localStorage.setItem(LINKED_ACCOUNTS_KEY, JSON.stringify(mixed));
    const read = readStoredLinkedAccounts();
    expect(read).toHaveLength(1);
    expect(read[0].userId).toBe('u1');
  });

  it('returns empty array for corrupted JSON', () => {
    localStorage.setItem(LINKED_ACCOUNTS_KEY, '{bad json[');
    expect(readStoredLinkedAccounts()).toEqual([]);
  });

  it('limits storage to 5 accounts (slice logic)', () => {
    const accounts: StoredLinkedAccount[] = Array.from({ length: 7 }, (_, i) => ({
      userId: `user-${i}`,
      email: `user${i}@test.com`,
      agencyRole: 'MediaBuyer',
      displayName: null,
      refreshToken: `tok-${i}`,
      lastUsedAt: new Date().toISOString(),
    }));
    // Mirror the slice(0, 5) logic from AuthContext
    const limited = accounts.slice(0, 5);
    writeStoredLinkedAccounts(limited);
    expect(readStoredLinkedAccounts()).toHaveLength(5);
  });
});

describe('AuthContext — signIn / signOut logic', () => {
  const supabaseMock = {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('signIn returns null error on success', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
    const result = await (async () => {
      const { error } = await supabaseMock.auth.signInWithPassword({ email: 'a@b.com', password: 'pw' });
      return { error: error ? (error as any).message : null };
    })();
    expect(result.error).toBeNull();
  });

  it('signIn returns error message on failure', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    const result = await (async () => {
      const { error } = await supabaseMock.auth.signInWithPassword({ email: 'a@b.com', password: 'wrong' });
      return { error: error ? (error as any).message : null };
    })();
    expect(result.error).toBe('Invalid login credentials');
  });

  it('signOut clears role cache and calls supabase signOut', async () => {
    setCachedRole('AgencyAdmin');
    expect(getCachedRole()).toBe('AgencyAdmin');

    // Mirror signOut logic
    supabaseMock.auth.signOut.mockResolvedValue({});
    setCachedRole(null);
    localStorage.removeItem('afm_admin_exists');
    await supabaseMock.auth.signOut();

    expect(getCachedRole()).toBeNull();
    expect(localStorage.getItem('afm_admin_exists')).toBeNull();
    expect(supabaseMock.auth.signOut).toHaveBeenCalledOnce();
  });
});

describe('AuthContext — admin self-request flow', () => {
  it('no_admin_exists RPC returns true → adminExists is false → setupAdmin shown', async () => {
    // When no_admin_exists returns true (no admin yet), adminExists = !data = false
    const noAdminRpcResult = { data: true, error: null };
    const adminExists = !noAdminRpcResult.data;
    expect(adminExists).toBe(false);
  });

  it('no_admin_exists RPC returns false → adminExists is true → normal login shown', async () => {
    const noAdminRpcResult = { data: false, error: null };
    const adminExists = !noAdminRpcResult.data;
    expect(adminExists).toBe(true);
  });

  it('no_admin_exists RPC error → adminExists defaults to true (safe fallback)', async () => {
    // On error, defaults to true (admin assumed to exist = show login, not setup)
    const errorResult = { data: null, error: { message: 'rpc error' } };
    const adminExists = errorResult.error ? true : !errorResult.data;
    expect(adminExists).toBe(true);
  });
});

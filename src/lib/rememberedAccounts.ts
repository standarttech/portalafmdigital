/**
 * Remembered Accounts — safe local-device convenience layer.
 * Stores ONLY display info (no tokens, no secrets).
 * TTL-based: accounts older than configured hours are hidden/pruned.
 */

const STORAGE_KEY = 'afm_remembered_accounts';
const DEFAULT_TTL_HOURS = 72;

export type AccountType = 'internal' | 'portal';

export interface RememberedAccount {
  /** Supabase auth user id */
  userId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** 'internal' | 'portal' */
  accountType: AccountType;
  /** Agency role label for internal accounts */
  roleLabel: string | null;
  /** Client name for portal accounts */
  portalClientLabel: string | null;
  /** Preferred entry route, e.g. '/dashboard' or '/portal' */
  entryRoute: string;
  /** ISO timestamp of last successful sign-in */
  lastUsedAt: string;
}

function readAll(): RememberedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a: any) => typeof a?.userId === 'string' && typeof a?.email === 'string',
    );
  } catch {
    return [];
  }
}

function writeAll(accounts: RememberedAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

/** Get remembered accounts that are still fresh (within TTL). */
export function getRememberedAccounts(ttlHours: number = DEFAULT_TTL_HOURS): RememberedAccount[] {
  const all = readAll();
  const cutoff = Date.now() - ttlHours * 60 * 60 * 1000;
  return all
    .filter((a) => new Date(a.lastUsedAt).getTime() > cutoff)
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
}

/** Get all remembered accounts including stale ones (for "expired" display). */
export function getAllRememberedAccounts(): RememberedAccount[] {
  return readAll().sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
  );
}

/** Check if an account is stale (beyond TTL). */
export function isAccountStale(account: RememberedAccount, ttlHours: number = DEFAULT_TTL_HOURS): boolean {
  const cutoff = Date.now() - ttlHours * 60 * 60 * 1000;
  return new Date(account.lastUsedAt).getTime() <= cutoff;
}

/** Add or update a remembered account after successful sign-in. */
export function upsertRememberedAccount(account: Omit<RememberedAccount, 'lastUsedAt'>): void {
  const all = readAll();
  const entry: RememberedAccount = {
    ...account,
    lastUsedAt: new Date().toISOString(),
  };
  // Deduplicate by unique key: userId + accountType
  const key = `${account.userId}:${account.accountType}`;
  const filtered = all.filter((a) => `${a.userId}:${a.accountType}` !== key);
  const next = [entry, ...filtered].slice(0, 10);
  writeAll(next);
}

/** Remove a specific remembered account. */
export function removeRememberedAccount(userId: string, accountType?: AccountType): void {
  const all = readAll();
  const filtered = accountType
    ? all.filter((a) => !(a.userId === userId && a.accountType === accountType))
    : all.filter((a) => a.userId !== userId);
  writeAll(filtered);
}

/** Clear all remembered accounts from this device. */
export function clearAllRememberedAccounts(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Prune stale entries older than TTL. */
export function pruneStaleAccounts(ttlHours: number = DEFAULT_TTL_HOURS): void {
  const cutoff = Date.now() - ttlHours * 60 * 60 * 1000;
  const all = readAll();
  const fresh = all.filter((a) => new Date(a.lastUsedAt).getTime() > cutoff);
  writeAll(fresh);
}

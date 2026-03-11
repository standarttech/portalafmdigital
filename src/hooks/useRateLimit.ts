const WINDOW_MS = 60 * 1000;     // 1 minute sliding window
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 5 * 60 * 1000;  // 5 minute block

export function useRateLimit(key: string) {
  const blockKey = `rl_block_${key}`;
  const attemptsKey = `rl_attempts_${key}`;

  const isBlocked = (): boolean => {
    const raw = sessionStorage.getItem(blockKey);
    if (!raw) return false;
    const until = parseInt(raw, 10);
    if (Date.now() < until) return true;
    sessionStorage.removeItem(blockKey);
    return false;
  };

  const record = (): { blocked: boolean } => {
    if (isBlocked()) return { blocked: true };

    const raw = sessionStorage.getItem(attemptsKey);
    const now = Date.now();
    const attempts: number[] = raw ? (JSON.parse(raw) as number[]).filter(t => now - t < WINDOW_MS) : [];

    attempts.push(now);

    if (attempts.length >= MAX_ATTEMPTS) {
      sessionStorage.setItem(blockKey, String(now + BLOCK_MS));
      sessionStorage.removeItem(attemptsKey);
      return { blocked: true };
    }

    sessionStorage.setItem(attemptsKey, JSON.stringify(attempts));
    return { blocked: false };
  };

  return { isBlocked, record };
}

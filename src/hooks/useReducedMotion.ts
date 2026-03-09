import { useState, useEffect } from 'react';

/**
 * Returns true when user prefers reduced motion OR device is likely low-performance.
 * Use this to disable heavy canvas/animation effects globally.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  });

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

/**
 * Detects low-performance devices via hardwareConcurrency and deviceMemory.
 * Returns true if the device is likely to struggle with heavy visual effects.
 */
export function useLowPerformance(): boolean {
  const [low, setLow] = useState(false);

  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = (navigator as any).deviceMemory ?? 8;
    setLow(cores <= 2 || memory <= 2);
  }, []);

  return low;
}

/**
 * Combined: should heavy effects be skipped?
 */
export function useShouldReduceEffects(): boolean {
  const prefersReduced = useReducedMotion();
  const lowPerf = useLowPerformance();
  return prefersReduced || lowPerf;
}

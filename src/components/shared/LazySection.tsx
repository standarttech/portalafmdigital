import React, { Suspense, lazy, useState, useEffect, useRef, type ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazySectionProps {
  /** Factory returning lazy component: () => import('./HeavyChart') */
  factory: () => Promise<{ default: ComponentType<any> }>;
  /** Props to pass to the lazy component */
  componentProps?: Record<string, any>;
  /** Skeleton height while loading. Default: '200px' */
  height?: string;
  /** Only load when visible in viewport. Default: true */
  loadOnVisible?: boolean;
}

/**
 * LazySection — deferred loading for heavy sub-components (charts, editors, tables).
 * Uses IntersectionObserver to load only when visible.
 * 
 * Usage:
 *   <LazySection factory={() => import('./HeavyChart')} componentProps={{ data }} />
 */
export default function LazySection({
  factory,
  componentProps = {},
  height = '200px',
  loadOnVisible = true,
}: LazySectionProps) {
  const [shouldLoad, setShouldLoad] = useState(!loadOnVisible);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadOnVisible || shouldLoad) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadOnVisible, shouldLoad]);

  if (!shouldLoad) {
    return <div ref={ref} style={{ minHeight: height }}><Skeleton className="w-full h-full rounded-lg" style={{ height }} /></div>;
  }

  const LazyComponent = lazy(factory);

  return (
    <Suspense fallback={<Skeleton className="w-full rounded-lg" style={{ height }} />}>
      <LazyComponent {...componentProps} />
    </Suspense>
  );
}

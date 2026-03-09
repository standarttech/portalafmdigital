/**
 * usePageQuery — unified performance pattern for page-level data fetching.
 * 
 * Usage:
 *   const { data, isLoading } = usePageQuery('dashboard-metrics', fetchFn, { staleTime: 2 * 60_000 });
 * 
 * Benefits:
 * - Consistent staleTime/gcTime defaults (no redundant refetch)
 * - Deduplication via react-query
 * - Background refetch without blocking UI
 * - Type-safe
 * 
 * See docs/PERFORMANCE.md for full guidelines.
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

interface PageQueryOptions<T> {
  /** How long data stays "fresh" before background refetch (ms). Default: 3 min */
  staleTime?: number;
  /** How long unused data stays in cache (ms). Default: 10 min */
  gcTime?: number;
  /** Only fetch when true. Default: true */
  enabled?: boolean;
  /** Placeholder data shown instantly while real data loads */
  placeholderData?: T;
}

const DEFAULT_STALE = 3 * 60_000;   // 3 min
const DEFAULT_GC = 10 * 60_000;     // 10 min

export function usePageQuery<T>(
  key: string | readonly unknown[],
  queryFn: () => Promise<T>,
  options?: PageQueryOptions<T>,
) {
  const queryKey = typeof key === 'string' ? [key] : key;

  return useQuery<T>({
    queryKey,
    queryFn,
    staleTime: options?.staleTime ?? DEFAULT_STALE,
    gcTime: options?.gcTime ?? DEFAULT_GC,
    enabled: options?.enabled ?? true,
    placeholderData: options?.placeholderData,
    refetchOnWindowFocus: false,
    retry: 1,
  } as UseQueryOptions<T>);
}

/**
 * Prefetch helper — call inside useEffect or event handler to warm the cache.
 * 
 * Usage:
 *   import { queryClient } from '@/App'; // or get from useQueryClient
 *   prefetchPageData(queryClient, 'clients-list', fetchClients);
 */
export async function prefetchPageData<T>(
  queryClient: { prefetchQuery: Function },
  key: string | readonly unknown[],
  queryFn: () => Promise<T>,
  staleTime = DEFAULT_STALE,
) {
  const queryKey = typeof key === 'string' ? [key] : key;
  await queryClient.prefetchQuery({ queryKey, queryFn, staleTime });
}

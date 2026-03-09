# Performance Guide — AFM Digital Platform

## Architecture Decisions

### Data Fetching
- **Always use `react-query` (`@tanstack/react-query`)** for server data.
  - Never use raw `useState + useEffect + fetch` for data that comes from Supabase.
  - This gives us: deduplication, caching, background refetch, stale-while-revalidate.
- **`staleTime`**: Set appropriate stale times:
  - Dashboard metrics: `2 min` (data changes infrequently)
  - User permissions / module access: `5 min`
  - Settings / branding: `10 min`
  - Real-time data (chat, presence): `0` (always fresh)
- **Parallel queries**: Use `Promise.all()` for independent DB calls, never sequential waterfalls.

### Code Splitting
- **All page components MUST be lazy-loaded** via `React.lazy()` in `App.tsx`.
- Heavy sub-components (charts, editors, modals) should be lazy-loaded within pages if they're > 50KB.
- The `Suspense` boundary is inside `MainLayout`, so page transitions show a localized spinner, not a full-screen flash.

### Component Guidelines
- **Page components** should be < 300 lines. Extract sub-sections into separate components.
- **Tables** with > 50 rows should use virtualization (`react-window` or limit + pagination).
- **Charts (Recharts)** should only render when visible (use `useMemo` for data transforms).
- **Modals/Dialogs** should not fetch data until opened.

### Database
- Add indexes for any column used in `WHERE`, `ORDER BY`, or `JOIN` clauses.
- Key indexed patterns: `(client_id, date)`, `(user_id)`, `(status, created_at)`.
- Avoid `SELECT *` — only select needed columns.
- Use `{ count: 'exact', head: true }` for count-only queries.

### UX Speed Patterns
- Show **skeleton placeholders** instead of spinner screens.
- Use **optimistic updates** for drag-drop, toggle, and status changes.
- **Never block the entire page** for a single loading section.
- Preserve scroll/state on navigation back (react-query cache handles this).

## Anti-patterns to Avoid
1. ❌ `useState + useEffect` for fetching DB data (use react-query)
2. ❌ Sequential DB queries that could be parallel
3. ❌ Fetching the same data in multiple components without shared cache
4. ❌ Eagerly importing heavy page components (use React.lazy)
5. ❌ Polling intervals < 30s for non-critical data
6. ❌ Re-fetching on every mount without staleTime
7. ❌ `SELECT *` when only a few columns are needed
8. ❌ Full-screen loading spinners for partial data loads

## Performance Budget
- Initial bundle (after code-split): < 200KB gzipped
- Time to interactive on dashboard: < 2s with cached data
- Page transitions: < 300ms perceived (skeleton appears immediately)
- DB queries per page load: aim for < 5, parallelize when > 3

## Adding New Pages Checklist
1. [ ] Page component is lazy-loaded in App.tsx
2. [ ] Data fetching uses `usePageQuery` from `@/hooks/usePageQuery`
3. [ ] Multiple queries are parallelized with `Promise.all()`
4. [ ] Loading state uses `<PageSkeleton>` from `@/components/shared/PageSkeleton`
5. [ ] Heavy sub-components use `<LazySection>` from `@/components/shared/LazySection`
6. [ ] Page components are < 300 lines per file
7. [ ] DB columns used in WHERE/ORDER have indexes
8. [ ] No unnecessary re-renders (check with React DevTools)

## Shared Performance Hooks & Components

### `usePageQuery(key, queryFn, options?)` — `src/hooks/usePageQuery.ts`
Unified data fetching with built-in caching. Use instead of raw `useQuery`.
```tsx
const { data, isLoading } = usePageQuery('dashboard-metrics', fetchMetrics, { staleTime: 2 * 60_000 });
```

### `<PageSkeleton variant="dashboard|list|detail|minimal">` — `src/components/shared/PageSkeleton.tsx`
Drop-in skeleton for any page. Renders instantly, no white flash.
```tsx
if (isLoading) return <PageSkeleton variant="list" tableRows={8} />;
```

### `<LazySection factory={...}>` — `src/components/shared/LazySection.tsx`
Deferred loading for heavy charts/editors/tables. Loads only when visible via IntersectionObserver.
```tsx
<LazySection factory={() => import('./HeavyChart')} componentProps={{ data }} height="300px" />
```

### `prefetchPageData(queryClient, key, fn)` — `src/hooks/usePageQuery.ts`
Warm cache on hover/focus for instant page transitions.

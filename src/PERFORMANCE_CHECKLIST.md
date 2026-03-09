# Performance Checklist — New Pages & Components

**MANDATORY for every new page or heavy component.**

## Data Loading
- [ ] Use `usePageQuery()` or `useQuery()` with `staleTime ≥ 2 min`
- [ ] Never use raw `useEffect` + `setState` for data fetching
- [ ] Parallel queries via `Promise.all` — no waterfall loading
- [ ] Modals/dialogs: load data on open, NOT on page mount
- [ ] Repeat visits must use cache (no full reload without reason)

## Skeleton & Perceived Speed
- [ ] Use `<PageSkeleton variant="..." />` during initial load
- [ ] Show page shell immediately, load content progressively
- [ ] No full-screen spinner if page shell can render first
- [ ] No white flash / empty block during load

## Heavy Components
- [ ] Charts/editors: wrap in `<LazySection />` (loads on viewport entry)
- [ ] Tables with 50+ rows: virtualize or paginate
- [ ] Large imports: use `React.lazy()` for route-level code splitting

## Visual Effects & Animations
- [ ] Check `useShouldReduceEffects()` before heavy canvas/animation
- [ ] No infinite JS animation loops (use CSS keyframes instead)
- [ ] Cap canvas animations at 30fps via `requestAnimationFrame` throttle
- [ ] On mobile: disable canvas effects, keep CSS-only fallback
- [ ] `framer-motion`: use `duration ≤ 0.2s`, avoid `staggerChildren > 0.05`

## Anti-Patterns (NEVER DO)
- ❌ `setInterval` for polling — use `refetchInterval` in react-query
- ❌ Fetching same data in multiple components — share query key
- ❌ `useEffect(() => fetch(), [])` without caching
- ❌ Eagerly loading data for closed modals/tabs
- ❌ Canvas/WebGL without reduced-motion check
- ❌ `staggerChildren > 0.1` on lists with 10+ items

## Reference Files
- `src/hooks/usePageQuery.ts` — cached data hook
- `src/hooks/useReducedMotion.ts` — device capability detection
- `src/components/shared/PageSkeleton.tsx` — skeleton variants
- `src/components/shared/LazySection.tsx` — viewport-triggered lazy load

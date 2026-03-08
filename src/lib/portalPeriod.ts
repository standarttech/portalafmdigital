import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { DateRange } from '@/components/portal/PortalDateFilter';

/**
 * Calendar-correct previous period calculation.
 * Shared between PortalDashboardPage and PortalReportsPage.
 */
export function getPreviousPeriod(range: DateRange): { from: Date; to: Date; label: string } {
  // For "Previous month" → use the month before that
  if (range.label === 'Previous month') {
    const refMonth = subMonths(range.from, 1);
    return { from: startOfMonth(refMonth), to: endOfMonth(refMonth), label: 'month before' };
  }
  // For "This month" → use previous calendar month
  if (range.label === 'This month') {
    const prev = subMonths(new Date(), 1);
    return { from: startOfMonth(prev), to: endOfMonth(prev), label: 'previous month' };
  }
  // Duration-based for 7d/30d
  const duration = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - duration),
    to: new Date(range.from.getTime() - 1),
    label: 'previous period',
  };
}

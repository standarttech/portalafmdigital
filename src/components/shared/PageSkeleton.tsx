import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface PageSkeletonProps {
  /** Number of KPI cards at top. Default: 4 */
  kpiCards?: number;
  /** Show a chart placeholder. Default: true */
  chart?: boolean;
  /** Number of table rows. Default: 5 */
  tableRows?: number;
  /** Variant: 'dashboard' | 'list' | 'detail' | 'minimal' */
  variant?: 'dashboard' | 'list' | 'detail' | 'minimal';
}

/**
 * PageSkeleton — reusable skeleton for any page.
 * Renders instantly to prevent blank/white flash.
 * 
 * Usage: <PageSkeleton variant="dashboard" kpiCards={6} />
 */
export default function PageSkeleton({
  kpiCards = 4,
  chart = true,
  tableRows = 5,
  variant = 'dashboard',
}: PageSkeletonProps) {
  if (variant === 'minimal') {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="space-y-2 mt-6">
          {Array.from({ length: tableRows }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: tableRows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent></Card>
          <Card><CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent></Card>
        </div>
      </div>
    );
  }

  // Default: dashboard
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {kpiCards > 0 && (
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${Math.min(kpiCards, 6)} gap-3`}>
          {Array.from({ length: kpiCards }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-3 w-16 mb-3" />
                <Skeleton className="h-7 w-24 mb-2" />
                <Skeleton className="h-3 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {chart && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-[250px] w-full rounded-lg" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </CardContent>
          </Card>
        </div>
      )}

      {tableRows > 0 && (
        <Card>
          <CardHeader className="pb-2"><Skeleton className="h-5 w-44" /></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: tableRows }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

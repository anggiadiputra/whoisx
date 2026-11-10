import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface PageSkeletonProps {
  // Settings has no stats row or table
  showStats?: boolean
  showTable?: boolean
}

// Placeholder for the page body inside the app shell (header, stat cards, table)
// so route loading and data loading look the same as the finished page
export function PageSkeleton({ showStats = true, showTable = true }: PageSkeletonProps) {
  return (
    <div>
      <div className="space-y-6 lg:space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48 md:h-14 md:w-72" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>

        {showStats && (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 lg:gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-card bg-white p-4 md:p-5">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="mt-4 h-12 w-16" />
                <Skeleton className="mt-2 h-4 w-24" />
              </div>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {(showTable ? [1, 2, 3, 4, 5] : [1, 2]).map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

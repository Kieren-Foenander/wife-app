import { cn } from '@/lib/utils'

type SkeletonProps = {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden
      className={cn('animate-pulse rounded-md bg-slate-800', className)}
    />
  )
}

/** Skeleton row matching category/task list item height */
export function ListRowSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3',
        className,
      )}
    >
      <Skeleton className="size-5 shrink-0 rounded" />
      <Skeleton className="h-4 flex-1 max-w-[60%] rounded" />
      <Skeleton className="h-8 w-16 rounded-md" />
      <Skeleton className="h-8 w-14 rounded-md" />
    </div>
  )
}

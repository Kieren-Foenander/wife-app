import { Loader2 } from 'lucide-react'

type SpinnerProps = {
  /** Accessible label for screen readers */
  'aria-label'?: string
  className?: string
  size?: number
}

export function Spinner({
  'aria-label': ariaLabel = 'Loading',
  className = '',
  size = 20,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      aria-busy="true"
      className={`inline-flex shrink-0 ${className}`}
    >
      <Loader2
        className="animate-spin text-slate-400"
        size={size}
        strokeWidth={1.5}
        aria-hidden
      />
    </span>
  )
}

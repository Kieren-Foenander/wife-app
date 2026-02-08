import { Link } from '@tanstack/react-router'

type BottomNavProps = {
  active: 'tasks' | 'calories'
}

const baseClass =
  'flex-1 rounded-full px-3 py-2 text-center text-sm font-semibold uppercase tracking-wide transition-colors'

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur">
      <div
        className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-6 py-3"
        role="navigation"
        aria-label="Primary"
      >
        <Link
          to="/"
          className={`${baseClass} ${active === 'tasks'
            ? 'bg-primary/20 text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
          aria-current={active === 'tasks' ? 'page' : undefined}
        >
          Tasks
        </Link>
        <button
          type="button"
          className={`${baseClass} cursor-not-allowed text-muted-foreground`}
          aria-disabled="true"
          tabIndex={-1}
        >
          Gym (soon)
        </button>
        <Link
          to="/calories"
          className={`${baseClass} ${active === 'calories'
            ? 'bg-primary/20 text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
          aria-current={active === 'calories' ? 'page' : undefined}
        >
          Calories
        </Link>
      </div>
    </nav>
  )
}

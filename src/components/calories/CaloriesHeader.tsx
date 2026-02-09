import { APP_TIME_ZONE } from '../../lib/dateUtils'

type CaloriesHeaderProps = {
  selectedDate: Date
  isSelectedToday: boolean
}

export function CaloriesHeader({
  selectedDate,
  isSelectedToday,
}: CaloriesHeaderProps) {
  return (
    <header className="space-y-4">
      <p className="text-center text-xl font-semibold text-muted-foreground">
        Wife App
      </p>
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          {isSelectedToday
            ? `Today - ${selectedDate.toLocaleDateString('en-US', {
                timeZone: APP_TIME_ZONE,
                weekday: 'long',
              })}`
            : selectedDate.toLocaleDateString('en-US', {
                timeZone: APP_TIME_ZONE,
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
        </p>
        <h1 className="text-4xl font-semibold text-foreground">Calories</h1>
        <p className="text-base text-muted-foreground">
          Stay on track with a quick daily check-in.
        </p>
      </div>
    </header>
  )
}

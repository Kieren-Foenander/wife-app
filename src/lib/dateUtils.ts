/** Format date as YYYY-MM-DD (UTC). */
export function toYYYYMMDDUTC(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse YYYY-MM-DD to Date at midnight UTC. */
export function fromYYYYMMDD(s: string): Date {
  const [y, m = 1, d = 1] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** UTC start-of-day ms for a Date (uses UTC date parts). */
export function startOfDayUTCFromDate(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function addDaysUTC(d: Date, days: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days),
  )
}

export function addMonthsUTC(d: Date, months: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()),
  )
}

/** Week Monday–Sunday containing the given date; dates at midnight UTC. */
export function getWeekDatesFor(selectedDate: Date): Array<Date> {
  const d = new Date(selectedDate)
  const day = d.getUTCDay()
  const mondayIndex = (day + 6) % 7
  const start = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() - mondayIndex,
    ),
  )
  const dates: Array<Date> = []
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(start.getTime() + i * 24 * 60 * 60 * 1000))
  }
  return dates
}

/** Month grid (6×7) for the given date; cells are Date (midnight UTC) or null. */
export function getMonthGridFor(
  selectedDate: Date,
): Array<Array<Date | null>> {
  const year = selectedDate.getUTCFullYear()
  const month = selectedDate.getUTCMonth()
  const first = new Date(Date.UTC(year, month, 1))
  const firstDay = (first.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const grid: Array<Array<Date | null>> = []
  let dayIndex = 1 - firstDay
  for (let row = 0; row < 6; row++) {
    const week: Array<Date | null> = []
    for (let col = 0; col < 7; col++) {
      if (dayIndex < 1 || dayIndex > daysInMonth) {
        week.push(null)
      } else {
        week.push(new Date(Date.UTC(year, month, dayIndex)))
      }
      dayIndex++
    }
    grid.push(week)
  }
  return grid
}

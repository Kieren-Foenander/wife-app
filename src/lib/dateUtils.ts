export const APP_TIME_ZONE = 'Australia/Brisbane'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  hourCycle: 'h23',
})

function getDateTimeParts(d: Date): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} {
  const parts = DATE_TIME_FORMATTER.formatToParts(d)
  const values: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

function getTimeZoneOffsetMs(d: Date): number {
  const parts = getDateTimeParts(d)
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return asUTC - d.getTime()
}

function startOfDayFromParts(year: number, month: number, day: number): number {
  const utcMidnight = Date.UTC(year, month - 1, day)
  const offsetMs = getTimeZoneOffsetMs(new Date(utcMidnight))
  return utcMidnight - offsetMs
}

export function getDatePartsInTimeZone(d: Date): {
  year: number
  month: number
  day: number
} {
  const parts = getDateTimeParts(d)
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  }
}

/** Format date as YYYY-MM-DD in Australia/Brisbane. */
export function toYYYYMMDDUTC(d: Date): string {
  const { year, month, day } = getDatePartsInTimeZone(d)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Parse YYYY-MM-DD to Date at Brisbane midnight (stored as UTC ms). */
export function fromYYYYMMDD(s: string): Date {
  const [y, m = 1, d = 1] = s.split('-').map(Number)
  return new Date(startOfDayFromParts(y, m, d))
}

/** Start-of-day ms for a Date in Australia/Brisbane. */
export function startOfDayUTCFromDate(d: Date): number {
  const { year, month, day } = getDatePartsInTimeZone(d)
  return startOfDayFromParts(year, month, day)
}

export function addDaysUTC(d: Date, days: number): Date {
  return new Date(startOfDayUTCFromDate(d) + days * MS_PER_DAY)
}

export function addMonthsUTC(d: Date, months: number): Date {
  const { year, month, day } = getDatePartsInTimeZone(d)
  const normalized = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(
    Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth() + 1, 0),
  ).getUTCDate()
  return new Date(
    startOfDayFromParts(
      normalized.getUTCFullYear(),
      normalized.getUTCMonth() + 1,
      Math.min(day, lastDay),
    ),
  )
}

function getWeekdayInTimeZone(d: Date): number {
  const offsetMs = getTimeZoneOffsetMs(d)
  return new Date(d.getTime() + offsetMs).getUTCDay()
}

/** Week Monday–Sunday containing the given date; dates at Brisbane midnight. */
export function getWeekDatesFor(selectedDate: Date): Array<Date> {
  const dayStartMs = startOfDayUTCFromDate(selectedDate)
  const day = getWeekdayInTimeZone(new Date(dayStartMs))
  const mondayIndex = (day + 6) % 7
  const startMs = dayStartMs - mondayIndex * MS_PER_DAY
  const dates: Array<Date> = []
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(startMs + i * MS_PER_DAY))
  }
  return dates
}

/** Month grid (6×7) for the given date; cells are Date (Brisbane midnight) or null. */
export function getMonthGridFor(
  selectedDate: Date,
): Array<Array<Date | null>> {
  const { year, month } = getDatePartsInTimeZone(selectedDate)
  const firstDayStartMs = startOfDayFromParts(year, month, 1)
  const firstDay = (getWeekdayInTimeZone(new Date(firstDayStartMs)) + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const grid: Array<Array<Date | null>> = []
  let dayIndex = 1 - firstDay
  for (let row = 0; row < 6; row++) {
    const week: Array<Date | null> = []
    for (let col = 0; col < 7; col++) {
      if (dayIndex < 1 || dayIndex > daysInMonth) {
        week.push(null)
      } else {
        week.push(new Date(startOfDayFromParts(year, month, dayIndex)))
      }
      dayIndex++
    }
    grid.push(week)
  }
  return grid
}

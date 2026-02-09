export const APP_TIME_ZONE = 'Australia/Brisbane'

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

export function getDateTimeParts(ms: number): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} {
  const parts = DATE_TIME_FORMATTER.formatToParts(new Date(ms))
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

export function getTimeZoneOffsetMs(ms: number): number {
  const parts = getDateTimeParts(ms)
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return asUTC - ms
}

export function startOfDayFromParts(
  year: number,
  month: number,
  day: number,
): number {
  const utcMidnight = Date.UTC(year, month - 1, day)
  const offsetMs = getTimeZoneOffsetMs(utcMidnight)
  return utcMidnight - offsetMs
}

/** Start of day in Australia/Brisbane (00:00:00.000 local). */
export function startOfDayUTC(ms: number): number {
  const { year, month, day } = getDateTimeParts(ms)
  return startOfDayFromParts(year, month, day)
}

/** Add months to a date (Brisbane), clamping day if needed). */
export function addMonthsUTC(ms: number, months: number): number {
  const { year, month, day } = getDateTimeParts(ms)
  const normalized = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(
    Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth() + 1, 0),
  ).getUTCDate()
  return startOfDayFromParts(
    normalized.getUTCFullYear(),
    normalized.getUTCMonth() + 1,
    Math.min(day, lastDay),
  )
}

export function convertUtcDayStartToBrisbane(ms: number): number {
  const d = new Date(ms)
  return startOfDayFromParts(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
  )
}

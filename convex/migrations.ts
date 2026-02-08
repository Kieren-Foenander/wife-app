import { v } from 'convex/values'
import { mutation } from './_generated/server'

const APP_TIME_ZONE = 'Australia/Brisbane'
const ROOT_DAY_PREFIX = 'root-day:'
const CHILDREN_PREFIX = 'children:'

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

function getDateTimeParts(ms: number): {
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

function getTimeZoneOffsetMs(ms: number): number {
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

function startOfDayFromParts(year: number, month: number, day: number): number {
  const utcMidnight = Date.UTC(year, month - 1, day)
  const offsetMs = getTimeZoneOffsetMs(utcMidnight)
  return utcMidnight - offsetMs
}

function convertUtcDayStartToBrisbane(ms: number): number {
  const d = new Date(ms)
  return startOfDayFromParts(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
  )
}

function migrateViewKey(viewKey: string): string | null {
  if (viewKey.startsWith(ROOT_DAY_PREFIX)) {
    const dayStartMs = Number(viewKey.slice(ROOT_DAY_PREFIX.length))
    if (!Number.isFinite(dayStartMs)) return null
    const nextMs = convertUtcDayStartToBrisbane(dayStartMs)
    return `${ROOT_DAY_PREFIX}${nextMs}`
  }
  if (viewKey.startsWith(CHILDREN_PREFIX)) {
    const rest = viewKey.slice(CHILDREN_PREFIX.length)
    const lastColon = rest.lastIndexOf(':')
    if (lastColon <= 0) return null
    const parentTaskId = rest.slice(0, lastColon)
    const dayStartMs = Number(rest.slice(lastColon + 1))
    if (!Number.isFinite(dayStartMs)) return null
    const nextMs = convertUtcDayStartToBrisbane(dayStartMs)
    return `${CHILDREN_PREFIX}${parentTaskId}:${nextMs}`
  }
  return null
}

export const migrateDatesToBrisbane = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false
    let updatedTasks = 0
    let updatedCompletedTasks = 0
    let updatedTaskOrders = 0

    const tasks = await ctx.db.query('tasks').collect()
    for (const task of tasks) {
      if (task.dueDate == null) continue
      const nextMs = convertUtcDayStartToBrisbane(task.dueDate)
      if (nextMs === task.dueDate) continue
      updatedTasks += 1
      if (!dryRun) {
        await ctx.db.patch(task._id, { dueDate: nextMs })
      }
    }

    const completedTasks = await ctx.db.query('completedTasks').collect()
    for (const row of completedTasks) {
      if (row.completedDate == null) continue
      const nextMs = convertUtcDayStartToBrisbane(row.completedDate)
      if (nextMs === row.completedDate) continue
      updatedCompletedTasks += 1
      if (!dryRun) {
        await ctx.db.patch(row._id, { completedDate: nextMs })
      }
    }

    const taskOrders = await ctx.db.query('taskOrders').collect()
    for (const row of taskOrders) {
      const nextViewKey = migrateViewKey(row.viewKey)
      if (!nextViewKey || nextViewKey === row.viewKey) continue
      updatedTaskOrders += 1
      if (!dryRun) {
        await ctx.db.patch(row._id, { viewKey: nextViewKey })
      }
    }

    return {
      dryRun,
      updatedTasks,
      updatedCompletedTasks,
      updatedTaskOrders,
    }
  },
})

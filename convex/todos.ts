import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { frequencyValidator } from './schema'

/** Frequency type for next-due computation. */
type Frequency =
  | 'daily'
  | 'bi-daily'
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | '6-monthly'
  | 'yearly'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Start of day UTC (00:00:00.000) for a given timestamp. */
function startOfDayUTC(ms: number): number {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Add months to a date (UTC), clamping day if needed). */
function addMonthsUTC(ms: number, months: number): number {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + months
  const day = d.getUTCDate()
  const normalized = new Date(Date.UTC(y, m, 1))
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return Date.UTC(
    normalized.getUTCFullYear(),
    normalized.getUTCMonth(),
    Math.min(day, lastDay),
  )
}

/** Next due date (start of day UTC) after lastCompletedDate for given frequency. */
function nextDueAfter(lastCompletedMs: number, frequency: Frequency): number {
  const start = startOfDayUTC(lastCompletedMs)
  switch (frequency) {
    case 'daily':
      return start + MS_PER_DAY
    case 'bi-daily':
      return start + 2 * MS_PER_DAY
    case 'weekly':
      return start + 7 * MS_PER_DAY
    case 'fortnightly':
      return start + 14 * MS_PER_DAY
    case 'monthly':
      return addMonthsUTC(start, 1)
    case 'quarterly':
      return addMonthsUTC(start, 3)
    case '6-monthly':
      return addMonthsUTC(start, 6)
    case 'yearly':
      return addMonthsUTC(start, 12)
    default:
      return start + MS_PER_DAY
  }
}

type TaskForDue = {
  isCompleted?: boolean
  lastCompletedDate?: number
  dueDate?: number
  repeatEnabled?: boolean
  frequency?: Frequency
}

/** Whether a task is due on the given day (UTC). Non-recurring: due on day D iff (!dueDate || dueDate === dayStartMs) and !completed. Recurring: first due = dueDate ?? refTodayStart; due on D if D >= firstDue or next due <= end of D. */
export function isTaskDueOnDay(
  task: TaskForDue,
  dayStartMs: number,
  refNowMs?: number,
): boolean {
  const refNow = refNowMs ?? Date.now()
  const todayStart = startOfDayUTC(refNow)
  const isRecurring =
    task.repeatEnabled === true && task.frequency != null

  if (!isRecurring) {
    if (task.isCompleted) return false
    if (task.dueDate != null) return task.dueDate === dayStartMs
    return true
  }

  if (task.lastCompletedDate == null) {
    const firstDue = task.dueDate ?? todayStart
    return dayStartMs >= firstDue
  }

  const dayEndMs = dayStartMs + MS_PER_DAY - 1
  const nextDue = nextDueAfter(task.lastCompletedDate, task.frequency!)
  return nextDue <= dayEndMs
}

/** Next due date (start of day UTC ms) for a task. Recurring: next interval after lastCompleted; never completed = dueDate ?? today. Non-recurring: treated as today if incomplete. */
function getNextDueMs(
  task: TaskForDue,
  nowMs: number,
): number {
  const isRecurring =
    task.repeatEnabled === true && task.frequency != null
  const todayStart = startOfDayUTC(nowMs)
  if (!isRecurring) {
    return todayStart
  }
  if (task.lastCompletedDate == null) {
    return task.dueDate ?? todayStart
  }
  return nextDueAfter(task.lastCompletedDate, task.frequency!)
}

/** Whether a task is due within [rangeStartMs, rangeEndMs] (UTC, inclusive). */
function isTaskDueInRange(
  task: TaskForDue,
  rangeStartMs: number,
  rangeEndMs: number,
  nowMs: number,
): boolean {
  const isRecurring =
    task.repeatEnabled === true && task.frequency != null
  if (!isRecurring) {
    if (task.isCompleted) return false
    if (task.dueDate != null) {
      return task.dueDate >= rangeStartMs && task.dueDate <= rangeEndMs
    }
    return true
  }
  const nextDue = getNextDueMs(task, nowMs)
  return nextDue >= rangeStartMs && nextDue <= rangeEndMs
}

/** Current week Sun 00:00 UTC to Sat 23:59:59.999 UTC. */
function getCurrentWeekRangeUTC(nowMs: number): { start: number; end: number } {
  const d = new Date(nowMs)
  const day = d.getUTCDay()
  const start = startOfDayUTC(nowMs) - day * MS_PER_DAY
  const end = start + 7 * MS_PER_DAY - 1
  return { start, end }
}

/** Current month 1st 00:00 UTC to last day 23:59:59.999 UTC. */
function getCurrentMonthRangeUTC(nowMs: number): { start: number; end: number } {
  const d = new Date(nowMs)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const start = Date.UTC(y, m, 1)
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const end = Date.UTC(y, m, lastDay, 23, 59, 59, 999)
  return { start, end }
}

export const listTasks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('tasks').order('desc').collect()
  },
})

export const listRootTasks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', q => q.eq('parentTaskId', undefined))
      .order('desc')
      .collect()
  },
})

/** Root tasks that are due on the given day (UTC). */
export const listRootTasksDueOnDate = query({
  args: { dayStartMs: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now()
    const rootTasks = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', q => q.eq('parentTaskId', undefined))
      .order('desc')
      .collect()
    return rootTasks.filter((task) =>
      isTaskDueOnDay(task, args.dayStartMs, now),
    )
  },
})

/** Root tasks due in the week (Sun–Sat UTC) containing refDateMs, or current week if omitted. */
export const listRootTasksDueInWeek = query({
  args: { refDateMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.refDateMs ?? Date.now()
    const { start, end } = getCurrentWeekRangeUTC(now)
    const rootTasks = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', q => q.eq('parentTaskId', undefined))
      .order('desc')
      .collect()
    return rootTasks.filter((task) =>
      isTaskDueInRange(task, start, end, now),
    )
  },
})

/** Root tasks due in the month (UTC) containing refDateMs, or current month if omitted. */
export const listRootTasksDueInMonth = query({
  args: { refDateMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.refDateMs ?? Date.now()
    const { start, end } = getCurrentMonthRangeUTC(now)
    const rootTasks = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', q => q.eq('parentTaskId', undefined))
      .order('desc')
      .collect()
    return rootTasks.filter((task) =>
      isTaskDueInRange(task, start, end, now),
    )
  },
})

export const createTask = mutation({
  args: {
    title: v.string(),
    parentTaskId: v.optional(v.id('tasks')),
    dueDate: v.optional(v.number()),
    frequency: v.optional(frequencyValidator),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('tasks', {
      title: args.title,
      parentTaskId: args.parentTaskId,
      dueDate: args.dueDate,
      frequency: args.frequency,
    })
  },
})

export const updateTask = mutation({
  args: {
    id: v.id('tasks'),
    title: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    frequency: v.optional(frequencyValidator),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id)
    if (!task) {
      throw new Error('Task not found')
    }
    const patch: {
      title?: string
      dueDate?: number
      frequency?:
      | 'daily'
      | 'bi-daily'
      | 'weekly'
      | 'fortnightly'
      | 'monthly'
      | 'quarterly'
      | '6-monthly'
      | 'yearly'
    } = {}
    if (args.title !== undefined) patch.title = args.title
    if (args.dueDate !== undefined) patch.dueDate = args.dueDate
    if (args.frequency !== undefined) patch.frequency = args.frequency
    return await ctx.db.patch(args.id, patch)
  },
})

export const deleteTask = mutation({
  args: { id: v.id('tasks') },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})


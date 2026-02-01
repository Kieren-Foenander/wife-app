import { v } from 'convex/values'
import { mutation, query, QueryCtx } from './_generated/server'
import { Id } from './_generated/dataModel'
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
  dueDate?: number
  frequency?: Frequency
}

async function getLatestCompletionDate(
  ctx: QueryCtx,
  taskId: Id<'tasks'>,
): Promise<number | undefined> {
  const latest = await ctx.db
    .query('completedTasks')
    .withIndex('by_task_id_completed_date', (q) => q.eq('taskId', taskId))
    .order('desc')
    .first()
  return latest?.completedDate
}

/** Whether a task is due on the given day (UTC). Non-recurring: due on day D iff (!dueDate || dueDate === dayStartMs) and !completed. Recurring: first due = dueDate ?? refTodayStart; due on D if D >= firstDue or next due <= end of D. */
export function isTaskDueOnDay(
  task: TaskForDue,
  dayStartMs: number,
  refNowMs?: number,
  latestCompletedDate?: number,
): boolean {
  const refNow = refNowMs ?? Date.now()
  const todayStart = startOfDayUTC(refNow)
  const isRecurring = task.frequency != null

  if (!isRecurring) {
    if (latestCompletedDate != null) return false
    if (task.dueDate != null) return task.dueDate === dayStartMs
    return true
  }

  if (latestCompletedDate == null) {
    const firstDue = task.dueDate ?? todayStart
    return dayStartMs >= firstDue
  }

  const dayEndMs = dayStartMs + MS_PER_DAY - 1
  const nextDue = nextDueAfter(latestCompletedDate, task.frequency!)
  return nextDue <= dayEndMs
}

/** Next due date (start of day UTC ms) for a task. Recurring: next interval after lastCompleted; never completed = dueDate ?? today. Non-recurring: treated as today if incomplete. */
function getNextDueMs(
  task: TaskForDue,
  nowMs: number,
  latestCompletedDate?: number,
): number {
  const isRecurring = task.frequency != null
  const todayStart = startOfDayUTC(nowMs)
  if (!isRecurring) {
    return todayStart
  }
  if (latestCompletedDate == null) {
    return task.dueDate ?? todayStart
  }
  return nextDueAfter(latestCompletedDate, task.frequency!)
}

/** Whether a task is due within [rangeStartMs, rangeEndMs] (UTC, inclusive). */
function isTaskDueInRange(
  task: TaskForDue,
  rangeStartMs: number,
  rangeEndMs: number,
  nowMs: number,
  latestCompletedDate?: number,
): boolean {
  const isRecurring = task.frequency != null
  if (!isRecurring) {
    if (latestCompletedDate != null) return false
    if (task.dueDate != null) {
      return task.dueDate >= rangeStartMs && task.dueDate <= rangeEndMs
    }
    return true
  }
  const nextDue = getNextDueMs(task, nowMs, latestCompletedDate)
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

export const getTask = query({
  args: { id: v.id('tasks') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const listTaskAncestors = query({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, args) => {
    const ancestors: Array<{ _id: Id<'tasks'> }> = []
    let current = await ctx.db.get(args.taskId)
    while (current?.parentTaskId) {
      const parent = await ctx.db.get(current.parentTaskId)
      if (!parent) break
      ancestors.unshift(parent)
      current = parent
    }
    return ancestors
  },
})

export const listTaskChildren = query({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, args) => {
    const children = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', q => q.eq('parentTaskId', args.taskId))
      .order('desc')
      .collect()
    const tasks = await Promise.all(
      children.map(async (task) => {
        const latestCompletedDate = await getLatestCompletionDate(ctx, task._id)
        return {
          ...task,
          isCompleted: latestCompletedDate != null,
        }
      }),
    )
    const completion = {
      total: tasks.length,
      completed: tasks.filter((task) => task.isCompleted).length,
    }
    return { tasks, completion }
  },
})

export const getTaskCompletion = query({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, args) => {
    const queue: Id<'tasks'>[] = [args.taskId]
    const allTaskIds: Id<'tasks'>[] = []
    while (queue.length > 0) {
      const currentId = queue.shift()
      if (!currentId) continue
      allTaskIds.push(currentId)
      const children = await ctx.db
        .query('tasks')
        .withIndex('byParentTaskId', q => q.eq('parentTaskId', currentId))
        .collect()
      for (const child of children) {
        queue.push(child._id)
      }
    }
    let completed = 0
    for (const taskId of allTaskIds) {
      const latestCompletedDate = await getLatestCompletionDate(ctx, taskId)
      if (latestCompletedDate != null) {
        completed += 1
      }
    }
    return { total: allTaskIds.length, completed }
  },
})

export const listTasksForParentPicker = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query('tasks').order('desc').collect()
    const byParent = new Map<string, typeof tasks>()
    for (const task of tasks) {
      const key = task.parentTaskId ?? 'root'
      const bucket = byParent.get(key) ?? []
      bucket.push(task)
      byParent.set(key, bucket)
    }
    const ordered: Array<{ _id: Id<'tasks'>; title: string; depth: number }> = []
    const visit = (parentId: Id<'tasks'> | undefined, depth: number) => {
      const key = parentId ?? 'root'
      const children = byParent.get(key) ?? []
      for (const child of children) {
        ordered.push({ _id: child._id, title: child.title, depth })
        visit(child._id, depth + 1)
      }
    }
    visit(undefined, 0)
    return ordered
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
    const withLatestCompletion = await Promise.all(
      rootTasks.map(async (task) => ({
        task,
        latestCompletedDate: await getLatestCompletionDate(ctx, task._id),
      })),
    )
    return withLatestCompletion
      .filter(({ task, latestCompletedDate }) =>
        isTaskDueOnDay(task, args.dayStartMs, now, latestCompletedDate),
      )
      .map(({ task }) => task)
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
    const withLatestCompletion = await Promise.all(
      rootTasks.map(async (task) => ({
        task,
        latestCompletedDate: await getLatestCompletionDate(ctx, task._id),
      })),
    )
    return withLatestCompletion
      .filter(({ task, latestCompletedDate }) =>
        isTaskDueInRange(task, start, end, now, latestCompletedDate),
      )
      .map(({ task }) => task)
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
    const withLatestCompletion = await Promise.all(
      rootTasks.map(async (task) => ({
        task,
        latestCompletedDate: await getLatestCompletionDate(ctx, task._id),
      })),
    )
    return withLatestCompletion
      .filter(({ task, latestCompletedDate }) =>
        isTaskDueInRange(task, start, end, now, latestCompletedDate),
      )
      .map(({ task }) => task)
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
    const child = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', (q) => q.eq('parentTaskId', args.id))
      .first()
    if (child) {
      throw new Error('Task has sub-tasks; delete them first')
    }
    const completed = await ctx.db
      .query('completedTasks')
      .withIndex('by_task_id', (q) => q.eq('taskId', args.id))
      .collect()
    for (const row of completed) {
      await ctx.db.delete(row._id)
    }
    return await ctx.db.delete(args.id)
  },
})

export const hasCompletedTasks = query({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query('completedTasks')
      .withIndex('by_task_id_completed_date', (q) =>
        q.eq('taskId', args.taskId),
      )
      .order('desc')
      .first()
    return latest != null
  },
})

export const completeTaskAndSubtasks = mutation({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, args) => {
    const now = Date.now()
    const queue: Id<'tasks'>[] = [args.taskId]
    const allTaskIds: Id<'tasks'>[] = []
    while (queue.length > 0) {
      const currentId = queue.shift()
      if (!currentId) continue
      allTaskIds.push(currentId)
      const children = await ctx.db
        .query('tasks')
        .withIndex('byParentTaskId', (q) =>
          q.eq('parentTaskId', currentId),
        )
        .collect()
      for (const child of children) {
        queue.push(child._id)
      }
    }
    for (const taskId of allTaskIds) {
      await ctx.db.insert('completedTasks', {
        taskId,
        completedDate: now,
      })
    }
    return { inserted: allTaskIds.length }
  },
})


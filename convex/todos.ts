import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { frequencyValidator } from './schema'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

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

async function applyViewOrder<T extends { _id: Id<'tasks'> }>(
  ctx: QueryCtx,
  viewKey: string | undefined,
  tasks: T[],
): Promise<T[]> {
  if (!viewKey || tasks.length === 0) return tasks
  const orderRows = await ctx.db
    .query('taskOrders')
    .withIndex('byViewKeyOrder', (q) => q.eq('viewKey', viewKey))
    .collect()
  if (orderRows.length === 0) return tasks
  const orderById = new Map<Id<'tasks'>, number>(
    orderRows.map((row) => [row.taskId, row.order]),
  )
  const originalIndex = new Map<Id<'tasks'>, number>(
    tasks.map((task, index) => [task._id, index]),
  )
  return [...tasks].sort((a, b) => {
    const aOrder = orderById.get(a._id)
    const bOrder = orderById.get(b._id)
    if (aOrder != null && bOrder != null) return aOrder - bOrder
    if (aOrder != null) return -1
    if (bOrder != null) return 1
    return (originalIndex.get(a._id) ?? 0) - (originalIndex.get(b._id) ?? 0)
  })
}

/** Start of day UTC (00:00:00.000) for a given timestamp. */
function startOfDayUTC(ms: number): number {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

const DAY_INTERVALS: Record<
  Exclude<Frequency, 'monthly' | 'quarterly' | '6-monthly' | 'yearly'>,
  number
> = {
  daily: 1,
  'bi-daily': 2,
  weekly: 7,
  fortnightly: 14,
}

const MONTH_INTERVALS: Record<
  Extract<Frequency, 'monthly' | 'quarterly' | '6-monthly' | 'yearly'>,
  number
> = {
  monthly: 1,
  quarterly: 3,
  '6-monthly': 6,
  yearly: 12,
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

type TaskForDue = {
  dueDate?: number
  frequency?: Frequency
}

type TaskWithParent = TaskForDue & {
  parentTaskId?: Id<'tasks'>
}

function isRecurringTask(task: TaskWithParent | null | undefined): boolean {
  return task?.frequency != null && task.parentTaskId == null
}

async function isTaskCompletedAny(
  ctx: QueryCtx,
  taskId: Id<'tasks'>,
): Promise<boolean> {
  const existing = await ctx.db
    .query('completedTasks')
    .withIndex('by_task_id', (q) => q.eq('taskId', taskId))
    .first()
  return existing != null
}

async function isTaskCompletedOnDay(
  ctx: QueryCtx,
  taskId: Id<'tasks'>,
  dayStartMs: number,
): Promise<boolean> {
  const existing = await ctx.db
    .query('completedTasks')
    .withIndex('by_task_id_completed_date', (q) =>
      q.eq('taskId', taskId).eq('completedDate', dayStartMs),
    )
    .first()
  return existing != null
}

async function isTaskCompletedWithChildren(
  ctx: QueryCtx,
  taskId: Id<'tasks'>,
): Promise<boolean> {
  const children = await ctx.db
    .query('tasks')
    .withIndex('byParentTaskId', (q) => q.eq('parentTaskId', taskId))
    .collect()
  if (children.length === 0) {
    return await isTaskCompletedAny(ctx, taskId)
  }
  for (const child of children) {
    if (!(await isTaskCompletedWithChildren(ctx, child._id))) {
      return false
    }
  }
  return true
}

async function isTaskCompletedForDay(
  ctx: QueryCtx,
  task: TaskForDue & { _id: Id<'tasks'> },
  dayStartMs: number,
): Promise<boolean> {
  if (task.frequency == null) {
    return await isTaskCompletedAny(ctx, task._id)
  }
  return await isTaskCompletedOnDay(ctx, task._id, dayStartMs)
}

async function isTaskCompletedWithChildrenForDay(
  ctx: QueryCtx,
  taskId: Id<'tasks'>,
  dayStartMs: number,
  scopeNonRecurringToDay = false,
): Promise<boolean> {
  const task = await ctx.db.get(taskId)
  if (!task) return false
  const isRecurringSelf = isRecurringTask(task)
  const forceDayScope = scopeNonRecurringToDay || isRecurringSelf
  const children = await ctx.db
    .query('tasks')
    .withIndex('byParentTaskId', (q) => q.eq('parentTaskId', taskId))
    .collect()
  if (children.length === 0) {
    if (forceDayScope && !isRecurringSelf) {
      return await isTaskCompletedOnDay(ctx, task._id, dayStartMs)
    }
    return await isTaskCompletedForDay(ctx, task, dayStartMs)
  }
  for (const child of children) {
    if (
      !(await isTaskCompletedWithChildrenForDay(
        ctx,
        child._id,
        dayStartMs,
        forceDayScope,
      ))
    ) {
      return false
    }
  }
  return true
}

async function deleteTaskCompletions(
  ctx: MutationCtx,
  taskId: Id<'tasks'>,
): Promise<void> {
  const completed = await ctx.db
    .query('completedTasks')
    .withIndex('by_task_id', (q) => q.eq('taskId', taskId))
    .collect()
  for (const row of completed) {
    await ctx.db.delete(row._id)
  }
}

async function collectTaskAndDescendantIds(
  ctx: QueryCtx,
  rootId: Id<'tasks'>,
): Promise<Array<Id<'tasks'>>> {
  const queue: Array<Id<'tasks'>> = [rootId]
  const allTaskIds: Array<Id<'tasks'>> = []
  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) continue
    allTaskIds.push(currentId)
    const children = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', (q) => q.eq('parentTaskId', currentId))
      .collect()
    for (const child of children) {
      queue.push(child._id)
    }
  }
  return allTaskIds
}

async function hasRecurringAncestor(
  ctx: QueryCtx | MutationCtx,
  taskId: Id<'tasks'>,
): Promise<boolean> {
  let current = await ctx.db.get(taskId)
  while (current?.parentTaskId) {
    const parent = await ctx.db.get(current.parentTaskId)
    if (!parent) break
    if (parent.frequency != null) return true
    current = parent
  }
  return false
}

async function ensureTaskCompleted(
  ctx: MutationCtx,
  taskId: Id<'tasks'>,
  completedDate: number,
  isRecurring: boolean,
): Promise<void> {
  const normalizedDate = startOfDayUTC(completedDate)
  const existing = await ctx.db
    .query('completedTasks')
    .withIndex(
      isRecurring ? 'by_task_id_completed_date' : 'by_task_id',
      (q) =>
        isRecurring
          ? q.eq('taskId', taskId).eq('completedDate', normalizedDate)
          : q.eq('taskId', taskId),
    )
    .first()
  if (existing) return
  await ctx.db.insert('completedTasks', {
    taskId,
    completedDate: normalizedDate,
  })
}

async function completeTaskTree(
  ctx: MutationCtx,
  taskId: Id<'tasks'>,
  completedDate: number,
  forceDayScopeForNonRecurring = false,
): Promise<Array<Id<'tasks'>>> {
  const allTaskIds = await collectTaskAndDescendantIds(ctx, taskId)
  for (const id of allTaskIds) {
    const task = await ctx.db.get(id)
    if (!task) continue
    const isRecurringSelf = isRecurringTask(task)
    await ensureTaskCompleted(
      ctx,
      id,
      completedDate,
      isRecurringSelf || forceDayScopeForNonRecurring,
    )
  }
  return allTaskIds
}

async function areAllChildrenCompleted(
  ctx: QueryCtx,
  parentId: Id<'tasks'>,
  optimisticCompletedIds?: Set<Id<'tasks'>>,
  dayStartMs?: number,
  scopeNonRecurringToDay?: boolean,
): Promise<boolean> {
  const children = await ctx.db
    .query('tasks')
    .withIndex('byParentTaskId', (q) => q.eq('parentTaskId', parentId))
    .collect()
  if (children.length === 0) return false
  for (const child of children) {
    if (optimisticCompletedIds?.has(child._id)) {
      continue
    }
    const isRecurringChild = isRecurringTask(child)
    if (dayStartMs != null && (isRecurringChild || scopeNonRecurringToDay)) {
      if (!(await isTaskCompletedOnDay(ctx, child._id, dayStartMs))) {
        return false
      }
      continue
    }
    if (!(await isTaskCompletedAny(ctx, child._id))) {
      return false
    }
  }
  return true
}

async function syncAncestorsOnComplete(
  ctx: MutationCtx,
  taskId: Id<'tasks'>,
  completedDate: number,
  optimisticCompletedIds?: Set<Id<'tasks'>>,
  forceDayScopeForNonRecurring = false,
): Promise<void> {
  const dayStartMs = startOfDayUTC(completedDate)
  let current = await ctx.db.get(taskId)
  let forceDayScope = forceDayScopeForNonRecurring
  while (current?.parentTaskId) {
    const parentId = current.parentTaskId
    const parent = await ctx.db.get(parentId)
    if (!parent) break
    if (isRecurringTask(parent)) {
      forceDayScope = true
    }
    const allCompleted = await areAllChildrenCompleted(
      ctx,
      parentId,
      optimisticCompletedIds,
      dayStartMs,
      forceDayScope,
    )
    if (!allCompleted) break
    await ensureTaskCompleted(
      ctx,
      parentId,
      completedDate,
      isRecurringTask(parent) || forceDayScope,
    )
    optimisticCompletedIds?.add(parentId)
    current = await ctx.db.get(parentId)
  }
}

async function clearAncestorCompletions(
  ctx: MutationCtx,
  taskId: Id<'tasks'>,
): Promise<void> {
  let current = await ctx.db.get(taskId)
  while (current?.parentTaskId) {
    const parentId = current.parentTaskId
    await deleteTaskCompletions(ctx, parentId)
    current = await ctx.db.get(parentId)
  }
}

async function clearAncestorCompletionsForDay(
  ctx: MutationCtx,
  taskId: Id<'tasks'>,
  dayStartMs: number,
): Promise<void> {
  let current = await ctx.db.get(taskId)
  while (current?.parentTaskId) {
    const parentId = current.parentTaskId
    const completed = await ctx.db
      .query('completedTasks')
      .withIndex('by_task_id_completed_date', (q) =>
        q.eq('taskId', parentId).eq('completedDate', dayStartMs),
      )
      .collect()
    for (const row of completed) {
      await ctx.db.delete(row._id)
    }
    current = await ctx.db.get(parentId)
  }
}

async function clearTaskTreeCompletions(
  ctx: MutationCtx,
  taskId: Id<'tasks'>,
): Promise<void> {
  const allTaskIds = await collectTaskAndDescendantIds(ctx, taskId)
  for (const id of allTaskIds) {
    await deleteTaskCompletions(ctx, id)
  }
}

function getFirstDueMs(task: TaskForDue, refNowMs: number): number {
  return task.dueDate ?? startOfDayUTC(refNowMs)
}

function isRecurringDueOnDay(
  task: TaskForDue & { frequency: Frequency },
  dayStartMs: number,
  refNowMs: number,
): boolean {
  const firstDue = getFirstDueMs(task, refNowMs)
  if (dayStartMs < firstDue) return false
  if (task.frequency in DAY_INTERVALS) {
    const intervalDays =
      DAY_INTERVALS[task.frequency as keyof typeof DAY_INTERVALS]
    const intervalMs = intervalDays * MS_PER_DAY
    return (dayStartMs - firstDue) % intervalMs === 0
  }
  const intervalMonths =
    MONTH_INTERVALS[task.frequency as keyof typeof MONTH_INTERVALS]
  const first = new Date(firstDue)
  const target = new Date(dayStartMs)
  const monthsDiff =
    (target.getUTCFullYear() - first.getUTCFullYear()) * 12 +
    (target.getUTCMonth() - first.getUTCMonth())
  if (monthsDiff % intervalMonths !== 0) return false
  return addMonthsUTC(firstDue, monthsDiff) === dayStartMs
}

function getNextRecurringDueOnOrAfter(
  task: TaskForDue & { frequency: Frequency },
  rangeStartMs: number,
  refNowMs: number,
): number {
  const firstDue = getFirstDueMs(task, refNowMs)
  if (rangeStartMs <= firstDue) return firstDue
  if (task.frequency in DAY_INTERVALS) {
    const intervalDays =
      DAY_INTERVALS[task.frequency as keyof typeof DAY_INTERVALS]
    const intervalMs = intervalDays * MS_PER_DAY
    const steps = Math.ceil((rangeStartMs - firstDue) / intervalMs)
    return firstDue + steps * intervalMs
  }
  const intervalMonths =
    MONTH_INTERVALS[task.frequency as keyof typeof MONTH_INTERVALS]
  const first = new Date(firstDue)
  const start = new Date(rangeStartMs)
  const monthsDiff =
    (start.getUTCFullYear() - first.getUTCFullYear()) * 12 +
    (start.getUTCMonth() - first.getUTCMonth())
  const alignedSteps = Math.floor(monthsDiff / intervalMonths) * intervalMonths
  let candidate = addMonthsUTC(firstDue, alignedSteps)
  if (candidate < rangeStartMs) {
    candidate = addMonthsUTC(candidate, intervalMonths)
  }
  return candidate
}

/** Whether a task is due on the given day (UTC). Non-recurring: due on day D iff (!dueDate || dueDate === dayStartMs) and !completed. Recurring: first due = dueDate ?? refTodayStart; due on D if D >= firstDue or next due <= end of D. */
export function isTaskDueOnDay(
  task: TaskForDue,
  dayStartMs: number,
  refNowMs?: number,
): boolean {
  const refNow = refNowMs ?? Date.now()
  const isRecurring = task.frequency != null

  if (!isRecurring) {
    if (task.dueDate != null) return task.dueDate === dayStartMs
    return true
  }

  return isRecurringDueOnDay(
    { ...task, frequency: task.frequency! },
    dayStartMs,
    refNow,
  )
}

/** Whether a task is due within [rangeStartMs, rangeEndMs] (UTC, inclusive). */
function isTaskDueInRange(
  task: TaskForDue,
  rangeStartMs: number,
  rangeEndMs: number,
  nowMs: number,
): boolean {
  const isRecurring = task.frequency != null
  if (!isRecurring) {
    if (task.dueDate != null) {
      return task.dueDate >= rangeStartMs && task.dueDate <= rangeEndMs
    }
    return true
  }
  const nextDue = getNextRecurringDueOnOrAfter(
    { ...task, frequency: task.frequency! },
    rangeStartMs,
    nowMs,
  )
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
  args: { viewKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query('tasks').order('desc').collect()
    return await applyViewOrder(ctx, args.viewKey, tasks)
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
    const ancestors: Array<{ _id: Id<'tasks'>; title: string }> = []
    let current = await ctx.db.get(args.taskId)
    while (current?.parentTaskId) {
      const parent = await ctx.db.get(current.parentTaskId)
      if (!parent) break
      ancestors.unshift({ _id: parent._id, title: parent.title })
      current = parent
    }
    return ancestors
  },
})

export const listTaskChildren = query({
  args: {
    taskId: v.id('tasks'),
    dayStartMs: v.optional(v.number()),
    viewKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dayStartMs = startOfDayUTC(
      args.dayStartMs ?? startOfDayUTC(Date.now()),
    )
    const parent = await ctx.db.get(args.taskId)
    const scopeNonRecurringToDay =
      isRecurringTask(parent) ||
      (await hasRecurringAncestor(ctx, args.taskId))
    const children = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', q => q.eq('parentTaskId', args.taskId))
      .order('desc')
      .collect()
    const orderedChildren = await applyViewOrder(ctx, args.viewKey, children)
    const tasks = await Promise.all(
      orderedChildren.map(async (task) => {
        const [isCompleted, subtaskCompletion] = await Promise.all([
          isTaskCompletedWithChildrenForDay(
            ctx,
            task._id,
            dayStartMs,
            scopeNonRecurringToDay,
          ),
          getDirectChildCompletionForDay(ctx, task._id, dayStartMs),
        ])
        return {
          ...task,
          isCompleted,
          subtaskCompletion,
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

async function getDirectChildCompletionForDay(
  ctx: QueryCtx,
  taskId: Id<'tasks'>,
  dayStartMs: number,
) {
  const parent = await ctx.db.get(taskId)
  if (!parent) {
    return { total: 0, completed: 0 }
  }
  const scopeNonRecurringToDay =
    isRecurringTask(parent) || (await hasRecurringAncestor(ctx, taskId))
  const children = await ctx.db
    .query('tasks')
    .withIndex('byParentTaskId', q => q.eq('parentTaskId', taskId))
    .collect()
  if (children.length === 0) {
    return { total: 0, completed: 0 }
  }
  let completed = 0
  for (const child of children) {
    if (
      await isTaskCompletedWithChildrenForDay(
        ctx,
        child._id,
        dayStartMs,
        scopeNonRecurringToDay,
      )
    ) {
      completed += 1
    }
  }
  return { total: children.length, completed }
}

export const getTaskCompletion = query({
  args: { taskId: v.id('tasks'), dayStartMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const dayStartMs = startOfDayUTC(
      args.dayStartMs ?? startOfDayUTC(Date.now()),
    )
    const rootTask = await ctx.db.get(args.taskId)
    const scopeNonRecurringToDay =
      isRecurringTask(rootTask) ||
      (await hasRecurringAncestor(ctx, args.taskId))
    const queue: Array<Id<'tasks'>> = [args.taskId]
    const allTaskIds: Array<Id<'tasks'>> = []
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
      if (
        await isTaskCompletedWithChildrenForDay(
          ctx,
          taskId,
          dayStartMs,
          scopeNonRecurringToDay,
        )
      ) {
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
  args: { viewKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', q => q.eq('parentTaskId', undefined))
      .order('desc')
      .collect()
    return await applyViewOrder(ctx, args.viewKey, tasks)
  },
})

/** Root tasks that are due on the given day (UTC). */
export const listRootTasksDueOnDate = query({
  args: { dayStartMs: v.number(), viewKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now()
    const dayStartMs = startOfDayUTC(args.dayStartMs)
    const rootTasks = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', q => q.eq('parentTaskId', undefined))
      .order('desc')
      .collect()
    const dueTasks = rootTasks.filter((task) =>
      isTaskDueOnDay(task, dayStartMs, now),
    )
    const orderedTasks = await applyViewOrder(ctx, args.viewKey, dueTasks)
    return await Promise.all(
      orderedTasks.map(async (task) => {
        const [isCompleted, subtaskCompletion] = await Promise.all([
          isTaskCompletedWithChildrenForDay(ctx, task._id, dayStartMs),
          getDirectChildCompletionForDay(ctx, task._id, dayStartMs),
        ])
        return {
          ...task,
          isCompleted,
          subtaskCompletion,
        }
      }),
    )
  },
})

/** Root tasks due on each day (UTC) in the provided list. */
export const listRootTasksDueByDay = query({
  args: {
    dayStartMs: v.array(v.number()),
    viewKeysByDay: v.optional(
      v.array(
        v.object({
          dayStartMs: v.number(),
          viewKey: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const rootTasks = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', q => q.eq('parentTaskId', undefined))
      .order('desc')
      .collect()
    const viewKeyByDay = new Map(
      (args.viewKeysByDay ?? []).map((entry) => [
        startOfDayUTC(entry.dayStartMs),
        entry.viewKey,
      ]),
    )
    return await Promise.all(
      args.dayStartMs.map(async (rawDayStartMs) => {
        const dayStartMs = startOfDayUTC(rawDayStartMs)
        const dueTasks = rootTasks.filter((task) =>
          isTaskDueOnDay(task, dayStartMs, now),
        )
        const orderedTasks = await applyViewOrder(
          ctx,
          viewKeyByDay.get(dayStartMs),
          dueTasks,
        )
        const tasks = await Promise.all(
          orderedTasks.map(async (task) => ({
            ...task,
            isCompleted: await isTaskCompletedWithChildrenForDay(
              ctx,
              task._id,
              dayStartMs,
            ),
          })),
        )
        return { dayStartMs, tasks }
      }),
    )
  },
})

/** Root tasks due in the week (Sun–Sat UTC) containing refDateMs, or current week if omitted. */
export const listRootTasksDueInWeek = query({
  args: { refDateMs: v.optional(v.number()), viewKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = args.refDateMs ?? Date.now()
    const { start, end } = getCurrentWeekRangeUTC(now)
    const rootTasks = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', q => q.eq('parentTaskId', undefined))
      .order('desc')
      .collect()
    const dueTasks = rootTasks.filter((task) =>
      isTaskDueInRange(task, start, end, now),
    )
    const orderedTasks = await applyViewOrder(ctx, args.viewKey, dueTasks)
    return await Promise.all(
      orderedTasks.map(async (task) => ({
        ...task,
        isCompleted: await isTaskCompletedWithChildren(ctx, task._id),
      })),
    )
  },
})

/** Root tasks due in the month (UTC) containing refDateMs, or current month if omitted. */
export const listRootTasksDueInMonth = query({
  args: { refDateMs: v.optional(v.number()), viewKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = args.refDateMs ?? Date.now()
    const { start, end } = getCurrentMonthRangeUTC(now)
    const rootTasks = await ctx.db
      .query('tasks')
      .withIndex('byParentTaskId', q => q.eq('parentTaskId', undefined))
      .order('desc')
      .collect()
    const dueTasks = rootTasks.filter((task) =>
      isTaskDueInRange(task, start, end, now),
    )
    const orderedTasks = await applyViewOrder(ctx, args.viewKey, dueTasks)
    return await Promise.all(
      orderedTasks.map(async (task) => ({
        ...task,
        isCompleted: await isTaskCompletedWithChildren(ctx, task._id),
      })),
    )
  },
})

export const reorderTasks = mutation({
  args: {
    viewKey: v.string(),
    taskIds: v.array(v.id('tasks')),
    parentTaskId: v.optional(v.id('tasks')),
  },
  handler: async (ctx, args) => {
    const uniqueIds = new Set(args.taskIds)
    if (uniqueIds.size !== args.taskIds.length) {
      throw new Error('Duplicate task ids in reorder request.')
    }
    const existing = await ctx.db
      .query('taskOrders')
      .withIndex('byViewKeyOrder', (q) => q.eq('viewKey', args.viewKey))
      .collect()
    const existingByTaskId = new Map(
      existing.map((row) => [row.taskId, row]),
    )
    for (const row of existing) {
      if (!uniqueIds.has(row.taskId)) {
        await ctx.db.delete(row._id)
      }
    }
    for (let index = 0; index < args.taskIds.length; index += 1) {
      const taskId = args.taskIds[index]
      const existingRow = existingByTaskId.get(taskId)
      if (existingRow) {
        await ctx.db.patch(existingRow._id, {
          order: index,
          parentTaskId: args.parentTaskId,
        })
      } else {
        await ctx.db.insert('taskOrders', {
          viewKey: args.viewKey,
          taskId,
          parentTaskId: args.parentTaskId,
          order: index,
        })
      }
    }
    return { updated: args.taskIds.length }
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
    if (args.parentTaskId && args.frequency != null) {
      throw new Error('Sub-tasks cannot be recurring.')
    }
    const normalizedDueDate =
      args.dueDate != null ? startOfDayUTC(args.dueDate) : undefined
    return await ctx.db.insert('tasks', {
      title: args.title,
      parentTaskId: args.parentTaskId,
      dueDate: normalizedDueDate,
      frequency: args.frequency,
    })
  },
})

export const updateTask = mutation({
  args: {
    id: v.id('tasks'),
    title: v.optional(v.string()),
    dueDate: v.optional(v.union(v.number(), v.null())),
    frequency: v.optional(v.union(frequencyValidator, v.null())),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id)
    if (!task) {
      throw new Error('Task not found')
    }
    if (task.parentTaskId && args.frequency !== undefined) {
      throw new Error('Sub-tasks cannot be recurring.')
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
    if (args.dueDate !== undefined) {
      patch.dueDate =
        args.dueDate != null ? startOfDayUTC(args.dueDate) : undefined
    }
    if (args.frequency !== undefined) {
      patch.frequency = args.frequency ?? undefined
    }
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
  args: { taskId: v.id('tasks'), completedDateMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.completedDateMs ?? Date.now()
    const task = await ctx.db.get(args.taskId)
    const scopeNonRecurringToDay =
      isRecurringTask(task) ||
      (await hasRecurringAncestor(ctx, args.taskId))
    const ids = await completeTaskTree(
      ctx,
      args.taskId,
      now,
      scopeNonRecurringToDay,
    )
    return { inserted: ids.length }
  },
})

export const setTaskCompletion = mutation({
  args: {
    taskId: v.id('tasks'),
    completed: v.boolean(),
    completedDateMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const completedDate = args.completedDateMs ?? Date.now()
    const task = await ctx.db.get(args.taskId)
    const scopeNonRecurringToDay =
      isRecurringTask(task) ||
      (await hasRecurringAncestor(ctx, args.taskId))
    if (args.completed) {
      const completedIds = await completeTaskTree(
        ctx,
        args.taskId,
        completedDate,
        scopeNonRecurringToDay,
      )
      await syncAncestorsOnComplete(
        ctx,
        args.taskId,
        completedDate,
        new Set(completedIds),
        scopeNonRecurringToDay,
      )
      return { completed: true }
    }
    if (!scopeNonRecurringToDay) {
      await clearTaskTreeCompletions(ctx, args.taskId)
      await clearAncestorCompletions(ctx, args.taskId)
      return { completed: false }
    }
    const dayStartMs = startOfDayUTC(completedDate)
    const allTaskIds = await collectTaskAndDescendantIds(ctx, args.taskId)
    for (const id of allTaskIds) {
      const completed = await ctx.db
        .query('completedTasks')
        .withIndex('by_task_id_completed_date', (q) =>
          q.eq('taskId', id).eq('completedDate', dayStartMs),
        )
        .collect()
      for (const row of completed) {
        await ctx.db.delete(row._id)
      }
    }
    await clearAncestorCompletionsForDay(ctx, args.taskId, dayStartMs)
    return { completed: false }
  },
})


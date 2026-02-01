import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { frequencyValidator } from './schema'
import type { Id } from './_generated/dataModel'

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

/** Whether a task is due on the given day (UTC). Non-recurring: due if not completed. Recurring: due if next due <= end of day. */
export function isTaskDueToday(
  task: {
    isCompleted: boolean
    lastCompletedDate?: number
    repeatEnabled?: boolean
    frequency?: Frequency
  },
  todayStartMs: number,
): boolean {
  const isRecurring =
    task.repeatEnabled === true && task.frequency != null

  if (!isRecurring) {
    return !task.isCompleted
  }

  if (task.lastCompletedDate == null) {
    return true
  }

  const todayEndMs = todayStartMs + MS_PER_DAY - 1
  const nextDue = nextDueAfter(task.lastCompletedDate, task.frequency!)
  return nextDue <= todayEndMs
}

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('categories').order('desc').collect()
  },
})

export const getCategory = query({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const listCategoryAncestors = query({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const ancestors = []
    const visited = new Set<string>()
    let current = await ctx.db.get(args.id)

    while (current?.parentCategoryId) {
      const parentId = current.parentCategoryId
      if (visited.has(parentId)) {
        break
      }
      visited.add(parentId)
      const parent = await ctx.db.get(parentId)
      if (!parent) {
        break
      }
      ancestors.push(parent)
      current = parent
    }

    return ancestors.reverse()
  },
})

export const listCategoryChildren = query({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const [categories, tasksRaw] = await Promise.all([
      ctx.db
        .query('categories')
        .filter((q) => q.eq(q.field('parentCategoryId'), args.id))
        .order('desc')
        .collect(),
      ctx.db
        .query('tasks')
        .filter((q) => q.eq(q.field('parentCategoryId'), args.id))
        .order('desc')
        .collect(),
    ])
    // Uncompleted first, completed last in category detail
    const tasks = [...tasksRaw].sort(
      (a, b) => Number(a.isCompleted) - Number(b.isCompleted),
    )

    const visited = new Set<string>()
    const queue = [args.id]
    const categoryIds: Array<string> = []

    while (queue.length > 0) {
      const currentId = queue.shift()
      if (!currentId || visited.has(currentId)) {
        continue
      }
      visited.add(currentId)
      categoryIds.push(currentId)

      const children = await ctx.db
        .query('categories')
        .filter((q) => q.eq(q.field('parentCategoryId'), currentId))
        .collect()
      for (const child of children) {
        if (!visited.has(child._id)) {
          queue.push(child._id)
        }
      }
    }

    let total = 0
    let completed = 0

    for (const categoryId of categoryIds) {
      const descendantTasks = await ctx.db
        .query('tasks')
        .filter((q) => q.eq(q.field('parentCategoryId'), categoryId))
        .collect()
      total += descendantTasks.length
      completed += descendantTasks.filter((task) => task.isCompleted).length
    }

    return { categories, tasks, completion: { total, completed } }
  },
})

export const getCategoryCompletion = query({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const rootCategory = await ctx.db.get(args.id)
    if (!rootCategory) {
      return null
    }

    const visited = new Set<string>()
    const queue = [rootCategory._id]
    const categoryIds: Array<string> = []

    while (queue.length > 0) {
      const currentId = queue.shift()
      if (!currentId || visited.has(currentId)) {
        continue
      }
      visited.add(currentId)
      categoryIds.push(currentId)

      const children = await ctx.db
        .query('categories')
        .filter((q) => q.eq(q.field('parentCategoryId'), currentId))
        .collect()
      for (const child of children) {
        if (!visited.has(child._id)) {
          queue.push(child._id)
        }
      }
    }

    let total = 0
    let completed = 0

    for (const categoryId of categoryIds) {
      const tasks = await ctx.db
        .query('tasks')
        .filter((q) => q.eq(q.field('parentCategoryId'), categoryId))
        .collect()
      total += tasks.length
      completed += tasks.filter((task) => task.isCompleted).length
    }

    return { total, completed }
  },
})

export const createCategory = mutation({
  args: { name: v.string(), parentCategoryId: v.optional(v.id('categories')) },
  handler: async (ctx, args) => {
    return await ctx.db.insert('categories', {
      name: args.name,
      parentCategoryId: args.parentCategoryId,
    })
  },
})

export const updateCategory = mutation({
  args: { id: v.id('categories'), name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      name: args.name,
    })
  },
})

export const deleteCategory = mutation({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const hasTasks = await ctx.db
      .query('tasks')
      .filter((q) => q.eq(q.field('parentCategoryId'), args.id))
      .first()
    if (hasTasks) {
      throw new Error('Category has tasks. Remove them before deleting.')
    }
    return await ctx.db.delete(args.id)
  },
})

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
      .filter((q) => q.eq(q.field('parentCategoryId'), undefined))
      .order('desc')
      .collect()
  },
})

/** Root tasks that are due today (UTC). Uses lastCompletedDate + frequency for recurring; non-recurring due if not completed. */
export const listRootTasksDueToday = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const todayStart = startOfDayUTC(now)
    const rootTasks = await ctx.db
      .query('tasks')
      .filter((q) => q.eq(q.field('parentCategoryId'), undefined))
      .order('desc')
      .collect()
    return rootTasks.filter((task) => isTaskDueToday(task, todayStart))
  },
})

export const createTask = mutation({
  args: {
    title: v.string(),
    parentCategoryId: v.optional(v.id('categories')),
    repeatEnabled: v.optional(v.boolean()),
    frequency: v.optional(frequencyValidator),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('tasks', {
      title: args.title,
      parentCategoryId: args.parentCategoryId,
      isCompleted: false,
      lastCompletedDate: undefined,
      repeatEnabled: args.repeatEnabled ?? false,
      frequency: args.frequency,
    })
  },
})

export const updateTask = mutation({
  args: {
    id: v.id('tasks'),
    title: v.optional(v.string()),
    repeatEnabled: v.optional(v.boolean()),
    frequency: v.optional(frequencyValidator),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id)
    if (!task) {
      throw new Error('Task not found')
    }
    const patch: {
      title?: string
      repeatEnabled?: boolean
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
    if (args.repeatEnabled !== undefined) patch.repeatEnabled = args.repeatEnabled
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

export const toggleTaskCompletion = mutation({
  args: { id: v.id('tasks') },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id)
    if (!task) {
      throw new Error('Task not found')
    }
    const nextCompleted = !task.isCompleted
    return await ctx.db.patch(args.id, {
      isCompleted: nextCompleted,
      lastCompletedDate: nextCompleted ? Date.now() : undefined,
    })
  },
})

export const bulkCompleteCategory = mutation({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const rootCategory = await ctx.db.get(args.id)
    if (!rootCategory) {
      throw new Error('Category not found')
    }

    const visited = new Set<string>()
    const queue: Array<Id<'categories'>> = [rootCategory._id]
    const categoryIds: Array<Id<'categories'>> = []

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) {
        continue
      }
      visited.add(currentId)
      categoryIds.push(currentId)

      const children = await ctx.db
        .query('categories')
        .filter((q) => q.eq(q.field('parentCategoryId'), currentId))
        .collect()
      for (const child of children) {
        if (!visited.has(child._id)) {
          queue.push(child._id)
        }
      }
    }

    let updated = 0
    const completedAt = Date.now()

    for (const categoryId of categoryIds) {
      const tasks = await ctx.db
        .query('tasks')
        .filter((q) => q.eq(q.field('parentCategoryId'), categoryId))
        .collect()
      const incompleteTasks = tasks.filter((task) => !task.isCompleted)
      if (incompleteTasks.length === 0) {
        continue
      }
      for (const task of incompleteTasks) {
        await ctx.db.patch(task._id, {
          isCompleted: true,
          lastCompletedDate: completedAt,
        })
        updated += 1
      }
    }

    return { updated }
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('todos').order('desc').collect()
  },
})
export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert('todos', {
      text: args.text,
      completed: false,
    })
  },
})
export const toggle = mutation({
  args: { id: v.id('todos') },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id)
    if (!todo) {
      throw new Error('Todo not found')
    }
    return await ctx.db.patch(args.id, {
      completed: !todo.completed,
    })
  },
})
export const remove = mutation({
  args: { id: v.id('todos') },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})

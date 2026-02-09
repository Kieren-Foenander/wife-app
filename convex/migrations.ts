import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { convertUtcDayStartToBrisbane } from './dateUtils'

const ROOT_DAY_PREFIX = 'root-day:'
const CHILDREN_PREFIX = 'children:'

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

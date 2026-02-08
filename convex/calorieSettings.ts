import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'

const SETTINGS_KIND = 'global'
const DEFAULT_NORMAL_GOAL = 1800
const DEFAULT_MAINTENANCE_GOAL = 2000

type Settings = {
  normalGoal: number
  maintenanceGoal: number
  resetWeekStartMs?: number
  resetWeekEndMs?: number
}

async function getSettings(ctx: QueryCtx): Promise<Settings> {
  const existing = await ctx.db
    .query('userSettings')
    .withIndex('byKind', (q) => q.eq('kind', SETTINGS_KIND))
    .first()
  if (existing) {
    return {
      normalGoal: existing.normalGoal,
      maintenanceGoal: existing.maintenanceGoal,
      resetWeekStartMs: existing.resetWeekStartMs,
      resetWeekEndMs: existing.resetWeekEndMs,
    }
  }
  return {
    normalGoal: DEFAULT_NORMAL_GOAL,
    maintenanceGoal: DEFAULT_MAINTENANCE_GOAL,
  }
}

async function getOrCreateSettings(
  ctx: MutationCtx,
): Promise<Doc<'userSettings'>> {
  const existing = await ctx.db
    .query('userSettings')
    .withIndex('byKind', (q) => q.eq('kind', SETTINGS_KIND))
    .first()
  if (existing) {
    return existing
  }
  const id = await ctx.db.insert('userSettings', {
    kind: SETTINGS_KIND,
    normalGoal: DEFAULT_NORMAL_GOAL,
    maintenanceGoal: DEFAULT_MAINTENANCE_GOAL,
  })
  return (await ctx.db.get(id)) as Doc<'userSettings'>
}

function isResetWeekForDate(
  dayStartMs: number,
  settings: Settings,
): boolean {
  const start = settings.resetWeekStartMs
  if (start == null) return false
  const end = settings.resetWeekEndMs
  if (end == null) return dayStartMs >= start
  return dayStartMs >= start && dayStartMs <= end
}

export const getCalorieSettings = query({
  args: {},
  handler: async (ctx) => {
    return await getSettings(ctx)
  },
})

export const getGoalForDate = query({
  args: { dayStartMs: v.number() },
  handler: async (ctx, args) => {
    const settings = await getSettings(ctx)
    const resetWeekActive = isResetWeekForDate(args.dayStartMs, settings)
    const goal = resetWeekActive
      ? settings.maintenanceGoal
      : settings.normalGoal
    return {
      goal,
      mode: resetWeekActive ? 'maintenance' : 'normal',
      resetWeekActive,
    }
  },
})

export const updateCalorieSettings = mutation({
  args: {
    normalGoal: v.optional(v.number()),
    maintenanceGoal: v.optional(v.number()),
    resetWeekStartMs: v.optional(v.union(v.number(), v.null())),
    resetWeekEndMs: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const settings = await getOrCreateSettings(ctx)
    const patch: Settings = {
      normalGoal: settings.normalGoal,
      maintenanceGoal: settings.maintenanceGoal,
    }
    if (args.normalGoal != null) patch.normalGoal = args.normalGoal
    if (args.maintenanceGoal != null) {
      patch.maintenanceGoal = args.maintenanceGoal
    }
    if (args.resetWeekStartMs !== undefined) {
      patch.resetWeekStartMs = args.resetWeekStartMs ?? undefined
    }
    if (args.resetWeekEndMs !== undefined) {
      patch.resetWeekEndMs = args.resetWeekEndMs ?? undefined
    }
    await ctx.db.patch(settings._id as Id<'userSettings'>, patch)
    return patch
  },
})

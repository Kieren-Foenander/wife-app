import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getGoalForDateInternal } from './calorieSettings'
import { startOfDayUTC } from './dateUtils'

function defaultTimestampForDay(dayStartMs: number): number {
  const todayStartMs = startOfDayUTC(Date.now())
  if (dayStartMs === todayStartMs) return Date.now()
  return dayStartMs + 12 * 60 * 60 * 1000
}

export const listEntriesForDay = query({
  args: {
    dayStartMs: v.number(),
    order: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    const dayStartMs = startOfDayUTC(args.dayStartMs)
    const order = args.order ?? 'desc'
    return await ctx.db
      .query('calorieEntries')
      .withIndex('byDayStartMsTimestamp', (q) =>
        q.eq('dayStartMs', dayStartMs),
      )
      .order(order)
      .collect()
  },
})

export const getDayTotals = query({
  args: { dayStartMs: v.number() },
  handler: async (ctx, args) => {
    const dayStartMs = startOfDayUTC(args.dayStartMs)
    const entries = await ctx.db
      .query('calorieEntries')
      .withIndex('byDayStartMs', (q) => q.eq('dayStartMs', dayStartMs))
      .collect()
    const consumed = entries.reduce((sum, entry) => sum + entry.calories, 0)
    const { goal } = await getGoalForDateInternal(ctx, dayStartMs)
    return {
      consumed,
      goal,
      remaining: goal - consumed,
    }
  },
})

export const createCalorieEntry = mutation({
  args: {
    dayStartMs: v.number(),
    timestampMs: v.optional(v.number()),
    label: v.string(),
    calories: v.number(),
    grams: v.optional(v.number()),
    servings: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dayStartMs = startOfDayUTC(args.dayStartMs)
    const timestampMs = args.timestampMs ?? defaultTimestampForDay(dayStartMs)
    return await ctx.db.insert('calorieEntries', {
      dayStartMs,
      timestampMs,
      label: args.label,
      calories: args.calories,
      grams: args.grams,
      servings: args.servings,
    })
  },
})

export const updateCalorieEntry = mutation({
  args: {
    id: v.id('calorieEntries'),
    dayStartMs: v.optional(v.number()),
    timestampMs: v.optional(v.number()),
    label: v.optional(v.string()),
    calories: v.optional(v.number()),
    grams: v.optional(v.number()),
    servings: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Calorie entry not found')
    }
    const patch: {
      dayStartMs?: number
      timestampMs?: number
      label?: string
      calories?: number
      grams?: number
      servings?: number
    } = {}
    if (args.dayStartMs !== undefined) {
      patch.dayStartMs = startOfDayUTC(args.dayStartMs)
    }
    if (args.timestampMs !== undefined) patch.timestampMs = args.timestampMs
    if (args.label !== undefined) patch.label = args.label
    if (args.calories !== undefined) patch.calories = args.calories
    if (args.grams !== undefined) patch.grams = args.grams
    if (args.servings !== undefined) patch.servings = args.servings
    return await ctx.db.patch(args.id, patch)
  },
})

export const deleteCalorieEntry = mutation({
  args: { id: v.id('calorieEntries') },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})

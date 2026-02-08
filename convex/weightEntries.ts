import { v } from 'convex/values'
import { query } from './_generated/server'
import { startOfDayUTC } from './dateUtils'

export const listWeightEntriesForRange = query({
  args: {
    startDayMs: v.number(),
    endDayMs: v.number(),
  },
  handler: async (ctx, args) => {
    const startDayMs = startOfDayUTC(args.startDayMs)
    const endDayMs = startOfDayUTC(args.endDayMs)
    const lower = Math.min(startDayMs, endDayMs)
    const upper = Math.max(startDayMs, endDayMs)
    return await ctx.db
      .query('weightEntries')
      .withIndex('byDayStartMs', (q) =>
        q.gte('dayStartMs', lower).lte('dayStartMs', upper),
      )
      .order('asc')
      .collect()
  },
})

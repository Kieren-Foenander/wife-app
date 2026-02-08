import { query } from './_generated/server'

export const listRecipes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('recipes')
      .withIndex('byUsageCount', (q) => q.gte('usageCount', 0))
      .order('desc')
      .collect()
  },
})

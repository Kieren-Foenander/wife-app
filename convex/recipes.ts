import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

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

export const upsertRecipe = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    ingredients: v.optional(v.string()),
    defaultServingGrams: v.optional(v.number()),
    caloriesPerServing: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('recipes')
      .withIndex('byName', (q) => q.eq('name', args.name))
      .first()
    if (existing) {
      const patch: {
        description?: string
        ingredients?: string
        defaultServingGrams?: number
        caloriesPerServing?: number
        usageCount?: number
      } = {
        usageCount: (existing.usageCount ?? 0) + 1,
      }
      if (args.description !== undefined) patch.description = args.description
      if (args.ingredients !== undefined) patch.ingredients = args.ingredients
      if (args.defaultServingGrams !== undefined) {
        patch.defaultServingGrams = args.defaultServingGrams
      }
      if (args.caloriesPerServing !== undefined) {
        patch.caloriesPerServing = args.caloriesPerServing
      }
      return await ctx.db.patch(existing._id, patch)
    }

    return await ctx.db.insert('recipes', {
      name: args.name,
      description: args.description,
      ingredients: args.ingredients,
      defaultServingGrams: args.defaultServingGrams,
      caloriesPerServing: args.caloriesPerServing,
      usageCount: 1,
    })
  },
})

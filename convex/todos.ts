import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('categories').order('desc').collect()
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

export const createTask = mutation({
  args: { title: v.string(), parentCategoryId: v.optional(v.id('categories')) },
  handler: async (ctx, args) => {
    return await ctx.db.insert('tasks', {
      title: args.title,
      parentCategoryId: args.parentCategoryId,
    })
  },
})

export const updateTask = mutation({
  args: { id: v.id('tasks'), title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      title: args.title,
    })
  },
})

export const deleteTask = mutation({
  args: { id: v.id('tasks') },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('todos')
      .withIndex('by_creation_time')
      .order('desc')
      .collect()
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

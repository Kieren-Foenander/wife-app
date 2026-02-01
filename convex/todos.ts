import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('categories').order('desc').collect()
  },
})

export const createCategory = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert('categories', {
      name: args.name,
    })
  },
})

export const listTasks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('tasks').order('desc').collect()
  },
})

export const createTask = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert('tasks', {
      title: args.title,
    })
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

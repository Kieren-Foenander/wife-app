import { useCallback, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Circle, Plus, Trash2 } from 'lucide-react'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/demo/convex')({
  ssr: false,
  component: ConvexTodos,
})

function ConvexTodos() {
  const tasks = useQuery(api.todos.listTasks)
  const addTask = useMutation(api.todos.createTask)
  const deleteTask = useMutation(api.todos.deleteTask)

  const [newTask, setNewTask] = useState('')

  const handleAddTask = useCallback(async () => {
    if (newTask.trim()) {
      await addTask({ title: newTask.trim() })
      setNewTask('')
    }
  }, [addTask, newTask])

  const handleRemoveTask = useCallback(
    async (id: Id<'tasks'>) => {
      await deleteTask({ id })
    },
    [deleteTask],
  )

  const totalCount = tasks?.length || 0

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'linear-gradient(135deg, #667a56 0%, #8fbc8f 25%, #90ee90 50%, #98fb98 75%, #f0fff0 100%)',
      }}
    >
      <div className="w-full max-w-2xl">
        {/* Header Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-green-200/50 p-8 mb-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-green-800 mb-2">
              Convex Todos
            </h1>
            <p className="text-green-600 text-lg">Powered by real-time sync</p>
            {totalCount > 0 && (
              <div className="mt-4 flex justify-center space-x-6 text-sm">
                <span className="text-green-700 font-medium">
                  {totalCount} tasks
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Add Todo Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-green-200/50 p-6 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTask()
                }
              }}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-green-200 focus:border-green-400 focus:outline-none text-gray-800 placeholder-gray-500 bg-white/80 transition-colors"
            />
            <button
              onClick={handleAddTask}
              disabled={!newTask.trim()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              Add
            </button>
          </div>
        </div>

        {/* Todos List */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-green-200/50 overflow-hidden">
          {!tasks ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-green-600">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center">
              <Circle size={48} className="text-green-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                No tasks yet
              </h3>
              <p className="text-green-600">
                Add your first task above to get started!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-green-100">
              {tasks.map((task, index) => (
                <div
                  key={task._id}
                  className="p-4 flex items-center gap-4 hover:bg-green-50/50 transition-colors"
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <span
                    className="flex-1 text-lg transition-all duration-200 text-gray-800"
                  >
                    {task.title}
                  </span>

                  <button
                    onClick={() => handleRemoveTask(task._id)}
                    className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-green-700/80 text-sm">
            Built with Convex • Real-time updates • Always in sync
          </p>
        </div>
      </div>
    </div>
  )
}

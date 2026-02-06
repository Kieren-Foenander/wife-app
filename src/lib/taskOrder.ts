export type TaskViewKey =
  | { kind: 'root-day'; dayStartMs: number }
  | { kind: 'children'; parentTaskId: string; dayStartMs: number }
  | { kind: 'root-week'; startMs: number }
  | { kind: 'root-month'; startMs: number }
  | { kind: 'root-all' }
  | { kind: 'all' }

const ROOT_DAY_PREFIX = 'root-day:'
const ROOT_WEEK_PREFIX = 'root-week:'
const ROOT_MONTH_PREFIX = 'root-month:'
const CHILDREN_PREFIX = 'children:'

export function buildRootDayViewKey(dayStartMs: number): string {
  return `${ROOT_DAY_PREFIX}${dayStartMs}`
}

export function buildRootWeekViewKey(weekStartMs: number): string {
  return `${ROOT_WEEK_PREFIX}${weekStartMs}`
}

export function buildRootMonthViewKey(monthStartMs: number): string {
  return `${ROOT_MONTH_PREFIX}${monthStartMs}`
}

export function buildTaskChildrenViewKey(
  parentTaskId: string,
  dayStartMs: number,
): string {
  return `${CHILDREN_PREFIX}${parentTaskId}:${dayStartMs}`
}

export function buildRootAllViewKey(): string {
  return 'root-all'
}

export function buildAllTasksViewKey(): string {
  return 'all'
}

export function parseViewKey(viewKey: string): TaskViewKey | null {
  if (viewKey === 'root-all') return { kind: 'root-all' }
  if (viewKey === 'all') return { kind: 'all' }
  if (viewKey.startsWith(ROOT_DAY_PREFIX)) {
    const dayStartMs = Number(viewKey.slice(ROOT_DAY_PREFIX.length))
    return Number.isFinite(dayStartMs) ? { kind: 'root-day', dayStartMs } : null
  }
  if (viewKey.startsWith(ROOT_WEEK_PREFIX)) {
    const startMs = Number(viewKey.slice(ROOT_WEEK_PREFIX.length))
    return Number.isFinite(startMs) ? { kind: 'root-week', startMs } : null
  }
  if (viewKey.startsWith(ROOT_MONTH_PREFIX)) {
    const startMs = Number(viewKey.slice(ROOT_MONTH_PREFIX.length))
    return Number.isFinite(startMs) ? { kind: 'root-month', startMs } : null
  }
  if (viewKey.startsWith(CHILDREN_PREFIX)) {
    const rest = viewKey.slice(CHILDREN_PREFIX.length)
    const lastColon = rest.lastIndexOf(':')
    if (lastColon <= 0) return null
    const parentTaskId = rest.slice(0, lastColon)
    const dayStartMs = Number(rest.slice(lastColon + 1))
    if (!Number.isFinite(dayStartMs)) return null
    return { kind: 'children', parentTaskId, dayStartMs }
  }
  return null
}

export function reorderTasksById<T extends { _id: string }>(
  tasks: T[],
  orderedIds: string[],
): T[] {
  if (tasks.length === 0) return tasks
  const byId = new Map(tasks.map((task) => [task._id, task]))
  const seen = new Set<string>()
  const ordered: T[] = []
  for (const id of orderedIds) {
    const task = byId.get(id)
    if (task) {
      ordered.push(task)
      seen.add(id)
    }
  }
  for (const task of tasks) {
    if (!seen.has(task._id)) ordered.push(task)
  }
  return ordered
}

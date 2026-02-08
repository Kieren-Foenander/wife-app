# Product Requirements Document (PRD)

Name: Wife App

Goal: A mobile-first productivity app for recurring responsibilities. Everything is a task with optional subtasks. UI should feel like a calm, pastel mobile app.

Target user: People managing repeatable household routines who want a simple, low-friction checklist.

## Tech stack

- TanStack Start (React 19), Convex (backend + DB), pnpm workspaces. Deploy: Cloudflare (Wrangler).

## Structure

- **Task**: Primary item. Fields: title, optional parentTaskId, optional dueDate (UTC start-of-day ms), optional frequency (root tasks only). Can have any depth of subtasks.
- **Subtask**: A task with a parent; cannot be recurring.
- **Recurrence**: Root tasks only. Frequencies: daily, bi-daily, weekly, fortnightly, monthly, quarterly, 6-monthly, yearly. Completion for recurring tasks is per-day; non-recurring is “completed ever” (single record).
- **Views**: One main view — **daily task list** for a **selected day**. Week and Month are **date pickers** (toggle in main content) to choose which day to show; they do not show tasks grouped by day.

## Routes

- **`/`** (optional `?date=YYYY-MM-DD`): Daily view. Shows root tasks due on the selected day (or today if no date). Header: “Wife App”, selected day label, “Tasks”. Week/Month toggle with Prev/Next to change range; Week strip or Month grid to pick a day (updates URL and list). “Add task” opens root-creation drawer. Task list: sortable (drag), checkbox, title (link to task detail), subtask badge (x/y), edit, delete. “Jump to Today” floating button when not today. Bottom nav: Tasks (current), Gym (soon), calories (soon) — disabled placeholders.
- **`/tasks/$taskId`** (optional `?date=YYYY-MM-DD`): Task detail. Breadcrumb: Daily → ancestors → current task. Parent task: checkbox (complete/uncomplete this task and all subtasks), title, completion indicator (progress bar + x/y done). “Add sub-task” opens drawer with parent fixed. Sub-task list: same row UI, sortable. “Go Back” to daily view (preserves date).

## Behavior

- **Root task creation**: Drawer has no parent field. Optional due date, optional repeat (frequency). Assumes root.
- **Subtask creation**: Only from task detail; drawer shows parent (read-only), no frequency.
- **Completion**: Completed tasks stay visible with strike-through (line-through + muted). No hiding.
- **Parent ↔ subtask sync**: All subtasks completed → parent auto-completes. Parent completed → all subtasks marked complete. Any subtask unchecked → parent (and ancestors) uncheck. Recurring context: completion is per-day; non-recurring uses single completion.
- **Day selection**: URL drives selected day. Clicking a day in Week strip or Month grid navigates with `?date=YYYY-MM-DD`. “Jump to Today” clears date. No separate “scroll to day” — one day, one list.
- **Ordering**: Custom order via drag-and-drop; persisted in Convex (taskOrders by viewKey). Root order per day; children order per parent (and recurring roots share a recurring view key).
- **Theme**: Pastel palette (Nunito font, pastel CSS vars) applied across UI. No starter header/menu; app title “Wife App” centered at top, small. Bottom bar is compact, mobile-style.
- **Completion feedback**: Brief celebration (bounce) when marking a task complete.

## Data (Convex)

- **tasks**: title, parentTaskId?, dueDate?, frequency? (root only).
- **taskOrders**: viewKey, taskId, parentTaskId?, order — for drag-order.
- **completedTasks**: taskId, completedDate? — one row per completion; recurring uses completedDate (UTC day start), non-recurring may omit it for “done ever”.

Indexes used: byParentTaskId, byViewKeyOrder, byViewKeyTaskId, by_task_id, by_task_id_completed_date.

## Work list (current state)

- [x] Root task drawer: no parent; optional due + frequency.
- [x] Subtask drawer: only from task detail; parent fixed, no frequency.
- [x] Completion: completed tasks visible with strike-through.
- [x] Parent/subtask sync: auto complete/uncomplete propagation.
- [x] Day selection: Week/Month as date pickers; URL ?date=; Jump to Today.
- [x] Pastel theme and “Wife App” title; no starter nav.
- [x] Bottom nav: Tasks + placeholders (Gym, calories — soon).
- [x] Task detail: breadcrumb, parent checkbox, completion indicator, sub-tasks, reorder.
- [x] Recurring tasks: frequencies; per-day completion for recurring.
- [x] Drag-and-drop reorder with persisted order.

## Planned (from UI)

- Gym (section) — placeholder in bottom nav.
- **Calories (section)** — placeholder in bottom nav. Full spec: [Calories section PRD](calories-section-prd.md).

## Related PRDs

- [Calories section PRD](calories-section-prd.md) — Easy calorie tracking (v1): logging, AI estimates, recipes, weight, streak, reset week.

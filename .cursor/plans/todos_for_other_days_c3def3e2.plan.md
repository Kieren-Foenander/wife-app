---
name: Todos for other days
overview: Add a selectable "viewing day" driven by the calendar (weekly/monthly), date-aware task queries and creation (with due-date picker defaulting to the viewing day), and recurring tasks that start from the selected task date.
todos: []
---

# Todos for other days

## Current state

- **[convex/schema.ts](convex/schema.ts)** – `tasks` have no due date; only `lastCompletedDate` + `repeatEnabled`/`frequency` for recurrence. "Due today" is computed (recurring: next due from lastCompleted; non-recurring: incomplete).
- **[src/routes/index.tsx](src/routes/index.tsx) **– View mode (day/week/month) in URL (`?view=`). Week strip and month grid show **current** week/month; days are not clickable. Data always uses "now" (listRootTasksDueToday, listRootTasksDueInWeek, listRootTasksDueInMonth).
- **[src/components/CreationDrawer.tsx](src/components/CreationDrawer.tsx)** – New task has title, parent, repeat, frequency; no date. Recurring effectively starts "today" (no lastCompletedDate).
- **[convex/todos.ts](convex/todos.ts)** – `isTaskDueToday(task, todayStartMs)`, `getNextDueMs`, `isTaskDueInRange`; all use "today" or `now` for first-due when `lastCompletedDate` is null.

## 1. Schema and backend: due date + date-aware queries

**Schema** – Add optional `dueDate: v.optional(v.number())` to `tasks` (UTC start-of-day ms). Semantics:

- **Non-recurring**: Task is due only on that day (show on that day until completed).
- **Recurring**: First due on `dueDate`; after completion, next due = `nextDueAfter(lastCompletedDate, frequency)`.

**Due logic in [convex/todos.ts](convex/todos.ts)**:

- Extend task type in `isTaskDueToday`, `getNextDueMs`, `isTaskDueInRange` to include `dueDate?: number`.
- **Recurring, no lastCompletedDate**: "First due" = `dueDate ?? todayStart`. Task is due on day D if `dayStartMs >= (dueDate ?? todayStart)` (and within range for week/month).
- **Recurring, has lastCompletedDate**: Unchanged – next due = `nextDueAfter(lastCompletedDate, frequency)`.
- **Non-recurring**: Due on day D iff `(!dueDate || dueDate === dayStartMs)` and `!completed`. (No dueDate = legacy: due every day until done.)

**Queries** – Make date explicit so the frontend can pass the selected day:

- Replace `listRootTasksDueToday` with **`listRootTasksDueOnDate`** args: `dayStartMs: v.number()`. Filter with `isTaskDueOnDay(task, dayStartMs)` (refactor of current `isTaskDueToday` to take arbitrary day).
- **`listRootTasksDueInWeek`** and **`listRootTasksDueInMonth`**: add optional `refDateMs: v.optional(v.number())`; when provided, compute week/month range from that date instead of `Date.now()`. Keeps one set of queries.

**Mutations**:

- **createTask**: add optional `dueDate: v.optional(v.number())`. Persist on task. Recurring: when `lastCompletedDate` is null, next due = `dueDate ?? today`.
- **updateTask**: optional `dueDate` for editing (if you want users to change due date later; can be Phase 2).

## 2. Frontend: selected date and calendar interaction

**URL state** – [src/routes/index.tsx](src/routes/index.tsx):

- Extend search: `{ view: ViewMode, date?: string }` with `date` as `YYYY-MM-DD`. Default `date` to today when absent (normalize in `validateSearch` or when reading).
- Derive a single **selectedDate** (Date) from `date` (or today). Use it for header text, data loading, and drawer default.

**Week strip and month grid**:

- **WeekStrip**: Take `selectedDate` (Date) and `onSelectDay(date: Date)`. Compute week dates from `selectedDate` (e.g. Sunday–Saturday of week containing selectedDate), not from "now". Make each day a `<button>`; click calls `onSelectDay(dayDate)` and navigates to `?date=YYYY-MM-DD&view=day` (so the list shows that day’s tasks).
- **MonthGrid**: Same idea – build grid for the **month of selectedDate**. Each cell with a date is a button; click sets `?date=YYYY-MM-DD&view=day`.
- Optional: add prev/next week or prev/next month to change the strip/grid without changing selected day (or change selected day to first of that week/month).

**Header**:

- For day view: show label for selected date, e.g. "Today – Monday" when selected is today, or "Wed, Feb 5, 2025" when another day.
- Week/Month headers can stay "Weekly" / "Monthly" or indicate the week/month of selected date.

**Data loading**:

- Day view: `listRootTasksDueOnDate({ dayStartMs: startOfDayUTC(selectedDate) })`.
- Week view: `listRootTasksDueInWeek({ refDateMs: selectedDate.getTime() })` (week range from selected date).
- Month view: `listRootTasksDueInMonth({ refDateMs: selectedDate.getTime() })`.

Categories list stays as-is (all root categories); only the **tasks** section is date-filtered.

## 3. Creation drawer: date selector and recurrence from that date

**[src/components/CreationDrawer.tsx](src/components/CreationDrawer.tsx)**:

- New prop: **`defaultDueDate?: Date`** (the currently selected day from the index page; when opening from category detail, can pass same or today).
- Task form: add a **Due date** field – native `<input type="date">` (mobile-friendly). Value: `defaultDueDate` or today; store as local state, submit as UTC start-of-day ms.
- **AddTaskParams** and submit: include `dueDate?: number`.
- On create, pass `dueDate` to `createTask`. Recurring tasks will use this as first-due (already handled in backend once `dueDate` exists and due logic is updated).

**Index and category detail**:

- Index: pass `selectedDate` into CreationDrawer as `defaultDueDate`.
- Category detail: pass `new Date()` as default (or later, if you add date to category route, pass that).

## 4. Recurring from selected task date

- Backend: recurring task with `dueDate` and no `lastCompletedDate` is due on any day `>= dueDate` (first occurrence = dueDate; then after completion, next due = nextDueAfter(lastCompletedDate, frequency)). No extra frontend logic.
- Ensure **toggleTaskCompletion** and existing recurrence math are unchanged; they already use `lastCompletedDate`. Only the "first due" comes from `dueDate` in the due helpers.

## 5. Edge cases and compatibility

- **Existing tasks** (no `dueDate`): Non-recurring = due every day until completed. Recurring = first due "today" until first completion. No migration.
- **Timezone**: Use UTC start-of-day in Convex; frontend converts selected date to UTC start-of-day when calling APIs (e.g. `Date.UTC(y, m, d)` from local YYYY-MM-DD or from selected Date).
- **Category detail**: No date filter in this scope; can later add optional `?date=` to category route and filter tasks by that day.

## 6. Files to touch (summary)

| Area | Files |

|------|--------|

| Schema | [convex/schema.ts](convex/schema.ts) – add `dueDate` to tasks |

| Backend | [convex/todos.ts](convex/todos.ts) – due helpers + dueDate, listRootTasksDueOnDate, listRootTasksDueInWeek/Month(refDateMs), createTask(dueDate) |

| Route | [src/routes/index.tsx](src/routes/index.tsx) – search.date, selectedDate, WeekStrip/MonthGrid clickable with onSelectDay, header for selected day, pass selectedDate to queries and drawer |

| Drawer | [src/components/CreationDrawer.tsx](src/components/CreationDrawer.tsx) – defaultDueDate prop, date input, submit dueDate |

| Category | [src/routes/categories/$categoryId.tsx](src/routes/categories/$categoryId.tsx) – pass defaultDueDate (e.g. today) to CreationDrawer if opened there |

## Data flow (high level)

```mermaid
sequenceDiagram
  participant User
  participant Index as Index_Route
  participant URL as URL_Search
  participant Convex as Convex_Queries
  participant Drawer as CreationDrawer

  User->>Index: Clicks day in week/month
  Index->>URL: Set date=YYYY-MM-DD, view=day
  Index->>Convex: listRootTasksDueOnDate(dayStartMs)
  Convex-->>Index: Tasks due that day
  Index->>User: Show tasks for selected day

  User->>Drawer: Open Create (defaultDueDate=selectedDate)
  User->>Drawer: Pick date, set repeat, submit
  Drawer->>Convex: createTask(dueDate, repeatEnabled, frequency)
  Convex->>Convex: Store dueDate; recurrence from dueDate when no lastCompleted
```

## Implementation order

1. Schema + Convex: add `dueDate`, update due helpers and queries, then `createTask`.
2. Index: URL `date`, selectedDate, wire queries to selected date.
3. WeekStrip / MonthGrid: derive from selectedDate, make days clickable, set date + view=day.
4. CreationDrawer: defaultDueDate, date input, pass dueDate on create.
5. Category detail: pass defaultDueDate (today) to drawer.
6. E2E: extend or add a test for selecting a day and creating a task with a due date (and optionally recurring).
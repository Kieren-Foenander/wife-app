# Product Requirements Document (PRD)

This is your Ralph plan file. The agent reads this file and `progress.txt` on each run, picks the next incomplete task, implements it, commits, and updates progress.

Format: markdown checklists. One task per iteration; run `pnpm run typecheck`, `pnpm run convex:check`, `pnpm run test`, `pnpm run lint`, then UI verification via Cursor browser, then commit and append to `progress.txt`. See [docs/RALPH.md](docs/RALPH.md).

---

## Phase 0: Audit, demo isolation, and scaffolding

- [x] Baseline audit: Inventory existing TanStack Start demo routes/components; record summary in progress.txt
- [x] Demo isolation plan: Preserve demo routes but keep them out of app navigation (e.g. /docs or /demo, not in main nav)
- [x] Add minimal data model skeleton for categories/tasks in convex/schema.ts; `pnpm run convex:check` passes
- [x] Create placeholder Convex query/mutation stubs in convex/todos.ts; `pnpm run typecheck` passes
- [ ] Wire Convex provider in app root; app boots with `pnpm run dev` and no console errors

## Phase 1: Core data model & CRUD (categories + tasks)

- [ ] Category create (root): Mutation + UI form to create root category on Daily view
- [ ] Category list (root): Query + show list in Daily view
- [ ] Category update: Mutation + UI to rename a category
- [ ] Category delete: Mutation + UI delete (only if empty; show message if children exist)
- [ ] Task create (root): Mutation + UI form to create root task
- [ ] Task list (root): Query + UI list of uncategorized tasks on Daily view
- [ ] Task update: Mutation + UI to rename a task
- [ ] Task delete: Mutation + UI delete for task

## Phase 2: Hierarchy (infinite nesting) + navigation

- [ ] Category parent/child fields: Add parentCategoryId to category and task tables; update create mutations
- [ ] Category detail route: Route screen for a category with list of children
- [ ] Child listing: Query children (subcategories + tasks) for a category
- [ ] Breadcrumbs: Query ancestors and render breadcrumb navigation
- [ ] Context-aware creation: Creation drawer auto-sets parent when on category detail
- [ ] Infinite depth: Navigation works for deep nesting; smoke test with 3+ levels

## Phase 3: Completion behavior + aggregation

- [ ] Task completion: Add isCompleted and lastCompletedDate; checkbox toggles
- [ ] Category completion computed: Query total descendant tasks and completed count (x/y done)
- [ ] Partial state indicator: UI shows partial completion for categories
- [ ] Auto-completion: Category shows completed when all descendant tasks completed
- [ ] Bulk complete category: Mutation to recursively complete all descendant tasks
- [ ] Unchecked priority: Sort uncompleted first, completed last in category detail

## Phase 4: Recurring tasks

- [ ] Repeat fields: Add repeat settings to tasks (repeatEnabled, frequency)
- [ ] Frequency enum: Validated options (daily, bi-daily, weekly, fortnightly, monthly, quarterly, 6-monthly, yearly)
- [ ] Next due logic: Compute whether task is due on Daily view from lastCompletedDate and frequency
- [ ] Daily view filtering: Only show tasks due for today in daily view
- [ ] Completion updates: On completing recurring task, update lastCompletedDate; task reappears next interval

## Phase 5: View modes (Daily/Weekly/Monthly)

- [ ] View mode state: Day/Week/Month toggle UI
- [ ] Daily header: Show "Today - [Day Name]"
- [ ] Weekly view UI: Render week strip with days
- [ ] Monthly view UI: Render calendar grid
- [ ] View-specific data: Hook data loaders to each view (Daily due; Week/Month relevant tasks)

## Phase 6: Creation drawer UX

- [ ] Drawer component: Slide-up panel for creating task/category
- [ ] Mode toggle: New Task vs New Category in drawer
- [ ] Task fields: Title, Parent, Repeat toggle, Frequency select
- [ ] Category fields: Name, Parent, Color
- [ ] Parent dropdown: Select any category as parent

## Phase 7: Theme + UI polish

- [ ] Pastel theme tokens: Add color palette in src/styles.css
- [ ] Typography: Apply friendly rounded font globally
- [ ] Iconography: Add soft-edged icons for categories/tasks
- [ ] Micro-interactions: Completion animation (e.g. subtle bounce/confetti)

## Phase 8: UX details + quality

- [ ] Empty states: Empty state messaging for lists
- [ ] Error handling: Error toasts for failed mutations
- [ ] Loading states: Spinners/skeletons during fetch
- [ ] Accessibility pass: Buttons/checkboxes labeled; basic a11y audit

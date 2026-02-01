---
name: ralph-loop-prd
overview: Break the PRD into very small, testable Ralph loop iterations that implement the full product in phases, each loop delivering one concrete task with required feedback loops and UI verification.
todos:
  - id: phase0-scaffold
    content: Add schema + Convex stubs; verify app boots
    status: pending
  - id: crud-root
    content: Implement root CRUD for categories/tasks
    status: pending
  - id: hierarchy-nav
    content: Add nesting, detail view, breadcrumbs
    status: pending
  - id: completion-agg
    content: Implement completion and aggregation logic
    status: pending
  - id: recurring-tasks
    content: Add repeat fields and due logic
    status: pending
  - id: view-modes
    content: Daily/weekly/monthly views + data
    status: pending
  - id: creation-drawer
    content: Build slide-up create drawer UX
    status: pending
  - id: theme-polish
    content: Apply pastel theme, icons, animations
    status: pending
  - id: ux-quality
    content: Empty/error/loading/a11y improvements
    status: pending
---

# Ralph Loop Plan For PRD

## Approach

- Follow the Ralph loop rules in [docs/RALPH.md](/home/kieren/Documents/wife-app/docs/RALPH.md): one task per iteration, run `pnpm run typecheck`, `pnpm run convex:check`, `pnpm run test`, `pnpm run lint`, then UI verification via Cursor browser, then commit and append to [progress.txt](/home/kieren/Documents/wife-app/progress.txt).
- Treat each item below as a single Ralph loop task. Each task includes a suggested test/verification step. Keep tasks small (one UI component, one backend function, one screen behavior, or one aggregation query per loop).

## Phase 0: Audit, demo isolation, and scaffolding

- **Baseline audit**: Inventory existing TanStack Start demo routes/components, determine what can be reused vs removed/overwritten. Record a short summary in [progress.txt](/home/kieren/Documents/wife-app/progress.txt). Test: no functional change required.
- **Demo isolation plan**: Preserve demo routes for reference but keep them out of the final app navigation/build. Decide one of:\n  - Move demo routes into a `/docs`-like area (e.g., [src/routes/_demo-reference](/home/kieren/Documents/wife-app/src/routes)) and exclude from main route tree; or\n  - Keep demo routes under [src/routes/demo](/home/kieren/Documents/wife-app/src/routes/demo) but remove them from the app router and link only from developer-only docs.\n  Test: app user-visible navigation no longer shows demo routes, but source remains for agent reference.\n+- Add minimal data model skeleton for categories/tasks with Convex tables (no complex logic yet) in [convex/schema.ts](/home/kieren/Documents/wife-app/convex/schema.ts). Test: `pnpm run convex:check` passes.
- Create placeholder Convex query/mutation stubs for categories/tasks CRUD in [convex/todos.ts](/home/kieren/Documents/wife-app/convex/todos.ts). Test: `pnpm run typecheck` passes.
- Wire Convex provider into app root if not already wired (check [src/integrations/convex/provider.tsx](/home/kieren/Documents/wife-app/src/integrations/convex/provider.tsx) and [src/routes/__root.tsx](/home/kieren/Documents/wife-app/src/routes/__root.tsx)). Test: app boots with `pnpm run dev` and no console errors.

## Phase 1: Core data model & CRUD (categories + tasks)

1. **Category create (root)**: Convex mutation to create root categories; basic form in UI to create root category on Daily view. Test: create category in UI and confirm it appears.
2. **Category list (root)**: Convex query to list root categories; show list in Daily view. Test: list renders with seeded categories.
3. **Category update**: Mutation + simple UI control to rename a category. Test: rename persists after reload.
4. **Category delete**: Mutation + UI delete action for category (only if empty). Test: delete works, blocked if children exist (show message).
5. **Task create (root)**: Mutation + UI form to create a root task. Test: create task and it appears.
6. **Task list (root)**: Query + UI list of uncategorized tasks on Daily view. Test: list renders and persists after reload.
7. **Task update**: Mutation + UI to rename a task. Test: rename persists.
8. **Task delete**: Mutation + UI delete for task. Test: delete removes from list.

## Phase 2: Hierarchy (infinite nesting) + navigation

9. **Category parent/child fields**: Add `parentCategoryId` to category and task tables; update create mutations to accept parent. Test: category with parent stored correctly.
10. **Category detail route**: Create route screen for a category with list of its children in [src/routes](/home/kieren/Documents/wife-app/src/routes). Test: navigate to category detail.
11. **Child listing**: Query children (subcategories + tasks) for a category. Test: mixed list renders.
12. **Breadcrumbs**: Query ancestors and render breadcrumb navigation. Test: clicking breadcrumb navigates up.
13. **Context-aware creation**: Creation drawer auto-sets parent when on category detail. Test: create child and it appears under current category.
14. **Infinite depth**: Ensure navigation works for deep nesting; add smoke test with 3+ levels. Test: breadcrumb path displays full chain.

## Phase 3: Completion behavior + aggregation

15. **Task completion**: Add `isCompleted` and `lastCompletedDate` on tasks; checkbox toggles. Test: checkbox persists and updates UI.
16. **Category completion computed**: Query that returns total descendant tasks and completed count. Test: category shows `x/y done`.
17. **Partial state indicator**: UI shows partial completion for categories (e.g., `3/5 done`). Test: counts update with task toggles.
18. **Auto-completion**: Category shows completed when all descendant tasks completed. Test: complete all tasks; category indicator changes.
19. **Bulk complete category**: Mutation to recursively complete all descendant tasks. Test: clicking category checkbox marks all tasks done.
20. **Unchecked priority**: Sort uncompleted items first, completed last in category detail. Test: order updates after toggling.

## Phase 4: Recurring tasks

21. **Repeat fields**: Add repeat settings to tasks (repeatEnabled, frequency). Test: create task with repeat fields stored.
22. **Frequency enum**: Add validated frequency options (daily, bi-daily, weekly, fortnightly, monthly, quarterly, 6-monthly, yearly). Test: invalid values rejected.
23. **Next due logic**: Compute whether a task is due on Daily view based on `lastCompletedDate` and frequency. Test: unit test or deterministic logic test.
24. **Daily view filtering**: Only show tasks due for today in daily view. Test: tasks appear/disappear based on simulated dates.
25. **Completion updates**: On completing a recurring task, update `lastCompletedDate` without removing task permanently. Test: toggle completion sets last date and it reappears next interval.

## Phase 5: View modes (Daily/Weekly/Monthly)

26. **View mode state**: Add Day/Week/Month toggle UI. Test: switching updates state without errors.
27. **Daily header**: Show “Today - [Day Name]”. Test: day name correct.
28. **Weekly view UI**: Render week strip with days. Test: current week displayed.
29. **Monthly view UI**: Render calendar grid. Test: current month layout renders.
30. **View-specific data**: Hook data loaders to each view (Daily due tasks; Week/Month show relevant tasks). Test: changing view updates list content.

## Phase 6: Creation drawer UX

31. **Drawer component**: Slide-up panel for creating task/category. Test: open/close behavior.
32. **Mode toggle**: New Task vs New Category toggle in drawer. Test: fields switch.
33. **Task fields**: Title, Parent, Repeat toggle, Frequency select. Test: repeat toggle reveals frequency.
34. **Category fields**: Name, Parent, Color. Test: color saved.
35. **Parent dropdown**: Select any category as parent. Test: change parent and create.

## Phase 7: Theme + UI polish

36. **Pastel theme tokens**: Add color palette in [src/styles.css](/home/kieren/Documents/wife-app/src/styles.css). Test: UI reflects colors.
37. **Typography**: Apply friendly rounded font. Test: font applied globally.
38. **Iconography**: Add soft-edged icons for categories/tasks. Test: icons render.
39. **Micro-interactions**: Add completion animation (e.g., subtle bounce/confetti). Test: animation triggers on completion.

## Phase 8: UX details + quality

40. **Empty states**: Add empty state messaging for lists. Test: renders when no items.
41. **Error handling**: Show error toasts for failed mutations. Test: simulate failure and verify.
42. **Loading states**: Show spinners/skeletons. Test: appear during fetch.
43. **Accessibility pass**: Ensure buttons/checkboxes are labeled. Test: basic a11y audit.

## Testing strategy per loop

- Prefer targeted unit/integration tests colocated with components or Convex logic for each task.
- For UI tasks, add or update tests to verify component behavior; when lacking, rely on browser verification as required by Ralph.
- For recurrence logic, add deterministic tests with mocked dates.

## Files to focus during implementation

- [convex/schema.ts](/home/kieren/Documents/wife-app/convex/schema.ts)
- [convex/todos.ts](/home/kieren/Documents/wife-app/convex/todos.ts)
- [src/routes/__root.tsx](/home/kieren/Documents/wife-app/src/routes/__root.tsx)
- [src/routes/index.tsx](/home/kieren/Documents/wife-app/src/routes/index.tsx)
- [src/routes/demo/*](/home/kieren/Documents/wife-app/src/routes/demo)
- [src/components](/home/kieren/Documents/wife-app/src/components)
- [src/styles.css](/home/kieren/Documents/wife-app/src/styles.css)
- [progress.txt](/home/kieren/Documents/wife-app/progress.txt)
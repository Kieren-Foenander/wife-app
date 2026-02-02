# Product Requirements Document (PRD)

Name: Wife App

Goal: A mobile-first productivity app for recurring responsibilities. Everything is a task with optional subtasks. UI should feel like a calm, pastel mobile app.

Target user: People managing repeatable household routines who want a simple, low-friction checklist.

## Structure

- Task: The primary item. Can have any depth of subtasks.
- Subtask: A task with a parent task.
- Views: Day, Week, Month.

## Behavior requirements

- Root task creation never asks for a parent.
- Subtasks can only be created inside a parent task; parent is auto-selected and shown read-only.
- Completing a task does not hide it; show completed state (strike-through).
- Parent completion mirrors subtasks:
  - If all subtasks are completed, parent auto-completes.
  - If parent is completed, all subtasks auto-complete.
  - If any subtask is unchecked, parent auto-unchecks.
- Week/Month views show all days in the range, grouped by day label with tasks listed under each.
- Week/Month day click keeps the current view and scrolls to that day.
- Day selection updates when a day is clicked in Week/Month; returning to Day view uses that selection until Today is chosen.
- Provide an easy reset to Today (floating button).
- Theme is pastel and applied across UI, not just tokens.
- Remove TanStack starter header and menu; no top-level navigation.
- App title "Wife App" centered at top, small.
- Day/Week/Month navigation should be a compact bottom bar (native mobile feel).

## Work list

- [x] Root task drawer: remove parent field; assume root.
- [x] Subtask drawer: only show within task detail; auto-set parent.
- [x] Completion UI: keep completed tasks visible with strike-through.
- [x] Completion sync: parent<->subtasks auto-propagation.
- [ ] Week/Month day click: scroll within view, do not switch view.
- [ ] Selected day state: clicking a day sets day state for Day view; reset on Today.
- [ ] Today reset: floating button to jump back to today.
- [ ] Pastel theme: apply palette to components, not just tokens.
- [ ] Remove starter header/menu: keep app single-page.
- [ ] Add centered small title: "Wife App".
- [ ] Redesign view tabs: bottom navigation bar, mobile-style.

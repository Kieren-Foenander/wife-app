PRD — “Easy Calorie Tracking” (v1) for Wife’s App

**Part of:** [Wife App — main PRD](PRD.md) (Tasks section is live; Calories is planned, placeholder in bottom nav.)

---

## Integration with this codebase (Wife App)

Calories is a **second section** of the same app: same bottom nav, same layout and theme, shared date/UI components. It does not replace Tasks.

### Routes

- **`/calories`** (optional `?date=YYYY-MM-DD`): Calories home (today dashboard) or day detail when `date` is set. Same URL pattern as Tasks (`/` with `?date=`).
- Day selection (calendar, “Jump to Today”) updates `?date=YYYY-MM-DD`; no date = today. Use `fromYYYYMMDD` / `toYYYYMMDDUTC` from `src/lib/dateUtils.ts` for parsing and formatting.

### Bottom nav

- The **bottom nav is shared** with the Tasks view: Tasks | Gym (soon) | **Calories**.
- On `/calories`, “Calories” is the active item (link + active style); “Tasks” links to `/`. Gym stays disabled.
- Implement by extracting the nav into a shared component or layout used by both `/` and `/calories` so the bar and active state are consistent.

### Shared components (reuse from task tracker)

| Use in Calories                     | Component / module    | Location                                        | Notes                                                                                                                                                                              |
| ----------------------------------- | --------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Calendar / History (month view)** | `MonthGrid`           | `src/components/MonthGrid.tsx`                  | Same API: `selectedDate`, `onSelectDay`. Use for “monthly calendar view” and “tap a day → day detail”. Do not duplicate a calendar.                                                |
| **Week date picker (optional)**     | `WeekStrip`           | `src/components/WeekStrip.tsx`                  | Same API. Use if Calories has a week/month toggle like Tasks.                                                                                                                      |
| **All date logic**                  | `dateUtils`           | `src/lib/dateUtils.ts`                          | Use everywhere: `toYYYYMMDDUTC`, `fromYYYYMMDD`, `startOfDayUTCFromDate`, `addDaysUTC`, `addMonthsUTC`, `getWeekDatesFor`, `getMonthGridFor`. Keeps UTC and URL format consistent. |
| **Buttons, primary actions**        | `Button`              | `src/components/ui/button.tsx`                  | Same as Tasks.                                                                                                                                                                     |
| **Add flow, Add New, sheets**       | `Drawer` (Vaul)       | `src/components/ui/drawer.tsx`                  | Same bottom-sheet pattern as task `CreationDrawer` (DrawerHeader, DrawerContent, DrawerFooter, etc.).                                                                              |
| **Loading states**                  | `Spinner`, `Skeleton` | `src/components/ui/spinner.tsx`, `skeleton.tsx` | Same as Tasks.                                                                                                                                                                     |

- **Calendar (PRD §5.5)**: Implement the “monthly calendar view” and “tap a day → day detail” using **`MonthGrid`**. Selecting a day should navigate to the same route with `?date=YYYY-MM-DD` and show that day’s totals, entry list, and “+ Add” for that date. No new calendar component.

### Convex

- Add **new tables** in the same `convex/schema.ts` (alongside `tasks`, `taskOrders`, `completedTasks`): e.g. `calorieEntries`, `recipes`, `weightEntries`, `userSettings` (goal, maintenance, reset week). Define **indexes for every field (or combination) used in filters or ordering** — see AGENTS.md: unindexed filters cause full table scans.
- Convex patterns and conventions: see `docs/convex.md`.

### Layout and styling

- Reuse app layout: `max-w-2xl` container, same header treatment (“Wife App” at top, section title below).
- Same pastel theme and CSS vars (Nunito, `styles.css`). Use existing card style: `rounded-2xl border border-border bg-card/70` for panels (e.g. day summary, entry list, calendar container).

---

1. Purpose / Problem Statement

Your wife wants to lose weight by staying in a consistent calorie deficit, but calorie tracking often fails because it’s too slow or too fiddly. This product exists to make daily calorie tracking so easy she’ll use it consistently, while providing enough accuracy to maintain trust and motivation.

The app uses AI to estimate calories, recommend portions based on remaining calories, and supports reusable saved meals (“recipes”) to minimize repeated work.

---

2. Target User & Context

Primary user

- Single user: your wife (design optimized for 1 person; multi-user not required in v1).

Real-world constraints

- She values speed and ease above perfect accuracy.

- She has a kitchen scale and uses grams (metric).

- Most meals are homemade.

- Often repeats the same breakfast/lunch (meal prep), dinners vary.

- Needs “at a glance” progress + a weight trend chart for motivation.

---

3. Goals, Non-Goals, and Success Metrics

Product goals (v1)

1. Make logging frictionless: common meals should be logged in ~2–3 taps.

2. Make progress obvious at a glance: remaining calories + progress ring + weight graph.

3. Support reusability: saved recipes/templates that can be quickly re-logged with grams.

4. Use AI to provide:
   - calorie estimates (single number)

   - portion guidance (normal + “stay within remaining”)

   - skippable follow-ups for accuracy when desired

5. Provide calendar backfill so missed days can be logged later (and streak corrected).

6. Provide reset week (maintenance calories) that pauses streak.

7. Detect 4-week plateau and gently suggest reviewing goal.

Non-goals (explicitly out of scope for v1)

- Barcode scanning

- Restaurant database integration

- Macros (protein/carbs/fat), micronutrients

- Notifications/reminders

- Social/sharing/export/privacy workflows (assume private single-user)

- Strict safety guardrails beyond gentle copy (user said “don’t worry”)

Success metrics (practical)

- Logging adherence: user logs entries on most days (e.g. 5/7).

- Reduced time-to-log: typical reused meal logged in under ~10 seconds.

- User can interpret status in <2 seconds (remaining calories + ring).

- Weight is recorded frequently enough to power 30-day chart and plateau logic.

- Streak feature feels motivating (not punishing), and correctly restores after backfill.

---

4. Product Principles (Decision Rules)

1) Default to easy: minimum required input; advanced accuracy is optional.

2) One best number: show a single calorie estimate (slightly conservative/high when uncertain).

3) Skippable accuracy: AI may ask follow-ups but user can always “skip / use best guess.”

4) Reuse first: saved recipes/templates are central; most-used recipes should be fastest to access.

5) At-a-glance: Home is a dashboard, not a journal.

6) Gentle tone: supportive language, no “don’t eat” messaging.

---

5. Core Features & UX Overview

5.1 Home (Today Dashboard)

- Default view at **`/calories`** (or `/calories?date=YYYY-MM-DD` when a day is selected). Uses the app’s shared bottom nav (Calories active).

Home must show:

- Calories remaining today (primary number)

- Progress ring (consumed vs goal)

- Today’s entry list (timestamped; easy to verify what’s logged)

- 30-day weight graph (motivating downward trend)

Primary action:

- - Add

Secondary:

- access Calendar

- add Weight (quick entry)

Reset week state:

- If reset week active: show “Reset week active (streak paused)” and use maintenance goal.

---

5.2 Add Flow (fast logging)

When user taps + Add:

- Open a sheet/modal with:
  - Search bar

  - Saved recipes list (default sort: most used)

  - Add new option

Reuse saved recipe

- Tap recipe → Confirm screen prefilled with default serving grams.

- User can adjust grams quickly.

- Log creates a copy entry for today (or selected date).

---

5.3 Add New (AI) — two-mode entry

A single text box plus two prominent buttons:

- Rough estimate (fast)

- Accurate (add ingredients)

Rough mode behavior

- Designed for speed.

- Output: one calorie estimate for 1 serving (single number, slightly high bias).

- Confirm defaults to “1 serving.”

- Optional grams field: if entered, grams overrides serving for this log (grams becomes source of truth).

Accurate mode behavior

- Designed for better accuracy.

- User can paste free-text ingredients list with mixed units.
  - Example: “200g chicken, 1 tbsp olive oil, 150g rice”

- AI parses, may ask up to ~3 follow-up questions; each is skippable.

- Output includes:
  - calories for a default serving grams

  - recommended portion (grams) and within-remaining portion

“Details” section

Both modes must provide a collapsed-by-default “Details” accordion containing:

- assumptions

- what the AI interpreted

- any conversions (e.g., tbsp → grams)

- caveats

---

5.4 Save as Recipe (reusability)

After AI estimate, user can “Save as recipe.”

- Minimum to save:
  - recipe name

  - default serving grams (preferred; for rough mode, may be optional but recommended to prompt)

- Ingredients text stored if provided.

- Recipes show in Saved list and are reusable.

Important rule:

- Logging a recipe creates a copy entry. Editing an entry does not mutate recipe template.

---

5.5 Calendar / History

- **Use the existing `MonthGrid`** component (`src/components/MonthGrid.tsx`) for the monthly calendar view — same as the Tasks day picker. Same props: `selectedDate`, `onSelectDay`; drive selected day from `/calories?date=YYYY-MM-DD`.
- Tap a day → day detail:
  - totals (consumed/goal/remaining)

  - entry list

  - “+ Add” to log for that date

- Backfilling can restore streak if the day ends under goal.

---

5.6 Weight Tracking + Plateau Detection

Weight entry

- Manual only (kg, metric).

- Home shows 30-day weight graph.

Plateau detection (4-week window)

- Evaluate over the last 28 days using smoothing:
  - Start weight = average of weigh-ins in days 1–7

  - End weight = average of weigh-ins in days 22–28

  - Progress \(\Delta = \text{Start} - \text{End}\)

- Progress threshold: >= 0.3 kg down = progress

- Plateau condition: \(\Delta < 0.3\) kg

Prompt behavior:

- Gentle suggestion: “Weight trend has been flat for ~4 weeks. Want to review your calorie goal?”

- CTA: Review goal (leads to a simple goal edit screen or placeholder)

- Dismiss:
  - once dismissed, only reappear after another full non-overlapping 4-week window also confirms plateau

- Do not show prompt during reset week.

Data sufficiency (recommended):

- At least 2 weigh-ins in first week segment and 2 in last week segment.

---

5.7 Streak (Motivation)

Definition:

- Streak = consecutive days where total consumed calories <= goal.

Behavior:

- If a day is unlogged, streak appears broken.

- If user backfills and ends up under goal, streak recalculates and can reappear.

Reset week interaction:

- Streak is paused during reset week:
  - does not increment

  - does not break

  - days during reset week are ignored by streak computation

- UI must explicitly show “streak paused” during reset week.

---

5.8 Reset Week (Manual “Maintenance Mode”)

- Manual toggle:
  - Start reset week

  - End reset week

- While active:
  - daily goal = maintenance calories

  - streak paused

- The toggle should be easy to find (Home settings or goal settings).

---

6. Core Data Concepts (Non-technical, for consistent implementation)

These are conceptual “objects” that every story should align with.

Entry (logged item)

- date (the day it belongs to)

- timestamp (for ordering within day)

- label/name

- portion:
  - grams OR servings

- calories (final number used in totals)

- source:
  - from recipe (recipe id) OR AI estimate (with stored prompt and assumptions)

- details (assumptions text)

Recipe (saved template)

- name

- description (optional)

- ingredients text (optional)

- default serving grams

- calories for default serving grams

- usage count (for sorting)

Day summary (derived)

- goal calories for that date (normal or maintenance)

- total consumed (sum of entries)

- remaining

Weight entry

- date

- kg value

---

7. Critical UX Requirements (Agent guardrails)

These are “must not break” rules when building any story.

1. Fast path is always available:
   - Rough estimate should not force follow-ups.

2. One best estimate:
   - avoid showing ranges/confidence by default.

3. Details are optional:
   - assumptions exist but are hidden under “Details.”

4. Reuse is primary:
   - saved recipes list is searchable and default sorted by most used.

5. Portion guidance must include two numbers when relevant:
   - normal recommended portion

   - within-remaining portion if normal would exceed remaining

6. No punitive messaging:
   - never “don’t eat this”

7. Reset week pauses streak:
   - do not accidentally count reset week days toward streak.

8. Backfill restores streak:
   - streak must be computed from historical truth, not stored as a fragile counter.

---

8. Copy/Tone Guidelines

- Supportive, calm, simple.

- Examples:
  - “You’re on track today.”

  - “Recommended portion: 250g (~450 kcal)”

  - “To stay within your remaining 410 kcal: 230g (~410 kcal)”

- Avoid:
  - shame language

  - absolutes (“bad,” “cheating,” “failed”)

  - food moralizing

---

9. Edge Cases & Expected Behaviors

- If remaining calories are negative:
  - still show remaining (negative) and within-remaining portion becomes 0g/0% with gentle copy.

- If user logs to a past day:
  - totals update for that day

  - streak recalculates (unless reset week day)

- If recipe calories are updated later:
  - does not retroactively change past entries (entries are copies).

- If weight data is sparse:
  - plateau detection should not run; show nothing rather than false prompts.

- During reset week:
  - plateau prompt suppressed

  - streak UI shows paused

---

10. Definition of Done (for any story)

A story is “done” only when:

- It matches the PRD principles above (especially ease + optional details).

- It works for both today and calendar-selected day contexts where applicable.

- It doesn’t introduce extra required fields on the fast path.

- Copy matches gentle tone and portion guidance rules.

---

11. Epics Covered by This PRD

This PRD provides the full context needed to implement tasks in:

- Home dashboard

- Add flow (reuse + add new)

- AI rough mode

- AI accurate mode + skippable follow-ups

- Saved recipes

- Calendar/day detail + backfill

- Weight tracking + 30-day graph

- Reset week toggle + streak pause

- Portion recommendations

- Plateau detection prompt + reappearance rules

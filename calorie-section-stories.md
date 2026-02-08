# Calorie section — implementation stories

**Part of:** [Calories section PRD](calories-section-prd.md). **Codebase:** Wife App (TanStack Start, Convex). Routes: `/calories` (optional `?date=YYYY-MM-DD`). Reuse: `MonthGrid`, `WeekStrip`, `dateUtils`, `Drawer`, `Button`, `Spinner`, `Skeleton` — see PRD “Integration with this codebase”.

**Tick off:** Mark each story as done by changing `- [ ]` to `- [x]` in the story heading.

---

EPIC 0 — Foundations (Day, Goal, Totals)

**Codebase:** Convex: add tables in `convex/schema.ts` (e.g. `calorieEntries`, `recipes`, `weightEntries`, `userSettings`). Define indexes for every filter/order — see AGENTS.md. Use `dateUtils.startOfDayUTCFromDate` for day keys. **Timezone:** days are Australia/Brisbane (same as Tasks); Convex day normalization must match `dateUtils`.

- [x] **Story 0.1** — Define daily goal settings (deficit + maintenance)

As a user, I want a daily calorie goal so I can track remaining calories.

Acceptance criteria:

- App supports a “normal” daily calorie goal (deficit target).

- App supports a “maintenance” daily calorie goal value used during reset week.

- For any date, the effective goal is either normal or maintenance depending on reset-week status.

---

- [x] **Story 0.2** — Compute daily totals + remaining calories

As a user, I want the app to compute total consumed and remaining calories per day.

Acceptance criteria:

- Given a date and its entries, “consumed calories” equals the sum of entry calories.

- “Remaining calories” = goal calories − consumed calories.

- Remaining calories updates immediately after adding/removing/updating an entry.

---

- [x] **Story 0.3** — Timestamped entries model

As a user, I want entries to have timestamps so I can see what I ate when.

Acceptance criteria:

- Each entry stores a timestamp.

- Today list is ordered by time (newest first or oldest first—pick one and keep consistent).

- If adding to a past day, default timestamp is a sensible time (e.g., midday) or “now” but pinned to that day (define in UI copy).

- Day normalization uses Australia/Brisbane boundaries (same as Tasks).

---

EPIC 1 — Home (At-a-glance)

- [x] **Story 1.1** — Home shows calories remaining and consumed

**Codebase:** Home = default view at `/calories` (no `date` or `?date=today`). Shared bottom nav: “Calories” active on this route. Use `dateUtils` for “today” (Australia/Brisbane).

As a user, I want to see remaining calories immediately when I open the app.

Acceptance criteria:

- Home displays:
  - Remaining calories (primary)

  - Consumed calories (secondary)

  - Goal calories (optional small label)

- Values reflect today’s date.

---

- [x] **Story 1.2** — Progress ring visualization

As a user, I want a progress ring so I can see progress at a glance.

Acceptance criteria:

- Ring shows consumed/goal ratio.

- If consumed exceeds goal, ring indicates “over” state (e.g. different color or label).

- Ring updates instantly after entry changes.

---

- [x] **Story 1.3** — Today entries list on Home

As a user, I want to see today’s logged items so I can confirm I’ve tracked everything.

Acceptance criteria:

- Home list shows each entry:
  - name/label

  - calories

  - time

  - portion indicator (grams or serving)

- List has a clear “+ Add” primary action.

---

- [x] **Story 1.4** — 30-day weight graph on Home

As a user, I want a 30-day weight trend graph so I’m motivated by progress.

Acceptance criteria:

- Graph defaults to the last 30 days.

- If there are fewer than 2 weight points, show an empty state (“Add your weight to see trend”).

- Adding a weight entry updates graph without requiring refresh.

---

- [x] **Story 1.5** — Reset week indicator + streak paused indicator

As a user, I want to know when reset week is active and that my streak is paused.

Acceptance criteria:

- When reset week is active, Home clearly displays:
  - “Reset week active”

  - “Streak paused”

- No streak increment/break messaging appears while active.

---

EPIC 2 — Add Flow (Reuse + Add New)

- [ ] **Story 2.1** — Add entry opens searchable Saved Recipes list

**Codebase:** Use shared `Drawer` (`src/components/ui/drawer.tsx`), same bottom-sheet pattern as task `CreationDrawer`. Route: `/calories` (or `/calories?date=YYYY-MM-DD` when adding to a selected day).

As a user, I want to quickly find a saved recipe to log it with minimal taps.

Acceptance criteria:

- Tapping “+ Add” opens a sheet/modal with:
  - search box

  - list of saved recipes

  - “Add new” action

- Default sort: most used (descending).

- Search filters by recipe name (and optionally description).

---

- [ ] **Story 2.2** — Reuse saved recipe → confirm → log

As a user, I want to tap a recipe and log it quickly.

Acceptance criteria:

- Tapping a recipe opens Confirm screen with:
  - recipe name

  - default serving grams prefilled

  - calories calculated for that grams

  - “Details” available (can be simple for recipes)

- User can change grams and calories recalculates.

- “Log” creates a new entry (copy), does not modify recipe template.

---

- [ ] **Story 2.3** — Add flow supports adding to a specific date (today or selected day)

**Codebase:** Target date = URL `?date=YYYY-MM-DD` (use `fromYYYYMMDD` / `toYYYYMMDDUTC` from `src/lib/dateUtils.ts`). No date = today. Same pattern as Tasks day selection.

As a user, I want to add meals to a past day when I forgot.

Acceptance criteria:

- Add flow can be invoked with a target date context:
  - From Home → today

  - From Calendar day detail → that day

- Logged entry is associated to the selected date.

---

EPIC 3 — AI: Rough Estimate Mode (Fast)

- [ ] **Story 3.1** — Add New screen: single textbox + two actions

As a user, I want one simple input field with clear options so logging is easy.

Acceptance criteria:

- Add New screen includes:
  - one text input area

  - button: “Rough estimate (fast)”

  - button: “Accurate (add ingredients)”

- Text is required before either action runs (basic validation).

---

- [ ] **Story 3.2** — Rough estimate returns single calorie estimate (slightly high bias)

As a user, I want a single best estimate so I can log quickly without thinking.

Acceptance criteria:

- Rough estimate returns:
  - one calorie number for “1 serving”

  - short label describing what was interpreted (optional)

- The estimate is biased slightly higher than midpoint when uncertain (product behavior requirement).

---

- [ ] **Story 3.3** — Rough estimate shows “Details” assumptions

As a user, I want to see assumptions if I care about accuracy.

Acceptance criteria:

- Result screen includes a “Details” expandable section containing:
  - assumptions used

  - any inferred portion/ingredients notes

- Details is collapsed by default.

---

- [ ] **Story 3.4** — Rough confirm defaults to 1 serving, optional grams override

As a user, I want rough logging to be quick, but still allow grams if I have time.

Acceptance criteria:

- Confirm screen defaults portion to “1 serving”.

- User may optionally enter grams.

- If grams is entered:
  - grams becomes the source of truth for this log

  - displayed calories update accordingly

- Entry stores either servings or grams (and calories always stored).

---

- [ ] **Story 3.5** — One-tap Confirm & Log

As a user, I want to log with one tap once I see the estimate.

Acceptance criteria:

- “Log” creates the entry and returns user to the originating screen (Home or Day detail).

- Home totals update immediately.

---

EPIC 4 — AI: Accurate Mode (Ingredients + Skippable Follow-ups)

- [ ] **Story 4.1** — Accurate mode parses free-text ingredients with mixed units

As a user, I want to paste a list of ingredients and have the app estimate calories.

Acceptance criteria:

- Accepts free text like “200g chicken, 1 tbsp oil, 150g rice”.

- Supports non-gram units (tbsp, cups, etc.) via AI conversion.

- Produces a single calorie estimate output.

---

- [ ] **Story 4.2** — AI asks follow-up questions, all skippable

As a user, I want better accuracy when I have time, but I must be able to skip.

Acceptance criteria:

- If AI needs clarifications, it can ask up to N questions (recommend N=3).

- Each question has:
  - an input control (text or multiple choice)

  - “Skip / Use best guess” action

- Skipping still yields an estimate.

---

- [ ] **Story 4.3** — Accurate mode generates default serving grams

As a user, I want a default serving size in grams so recipes are reusable.

Acceptance criteria:

- Accurate result includes:
  - default serving grams (either suggested by AI or asked as a follow-up)

  - calories for that serving

- User can adjust default serving grams before saving/logging.

---

- [ ] **Story 4.4** — Accurate confirm/log uses grams-based portioning

As a user, I want to log by grams using my kitchen scale for accuracy.

Acceptance criteria:

- Confirm shows grams field prefilled (default serving grams).

- Changing grams recalculates calories linearly.

- Logged entry stores grams and calories.

---

- [ ] **Story 4.5** — Re-run AI estimate with new info (for a logged entry)

As a user, I want to re-run the estimate if I realize I missed details.

Acceptance criteria:

- On an entry, user can select “Re-run estimate”.

- Pre-fills original text (and any prior follow-up answers if available).

- After rerun, user can replace calories/portion for that entry (confirm step required).

---

EPIC 5 — Portion Recommendations (Stay within remaining)

- [ ] **Story 5.1** — Show normal portion recommendation

As a user, I want to see the normal recommended portion for this meal.

Acceptance criteria:

- For recipes: normal = default serving grams and its calories.

- For AI meals:
  - rough: normal = 1 serving (and optionally an estimated grams if AI has it)

  - accurate: normal = default serving grams

---

- [ ] **Story 5.2** — Show “within remaining” portion suggestion when needed

As a user, I want to know how much I can eat without going over my remaining calories.

Acceptance criteria:

- If normal portion calories > remaining calories:
  - show “To stay within remaining: Xg (~Y kcal)” for grams-based items

  - show “To stay within remaining: ~Z% of serving” for serving-based rough items

- If remaining calories <= 0:
  - show within-remaining suggestion as 0g / 0% serving (worded gently).

---

- [ ] **Story 5.3** — Portion guidance copy is gentle

As a user, I want the app to feel supportive, not punitive.

Acceptance criteria:

- Copy avoids “don’t eat” language.

- Example format:
  - “Recommended portion: 250g (~450 kcal)”

  - “To stay within today’s remaining 410 kcal: 230g (~410 kcal)”

---

EPIC 6 — Saved Recipes (Create, List, Use)

- [ ] **Story 6.1** — Save AI result as recipe (from rough or accurate)

As a user, I want to save meals so I can reuse them easily.

Acceptance criteria:

- After estimating, user can “Save as recipe”.

- Minimum required to save:
  - recipe name

  - default serving grams (for accurate; for rough can be optional if you want—otherwise prompt)

- Ingredients text is stored if available.

- Recipe appears in saved list immediately.

---

- [ ] **Story 6.2** — Saved recipes list sorted by most used

As a user, I want my common meals at the top.

Acceptance criteria:

- Each time a recipe is logged, its usage count increments.

- Saved recipes list defaults to usage count desc.

---

- [ ] **Story 6.3** — Recipe default serving grams used on reuse

As a user, I want a sensible default portion each time.

Acceptance criteria:

- When reusing a recipe, confirm pre-fills grams = recipe default serving grams.

- User edits do not change the template (logging uses a copy).

---

- [ ] **Story 6.4** — Minimal recipe edit (name + default grams)

As a user, I want to fix a recipe if it’s slightly wrong.

Acceptance criteria:

- User can edit:
  - recipe name

  - default serving grams

  - (optional) description / ingredients text

- Changes affect future reuse, not past entries.

---

EPIC 7 — Calendar & Day Detail (Backfill)

- [ ] **Story 7.1** — Monthly calendar view

**Codebase:** Use existing **`MonthGrid`** (`src/components/MonthGrid.tsx`). Same API: `selectedDate`, `onSelectDay`. Drive selected day from `/calories?date=YYYY-MM-DD`; use `addMonthsUTC` / Prev–Next for month navigation (same as Tasks). Do not add a new calendar component.

As a user, I want to select a date to see what I ate that day.

Acceptance criteria:

- Calendar shows month navigation.

- Dates can show a subtle indicator if the day has entries (optional v1).

---

- [ ] **Story 7.2** — Day detail screen shows totals + entries

**Codebase:** Day detail = same route `/calories` with `?date=YYYY-MM-DD`. Use `startOfDayUTCFromDate` for day-scoped queries. “+ Add” from day detail logs to that date (pass date into Add flow).

As a user, I want to review a day and add missing meals.

Acceptance criteria:

- Day detail displays:
  - consumed calories

  - goal

  - remaining

  - list of entries

  - “+ Add” pinned to that day

- Adding from day detail logs to that date.

---

- [ ] **Story 7.3** — Backfilling can restore streak

As a user, I want streak to reflect reality once I finish tracking.

Acceptance criteria:

- If a previously unlogged/over goal day is edited/backfilled to <= goal:
  - streak recalculates and can reappear.

- Days during reset week never affect streak (paused).

---

EPIC 8 — Weight Tracking

- [ ] **Story 8.1** — Add weight entry (manual)

As a user, I want to record my weight to see progress over time.

Acceptance criteria:

- User can add:
  - date (defaults to today)

  - weight in kg

- Edits and deletions are optional but recommended.

---

- [ ] **Story 8.2** — Weight trend uses last 30 days

As a user, I want a consistent view of recent progress.

Acceptance criteria:

- Weight chart uses last 30 days on Home.

- Handles missing days gracefully.

---

EPIC 9 — Streak (Under-goal days) + Reset Week Pause

- [ ] **Story 9.1** — Compute streak from day totals (not manually maintained)

As a user, I want streak to be accurate and recoverable after backfilling.

Acceptance criteria:

- Streak is derived from historical day totals where:
  - success day: consumed <= goal

  - reset-week days: ignored (pause)

- If a past day changes, streak recalculates.

---

- [ ] **Story 9.2** — Display streak on Home

As a user, I want to see how many consecutive under-goal days I have.

Acceptance criteria:

- Home shows streak count when not in reset week.

- During reset week, show “Streak paused” instead of a number.

---

- [ ] **Story 9.3** — Manual reset week toggle (maintenance mode)

As a user, I want to start a reset week and temporarily eat at maintenance.

Acceptance criteria:

- User can toggle reset week on/off.

- While on:
  - effective goal = maintenance

  - streak is paused (doesn’t increment/break)

- Toggle state is reflected in Home and Day detail.

---

EPIC 10 — Plateau Detection (4-week window) + Prompt Rules

- [ ] **Story 10.1** — Compute 4-week progress using 7-day averages

As a user, I want plateau detection to avoid noise from daily fluctuations.

Acceptance criteria:

- For a 28-day window:
  - start weight = average of weights in days 1–7

  - end weight = average of weights in days 22–28

  - progress \(\Delta\) = start − end

- Requires minimum data (recommended):
  - at least 2 weigh-ins in days 1–7 and 2 weigh-ins in days 22–28

---

- [ ] **Story 10.2** — Plateau prompt when progress < 0.3kg over 4 weeks

As a user, I want gentle guidance if progress stalls.

Acceptance criteria:

- If \(\Delta < 0.3\) kg, show a prompt:
  - “Weight trend has been flat for ~4 weeks. Want to review your calorie goal?”

- Prompt has:
  - CTA: Review goal

  - Dismiss action

- No prompt during reset week.

---

- [ ] **Story 10.3** — Dismissal reappears only after another full confirmed 4-week window

As a user, I don’t want nagging prompts.

Acceptance criteria:

- If dismissed, the prompt does not reappear until:
  - a subsequent full (non-overlapping) 28-day window ending after dismissal

  - also confirms \(\Delta < 0.3\) kg

- If a later window shows progress (>= 0.3 kg down), plateau state is cleared.

---

Suggested implementation order (small, shippable increments)

1. **Epic 0** (goal + totals) + **Story 1.1** + **1.3** (Home basic + list) — add `/calories` route and shared bottom nav (Calories active here; Tasks links to `/`).

2. Story 2.1 + 2.2 (Add from saved recipe → confirm/log)

3. Story 3.1–3.5 (Rough AI flow end-to-end)

4. Epic 6 minimal (save recipe + list sorted most used)

5. **Epic 7** calendar + day detail + backfill — use `MonthGrid` for calendar; day detail = same route with `?date=`.

6. Epic 8 weight entry + chart

7. Epic 9 streak + reset week pause

8. Epic 4 accurate mode + skippable follow-ups

9. Epic 5 portion recommendation polish (normal + within-remaining everywhere)

10. Epic 10 plateau detection + prompt rules

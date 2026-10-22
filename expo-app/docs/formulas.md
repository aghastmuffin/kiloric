# Formulas (version 5)

Every number kiloric shows comes from the pure functions below. They have no
Appwrite or UI imports and are covered by Vitest (`src/lib/formulas.test.ts`,
`src/lib/nutrition.test.ts`, `src/lib/data/foodItem.test.ts`,
`src/lib/data/planning.test.ts`). `NUTRITION_FORMULA_VERSION` is `5` and is
stored on the profile (`formula_version`) when targets are saved.

## Inputs

| Input | Where it's collected | Stored in |
| --- | --- | --- |
| Date of birth → age | Onboarding step 1 | `users.dateOfBirth` |
| Sex | Body step | `users.sex` (v5 column) + `kiloricPlan.sex` prefs |
| Height, weight | Body step; weigh-ins on Progress | `users.height`, `users.weight`, `weight_logs` |
| Body-fat % (optional, 3–60) | Body step | `users.body_fat_pct` + prefs |
| Activity level | Lifestyle step | `users.activity_level` + prefs |
| Goal + pace | Lifestyle step | `users.goal_type`, `users.goal_pace`, `goal_pace_kg_per_week` + prefs |
| Eating style | Diet step | `users.diet_style` + prefs |
| Display units | Body / plan step | `goal_plain` suffix + prefs |

`resolvePlanInputs()` (`src/lib/planInputs.ts`) reads the v5 profile columns
first and falls back to the `kiloricPlan` account prefs, so profiles created
before v5 (or before the columns are provisioned) keep working. Editing the
profile now restores the saved sex, activity, goal, pace, diet and body fat
instead of resetting them to defaults.

## Resting and total energy

- **BMR, default — Mifflin–St Jeor.** `10·kg + 6.25·cm − 5·age + 5` (men) / `− 161` (women).
  It predicts RMR within ±10 % for more people than Harris–Benedict, Owen or WHO/FAO
  (Frankenfield, Roth-Yousey & Compher 2005, *J Am Diet Assoc* 105:775).
- **BMR with body fat — Katch–McArdle.** `370 + 21.6 × lean mass (kg)`, lean mass =
  `kg × (1 − bf%/100)`. Used only when a body-fat % between 3 and 60 is entered.
- **TDEE.** `BMR × activity factor`: sedentary 1.2, light 1.375, moderate 1.55,
  very active 1.725, extra active 1.9 (the standard physical-activity factors used with
  these equations; McArdle, Katch & Katch, *Exercise Physiology*). Activity
  descriptions now include step-count anchors from Tudor-Locke & Bassett 2004
  (*Sports Med* 34:1) so people can place themselves more reliably.

## Goal rate and calorie target

- **Pace scales with body weight.** Loss: gentle 0.5 %, moderate 0.75 %, focused 1 %
  of body weight per week, capped at 1 kg/week. Faster loss costs more lean mass
  (Garthe et al. 2011, *IJSNEM* 21:97; Helms, Aragon & Fitschen 2014, *JISSN* 11:20).
  Gain: 0.15 %, 0.25 %, 0.5 % per week, capped at 0.5 kg/week (Iraki et al. 2019,
  *Sports* 7:154). Previously these were fixed 0.25/0.5/0.75 kg/week for everyone.
- **Energy adjustment.** `pace kg/week × 7,700 kcal/kg ÷ 7`.
- **Safety floor.** 1,200 kcal (women) / 1,500 kcal (men) — the NHLBI threshold for
  unsupervised low-calorie diets — but never above the person's own TDEE, so a small
  sedentary person who maintains isn't pushed into a surplus.
- **Reported pace.** The goal state stores the pace the final calorie target actually
  produces, not the requested preset, so a floored plan shows the slower real rate.

## Macros

1. **Protein reference mass.** Lean mass ÷ 0.8 when body fat is known; otherwise body
   weight capped at the weight for BMI 25, so larger bodies don't get inflated targets
   (the adjusted-weight approach used in clinical nutrition).
2. **Protein.** 2.0 g/kg (lose), 1.6 g/kg (maintain), 1.8 g/kg (gain) of reference mass;
   +0.4 for high-protein, +0.2 for low-carb. 1.6 g/kg is the plateau for resistance-training
   gains (Morton et al. 2018, *Br J Sports Med* 52:376), and deficits need more
   to spare lean mass (Hector & Phillips 2018, *IJSNEM* 28:170). Capped at 35 % of energy
   (the top of the adult AMDR, IOM 2005).
3. **Fat.** The eating style's share of energy (balanced 30 %, high-protein 27 %,
   Mediterranean 35 %, plant-forward 27 %, low-carb 40 %), never below 20 % of energy
   or 0.5 g/kg of reference mass.
4. **Carbohydrate.** Whatever energy remains. Low-carb caps carbs at the lower of
   26 % of energy and 130 g/day (Feinman et al. 2015, *Nutrition* 31:1), and moves
   the rest to fat.

Previously protein used total body weight with no ceiling, and fat had no floor.

## Hydration

Beverage targets of 2.2 L (women) / 3.0 L (men) for adults: about 80 % of the IOM
Adequate Intakes for total water (2.7 / 3.7 L), the rest of which comes from food.

## Exercise

- **Net energy.** `(MET − 1) × kg × hours`. Subtracting 1 MET removes resting energy
  that BMR already counts. Previously the app used gross `MET 5 × kg × hours`, which
  double-counted rest.
- **Intensity from the session itself.** Completed sets per active minute: ≥ 0.4 →
  vigorous (6.0 MET), ≥ 0.25 → moderate (5.0), otherwise light (3.5). These are the
  resistance-training entries in the Compendium of Physical Activities
  (Ainsworth et al. 2011; Herrmann et al. 2024 Adult Compendium).
- **Duration.** Elapsed time, but no more than 4 minutes per completed set + 5 minutes
  (max 180), so a session left running overnight doesn't produce thousands of kcal.
  No completed sets → 0 kcal.
- **No double-counting with the activity level.** The activity factor already budgets
  `TDEE − sedentary TDEE = TDEE × (1 − 1.2/factor)` kcal/day for activity. Only logged
  workout energy beyond that allowance is added back to the day's budget
  (`exerciseCreditKcal`). Sedentary users get the full workout back; a moderately
  active user's typical session is already inside their target. Today's calorie card
  shows the burn and explains when the activity level already covers it.

## Weight trend and adaptive maintenance

- **Trend.** Gap-aware exponentially weighted moving average with α = 0.1 per day
  (Walker, *The Hacker's Diet*); a weigh-in after n missing days gets weight
  `1 − 0.9ⁿ`. The Progress chart, change badge and "Trend" value use the trend, not
  raw scale readings, so a salty dinner doesn't look like fat gain.
- **Adaptive maintenance.** Over the last 28 days:
  `observed TDEE = mean logged intake − (least-squares weight slope kg/day × 7,700)`.
  It needs ≥ 10 logged days and ≥ 3 weigh-ins spanning ≥ 14 days; today is excluded
  because it's incomplete. The estimate is blended with the formula TDEE by
  `min(1, logged days/28) × min(1, span/28)` and bounded to 65–135 % of the formula,
  so a run of under-logging can't produce an unsafe target. This is the
  energy-balance back-calculation used by adaptive coaching apps. Hall et al. 2011
  (*Lancet* 378:826) explain why static 7,700 kcal/kg projections overestimate long-term
  loss; measuring the real response corrects for that.
- When the data-driven estimate would move the calorie goal by ≥ 100 kcal with
  ≥ 50 % confidence, Progress offers **Use it**, which recomputes calories and macros
  from the new maintenance number (`applyMaintenanceEstimate`).

## Food data

- **Energy sanity.** A kcal value above 900 per 100 g, or 3.5–5× the Atwater estimate
  (`4·protein + 4·carbs + 9·fat`), is treated as kJ and divided by 4.184. Products
  with an Atwater estimate below 15 kcal/100 g skip the ratio check, because alcohol
  and polyols aren't in the macros.
- **Missing energy.** Falls back to the kJ column, then to the Atwater estimate.
  Previously these foods showed 0 kcal.
- **Servings and grams.** One serving is `serving_quantity` grams (100 g when the label
  has none). Gram amounts convert as `grams ÷ serving grams` servings, and macros
  scale linearly.

## Daily numbers

- **Remaining** = calorie target − eaten + exercise credit.
- **% of daily** on Review & log = item kcal ÷ calorie target.
- **Streak** = consecutive local days with logged calories, counting back from today
  (or from yesterday if nothing is logged yet today). It now looks back 365 days
  instead of 60.
- **Average intake** on Progress averages logged days only and excludes today.
- Meal history is paged newest-first, so a year range no longer drops the newest
  meals once there are more than 1,000 meal documents.

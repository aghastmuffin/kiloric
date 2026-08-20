# Onboarding and nutrition

First-time setup collects profile data, computes a nutrition plan, and saves everything to Appwrite.

## Entry points

| Trigger | Destination |
|---------|-------------|
| Sign up → `signed_in` | `/onboarding` |
| `ProfileGate` detects incomplete profile | `/onboarding` |
| Account → Edit profile | `/config` (full editor, not wizard) |

Success path: onboarding wizard → `/onboard_success` → main tabs.

## Onboarding wizard

**Component:** `src/components/onboarding/OnboardingWizard.tsx`  
**Host screen:** `src/app/onboarding.tsx`

### Steps (`ONBOARDING_STEPS` in `types.ts`)

Typical flow (see `types.ts` for exact order):

1. Welcome / username
2. Date of birth, sex
3. Country
4. Height and weight (metric stored; imperial display optional)
5. Activity level
6. Fitness goal and pace
7. Diet style
8. Review computed plan (optional macro overrides)
9. Confirm and save

UI building blocks: `ProgressHeader`, `StepTransition`, `SelectionCard`, `BodyMetricPickers`, `UnitToggle`, `ConfirmDialog`.

### Unit handling

- User may enter height/weight in imperial or metric.
- Values converted to **kg / cm** before save via `normalizeStoredMetricsToMetric`.
- Display preference encoded in `goal_plain` suffix: `· units:metric` or `· units:imperial`.
- `defaultDisplayUnits(country)` pre-selects imperial for US and territories.

### Save payload

On confirm, wizard calls `saveProfileFields(user.$id, { ... })` with:

- Required profile fields (`username`, `email`, `dateOfBirth`, `weight`, `height`, `role`)
- Optional: `bio`, `country`, `lastLogin`
- Nutrition targets from `buildNutritionPlan()`:
  - `target_kcal`, `target_protein`, `target_carbs`, `target_fat`
  - `daily_fluid`, `TDEE`, `weekly_deficit`, `target_weight`
  - `goal_plain` (legacy human-readable goal + diet + units)
- Machine-readable goal state from `buildGoalState()` / `buildGoalStateFromPlan()`:
  - `goal_type`, `goal_pace_kg_per_week`, `goal_start_weight_kg`, `goal_target_weight_kg`
  - `goal_start_date`, `goal_estimated_weeks`

The `meals` relationship field is **never** written as plain text.

## Nutrition engine

**Module:** `src/lib/nutrition.ts`

### `buildNutritionPlan` inputs

- Date of birth, sex, weight (kg), height (cm)
- Activity level, fitness goal, pace, diet style
- Optional macro overrides from wizard review step

### Calculations (summary)

1. **Age** from DOB
2. **BMR** — Mifflin–St Jeor
3. **TDEE** — BMR × activity multiplier (1.2–1.9)
4. **Goal pace** — preset maps directly to kg/week: gentle `0.25`, moderate `0.5`, aggressive `0.75`; signed negative for loss and positive for gain
5. **Target calories** — `TDEE + (paceKgPerWeek × 7700) / 7`; floored at 1200 (F) / 1500 (M)
6. **Macros** — protein by kg and diet style; fat %; remaining carbs
7. **Fluid** — ~35 ml/kg (rounded)
8. **Weekly deficit** — `(TDEE - targetKcal) × 7`
9. **Estimated weight change** — `weeklyDeficit / 7700` kcal per kg of fat
10. **Estimated weeks to goal** — `|targetWeight - startWeight| / |paceKgPerWeek|`

### Option presets

Exported arrays drive UI labels and descriptions:

- `ACTIVITY_OPTIONS` — sedentary → extra active
- `GOAL_OPTIONS` — lose, maintain, gain
- `PACE_OPTIONS` — gentle, moderate, aggressive (with kg/week hints)
- `DIET_OPTIONS` — balanced, high protein, low carb, Mediterranean, plant-forward, and custom. The custom option starts from the balanced calculation and exposes calorie, protein, carbohydrate, fat, and hydration targets for direct editing.

### Formula audit and trend behavior

- Formula version 4 uses Mifflin–St Jeor for BMR and the selected lifestyle activity factor for estimated TDEE. These are planning estimates, not measured metabolism. Sex, activity, goal, pace, eating style, target weight, display units, and custom targets are also saved in account preferences so later edits do not silently revert to defaults.
- The three preset paces represent 0.25, 0.50, and 0.75 kg/week. Their calorie adjustment uses the common 7,700 kcal/kg approximation and the app enforces a 1,200 kcal female / 1,500 kcal male planning floor. A floor can therefore make the achieved pace slower than the selected preset; the UI reports the energy-derived pace.
- Preset macro targets are calculated in grams from current body weight and the selected eating style. The Targets screen reconciles those grams back to calories using 4 kcal/g protein, 4 kcal/g carbohydrate, and 9 kcal/g fat, and warns when a custom combination differs by more than 5% (or 50 kcal) from the energy target.
- Adult hydration values are beverage targets (2.2 L female / 3.0 L male); they intentionally do not claim to be total-water requirements because food also contributes water.
- Stats compares equal adjacent windows of **logged days**. Missing days are excluded instead of treated as zero intake, and a visible confidence label is based on logging completeness. Intake trends do not claim to predict weight or metabolic adaptation.
- Targets are recalculated whenever body data or goal settings change and are stored when the profile is saved. Because the app currently stores one current weight rather than a weight-log collection, it does not fabricate a longitudinal weight trend.

## Profile completeness

`isProfileComplete()` in `profile.ts` checks required create fields only. Nutrition targets are optional for completeness but are normally set during onboarding.

## Config screen vs wizard

`config.tsx` exposes raw field editors (pickers + text inputs) for power users. Same `saveProfileFields` helper. Blocks back navigation until saved when profile was incomplete (mirrors onboarding guard). On save it also writes the machine-readable `goal_*` fields so edits stay in sync with the progress card.

## Goal progress on the home screen

`src/app/(tabs)/index.tsx` uses `calculateGoalProgress(profile)` from `src/lib/goals.ts` to render a **Goal** card:

- Current weight → target weight
- Percentage complete
- Selected pace (kg/week)
- Estimated weeks remaining

The progress math reads the new `goal_*` columns and falls back to legacy `target_weight` / `weekly_deficit` for profiles that have not been re-saved yet.

## Error UX

Save failures use `formatProfileSaveError()` and `showApiError(..., 'appwrite')`. Common Console misconfigurations (missing Create permission, relationship type mismatch) include inline fix hints.

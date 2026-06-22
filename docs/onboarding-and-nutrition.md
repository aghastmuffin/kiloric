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
  - `goal_plain` (human-readable goal + diet + units)

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
4. **Target calories** — TDEE ± deficit/surplus by goal and pace; floored at 1200 (F) / 1500 (M)
5. **Macros** — protein by kg and diet style; fat %; remaining carbs
6. **Fluid** — ~35 ml/kg (rounded)
7. **Weekly deficit** — `(TDEE - targetKcal) × 7`
8. **Estimated weight change** — deficit / 7700 kcal per kg

### Option presets

Exported arrays drive UI labels and descriptions:

- `ACTIVITY_OPTIONS` — sedentary → extra active
- `GOAL_OPTIONS` — lose, maintain, gain
- `PACE_OPTIONS` — gentle, moderate, aggressive (with kg/week hints)
- `DIET_OPTIONS` — balanced, high protein, low carb, mediterranean, plant-forward

## Profile completeness

`isProfileComplete()` in `profile.ts` checks required create fields only. Nutrition targets are optional for completeness but are normally set during onboarding.

## Config screen vs wizard

`config.tsx` exposes raw field editors (pickers + text inputs) for power users. Same `saveProfileFields` helper. Blocks back navigation until saved when profile was incomplete (mirrors onboarding guard).

## Error UX

Save failures use `formatProfileSaveError()` and `showApiError(..., 'appwrite')`. Common Console misconfigurations (missing Create permission, relationship type mismatch) include inline fix hints.

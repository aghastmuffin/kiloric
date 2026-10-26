# `src/lib` reference

Shared logic modules. Import via `@/lib/...`.

## Kiloric API client

### `serverPersistence.ts`

`serverPersistence.ts` maps the app's profile and feature-store operations to FastAPI routes. `apiClient.ts` owns the base URL, bearer tokens, refresh rotation, JSON requests, and error parsing.

The production API URL is the default; `EXPO_PUBLIC_API_URL` can override it.

### `apiClient.ts`

| Function | Purpose |
|----------|---------|
| `initApiClient()` | Restore access and refresh tokens from AsyncStorage |
| `setTokens(access, refresh)` | Save a successful API session |
| `revokeSession()` | Revoke the refresh token through `/v1/auth/logout` |
| `clearTokens()` | Remove the local API session |

Storage keys: `@kiloric/access_token` and `@kiloric/refresh_token`.

### `AuthContext.tsx`

React context for registration, sign-in, token restoration, sign-out, and account state.

### `getAccessToken.ts`

Returns the current API bearer token, or `null` if no session exists.

---

## Profile

### `profile.ts`

Types: `ProfileFields`, `ProfileCreate`, `ProfileDocument`, `ProfileRole`.

| Export | Purpose |
|--------|---------|
| `getProfile(userId)` | Fetch profile doc; `null` if not found |
| `saveProfileFields(userId, fields)` | Create or patch profile |
| `isProfileComplete(profile)` | All required create fields present |
| `dateToIso(date)` / `dateInputToIso(str)` | Date formatting for Kiloric API datetime |
| `logPersistenceError(ctx, err)` | Structured console logging |
| `formatProfileSaveError(err)` | UI-friendly error strings |
| `normalizeProfileWritePayload(data)` | Coerce numbers, skip `meals` relationship |

Profile document ID always equals the signed-in API user's `$id`.

---

## Nutrition

### `nutrition.ts`

Onboarding and goal calculation utilities.

**Types:** `Sex`, `ActivityLevel`, `FitnessGoal`, `GoalPace`, `DietStyle`, `NutritionPlan`.

**Option arrays:** `ACTIVITY_OPTIONS`, `GOAL_OPTIONS`, `PACE_OPTIONS`, `DIET_OPTIONS` — used by onboarding UI.

**Functions:**

| Function | Description |
|----------|-------------|
| `calculateAge(dob)` | Age from date of birth |
| `calculateBmr(kg, cm, age, sex, bodyFatPct?)` | Mifflin–St Jeor, or Katch–McArdle with body fat |
| `calculateTdee(bmr, activity)` | BMR × activity multiplier |
| `suggestTargetWeight(kg, cm, goal)` | Goal-based target weight |
| `goalPaceKgPerWeek(goal, pace, kg?)` | Weight-relative preset pace |
| `calculateDailyCalories(tdee, goal, pace, sex, kg?)` | Target kcal with floor |
| `calculateWeeklyDeficit(tdee, targetKcal)` | Weekly kcal delta |
| `estimateWeeklyWeightChangeKg(deficit)` | ~7700 kcal/kg rule |
| `calculateMacros(kcal, kg, diet, { goal, heightCm, bodyFatPct })` | Protein / carbs / fat grams |
| `calculateDailyFluid(kg)` | ml/day suggestion |
| `buildNutritionPlan(...)` | Full plan object for onboarding save |

Related modules: `exercise.ts` (net workout calories and the activity allowance), `weightTrend.ts` (EWMA trend and adaptive maintenance), `planInputs.ts` (resolves plan inputs from profile columns and prefs). Formulas and sources: [`formulas.md`](./formulas.md).

---

## Units

### `units.ts`

Display and storage unit helpers. **Kiloric API always stores metric** (kg, cm, ml).

| Function | Purpose |
|----------|---------|
| `defaultDisplayUnits(country)` | `imperial` for US territories, else `metric` |
| `prefersImperialDisplay(country)` | Country-based check |
| `kgToLbs`, `lbsToKg`, `cmToFeetInches`, etc. | Conversions |
| `formatHeightMetric/Imperial`, `formatWeightMetric/Imperial` | Display strings |
| `formatFluid(units, ml)` | ml or fl oz |
| `parseDisplayUnitsPreference(goalPlain)` | Read units suffix from stored goal |
| `appendDisplayUnitsToGoalPlain(text, units)` | Persist units in `goal_plain` |
| `normalizeStoredMetricsToMetric(profile)` | Load imperial-stored legacy values |

---

## Device preferences (AsyncStorage)

### `fontPreferences.ts`

- Key: `@kiloric/app_font_choice`
- Values: `'default' | 'custom'`
- Default: `'default'`

### `mealTypePreferences.ts`

- Key: `@kiloric/selected_meal_type`
- Values: `'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Other'`
- Default: Inferred from current time (e.g., 8 AM → Breakfast)

### Context wrappers

- `FontPreferencesContext.tsx` — `useFontPreferences()`
- `MealTypePreferencesContext.tsx` — `useMealTypePreferences()`

Signed-in account preferences use `accountPreferences.ts` and `/v1/me/prefs`. This includes favorite foods, plan settings, demographics, and privacy controls. Updates are serialized so concurrent settings changes do not overwrite one another.

---

## Fonts

### `fonts.ts`

- `FONT_FAMILY = 'Redaction'`
- `fontAssets` — maps to `assets/fonts/redaction.otf`
- Loaded in root `_layout.tsx` via `useFonts`

### `appFont.ts`

Module-level `setActiveFontFamily` / `getActiveFontFamily` for the Babel alias shim. `FontPreferencesProvider` calls it when the choice changes.

### `react-native-with-fonts.tsx`

Babel alias replaces `react-native` imports to wrap `Text` and `TextInput` with the active font family. See [preferences-and-fonts.md](../preferences-and-fonts.md).

---

## API Caching

### `apiCache.ts`

TTL-based `AsyncStorage` caching for backend requests. Reduces network usage and enables offline detail views for recently scanned items.

- **Barcode/Product:** 14-day TTL.
- **Fuzzy Search:** 3-day TTL.

| Function | Purpose |
|----------|---------|
| `getCachedResponse(endpoint)` | Reads from memory map, then AsyncStorage |
| `setCachedResponse(endpoint, data, ttl)` | Persists JSON payload with expiration |
| `normalizeCacheKey(endpoint)` | Normalizes barcode/product/fuzzy endpoints (drops query params, trims/decodes), otherwise preserves the full query string |

---

## Meal Logic

### `mealFromProduct.ts`

Maps raw API JSON from the FastAPI backend (Oracle) to the `CreateMealInput` shape expected by Kiloric API.

- Handles field aliasing (`energy-kcal` vs `calories`).
- Infers default `MealType` from system clock.
- Estimates "Nutrient Density Score" from Nutri-Score grades (A-E).

### `servings.ts`

| Function | Purpose |
|----------|---------|
| `scaleNutrient(value, servings)` | Multiplies kcal/macros by serving count |

---

## API errors

### `apiErrors.ts`

| Export | Purpose |
|--------|---------|
| `ApiRequestError` | Thrown after toast shown |
| `showApiError(err, source)` | Global toast (`'server' \| 'oracle'`) |
| `formatKiloric APIError` / `formatOracleError` | Message extraction |
| `registerApiErrorListener` | Used by `ApiErrorProvider` |

---

## Data

### `countries.ts`

`COUNTRY_OPTIONS` — ISO code + label list for onboarding country picker.

---

## API client

`src/lib/apiUtils.ts` exports `authenticatedRequest` for food lookup backends.

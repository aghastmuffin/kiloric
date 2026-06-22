# `src/lib` reference

Shared logic modules. Import via `@/lib/...`.

## Appwrite client

### `appwrite.ts`

Creates the shared `Client`, `Account`, and `Databases` instances. Sets endpoint, project, and platform ID (`co.taeson.calcount` on native; web uses hostname or `EXPO_PUBLIC_APPWRITE_PLATFORM_WEB`).

Throws if required env vars are missing.

### `appwriteSession.ts`

| Function | Purpose |
|----------|---------|
| `applyAppwriteSession(secret)` | `client.setSession(secret)` |
| `persistAppwriteSession(session)` | Apply + save to AsyncStorage |
| `restoreAppwriteSession()` | Load from storage on cold start |
| `clearAppwriteSession()` | Clear client + storage on sign out |

Storage key: `appwrite_session_<projectId>`.

### `AuthContext.tsx`

React context for auth. See [appwrite/auth-and-db.md](../appwrite/auth-and-db.md).

### `getAccessToken.ts`

`account.createJWT()` → JWT string for FastAPI. Returns `null` if no session.

---

## Profile

### `profile.ts`

Types: `ProfileFields`, `ProfileCreate`, `ProfileDocument`, `ProfileRole`.

| Export | Purpose |
|--------|---------|
| `getProfile(userId)` | Fetch profile doc; `null` if not found |
| `saveProfileFields(userId, fields)` | Create or patch profile |
| `isProfileComplete(profile)` | All required create fields present |
| `dateToIso(date)` / `dateInputToIso(str)` | Date formatting for Appwrite datetime |
| `logAppwriteError(ctx, err)` | Structured console logging |
| `formatProfileSaveError(err)` | UI-friendly error strings |
| `normalizeProfileWritePayload(data)` | Coerce numbers, skip `meals` relationship |

Profile document ID always equals Appwrite Auth `user.$id`.

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
| `calculateBmr(kg, cm, age, sex)` | Mifflin–St Jeor BMR |
| `calculateTdee(bmr, activity)` | BMR × activity multiplier |
| `suggestTargetWeight(kg, cm, goal)` | Goal-based target weight |
| `calculateDailyCalories(tdee, goal, pace, sex)` | Target kcal with floor |
| `calculateWeeklyDeficit(tdee, targetKcal)` | Weekly kcal delta |
| `estimateWeeklyWeightChangeKg(deficit)` | ~7700 kcal/kg rule |
| `calculateMacros(kcal, kg, diet)` | Protein / carbs / fat grams |
| `calculateDailyFluid(kg)` | ml/day suggestion |
| `buildNutritionPlan(...)` | Full plan object for onboarding save |

---

## Units

### `units.ts`

Display and storage unit helpers. **Appwrite always stores metric** (kg, cm, ml).

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

## Preferences (AsyncStorage)

### `searchPreferences.ts`

- Key: `@calcount/default_search_mode`
- Values: `'scan' | 'text_query'`
- Default: `'scan'`

### `fontPreferences.ts`

- Key: `@calcount/app_font_choice`
- Values: `'default' | 'custom'`
- Default: `'default'`

### Context wrappers

- `SearchPreferencesContext.tsx` — `useSearchPreferences()`
- `FontPreferencesContext.tsx` — `useFontPreferences()`

---

## Fonts

### `fonts.ts`

- `FONT_FAMILY = 'Redaction'`
- `fontAssets` — maps to `assets/fonts/redaction.otf`
- Loaded in root `_layout.tsx` via `useFonts`

### `appFont.ts`

Module-level `setActiveFontFamily` / `getActiveFontFamily` for the Babel alias shim.

### `applyDefaultFont.ts`

Calls `setActiveFontFamily` when preference changes.

### `react-native-with-fonts.tsx`

Babel alias replaces `react-native` imports to wrap `Text` and `TextInput` with the active font family. See [preferences-and-fonts.md](../preferences-and-fonts.md).

---

## API errors

### `apiErrors.ts`

| Export | Purpose |
|--------|---------|
| `ApiRequestError` | Thrown after toast shown |
| `showApiError(err, source)` | Global toast (`'appwrite' \| 'oracle'`) |
| `formatAppwriteError` / `formatOracleError` | Message extraction |
| `registerApiErrorListener` | Used by `ApiErrorProvider` |

---

## Data

### `countries.ts`

`COUNTRY_OPTIONS` — ISO code + label list for onboarding country picker.

---

## Re-exports

`src/components/apiUtils.tsx` re-exports `account` from `@/lib/appwrite` for convenience alongside `authenticatedRequest`.

# Components

Reusable UI in `src/components/`. Import via `@/components/...`.

## API and errors

Food lookup requests live in `src/lib/apiUtils.ts` (`authenticatedRequest`). See [backend-api.md](./backend-api.md).

### `ApiErrorToast.tsx`

Animated dismissible toast shown by `ApiErrorProvider`. Displays `message` and optional source badge.

---

## Auth and profile

### `ProfileGate.tsx`

Wraps tab navigator. While auth or profile check is loading, shows spinner. If user is signed in but profile is incomplete (`isProfileComplete`), redirects to `/onboarding`.

Does not block logged-out users.

---

## Search

### `SearchModeSwapButton.tsx`

Floating action button on the camera screen. Returns to text search on the Log tab.

Position accounts for tab bar height + safe area inset.

### `Gague.tsx` (RadialGauge)

Animated semi-circular gauge used to display calorie or nutrient progress against a daily goal.

- **Props:** `value`, `max`, `size`, `strokeWidth`, `color`, `backgroundColor`.
- **Implementation:** Uses `react-native-reanimated` for smooth arc transitions.

---

## Pickers and dialogs

### `NativePickers.tsx`

Cross-platform form controls built on `@react-native-picker/picker` and `@react-native-community/datetimepicker`:

| Component | Purpose |
|-----------|---------|
| `NativeDatePicker` | Date of birth |
| `NativeEnumPicker` | String enum lists (country, role, etc.) |
| `NativeIntPicker` | Integer ranges |
| `NativeDecimalPicker` | Decimal values |

Used in `config.tsx` and onboarding.

### `ConfirmDialog.tsx`

Animated modal with confirm/cancel, optional destructive styling and loading state. Built with `react-native-reanimated`.

### `FontPreferencePicker.tsx`

Toggle between system font and custom Redaction font. Used on Account tab (logged out and logged in).

Meal type is selected from Log / product-detail UI via `MealTypePreferencesContext`.

---

## Onboarding (`components/onboarding/`)

| File | Purpose |
|------|---------|
| `OnboardingWizard.tsx` | Multi-step wizard; saves profile + nutrition plan |
| `types.ts` | Step definitions, form state, defaults |
| `ProgressHeader.tsx` | Step indicator |
| `StepTransition.tsx` | Animated step changes |
| `SelectionCard.tsx` | Tappable option cards (activity, goal, diet) |
| `BodyMetricPickers.tsx` | Height/weight pickers with unit toggle |
| `UnitToggle.tsx` | Metric ↔ imperial switch |
| `styles.ts` | Onboarding color tokens |

See [onboarding-and-nutrition.md](./onboarding-and-nutrition.md).

---

## Styles

### `src/styles/styles.ts`

Shared `appStyles` — container, inputs, buttons, labels matching the dark theme (`#25292e` background, `#ffd33d` accent).

Onboarding uses its own palette in `components/onboarding/styles.ts`.

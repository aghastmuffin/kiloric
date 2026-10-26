# Architecture

## Stack

- **Expo SDK 56** with **Expo Router** (typed routes, React Compiler enabled)
- **React Native 0.85** / **React 19**
- **Kiloric API**, backed by FastAPI at `https://api.kiloric.co`, for authentication and all account data
- **AsyncStorage** for access/refresh tokens, pre-auth presentation choices, and bounded API caches

Path alias: `@/*` → `src/*` (see `tsconfig.json`).

## Provider tree

Root layout: `src/app/_layout.tsx`

```
SafeAreaProvider
└─ FontPreferencesProvider          (custom font choice + navigation theme)
   └─ ThemeProvider (expo-router dark theme)
      └─ ApiErrorProvider          (global error toast)
         └─ AuthProvider           (Kiloric API session + user)
            └─ Stack               (modal/stack screens)
               └─ (tabs)           (tab navigator)
```

Tab layout: `src/app/(tabs)/_layout.tsx`

```
ProfileGate                         (redirect incomplete profiles → onboarding)
└─ Tabs
```

### What each provider does

| Provider | Hook | Purpose |
|----------|------|---------|
| `FontPreferencesProvider` | `useFontPreferences()` | System vs custom Redaction font; remounts tree on font change |
| `ApiErrorProvider` | `useApiError()` | Shows `ApiErrorToast` for Kiloric API and backend errors |
| `AuthProvider` | `useAuth()` | `user`, `loading`, `signIn`, `signUp`, `signOut` |
| `MealTypePreferencesProvider` | `useMealTypePreferences()` | Selected meal bucket (Breakfast, Lunch, …) |

## Navigation

### Tab screens (`src/app/(tabs)/`)

| Route | Tab visible | Notes |
|-------|-------------|-------|
| `index` | Today | Dashboard: targets, logs, tasks |
| `logfood` | Log | Search, scan, favorites, and meal logging |
| `stats` | Stats | History and progress |
| `account` | You | Sign in/out, settings, profile |
| `meals` / `workouts` / `meds` / `searchrewrite` | Hidden | Redirects or `__DEV__` previews |

### Stack screens (`src/app/`)

| Route | Header | Purpose |
|-------|--------|---------|
| `cameraview` | Scan Barcode | Live barcode scanner (`expo-camera`) |
| `onboarding` | Hidden | Multi-step profile + nutrition wizard |
| `onboard_success` | Hidden | Post-onboarding confirmation |
| `config` | Profile | Edit saved profile fields |
| `additions` | Hidden | Product detail / add to meal |
| `contribute-food` | Hidden | Submit a food record |
| `credits` | — | Credits screen |

## Auth + profile gate flow

```text
App launch
  └─ AuthProvider restores API tokens → GET /v1/me
  └─ ProfileGate (tabs only)
       └─ if user && !isProfileComplete → router.replace('/onboarding')
       └─ else → show tabs

Sign up success → /onboarding
Onboarding complete → /onboard_success → tabs
```

Logged-out users can still use tabs; only authenticated users with incomplete profiles are redirected.

## Barcode scan flow

```text
Log tab → Open Camera → /cameraview
  └─ onBarcodeScanned → AsyncStorage 'saved_barcode' → router.back()
  └─ Log tab useFocusEffect reads storage → authenticatedRequest /api/barcode/:code
```

## Meal logging flow

Search and scan results write straight to the signed-in account's API records. Favorite foods also persist in `/v1/me/prefs`; the temporary barcode handoff from the camera remains device-local.

## Build and deploy

- **EAS**: `eas.json` defines `development` (dev client), `preview`, and `production` profiles.
- **Bundle ID**: `co.taeson.kiloric` (iOS + Android).
- **Deep link scheme**: `calorie://`

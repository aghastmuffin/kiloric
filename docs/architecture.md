# Architecture

## Stack

- **Expo SDK 56** with **Expo Router** (typed routes, React Compiler enabled)
- **React Native 0.85** / **React 19**
- **Appwrite** (`react-native-appwrite`) for auth + databases
- **FastAPI** backend at `https://calcount.taeson.co` for food/barcode APIs
- **AsyncStorage** for session persistence and user preferences

Path alias: `@/*` → `src/*` (see `tsconfig.json`).

## Provider tree

Root layout: `src/app/_layout.tsx`

```
SafeAreaProvider
└─ FontPreferencesProvider          (custom font choice + navigation theme)
   └─ ThemeProvider (expo-router dark theme)
      └─ ApiErrorProvider          (global error toast)
         └─ AuthProvider           (Appwrite session + user)
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
| `ApiErrorProvider` | `useApiError()` | Shows `ApiErrorToast` for Appwrite and backend errors |
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
| `Additions` | Hidden | Product detail / add to meal |
| `contribute-food` | Hidden | Submit a food record |
| `credits` | — | Credits screen |

## Auth + profile gate flow

```text
App launch
  └─ AuthProvider restores AsyncStorage session → account.get()
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

Search, scan, and favorites on the Log tab write straight to today's Appwrite meal document (`addProductToMeal`). There is no local barcode staging list.

## Build and deploy

- **EAS**: `eas.json` defines `development` (dev client), `preview`, and `production` profiles.
- **Bundle ID**: `co.taeson.calcount` (iOS + Android) — must match `EXPO_PUBLIC_APPWRITE_PLATFORM_ID`.
- **Deep link scheme**: `calorie://`

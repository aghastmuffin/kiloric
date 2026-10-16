# Architecture

## Stack

- **Expo SDK 56** with **Expo Router** (typed routes, React Compiler enabled)
- **React Native 0.85** / **React 19**
- **Appwrite** (`react-native-appwrite`) for auth + databases
- **FastAPI** backend at `https://calcount.taeson.co` for food/barcode APIs
- **expo-secure-store** for the native Appwrite session secret (web relies on the cookie session)
- **AsyncStorage** for user preferences

Path alias: `@/*` → `src/*` (see `tsconfig.json`).

## Provider tree

Root layout: `src/app/_layout.tsx`

```
SafeAreaProvider
└─ FontPreferencesProvider          (IBM Plex Sans body face for navigation)
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
| `FontPreferencesProvider` | `useFontPreferences()` | Applies IBM Plex Sans once the font assets load |
| `ApiErrorProvider` | `useApiError()` | Shows `ApiErrorToast` for Appwrite and backend errors |
| `AuthProvider` | `useAuth()` | `user`, `loading`, `signIn`, `signUp`, `signOut` |
| `MealTypePreferencesProvider` | `useMealTypePreferences()` | Selected meal bucket (Breakfast, Lunch, …) |

## Navigation

### Tab screens (`src/app/(tabs)/`)

| Route | Tab visible | Notes |
|-------|-------------|-------|
| `index` | Today | Targets, checklist, today's meals |
| `logfood` | Add | Search, scan, favorites, and meal logging |
| `stats` | Trends | History and progress |
| `account` | You | Sign in/out, settings, profile |

### Stack screens (`src/app/`)

| Route | Header | Purpose |
|-------|--------|---------|
| `cameraview` | Scan Barcode | Live barcode scanner (`expo-camera`) |
| `onboarding` | Hidden | Multi-step profile + nutrition wizard |
| `onboard_success` | Hidden | Post-onboarding confirmation |
| `config` | Goals & body | Profile, targets, and appearance |
| `food/[barcode]` | Hidden | Product detail / add to meal |
| `contribute-food` | Hidden | Submit a food record |
| `credits` | — | Credits screen |

## Auth + profile gate flow

```text
App launch
  └─ AuthProvider restores the native SecureStore session, or the web cookie session → account.get()
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

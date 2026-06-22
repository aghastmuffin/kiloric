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
└─ SearchPreferencesProvider        (scan vs text_query default tab)
   └─ Tabs
```

### What each provider does

| Provider | Hook | Purpose |
|----------|------|---------|
| `FontPreferencesProvider` | `useFontPreferences()` | System vs custom Redaction font; remounts tree on font change |
| `ApiErrorProvider` | `useApiError()` | Shows `ApiErrorToast` for Appwrite and backend errors |
| `AuthProvider` | `useAuth()` | `user`, `loading`, `signIn`, `signUp`, `signOut` |
| `SearchPreferencesProvider` | `useSearchPreferences()` | Which search tab is visible by default |

## Navigation

### Tab screens (`src/app/(tabs)/`)

| Route | Tab visible | Notes |
|-------|-------------|-------|
| `index` | Home | Welcome / dev links |
| `scan` | When default mode is `scan` | Barcode results after camera scan |
| `text_query` | When default mode is `text_query` | Manual text or barcode lookup |
| `meals` | Always | Placeholder (under construction) |
| `account` | Always | Sign in/out, settings, profile link |
| `about` | Hidden (`href: null`) | About screen, not in tab bar |
| `basepg` | Hidden | Legacy/base page |

Scan and Manual Search share one tab slot: `SearchPreferencesContext` toggles `href: null` on the inactive tab.

### Stack screens (`src/app/`)

| Route | Header | Purpose |
|-------|--------|---------|
| `cameraview` | Scan Barcode | Live barcode scanner (`expo-camera`) |
| `onboarding` | Hidden | Multi-step profile + nutrition wizard |
| `onboard_success` | Hidden | Post-onboarding confirmation |
| `config` | Profile | Edit saved profile fields |
| `multiresponse` | Results | List fuzzy-search API results |
| `fooddetail` | Food Details | Single product detail from backend |
| `present_n_save` | Confirm Selection | Reserved for save flow (stub) |
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
scan tab → Open Camera → /cameraview
  └─ onBarcodeScanned → AsyncStorage 'saved_barcode' → router.back()
  └─ scan tab useFocusEffect reads storage → authenticatedRequest /api/barcode/:code
```

## Build and deploy

- **EAS**: `eas.json` defines `development` (dev client), `preview`, and `production` profiles.
- **Bundle ID**: `co.taeson.calcount` (iOS + Android) — must match `EXPO_PUBLIC_APPWRITE_PLATFORM_ID`.
- **Deep link scheme**: `calorie://`

# Screens and routing

Expo Router file-based routes under `src/app/`. Typed routes enabled (`experiments.typedRoutes`).

## Tab group `(tabs)`

| File | Route | Description |
|------|-------|-------------|
| `index.tsx` | `/` | Home — links to credits, scan, text query |
| `scan.tsx` | `/scan` | Shows last scanned barcode + API result; opens camera |
| `text_query.tsx` | `/text_query` | Text or manual barcode search; fuzzy results → multiresponse |
| `meals.tsx` | `/meals` | Placeholder — under construction |
| `account.tsx` | `/account` | Auth form, settings (font, search mode), profile editor link |
| `about.tsx` | `/about` | Hidden from tab bar |
| `basepg.tsx` | `/basepg` | Hidden legacy page |
| `_layout.tsx` | — | Tabs + `ProfileGate` + `SearchPreferencesProvider` |

### Search tab visibility

Controlled in `(tabs)/_layout.tsx`:

- `defaultSearchMode === 'scan'` → Scan tab visible, Manual Search hidden
- `defaultSearchMode === 'text_query'` → opposite

User can still swap modes temporarily via `SearchModeSwapButton` without changing the default.

## Stack screens

| File | Route | Params | Description |
|------|-------|--------|-------------|
| `_layout.tsx` | — | — | Root stack, fonts, providers |
| `cameraview.tsx` | `/cameraview` | — | Barcode scanner; writes `saved_barcode` to AsyncStorage |
| `onboarding.tsx` | `/onboarding` | — | Hosts `OnboardingWizard` |
| `onboard_success.tsx` | `/onboard_success` | — | Success screen after onboarding |
| `config.tsx` | `/config` | — | Redirects to `/onboarding` (legacy route) |
| `multiresponse.tsx` | `/multiresponse` | `data` (JSON string) | Renders fuzzy search result list |
| `fooddetail.tsx` | `/fooddetail` | `code` | Fetches `/api/barcode/:code` for detail view |
| `present_n_save.tsx` | `/present_n_save` | — | Stub for confirm/save flow |
| `credits.tsx` | `/credits` | — | Credits |
| `+not-found.tsx` | — | — | 404 fallback |

## Common navigation patterns

```tsx
import { useRouter } from 'expo-router'

const router = useRouter()

router.push('/cameraview')
router.push('/fooddetail?code=012345678905')
router.push({ pathname: '/multiresponse', params: { data: JSON.stringify(items) } })
router.replace('/onboarding')
```

## Screen dependencies

| Screen | Requires login | Requires complete profile | Backend API |
|--------|----------------|---------------------------|-------------|
| Home, About | No | No | No |
| Scan, Text query | Yes (for API) | No | Yes |
| Account | No (shows auth form) | No | JWT test only |
| Meals | No | No | No |
| Onboarding | Yes | No (creates profile) | No |
| Config | Yes | Partial (editable anytime) | No |
| Food detail, Multiresponse | Yes | No | Yes |

`ProfileGate` only forces onboarding for signed-in users with incomplete profiles.

## Camera notes

- iOS Simulator: scanning disabled (`expo-device` check); message shown instead.
- Permissions requested via `useCameraPermissions()` from `expo-camera`.
- Supported barcode types listed in `cameraview.tsx` (EAN, UPC, QR, Code128, etc.).

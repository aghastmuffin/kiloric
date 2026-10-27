# Preferences and fonts

Account preferences are stored by the Kiloric API. Presentation choices that are needed before sign-in, such as theme and font, remain on the device and are exposed through React contexts.

## Search mode

Scan vs text lookup is a Log-tab action, not a persisted preference. `SearchModeSwapButton` on the camera screen returns to `/logfood` (or pops back) without writing AsyncStorage.

---

## Theme preference

**Storage:** `@kiloric/app_theme_choice`
**Values:** `'ios'` (Adaptive) | `'barebones'` (Original Dark)
**Module:** `src/lib/theme/themePreferences.ts`
**Context:** `ThemeProvider` (root `_layout.tsx`)

### Available themes

| Theme | Description |
|-------|-------------|
| **iOS** | Follows system light/dark mode. Uses standard iOS-style colors (system blue accent). |
| **barebones** | Permanently dark theme. Uses the app's original custom palette (#ffd33d amber accent). |

Default: `ios`.

### `useThemedStyles` hook

To maintain consistency across themes, components should avoid hardcoded hex values. Use the `useThemedStyles` hook to access the active palette:

```tsx
const styles = useThemedStyles((c) => StyleSheet.create({
  container: {
    backgroundColor: c.background,
  },
  text: {
    color: c.text,
  }
}));
```

`onboarding` components use a specialized `useOnboardingStyles` hook for their distinct step-by-step palette.

---

## Font preference

**Storage:** `@kiloric/app_font_choice`  
**Values:** `'default'` (Editorial mix) | `'custom'` (Serif) | `'mono'` (Mono)  
**Module:** `src/lib/fontPreferences.ts`  
**Context:** `FontPreferencesProvider` (root `_layout.tsx`)

### Typography Stack

- **UI & Body:** Inter Tight (`InterTight`, `InterTightLight`, `InterTightMedium`, `InterTightSemiBold`, `InterTightBold`, `InterTightExtraBold`)
- **Display & Headings:** Instrument Serif (`InstrumentSerif`)
- **Monospace & Overlines:** JetBrains Mono (`JetBrainsMono`, `JetBrainsMonoMedium`)
- Loaded via `@expo-google-fonts/*` in `src/lib/fonts.ts` and initialized with `useFonts` in root `_layout.tsx`.

### How fonts apply globally

1. **`FontPreferencesProvider`** sets `activeFontFamily` based on typography preference (`default`, `custom`, or `mono`).
2. **`setActiveFontFamily`** updates module state in `appFont.ts`.
3. **Metro resolver** (`metro.config.js`) maps `react-native` → `src/lib/react-native-with-fonts.tsx`.
4. That shim wraps **`Text`** and **`TextInput`** to resolve the correct standardized font variant (e.g. mapping `fontWeight: '600'` to `InterTightSemiBold` and `'700'` to `InterTightBold`).
5. Root layout also passes `activeFontFamily` to Expo Router `ThemeProvider` fonts and stack header styles.
6. Provider uses `<Fragment key={fontRenderKey}>` to remount navigation when font choice changes.

### Picker UI

`FontPreferencePicker` on Account tab — available logged in or out.

### TypeScript alias

`tsconfig.json` maps `react-native-original` → actual `react-native` package for the shim imports.

---

## Other AsyncStorage keys

| Key | Used by |
|-----|---------|
| `saved_barcode` | Camera scan → scan tab result display |
| `@kiloric/access_token` | Kiloric API access token |
| `@kiloric/refresh_token` | Kiloric API refresh token |

Favorite foods, nutrition-plan settings, demographics, and privacy choices are stored in `/v1/me/prefs` for the signed-in account.

---

## Provider hooks

```tsx
import { useFontPreferences } from '@/lib/FontPreferencesContext'

const { fontChoice, setFontChoice, activeFontFamily } = useFontPreferences()
```

The hook throws if used outside `FontPreferencesProvider`.

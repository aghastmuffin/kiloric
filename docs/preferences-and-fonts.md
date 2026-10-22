# Preferences and fonts

User settings persisted in AsyncStorage and exposed via React contexts.

## Search mode

Scan vs text lookup is a Log-tab action, not a persisted preference. `SearchModeSwapButton` on the camera screen returns to `/logfood` (or pops back) without writing AsyncStorage.

---

## Theme preference

**Storage:** `@kiloric/app_theme_choice` (legacy `@calcount/app_theme_choice`, including the stored value `calcount`, is copied forward as `kiloric`)
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

**Storage:** `@kiloric/app_font_choice` (legacy `@calcount/app_font_choice` is copied forward)  
**Values:** `'default'` (system) | `'custom'` (Redaction)  
**Module:** `src/lib/fontPreferences.ts`  
**Context:** `FontPreferencesProvider` (root `_layout.tsx`)

### Custom font asset

- File: `assets/fonts/redaction.otf`
- Family name: `Redaction` (`FONT_FAMILY` in `fonts.ts`)
- Loaded with `expo-font` / `useFonts` before app renders

### How custom font applies globally

1. **`FontPreferencesProvider`** sets `activeFontFamily` when choice is `custom` and font loaded.
2. **`applyAppFont`** updates module state in `appFont.ts`.
3. **Babel alias** (`babel.config.js`) redirects `react-native` → `src/lib/react-native-with-fonts.tsx`.
4. That shim wraps **`Text`** and **`TextInput`** to merge `fontFamily` into styles.
5. Root layout also passes `activeFontFamily` to Expo Router `ThemeProvider` fonts and stack header styles.
6. Provider uses `<Fragment key={fontRenderKey}>` to remount navigation when font changes.

### Picker UI

`FontPreferencePicker` on Account tab — available logged in or out.

### TypeScript alias

`tsconfig.json` maps `react-native-original` → actual `react-native` package for the shim imports.

---

## Other AsyncStorage keys

| Key | Used by |
|-----|---------|
| `saved_barcode` | Camera scan → scan tab result display |
| `appwrite_session_<projectId>` | Appwrite session secret |

---

## Provider hooks

```tsx
import { useFontPreferences } from '@/lib/FontPreferencesContext'

const { fontChoice, setFontChoice, activeFontFamily } = useFontPreferences()
```

The hook throws if used outside `FontPreferencesProvider`.

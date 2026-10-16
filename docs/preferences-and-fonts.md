# Preferences and fonts

User settings persisted in AsyncStorage and exposed via React contexts.

## Search mode

Scan vs text lookup is a Log-tab action, not a persisted preference. `SearchModeSwapButton` on the camera screen returns to `/logfood` (or pops back) without writing AsyncStorage.

---

## Theme preference

**Storage:** `@calcount/app_theme_choice`
**Values:** `'night'` (Night ledger, default) | `'paper'` (warm light)
**Module:** `src/lib/theme/themePreferences.ts`
**Context:** `ThemeProvider` (root `_layout.tsx`)

Stored `'dark'` maps to night and `'light'` maps to paper. Missing or retired values (`ios`, `barebones`) resolve to night. The choice does not follow the system color scheme.

### Available themes

| Theme | Description |
|-------|-------------|
| **Night** | Default dark ledger. Background `#121110`, rust accent `#E0664E`. |
| **Paper** | The single light theme. Warm paper, ink accent, rust brand `#A33A2E`. |

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

Onboarding uses the same theme tokens through `useOnboardingStyles`.

---

## Fonts

There is no font-mode preference. IBM Plex Sans is the body face (`FONT_FAMILY`), Instrument Serif is reserved for screen titles and the large calorie number, and JetBrains Mono with tabular figures is used for other gram and kilocalorie values.

1. Root layout loads the families with `useFonts`.
2. **`FontPreferencesProvider`** sets `activeFontFamily` to IBM Plex Sans once those assets load.
3. **`applyAppFont`** updates module state in `appFont.ts`.
4. **Babel alias** (`babel.config.js`) redirects `react-native` → `src/lib/react-native-with-fonts.tsx`.
5. That shim wraps **`Text`** and **`TextInput`** to merge `fontFamily` into styles.
6. Stack headers use Instrument Serif directly.

### TypeScript alias

`tsconfig.json` maps `react-native-original` → actual `react-native` package for the shim imports.

---

## Other AsyncStorage keys

| Key | Used by |
|-----|---------|
| `saved_barcode` | Camera scan → scan tab result display |
| `appwrite_session_<projectId>` | Native Appwrite session secret in SecureStore. Web does not persist it. |

---

## Provider hooks

```tsx
import { useFontPreferences } from '@/lib/FontPreferencesContext'

const { activeFontFamily } = useFontPreferences()
```

The hook throws if used outside `FontPreferencesProvider`.

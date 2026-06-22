# Preferences and fonts

User settings persisted in AsyncStorage and exposed via React contexts.

## Default search mode

**Storage:** `@calcount/default_search_mode`  
**Module:** `src/lib/searchPreferences.ts`  
**Context:** `SearchPreferencesContext` (wraps tabs in `(tabs)/_layout.tsx`)

| Value | Effect |
|-------|--------|
| `scan` | Scan tab visible in tab bar; Manual Search hidden |
| `text_query` | Manual Search visible; Scan hidden |

Default: `scan`.

### Changing the default

Account tab → **Default search mode** (when logged in). Calls `setDefaultSearchMode(mode)` which updates state and AsyncStorage.

### Temporary swap

`SearchModeSwapButton` on scan/text screens navigates to the other mode without updating the stored preference.

---

## Font preference

**Storage:** `@calcount/app_font_choice`  
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
import { useSearchPreferences } from '@/lib/SearchPreferencesContext'
import { useFontPreferences } from '@/lib/FontPreferencesContext'

const { defaultSearchMode, setDefaultSearchMode, loading } = useSearchPreferences()
const { fontChoice, setFontChoice, activeFontFamily } = useFontPreferences()
```

Both hooks throw if used outside their provider.

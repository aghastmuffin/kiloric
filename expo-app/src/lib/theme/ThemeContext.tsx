import {
  DEFAULT_THEME_CHOICE,
  loadThemeChoice,
  saveThemeChoice,
} from '@/lib/theme/themePreferences'
import {
  resolveOnboardingColors,
  resolveThemeColors,
  type AppThemeChoice,
  type ColorSchemeName,
  type OnboardingColors,
  type ThemeColors,
} from '@/lib/theme/tokens'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useColorScheme } from 'react-native'

type ThemeContextValue = {
  themeChoice: AppThemeChoice
  /** Resolved light/dark scheme actually in effect. */
  scheme: ColorSchemeName
  colors: ThemeColors
  onboardingColors: OnboardingColors
  loading: boolean
  setThemeChoice: (choice: AppThemeChoice) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [themeChoice, setThemeChoiceState] = useState<AppThemeChoice>(DEFAULT_THEME_CHOICE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadThemeChoice()
      .then(setThemeChoiceState)
      .finally(() => setLoading(false))
  }, [])

  // iOS theme follows the device; barebones is always dark.
  const scheme: ColorSchemeName =
    themeChoice === 'barebones'
      ? 'dark'
      : themeChoice === 'kiloric'
        ? systemScheme === 'dark' ? 'dark' : 'light'
        : systemScheme === 'light' ? 'light' : 'dark'

  const colors = useMemo(
    () => resolveThemeColors(themeChoice, scheme),
    [themeChoice, scheme],
  )
  const onboardingColors = useMemo(
    () => resolveOnboardingColors(themeChoice, scheme),
    [themeChoice, scheme],
  )

  const setThemeChoice = useCallback(async (choice: AppThemeChoice) => {
    setThemeChoiceState(choice)
    try {
      await saveThemeChoice(choice)
    } catch (err) {
      console.error('[themePreferences] save failed', err)
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeChoice,
      scheme,
      colors,
      onboardingColors,
      loading,
      setThemeChoice,
    }),
    [themeChoice, scheme, colors, onboardingColors, loading, setThemeChoice],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

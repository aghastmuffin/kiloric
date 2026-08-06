import { applyAppFont } from '@/lib/applyDefaultFont'
import {
  DEFAULT_FONT_CHOICE,
  loadFontChoice,
  saveFontChoice,
  type AppFontChoice,
} from '@/lib/fontPreferences'
import { FONT_FAMILY, HEADLINE_FONT_FAMILY } from '@/lib/fonts'
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type FontPreferencesContextValue = {
  fontChoice: AppFontChoice
  activeFontFamily: string | undefined
  fontRenderKey: string
  loading: boolean
  customFontLoaded: boolean
  setFontChoice: (choice: AppFontChoice) => Promise<void>
}

const FontPreferencesContext = createContext<FontPreferencesContextValue | null>(null)

export function FontPreferencesProvider({
  children,
  customFontLoaded,
}: {
  children: React.ReactNode
  customFontLoaded: boolean
}) {
  const [fontChoice, setFontChoiceState] = useState<AppFontChoice>(DEFAULT_FONT_CHOICE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFontChoice()
      .then(setFontChoiceState)
      .finally(() => setLoading(false))
  }, [])

  const activeFontFamily = useMemo(
    () => customFontLoaded
      ? (fontChoice === 'custom' ? HEADLINE_FONT_FAMILY : FONT_FAMILY)
      : undefined,
    [fontChoice, customFontLoaded],
  )

  const fontRenderKey = activeFontFamily ?? 'system'

  useEffect(() => {
    if (!loading) {
      applyAppFont(activeFontFamily)
    }
  }, [activeFontFamily, loading])

  const setFontChoice = useCallback(async (choice: AppFontChoice) => {
    setFontChoiceState(choice)
    try {
      await saveFontChoice(choice)
    } catch (err) {
      console.error('[fontPreferences] save failed', err)
    }
  }, [])

  return (
    <FontPreferencesContext.Provider
      value={{
        fontChoice,
        activeFontFamily,
        fontRenderKey,
        loading,
        customFontLoaded,
        setFontChoice,
      }}
    >
      <Fragment key={fontRenderKey}>{children}</Fragment>
    </FontPreferencesContext.Provider>
  )
}

export function useFontPreferences(): FontPreferencesContextValue {
  const context = useContext(FontPreferencesContext)
  if (!context) {
    throw new Error('useFontPreferences must be used within FontPreferencesProvider')
  }
  return context
}

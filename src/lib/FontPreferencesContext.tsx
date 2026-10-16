import { setActiveFontFamily } from '@/lib/appFont'
import { FONT_FAMILY } from '@/lib/fonts'
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
} from 'react'

type FontPreferencesContextValue = {
  activeFontFamily: string | undefined
  fontRenderKey: string
  customFontLoaded: boolean
}

const FontPreferencesContext = createContext<FontPreferencesContextValue | null>(null)

export function FontPreferencesProvider({
  children,
  customFontLoaded,
}: {
  children: React.ReactNode
  customFontLoaded: boolean
}) {
  const activeFontFamily = customFontLoaded ? FONT_FAMILY : undefined
  const fontRenderKey = activeFontFamily ?? 'system'

  useEffect(() => {
    if (activeFontFamily) {
      setActiveFontFamily(activeFontFamily, false)
    }
  }, [activeFontFamily])

  const value = useMemo(
    () => ({
      activeFontFamily,
      fontRenderKey,
      customFontLoaded,
    }),
    [activeFontFamily, customFontLoaded, fontRenderKey],
  )

  return (
    <FontPreferencesContext.Provider value={value}>
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

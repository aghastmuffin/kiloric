/**
 * @deprecated Prefer Log (`logfood`) for today's meal organisation.
 * Kept as a redirect so old deep links and bookmarks keep working.
 */
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useTheme } from '@/lib/theme/ThemeContext'

export default function MealsScreen() {
  const router = useRouter()
  const { colors } = useTheme()

  useEffect(() => {
    router.replace('/logfood')
  }, [router])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  )
}

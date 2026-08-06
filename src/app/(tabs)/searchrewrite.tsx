/**
 * @deprecated Prefer Log (`logfood`) for search + logging.
 * Kept as a redirect so old deep links keep working.
 */
import { useTheme } from '@/lib/theme/ThemeContext'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

export default function SearchRewriteScreen() {
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

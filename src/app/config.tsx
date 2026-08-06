import { useAuth } from '@/lib/AuthContext'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Redirect, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

/**
 * Legacy `/config` route — redirects to the onboarding wizard, which is now
 * the single profile & goals editor (create + edit).
 */
export default function ConfigRedirectScreen() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/(tabs)/account')
      return
    }
    router.replace('/onboarding')
  }, [loading, router, user])

  if (!loading && user) {
    return <Redirect href="/onboarding" />
  }

  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.mutedText}>Opening profile editor…</Text>
    </View>
  )
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.background,
      gap: 12,
    },
    mutedText: {
      color: c.textMuted,
    },
  })

import { useAuth } from '@/lib/AuthContext'
import { useProfile } from '@/lib/ProfileContext'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { useRouter } from 'expo-router'
import { type ReactNode, useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

export function ProfileGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { isComplete, loading: profileLoading } = useProfile()
  const router = useRouter()
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()

  useEffect(() => {
    if (authLoading || profileLoading) return
    if (!user?.$id) return
    if (!isComplete) {
      router.replace('/onboarding')
    }
  }, [authLoading, isComplete, profileLoading, router, user?.$id])

  if (authLoading || (user?.$id && profileLoading)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.mutedText}>Loading account…</Text>
      </View>
    )
  }

  return children
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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

import { getAuthErrorMessage, useAuth } from '@/lib/AuthContext'
import { isValidPassword } from '@/lib/authValidation'
import { triggerImpactHaptic, triggerNotificationHaptic, triggerSelectionHaptic } from '@/lib/haptics'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

export default function ResetPasswordScreen() {
  const { userId, secret } = useLocalSearchParams<{ userId?: string; secret?: string }>()
  const { confirmPasswordReset } = useAuth()
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit() {
    triggerImpactHaptic('medium')
    if (!userId || !secret) {
      setError('This reset link is incomplete or expired. Request a new link from sign in.')
      triggerNotificationHaptic('error')
      return
    }
    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters.')
      triggerNotificationHaptic('error')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      triggerNotificationHaptic('error')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await confirmPasswordReset(userId, secret, password)
      triggerNotificationHaptic('success')
      router.replace('/signin')
    } catch (err) {
      setError(getAuthErrorMessage(err))
      triggerNotificationHaptic('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>CALCOUNT ACCOUNT</Text>
        <Text accessibilityRole="header" style={styles.title}>Choose a new password</Text>
        <Text style={styles.body}>Use at least 8 characters, then return to sign in.</Text>
        {error ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Text style={styles.label}>New password</Text>
        <TextInput
          accessibilityLabel="New password"
          accessibilityHint="Enter at least 8 characters for your new password"
          accessibilityState={{ disabled: saving }}
          editable={!saving}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          accessibilityLabel="Confirm new password"
          accessibilityHint="Re-enter your new password to verify"
          accessibilityState={{ disabled: saving }}
          editable={!saving}
          autoComplete="new-password"
          placeholder="Re-enter new password"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          value={confirmation}
          onChangeText={setConfirmation}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, busy: saving }}
          disabled={saving}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.button, pressed && styles.pressed, saving && styles.disabled]}
        >
          {saving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.buttonText}>Reset password</Text>}
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityHint="Navigates back to the sign in screen"
          onPress={() => {
            triggerSelectionHaptic()
            router.replace('/signin')
          }}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>Return to sign in</Text>
        </Pressable>
      </View>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background, justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 10 },
  eyebrow: { ...typography.overline, color: c.brand },
  title: { ...typography.display, color: c.text },
  body: { ...typography.body, color: c.textMuted, marginBottom: 12 },
  label: { ...typography.label, color: c.text },
  input: { ...typography.body, minHeight: 48, color: c.text, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 14 },
  error: { ...typography.bodySmall, color: c.danger, backgroundColor: c.dangerSoft, padding: 12 },
  button: { minHeight: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand, marginTop: 8 },
  buttonText: { ...typography.label, color: c.onBrand },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  secondaryButtonText: { ...typography.bodySmall, color: c.textMuted },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
})

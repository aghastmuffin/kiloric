import { CongressionalNote } from '@/components/onboarding/ResidencyNotices'
import { AppScreenHeader } from '@/components/ui/AppScreenHeader'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRef } from 'react'
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const contributors = [
  ['FOUNDATION', 'React Native & Expo Community'],
  ['COMMUNITY', 'Open Source Contributors'],
  ['WITH THANKS', 'You, for making time for your health'],
] as const

export default function CreditsScreen() {
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const tapCountRef = useRef(0)

  const triggerEasterEgg = () => {
    fetch('https://hackatime.hackclub.com/api/v1/users/levitkbr/project/Sonex')
      .then((response) => response.json())
      .then((data) => {
        const seconds = data.total_seconds || 0
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const message = `Levi spent ${hours} hours and ${minutes} minutes building Sonex. Thank you for checking out kiloric.`
        if (Platform.OS === 'web') alert(message)
        else Alert.alert('Secret unlocked', message)
      })
      .catch((error) => console.warn('Failed to fetch easter egg data:', error))
  }

  const handleAvatarPress = () => {
    tapCountRef.current += 1
    if (tapCountRef.current < 10) return
    tapCountRef.current = 0
    triggerEasterEgg()
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: 20, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <AppScreenHeader
        overline="Credits"
        title="Made with care."
        description="The people and open-source communities behind kiloric."
      />

      <View style={styles.creatorSection}>
        <Pressable
          accessibilityLabel="Creator's avatar"
          accessibilityRole="button"
          accessibilityHint="Tap repeatedly to unlock a secret"
          onPress={handleAvatarPress}
          style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
        >
          <Image
            source={{ uri: 'https://avatars.githubusercontent.com/u/78246775?v=4' }}
            style={styles.avatar}
            contentFit="cover"
          />
        </Pressable>
        <View style={styles.creatorCopy}>
          <Text style={styles.kicker}>CREATOR & DESIGN</Text>
          <Text accessibilityRole="header" style={styles.creatorName}>Levi Brown</Text>
          <Text style={styles.creatorEmail}>levi@kiloric.co</Text>
        </View>
      </View>

      <View style={styles.ledger}>
        {contributors.map(([label, value]) => (
          <View key={label} style={styles.ledgerRow}>
            <Text style={styles.ledgerLabel}>{label}</Text>
            <Text style={styles.ledgerValue}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.note}>
        <Ionicons name="leaf-outline" size={22} color={colors.brand} />
        <Text style={styles.noteText}>
          Built with Expo, React Native, FastAPI, SQLAlchemy, and the generosity of open-source maintainers.
        </Text>
      </View>

      <CongressionalNote />
    </ScrollView>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 24, gap: 32 },
  creatorSection: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingVertical: 22, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.borderStrong },
  avatarButton: { width: 112, height: 112, borderRadius: 56, padding: 4, borderWidth: 1, borderColor: c.brand },
  avatar: { width: '100%', height: '100%', borderRadius: 52 },
  creatorCopy: { flex: 1, minWidth: 0 },
  kicker: { ...typography.overline, color: c.brand, marginBottom: 5 },
  creatorName: { ...typography.headlineLarge, color: c.text },
  creatorEmail: { ...typography.body, color: c.textMuted, marginTop: 3 },
  ledger: { borderTopWidth: 1, borderTopColor: c.borderStrong },
  ledgerRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  ledgerLabel: { ...typography.overline, color: c.textMuted, width: 112 },
  ledgerValue: { ...typography.bodyLarge, color: c.text, flex: 1 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 18, backgroundColor: c.brandSoft, borderLeftWidth: 3, borderLeftColor: c.brand },
  noteText: { ...typography.body, color: c.textMuted, flex: 1 },
  pressed: { opacity: 0.76 },
})

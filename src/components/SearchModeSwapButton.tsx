import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Platform, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Typical tab bar height above the home-indicator safe area. */
const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 56, default: 56 }) ?? 56

type SearchScreen = 'scan' | 'text_query'

const SWAP_CONFIG: Record<
    SearchScreen,
    { target: SearchScreen; icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  scan: {
    target: 'text_query',
    icon: 'search-outline',
    label: 'Switch to text search',
  },
  text_query: {
    target: 'scan',
    icon: 'camera-outline',
    label: 'Switch to camera scan',
  },
}

type Props = {
  current: SearchScreen
}

export function SearchModeSwapButton({ current }: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const { target, icon, label } = SWAP_CONFIG[current]
  const bottomOffset =  insets.bottom + 18 //match right offset

  return (
      <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => router.push(`/(tabs)/${target}`)}
          style={({ pressed }) => [
            styles.button,
            { bottom: bottomOffset },
            pressed && styles.buttonPressed,
          ]}
      >
        <Ionicons name={icon} size={26} color={colors.accent} />
      </Pressable>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  button: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
})

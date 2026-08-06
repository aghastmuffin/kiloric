import type { ThemeColors } from '@/lib/theme/tokens'
import { Platform, StyleSheet } from 'react-native'

export const makeAppStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: c.background,
      gap: 16,
    },
    verticallySpaced: {
      paddingTop: 6,
      paddingBottom: 6,
      alignSelf: 'stretch',
    },
    mt20: {
      marginTop: 20,
    },
    label: {
      color: c.text,
      marginBottom: 6,
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    input: {
      backgroundColor: c.surfaceAlt,
      color: c.text,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
      fontSize: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    inputDisabled: {
      opacity: 0.6,
    },
    button: {
      backgroundColor: c.accent,
      borderRadius: 24,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: c.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: c.onAccent,
      fontWeight: '700',
      fontSize: 16,
      letterSpacing: 0.3,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: c.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    cardTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: '700',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginVertical: 16,
    },
    badge: {
      backgroundColor: c.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    badgeText: {
      color: c.accent,
      fontSize: 12,
      fontWeight: '700',
    },
  })

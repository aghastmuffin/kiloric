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
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    inputDisabled: {
      opacity: 0.6,
    },
    button: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
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
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
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
      marginBottom: 8,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginVertical: 12,
    },
    badge: {
      backgroundColor: c.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeText: {
      color: c.accent,
      fontSize: 12,
      fontWeight: '700',
    },
  })

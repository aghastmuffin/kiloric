import type { ThemeColors } from '@/lib/theme/tokens'
import { StyleSheet } from 'react-native'

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
      borderRadius: 4,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      borderWidth: 0,
    },
    inputDisabled: {
      opacity: 0.6,
    },
    button: {
      backgroundColor: c.accent,
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    buttonText: {
      color: c.onAccent,
      fontWeight: '600',
      fontSize: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 4,
      padding: 20,
      borderWidth: 1,
      borderColor: c.border,
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
      borderRadius: 4,
    },
    badgeText: {
      color: c.accent,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
  })
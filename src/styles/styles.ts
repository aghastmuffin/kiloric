import type { ThemeColors } from '@/lib/theme/tokens'
import { StyleSheet } from 'react-native'

export const makeAppStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
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
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: 6,
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
      backgroundColor: c.brand,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    buttonText: {
      color: c.onBrand,
      fontWeight: '600',
      fontSize: 11,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 8,
      padding: 18,
      borderWidth: StyleSheet.hairlineWidth,
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
      backgroundColor: c.brandSoft,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
    },
    badgeText: {
      color: c.brand,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
  })

import {
  CONGRESSIONAL_CHALLENGE_MESSAGE,
  CONGRESSIONAL_MAILTO,
  H_PYLORI_WARNING,
  RESIDENCY_BAR_MESSAGE,
} from '@/lib/residency'
import type { ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'

const MAILTO_MARKER = CONGRESSIONAL_MAILTO

export function ResidencyBarNotice() {
  const styles = useThemedStyles(makeStyles)
  return (
    <View accessibilityRole="alert" testID="residency-bar" style={styles.alert}>
      <Text style={styles.alertTitle}>kiloric is unavailable in your country of residence</Text>
      <Text style={styles.alertText}>{RESIDENCY_BAR_MESSAGE}</Text>
    </View>
  )
}

export function HPyloriWarning() {
  const styles = useThemedStyles(makeStyles)
  return (
    <View accessibilityRole="alert" testID="h-pylori-warning" style={styles.alert}>
      <Text style={styles.alertTitle}>Health note</Text>
      <Text style={styles.alertText}>{H_PYLORI_WARNING}</Text>
      <Text style={styles.alertText}>
        This is an educational notice, not medical advice. H. pylori bacterial infections are common across East Asian populations and are a leading cause of peptic ulcers and gastric cancers. Consult a physician for screening if you experience persistent stomach pain or digestive issues.
      </Text>
    </View>
  )
}

export function CongressionalNote() {
  const styles = useThemedStyles(makeStyles)
  const [before, after] = CONGRESSIONAL_CHALLENGE_MESSAGE.split(MAILTO_MARKER)

  return (
    <View testID="congressional-note" style={styles.note}>
      <Text style={styles.noteTitle}>Congressional App Challenge</Text>
      <Text style={styles.noteText}>
        {before}
        <Text
          accessibilityRole="link"
          style={styles.link}
          onPress={() => {
            void Linking.openURL(CONGRESSIONAL_MAILTO)
          }}
        >
          {MAILTO_MARKER}
        </Text>
        {after}
      </Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Email admin@taeson.co"
        onPress={() => {
          void Linking.openURL(CONGRESSIONAL_MAILTO)
        }}
        style={({ pressed }) => [styles.linkButton, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.link}>Email admin@taeson.co</Text>
      </Pressable>
    </View>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    alert: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger,
      borderWidth: 1,
      borderRadius: 8,
      padding: 14,
      marginTop: 8,
      marginBottom: 16,
    },
    alertTitle: {
      ...typography.label,
      color: colors.danger,
      marginBottom: 6,
    },
    alertText: {
      ...typography.bodySmall,
      color: colors.danger,
    },
    note: {
      paddingVertical: 4,
      paddingLeft: 16,
      marginTop: 8,
      marginBottom: 16,
      borderLeftWidth: 2,
      borderLeftColor: colors.accent,
    },
    noteTitle: {
      ...typography.overline,
      color: colors.accent,
      marginBottom: 6,
    },
    noteText: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    link: {
      ...typography.labelSmall,
      color: colors.accent,
    },
    linkButton: {
      alignSelf: 'flex-start',
      minHeight: 44,
      justifyContent: 'center',
      marginTop: 4,
    },
  })

import { usePalette } from '@/lib/theme/palette'
import { Ionicons } from '@expo/vector-icons'
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Txt } from './Txt'
import { UButton } from './UButton'

export type ShellInfo = {
  /** Wide (desktop/tablet web) layout with the sidebar instead of the bottom tab bar. */
  wide: boolean
  /** Space reserved at the bottom for the floating tab bar. */
  bottomClearance: number
}

export const ShellContext = createContext<ShellInfo>({ wide: false, bottomClearance: 0 })

export function useShell(): ShellInfo {
  return useContext(ShellContext)
}

export const WIDE_BREAKPOINT = 960

export function ScreenScroll({
  children,
  maxWidth,
  refreshing,
  onRefresh,
  footer,
  contentStyle,
  testID,
}: {
  children: ReactNode
  maxWidth?: number
  refreshing?: boolean
  onRefresh?: () => void
  /** Pinned content rendered above the tab bar (e.g. a primary action). */
  footer?: ReactNode
  contentStyle?: StyleProp<ViewStyle>
  testID?: string
}) {
  const c = usePalette()
  const insets = useSafeAreaInsets()
  const { wide, bottomClearance } = useShell()
  const width = maxWidth ?? (wide ? 1180 : 560)
  return (
    <View style={[styles.root, { backgroundColor: c.bg }]} testID={testID}>
      <ScrollView
        style={styles.root}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (wide ? 36 : 22),
            paddingBottom: bottomClearance + (footer ? 96 : 28),
            paddingHorizontal: wide ? 36 : 20,
          },
        ]}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} /> : undefined
        }
      >
        <View style={[styles.inner, { maxWidth: width }, contentStyle]}>{children}</View>
      </ScrollView>
      {footer ? (
        <View
          pointerEvents="box-none"
          style={[styles.footer, { bottom: bottomClearance + 12, paddingHorizontal: wide ? 36 : 20 }]}
        >
          <View style={[styles.inner, { maxWidth: width }]}>{footer}</View>
        </View>
      ) : null}
    </View>
  )
}

export function ScreenHeader({
  overline,
  title,
  right,
}: {
  overline?: string
  title: string
  right?: ReactNode
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {overline ? (
          <Txt variant="label" tone="muted">
            {overline}
          </Txt>
        ) : null}
        <Txt variant="display" accessibilityRole="header" numberOfLines={2}>
          {title}
        </Txt>
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  )
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Txt variant="heading" accessibilityRole="header">
        {title}
      </Txt>
      {right}
    </View>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  compact,
}: {
  icon: ComponentProps<typeof Ionicons>['name']
  title: string
  body?: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
}) {
  const c = usePalette()
  return (
    <View style={[styles.empty, compact && styles.emptyCompact]}>
      <View style={[styles.emptyIcon, { backgroundColor: c.mint }]}>
        <Ionicons name={icon} size={22} color={c.mintInk} />
      </View>
      <Txt variant="subheading" align="center">
        {title}
      </Txt>
      {body ? (
        <Txt variant="caption" tone="muted" align="center">
          {body}
        </Txt>
      ) : null}
      {actionLabel && onAction ? <UButton label={actionLabel} onPress={onAction} tone="mint" size="sm" /> : null}
    </View>
  )
}

export function LoadingBlock() {
  const c = usePalette()
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={c.primary} />
    </View>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const c = usePalette()
  return (
    <View style={[styles.error, { backgroundColor: c.dangerSoft }]} accessibilityRole="alert">
      <Txt variant="caption" color={c.danger} style={{ flex: 1 }}>
        {message}
      </Txt>
      {onRetry ? <UButton label="Retry" onPress={onRetry} tone="card" size="sm" /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { alignItems: 'center', flexGrow: 1 },
  inner: { width: '100%', gap: 16 },
  footer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  headerText: { flex: 1, gap: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 2 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 12 },
  emptyCompact: { paddingVertical: 12 },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  loading: { paddingVertical: 48, alignItems: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14 },
})

import { FEATURES } from '@/lib/features'
import { Redirect } from 'expo-router'
import {
  Card,
  Divider,
  EmptyState,
  ErrorNote,
  IconButton,
  LoadingBlock,
  ProgressRing,
  ScreenHeader,
  ScreenScroll,
  Txt,
  UButton,
} from '@/components/ds'
import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import { loadProfileSummary, type ProfileSummary } from '@/lib/data/overview'
import { useFocusLoader } from '@/lib/data/useLoader'
import { triggerNotificationHaptic, triggerSelectionHaptic } from '@/lib/haptics'
import { fonts, usePalette } from '@/lib/theme/palette'
import { flOzToMl, formatFluid, mlToFlOz } from '@/lib/units'
import { addWaterEntry, deleteWaterEntry, listWaterEntries, totalWaterMl, type WaterDocument } from '@/lib/water'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Fragment, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

function formatLogTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return 'Today'
  }
}

function WaterScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const c = usePalette()
  const userId = user?.$id ?? null

  const [customInput, setCustomInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const state = useFocusLoader<{ entries: WaterDocument[]; summary: ProfileSummary }>(async () => {
    if (!userId) return { entries: [], summary: await loadProfileSummary('') }
    const [entries, summary] = await Promise.all([
      listWaterEntries(userId),
      loadProfileSummary(userId, user?.name),
    ])
    return { entries, summary }
  }, userId)

  const entries = state.data?.entries ?? []
  const summary = state.data?.summary
  const units = summary?.units ?? 'metric'
  const targetMl = summary?.targets.fluidMl && summary.targets.fluidMl > 0 ? summary.targets.fluidMl : 2500
  const totalMl = totalWaterMl(entries)
  const isImperial = units === 'imperial'

  const presets = isImperial
    ? [
        { label: '+8 oz', amountMl: flOzToMl(8) },
        { label: '+12 oz', amountMl: flOzToMl(12) },
        { label: '+16 oz', amountMl: flOzToMl(16) },
        { label: '+24 oz', amountMl: flOzToMl(24) },
      ]
    : [
        { label: '+250 ml', amountMl: 250 },
        { label: '+350 ml', amountMl: 350 },
        { label: '+500 ml', amountMl: 500 },
        { label: '+750 ml', amountMl: 750 },
      ]

  async function handleAdd(amountMl: number) {
    if (!userId || submitting) return
    triggerSelectionHaptic()
    setSubmitting(true)
    try {
      await addWaterEntry(userId, amountMl)
      triggerNotificationHaptic('success')
      await state.reload()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCustomSubmit() {
    if (!userId || submitting) return
    const parsed = Number.parseFloat(customInput.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) return

    const amountMl = isImperial ? flOzToMl(parsed) : Math.round(parsed)
    if (amountMl < 25 || amountMl > 4000) {
      showApiError(new Error('Water amount must be between 25 ml (~1 oz) and 4000 ml (~135 oz).'), 'appwrite')
      return
    }

    triggerSelectionHaptic()
    setSubmitting(true)
    try {
      await addWaterEntry(userId, amountMl)
      triggerNotificationHaptic('success')
      setCustomInput('')
      await state.reload()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(documentId: string) {
    if (!userId || submitting) return
    triggerSelectionHaptic()
    setSubmitting(true)
    try {
      await deleteWaterEntry(userId, documentId)
      await state.reload()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setSubmitting(false)
    }
  }

  const progress = Math.min(1.5, Math.max(0, totalMl / targetMl))
  const displayTotal = isImperial ? mlToFlOz(totalMl) : totalMl
  const displayTarget = isImperial ? mlToFlOz(targetMl) : targetMl
  const unitLabel = isImperial ? 'fl oz' : 'ml'

  return (
    <ScreenScroll refreshing={state.loading} onRefresh={state.reload} maxWidth={640}>
      <ScreenHeader
        overline="Today"
        title="Hydration"
        right={
          router.canGoBack() ? (
            <IconButton icon="close" accessibilityLabel="Close hydration screen" onPress={() => router.back()} />
          ) : null
        }
      />

      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}

      {!state.data && state.loading ? (
        <LoadingBlock />
      ) : (
        <>
          <Card style={styles.mainCard} testID="water-overview-card">
            <View style={styles.ringRow}>
              <ProgressRing
                progress={progress}
                size={140}
                stroke={14}
                color={c.protein}
                accessibilityLabel={`${formatFluid(units, totalMl)} of ${formatFluid(units, targetMl)} drank today`}
              >
                <Text style={[styles.ringValue, { color: c.ink }]}>{displayTotal}</Text>
                <Text style={[styles.ringLabel, { color: c.inkMuted }]}>
                  / {displayTarget} {unitLabel}
                </Text>
              </ProgressRing>

              <View style={styles.ringInfo}>
                <Txt variant="subheading" color={c.ink}>
                  Daily Target
                </Txt>
                <Txt variant="caption" tone="muted">
                  {formatFluid(units, targetMl)} recommended based on your activity and goals.
                </Txt>
                <Txt variant="caption" color={c.protein} style={styles.pctLabel}>
                  {Math.round((totalMl / targetMl) * 100)}% completed
                </Txt>
              </View>
            </View>

            <View style={styles.dividerSpacing}>
              <Divider />
            </View>

            <Txt variant="label" tone="muted" style={styles.sectionHeading}>
              Quick Add
            </Txt>
            <View style={styles.presetsGrid}>
              {presets.map((preset) => (
                <Pressable
                  key={preset.label}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${preset.label} water`}
                  accessibilityHint="Logs water for today"
                  accessibilityState={{ disabled: submitting }}
                  disabled={submitting}
                  onPress={() => void handleAdd(preset.amountMl)}
                  style={({ pressed }) => [
                    styles.presetTile,
                    { backgroundColor: c.proteinSoft, opacity: pressed || submitting ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons name="water" size={18} color={c.protein} />
                  <Text style={[styles.presetTileText, { color: c.protein }]}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.dividerSpacing}>
              <Divider />
            </View>

            <Txt variant="label" tone="muted" style={styles.sectionHeading}>
              Custom Amount ({unitLabel})
            </Txt>
            <View style={styles.customRow}>
              <TextInput
                value={customInput}
                onChangeText={setCustomInput}
                placeholder={`Amount in ${unitLabel}`}
                placeholderTextColor={c.inkMuted}
                keyboardType="decimal-pad"
                maxLength={6}
                editable={!submitting}
                accessibilityLabel={`Custom water amount in ${unitLabel}`}
                style={[styles.customInput, { color: c.ink, borderColor: c.line, backgroundColor: c.card }]}
              />
              <UButton
                label={submitting ? 'Saving…' : 'Log Water'}
                size="sm"
                disabled={!customInput.trim() || submitting}
                onPress={() => void handleCustomSubmit()}
                testID="log-custom-water"
              />
            </View>
          </Card>

          <Txt variant="subheading" style={styles.historyHeader}>
            Today&apos;s Logs ({entries.length})
          </Txt>

          <Card padded={false} style={styles.historyCard} testID="water-history-list">
            {entries.length === 0 ? (
              <EmptyState
                icon="water-outline"
                title="No water logged today"
                body="Use the quick add options or custom input above to log water."
              />
            ) : (
              entries.map((entry, index) => (
                <Fragment key={entry.$id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.historyRow}>
                    <View style={styles.historyIconBox}>
                      <Ionicons name="water" size={20} color={c.protein} />
                    </View>
                    <View style={styles.historyTextGroup}>
                      <Txt variant="bodyStrong">{formatFluid(units, entry.amount_ml)}</Txt>
                      <Txt variant="caption" tone="muted">
                        {formatLogTime(entry.consumed_at)}
                      </Txt>
                    </View>
                    <IconButton
                      icon="trash-outline"
                      tone="chip"
                      size={36}
                      accessibilityLabel={`Delete water log of ${formatFluid(units, entry.amount_ml)}`}
                      onPress={() => {
                        if (!submitting) void handleDelete(entry.$id)
                      }}
                    />
                  </View>
                </Fragment>
              ))
            )}
          </Card>
        </>
      )}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  mainCard: { gap: 12 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ringValue: { fontFamily: fonts.heavy, fontSize: 26, letterSpacing: -0.5 },
  ringLabel: { fontFamily: fonts.medium, fontSize: 13 },
  ringInfo: { flex: 1, gap: 4 },
  pctLabel: { fontFamily: fonts.bold, fontSize: 14, marginTop: 4 },
  dividerSpacing: { marginVertical: 8 },
  sectionHeading: { marginBottom: 4 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  presetTileText: { fontFamily: fonts.bold, fontSize: 14 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  customInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  historyHeader: { marginTop: 12, marginBottom: 8 },
  historyCard: { paddingHorizontal: 16, paddingVertical: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  historyIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  historyTextGroup: { flex: 1, gap: 2 },
})

// Water logging is not shipped yet; keep the route inaccessible.
export default function WaterRoute() {
  if (!FEATURES.water) return <Redirect href="/" />
  return <WaterScreen />
}

import { CaloriesWeekCard, WeightCard } from '@/components/cards/ProgressCards'
import {
  Card,
  ErrorNote,
  Field,
  LoadingBlock,
  parseDecimal,
  ScreenHeader,
  ScreenScroll,
  Segmented,
  Txt,
  UButton,
  useShell,
} from '@/components/ds'
import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import { shortMonthDay } from '@/lib/data/dateKeys'
import { formatKcal } from '@/lib/data/foodItem'
import { displayWeight, loadProgress, weightUnitLabel, type ProgressRange } from '@/lib/data/overview'
import { useFocusLoader } from '@/lib/data/useLoader'
import { logWeight } from '@/lib/data/weight'
import { lbsToKg } from '@/lib/units'
import { fonts, usePalette } from '@/lib/theme/palette'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

const RANGES = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: '3 months' },
  { value: 'year', label: 'Year' },
] as const

function StatCard({ label, value, unit, detail }: { label: string; value: string; unit?: string; detail?: string }) {
  const c = usePalette()
  return (
    <Card style={styles.stat}>
      <Txt variant="caption" tone="muted">
        {label}
      </Txt>
      <View style={styles.statValue}>
        <Text style={[styles.statNumber, { color: c.ink }]}>{value}</Text>
        {unit ? (
          <Txt variant="label" tone="muted">
            {unit}
          </Txt>
        ) : null}
      </View>
      {detail ? (
        <Txt variant="caption" tone="muted">
          {detail}
        </Txt>
      ) : null}
    </Card>
  )
}

export default function ProgressScreen() {
  const { user } = useAuth()
  const { wide } = useShell()
  const userId = user?.$id ?? null
  const [range, setRange] = useState<ProgressRange>('month')
  const [logOpen, setLogOpen] = useState(false)
  const [weightText, setWeightText] = useState('')
  const [saving, setSaving] = useState(false)

  const state = useFocusLoader(() => loadProgress(userId!, range, user?.name), userId ? `${userId}:${range}` : null)
  const data = state.data
  const units = data?.summary.units ?? 'metric'
  const unit = weightUnitLabel(units)
  const goal = data?.summary.goal
  const goalLine =
    goal?.targetWeightKg != null
      ? `Goal: ${displayWeight(goal.targetWeightKg, units)} ${unit}${goal.targetDate ? ` by ${shortMonthDay(goal.targetDate)}` : ''}`
      : 'Set a goal weight in your profile'

  async function saveWeight() {
    if (!userId) return
    const value = parseDecimal(weightText)
    if (value == null) return
    setSaving(true)
    try {
      await logWeight(userId, units === 'imperial' ? lbsToKg(value) : value)
      setLogOpen(false)
      setWeightText('')
      await state.reload()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setSaving(false)
    }
  }

  const logAction = <UButton label="Log weight" tone="mint" size="sm" onPress={() => setLogOpen(true)} testID="log-weight" />

  const weightCard = data ? (
    <WeightCard
      weights={data.weights}
      units={units}
      fallbackKg={data.summary.currentWeightKg}
      range={range}
      overline={`Weight · ${RANGES.find((option) => option.value === range)?.label.toLowerCase()}`}
      action={logOpen ? undefined : logAction}
    />
  ) : null

  const logPanel = logOpen ? (
    <Card style={styles.logPanel} testID="weight-form">
      <Field
        label="Today’s weight"
        placeholder={data?.summary.currentWeightKg ? String(displayWeight(data.summary.currentWeightKg, units)) : undefined}
        keyboardType="decimal-pad"
        suffix={unit}
        onChangeText={setWeightText}
        testID="weight-input"
      />
      <View style={styles.logActions}>
        <UButton label="Cancel" tone="chip" size="sm" onPress={() => setLogOpen(false)} />
        <UButton label={saving ? 'Saving…' : 'Save'} size="sm" disabled={saving || parseDecimal(weightText) == null} onPress={saveWeight} testID="weight-save" />
      </View>
    </Card>
  ) : null

  const avg = data?.avgIntake
  const target = data?.summary.targets.kcal ?? 0
  const stats = data ? (
    <View style={styles.stats}>
      <StatCard
        label="Avg intake"
        value={avg != null ? formatKcal(avg) : '—'}
        unit={avg != null ? 'kcal/day' : undefined}
        detail={avg != null && target > 0 ? `${avg <= target ? formatKcal(target - avg) + ' under' : formatKcal(avg - target) + ' over'} goal` : 'Log meals to see your average'}
      />
      <StatCard
        label="Workouts"
        value={`${data.workoutsDone}`}
        unit={`of ${data.workoutsPlanned}`}
        detail="this week"
      />
    </View>
  ) : null

  return (
    <ScreenScroll refreshing={state.loading} onRefresh={state.reload} maxWidth={wide ? 1040 : undefined}>
      <ScreenHeader overline={goalLine} title="Progress" />
      <Segmented options={RANGES} value={range} onChange={setRange} testID="progress-range" />
      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}
      {!data ? (
        <LoadingBlock />
      ) : wide ? (
        <View style={styles.wideRow}>
          <View style={styles.wideCol}>
            {weightCard}
            {logPanel}
          </View>
          <View style={styles.wideCol}>
            {stats}
            <CaloriesWeekCard bars={data.bars} goal={target} initials={false} />
          </View>
        </View>
      ) : (
        <>
          {weightCard}
          {logPanel}
          {stats}
          <CaloriesWeekCard bars={data.bars} goal={target} />
        </>
      )}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 4 },
  statValue: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  statNumber: { fontFamily: fonts.heavy, fontSize: 28, letterSpacing: -0.8 },
  logPanel: { gap: 12 },
  logActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  wideRow: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  wideCol: { flex: 1, gap: 16 },
})

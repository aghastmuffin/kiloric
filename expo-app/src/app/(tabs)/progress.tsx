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
import { displayWeight, loadProgress, weightUnitLabel, type ProgressData, type ProgressRange } from '@/lib/data/overview'
import { applyMaintenanceEstimate, targetsFromTdee } from '@/lib/data/targets'
import { useFocusLoader } from '@/lib/data/useLoader'
import { logWeight } from '@/lib/data/weight'
import { kgPerWeekToLbsPerWeek, lbsToKg } from '@/lib/units'
import { ADAPTIVE_MIN_LOGGED_DAYS, ADAPTIVE_MIN_WEIGH_INS } from '@/lib/weightTrend'
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

/** Below this gap the formula and the data agree closely enough that retargeting is noise. */
const RETARGET_MIN_DIFF_KCAL = 100
const RETARGET_MIN_CONFIDENCE = 0.5

function MaintenanceCard({ data, onApply, applying }: { data: ProgressData; onApply: (tdee: number) => void; applying: boolean }) {
  const c = usePalette()
  const { adaptive, adaptiveInputs, summary } = data
  const formula = summary.plan.tdee
  if (!adaptive) {
    const daysLeft = Math.max(0, ADAPTIVE_MIN_LOGGED_DAYS - adaptiveInputs.loggedDays)
    const weighInsLeft = Math.max(0, ADAPTIVE_MIN_WEIGH_INS - adaptiveInputs.weighIns)
    const needs = [
      daysLeft > 0 ? `${daysLeft} more logged day${daysLeft === 1 ? '' : 's'}` : null,
      weighInsLeft > 0 ? `${weighInsLeft} more weigh-in${weighInsLeft === 1 ? '' : 's'}` : null,
    ].filter(Boolean)
    return (
      <Card style={styles.maintenance} testID="maintenance-card">
        <Txt variant="caption" tone="muted">
          Maintenance estimate
        </Txt>
        <View style={styles.statValue}>
          <Text style={[styles.statNumber, { color: c.ink }]}>{formula ? formatKcal(formula) : '—'}</Text>
          {formula ? (
            <Txt variant="label" tone="muted">
              kcal/day
            </Txt>
          ) : null}
        </View>
        <Txt variant="caption" tone="muted">
          {needs.length > 0
            ? `From your profile for now. ${needs.join(' and ')} over two weeks will personalise it from your own logs.`
            : 'From your profile for now. Keep weighing in across two weeks to personalise it.'}
        </Txt>
      </Card>
    )
  }
  const units = summary.units
  const weekly = units === 'imperial' ? `${kgPerWeekToLbsPerWeek(adaptive.weeklyChangeKg)} lb` : `${adaptive.weeklyChangeKg} kg`
  const next = targetsFromTdee(summary, adaptive.tdee)
  const canApply =
    adaptive.confidence >= RETARGET_MIN_CONFIDENCE &&
    Math.abs(next.targetKcal - summary.targets.kcal) >= RETARGET_MIN_DIFF_KCAL
  return (
    <Card style={styles.maintenance} testID="maintenance-card">
      <Txt variant="caption" tone="muted">
        Maintenance estimate · from your data
      </Txt>
      <View style={styles.statValue}>
        <Text style={[styles.statNumber, { color: c.ink }]}>{formatKcal(adaptive.tdee)}</Text>
        <Txt variant="label" tone="muted">
          kcal/day
        </Txt>
      </View>
      <Txt variant="caption" tone="muted">
        {adaptive.loggedDays} logged days, trend {adaptive.weeklyChangeKg > 0 ? '+' : ''}
        {weekly}/week. Profile estimate {formatKcal(adaptive.formulaTdee)} · {Math.round(adaptive.confidence * 100)}% from your logs.
      </Txt>
      {canApply ? (
        <UButton
          label={applying ? 'Updating…' : `Use it · goal becomes ${formatKcal(next.targetKcal)} kcal`}
          tone="mint"
          size="sm"
          disabled={applying}
          onPress={() => onApply(adaptive.tdee)}
          testID="apply-maintenance"
        />
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
  const [applying, setApplying] = useState(false)

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

  async function applyEstimate(tdee: number) {
    if (!userId || !data) return
    setApplying(true)
    try {
      await applyMaintenanceEstimate(userId, data.summary, tdee)
      await state.reload()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setApplying(false)
    }
  }

  const logAction = <UButton label="Log weight" tone="mint" size="sm" onPress={() => setLogOpen(true)} testID="log-weight" />

  const weightCard = data ? (
    <WeightCard
      weights={data.weights}
      trend={data.trend}
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
            <MaintenanceCard data={data} onApply={applyEstimate} applying={applying} />
            <CaloriesWeekCard bars={data.bars} goal={target} initials={false} />
          </View>
        </View>
      ) : (
        <>
          {weightCard}
          {logPanel}
          {stats}
          <MaintenanceCard data={data} onApply={applyEstimate} applying={applying} />
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
  maintenance: { gap: 6 },
  logActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  wideRow: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  wideCol: { flex: 1, gap: 16 },
})

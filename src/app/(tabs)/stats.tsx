import { useAuth } from '@/lib/AuthContext';
import { AppScreenHeader } from '@/components/ui/AppScreenHeader';
import { resolveGoalState } from '@/lib/goals';
import { calculateEnergyTrend } from '@/lib/nutritionTrends';
import { getTodayMeals, listHistoricMeals, type MealDocument } from '@/lib/meals';
import { getProfile, type ProfileDocument } from '@/lib/profile';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAppLayout } from '@/lib/theme/layout';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import {
    formatWeightImperial,
    formatWeightMetric,
    parseDisplayUnitsPreference,
} from '@/lib/units';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, memo, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Period = 'week' | 'month'
type StatsData = {
  meals: MealDocument[]
  profile: ProfileDocument | null
}
type DayTotal = {
  key: string
  date: Date
  kcal: number
  hasLog: boolean
  fullDateLabel: string
  axisLabel: string
}

const EMPTY_DATA: StatsData = { meals: [], profile: null }
const CHART_HEIGHT = 174

// Fast zero-padded YYYY-MM-DD date key formatting without String().padStart allocations
function dayKey(date: Date): string {
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${date.getFullYear()}-${m < 10 ? '0' : ''}${m}-${d < 10 ? '0' : ''}${d}`
}

function makeDays(
  totals: Map<string, { kcal: number; hasLog: boolean }>,
  period: Period,
): DayTotal[] {
  const count = period === 'week' ? 7 : 30
  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const todayDate = today.getDate()

  const days = new Array<DayTotal>(count)
  for (let index = 0; index < count; index++) {
    const date = new Date(todayYear, todayMonth, todayDate - (count - 1 - index))
    const key = dayKey(date)
    const total = totals.get(key)
    days[index] = {
      key,
      date,
      kcal: total?.kcal ?? 0,
      hasLog: total?.hasLog ?? false,
      fullDateLabel: date.toLocaleDateString(),
      axisLabel: period === 'week'
        ? date.toLocaleDateString(undefined, { weekday: 'short' })
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }
  }
  return days
}

function getInsight(days: DayTotal[], goal: number | null): { title: string; body: string } {
  const logged = days.filter((day) => day.hasLog)
  if (logged.length === 0) {
    return {
      title: 'Start with one honest log',
      body: 'There is not enough meal data for a pattern yet. Logging a full day will make this view useful.',
    }
  }

  if (!goal) {
    return {
      title: logged.length >= days.length * 0.7 ? 'Your logging rhythm is taking shape' : 'Build a steadier baseline',
      body: `You logged meals on ${logged.length} of ${days.length} days. Set an energy goal to add goal-based guidance.`,
    }
  }

  const average = logged.reduce((sum, day) => sum + day.kcal, 0) / logged.length
  const onTarget = logged.filter((day) => Math.abs(day.kcal - goal) <= goal * 0.15).length
  if (onTarget >= Math.max(2, logged.length * 0.7)) {
    return {
      title: 'Your energy intake looks steady',
      body: `${onTarget} of ${logged.length} logged days landed within 15% of your daily goal. Keep the routine repeatable.`,
    }
  }
  if (average > goal * 1.15) {
    return {
      title: 'Logged days are trending above goal',
      body: `Your logged-day average is ${Math.round(average - goal)} kcal above goal. Look for the meals driving the gap.`,
    }
  }
  if (average < goal * 0.85) {
    return {
      title: 'Logged days are landing below goal',
      body: `Your logged-day average is ${Math.round(goal - average)} kcal below goal. Check that your logs are complete before adjusting intake.`,
    }
  }
  return {
    title: 'The average is close; the days vary',
    body: `Your logged-day average is within 15% of goal, with ${onTarget} individual days in range. Aim for a more even rhythm.`,
  }
}

function PeriodToggle({
  period,
  onChange,
}: {
  period: Period
  onChange: (period: Period) => void
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.toggle} accessibilityRole="tablist">
      {(['week', 'month'] as const).map((option) => {
        const selected = option === period
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityLabel={option === 'week' ? 'Show the last 7 days' : 'Show the last 30 days'}
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.toggleButton,
              selected && styles.toggleButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.toggleText, selected && styles.toggleTextSelected]}>
              {option === 'week' ? '7 DAYS' : '30 DAYS'}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// Memoize EnergyChart to prevent expensive chart re-renders when parent state
// (such as reloadKey, error state, or profile snapshots) updates without changing days/goal/period.
const EnergyChart = memo(function EnergyChart({ days, goal, period }: { days: DayTotal[]; goal: number | null; period: Period }) {
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const maxValue = Math.max(goal ?? 0, ...days.map((day) => day.kcal), 1)
  const scaleMax = Math.ceil((maxValue * 1.12) / 100) * 100
  const goalBottom = goal ? Math.min(CHART_HEIGHT - 1, (goal / scaleMax) * CHART_HEIGHT) : 0
  const barWidth = period === 'week' ? 26 : 6
  const axisDays = period === 'week'
    ? days
    : days.filter((_, index) => (
      index === 0
      || index === days.length - 1
      || (index % 7 === 0 && index < days.length - 3)
    ))

  return (
    <View accessibilityLabel={`Recorded energy for the last ${days.length} days`}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={styles.legendSwatch} />
          <Text style={styles.legendText}>RECORDED KCAL</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendMissing} />
          <Text style={styles.legendText}>NO LOG</Text>
        </View>
        {goal ? (
          <View style={styles.legendItem}>
            <View style={styles.legendLine} />
            <Text style={styles.legendText}>DAILY GOAL · {Math.round(goal)}</Text>
          </View>
        ) : (
          <Text style={styles.legendText}>NO ENERGY GOAL SET</Text>
        )}
      </View>
      <View style={styles.chartFrame}>
        <View style={styles.yAxis} importantForAccessibility="no-hide-descendants">
          <Text style={styles.yAxisLabel}>{scaleMax.toLocaleString()}</Text>
          <Text style={styles.yAxisLabel}>{Math.round(scaleMax / 2).toLocaleString()}</Text>
          <Text style={styles.yAxisLabel}>0</Text>
        </View>
        <View style={styles.chartBody}>
          <View style={styles.plotArea}>
            <View style={styles.gridLineTop} />
            <View style={styles.gridLineMiddle} />
            <View style={styles.gridLineBottom} />
            {goal ? (
              <View
                pointerEvents="none"
                style={[styles.goalLine, { bottom: goalBottom, backgroundColor: colors.accent }]}
              />
            ) : null}
            <View style={styles.bars}>
              {days.map((day) => {
                const height = day.hasLog
                  ? Math.max(3, (day.kcal / scaleMax) * CHART_HEIGHT)
                  : 0
                return (
                  <View
                    key={day.key}
                    accessible
                    accessibilityRole="text"
                    accessibilityLabel={day.hasLog
                      ? `${day.fullDateLabel}: ${Math.round(day.kcal)} kilocalories recorded`
                      : `${day.fullDateLabel}: no meals logged`}
                    style={styles.barColumn}
                  >
                    {day.hasLog ? (
                      <View style={[styles.bar, { width: barWidth, height }]} />
                    ) : (
                      <View style={styles.missingDot} />
                    )}
                  </View>
                )
              })}
            </View>
          </View>
          <View style={styles.xAxis} importantForAccessibility="no-hide-descendants">
            {axisDays.map((day, index) => (
              <Text
                key={day.key}
                style={[
                  styles.axisLabel,
                  index === 0 && styles.axisLabelFirst,
                  index === axisDays.length - 1 && styles.axisLabelLast,
                ]}
              >
                {day.axisLabel}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
})

export default function StatsScreen() {
  const { user, loading: authLoading } = useAuth()
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const { gutter } = useAppLayout()
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<StatsData>(EMPTY_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useFocusEffect(
    useCallback(() => {
      void reloadKey
      let active = true
      if (authLoading) return () => { active = false }
      if (!user?.$id) {
        setData(EMPTY_DATA)
        setLoading(false)
        setError(null)
        return () => { active = false }
      }

      setLoading(true)
      setError(null)
      Promise.all([
        getTodayMeals(user.$id),
        listHistoricMeals(user.$id, 100),
        getProfile(user.$id),
      ])
        .then(([today, historic, profile]) => {
          if (active) setData({ meals: [...today, ...historic], profile })
        })
        .catch((loadError: unknown) => {
          console.warn('[Stats] load failed', loadError)
          if (active) setError('We could not load your stats. Check your connection and try again.')
        })
        .finally(() => {
          if (active) setLoading(false)
        })

      return () => { active = false }
    }, [authLoading, reloadKey, user?.$id]),
  )

  const mealTotalsByDay = useMemo(() => {
    const totals = new Map<string, { kcal: number; hasLog: boolean }>()
    for (const meal of data.meals) {
      const date = new Date(meal.$createdAt)
      if (Number.isNaN(date.getTime())) continue
      const key = dayKey(date)
      const previous = totals.get(key) ?? { kcal: 0, hasLog: false }
      totals.set(key, {
        kcal: previous.kcal + (typeof meal.kcal === 'number' ? Math.max(0, meal.kcal) : 0),
        hasLog: true,
      })
    }
    return totals
  }, [data.meals])

  const days = useMemo(
    () => makeDays(mealTotalsByDay, period),
    [mealTotalsByDay, period],
  )
  const goal = data.profile?.target_kcal && data.profile.target_kcal > 0
    ? data.profile.target_kcal
    : null
  const loggedDays = days.filter((day) => day.hasLog).length
  const onTargetDays = goal
    ? days.filter((day) => day.hasLog && Math.abs(day.kcal - goal) <= goal * 0.15).length
    : 0
  const insight = getInsight(days, goal)
  const energyTrend = useMemo(() => calculateEnergyTrend(days), [days])

  const weightSnapshot = useMemo(() => {
    const profile = data.profile
    if (!profile || typeof profile.weight !== 'number') return null
    const goal = resolveGoalState(profile)
    if (!goal) return null
    const units = parseDisplayUnitsPreference(profile.goal_plain, profile.country)
    const format = units === 'imperial' ? formatWeightImperial : formatWeightMetric
    return {
      current: format(profile.weight),
      target: format(goal.targetWeightKg),
    }
  }, [data.profile])

  if (authLoading || loading) {
    return (
      <View
        accessible
        accessibilityLabel="Loading progress report"
        accessibilityState={{ busy: true }}
        style={styles.centered}
      >
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.stateText}>Loading your progress…</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.centered, styles.statePadding]}>
        <Ionicons name="stats-chart-outline" size={36} color={colors.success} />
        <Text accessibilityRole="header" style={styles.stateTitle}>Sign in to see your stats</Text>
        <Text style={styles.stateText}>Your meal history and profile goals will appear here.</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingHorizontal: gutter }]}
      >
        <AppScreenHeader
          title="Your progress"
          description="See how your nutrition changes over time. Days without logs stay separate from zero intake."
        />

        <PeriodToggle period={period} onChange={setPeriod} />

        {error ? (
          <View accessibilityLiveRegion="polite" style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
            <View style={styles.errorCopy}>
              <Text accessibilityRole="header" style={styles.errorTitle}>Stats unavailable</Text>
              <Text style={styles.errorMessage}>{error}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading stats"
              onPress={() => setReloadKey((key) => key + 1)}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>RETRY</Text>
            </Pressable>
          </View>
        ) : data.meals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="leaf-outline" size={30} color={colors.success} />
            <Text accessibilityRole="header" style={styles.stateTitle}>No meal history yet</Text>
            <Text style={styles.stateText}>Log your first meal and your energy pattern will begin here.</Text>
          </View>
        ) : (
          <>
            <View style={styles.reportSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeadingCopy}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>{period === 'week' ? 'Last 7 days' : 'Last 30 days'}</Text>
                </View>
                <Text style={styles.sectionMeta}>Energy</Text>
              </View>
              <View style={styles.metricLedger}>
                <View style={styles.detailMetric}>
                  <Text style={styles.detailValue}>{loggedDays}<Text style={styles.detailSuffix}>/{days.length}</Text></Text>
                  <Text style={styles.metricLabel}>DAYS LOGGED</Text>
                </View>
                <View style={styles.detailMetric}>
                  <Text style={styles.detailValue}>{goal ? onTargetDays : 'N/A'}</Text>
                  <Text style={styles.metricLabel}>IN GOAL RANGE</Text>
                </View>
              </View>
              <Text style={styles.metricCaption}>
                {goal
                  ? 'Recorded days within 15% of your energy goal are shown without grading missed days.'
                  : 'This report shows recorded days only. Set an energy goal to add a goal-range count.'}
              </Text>
              <EnergyChart days={days} goal={goal} period={period} />
            </View>

            <View style={styles.insightSection}>
              <View style={styles.insightCopy}>
                <View style={styles.insightKickerRow}>
                  <Ionicons name="sparkles-outline" size={16} color={colors.brand} />
                  <Text style={styles.sectionKicker}>Summary</Text>
                </View>
                <Text accessibilityRole="header" style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightBody}>{insight.body}</Text>
              </View>
            </View>

            <View style={styles.journalSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeadingCopy}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    {energyTrend.direction === 'insufficient'
                      ? 'More complete days needed'
                      : energyTrend.direction === 'steady'
                        ? 'Energy is holding steady'
                        : `Energy is trending ${energyTrend.direction}`}
                  </Text>
                </View>
                <Ionicons
                  name={energyTrend.direction === 'up' ? 'trending-up' : energyTrend.direction === 'down' ? 'trending-down' : 'remove'}
                  size={24}
                  color={colors.accent}
                />
              </View>
              <Text style={styles.sectionBody}>
                {energyTrend.changeKcal == null
                  ? `Log at least 4 complete days to compare equal time windows. ${energyTrend.loggedDays}/${days.length} days are currently logged.`
                  : `${Math.abs(Math.round(energyTrend.changeKcal))} kcal/day ${energyTrend.direction === 'down' ? 'lower' : energyTrend.direction === 'up' ? 'higher' : 'difference'} between adjacent logged-day windows · ${energyTrend.confidence} confidence from ${energyTrend.loggedDays}/${days.length} logged days.`}
              </Text>
              <Text style={styles.snapshotNote}>
                Missing days are excluded—not counted as zero. This describes recorded intake, not weight change or metabolic adaptation.
              </Text>
            </View>
          </>
        )}

        <View style={styles.journalSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeadingCopy}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Weight</Text>
            </View>
            <Ionicons name="scale-outline" size={22} color={colors.success} />
          </View>
          {error ? (
            <Text style={styles.emptyInline}>Profile data is unavailable until the report can be reloaded.</Text>
          ) : weightSnapshot ? (
            <>
              <View style={styles.weightRow}>
                <View style={styles.weightMetric}>
                  <Text style={styles.weightLabel}>CURRENT WEIGHT</Text>
                  <Text style={styles.weightValue}>{weightSnapshot.current}</Text>
                </View>
                <View style={styles.weightDivider} />
                <View style={styles.weightMetric}>
                  <Text style={styles.weightLabel}>GOAL WEIGHT</Text>
                  <Text style={styles.weightValue}>{weightSnapshot.target ?? 'Not set'}</Text>
                </View>
              </View>
              <Text style={styles.snapshotNote}>
                Current profile values only — no weight trend is inferred.
              </Text>
            </>
          ) : (
            <Text style={styles.emptyInline}>Complete your profile to show a current-weight snapshot and goal.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingBottom: 112,
    gap: 24,
  },
  toggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    width: '100%',
    maxWidth: 280,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderStrong,
  },
  toggleButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  toggleButtonSelected: { borderBottomColor: c.brand, backgroundColor: c.brandSoft },
  toggleText: { ...typography.overline, color: c.textMuted, fontSize: 10 },
  toggleTextSelected: { color: c.brand },
  pressed: { opacity: 0.72 },
  reportSection: {
    gap: 20,
    paddingVertical: 22,
    borderTopWidth: 1,
    borderTopColor: c.borderStrong,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  journalSection: {
    gap: 16,
    paddingTop: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderStrong,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeadingCopy: { flex: 1, minWidth: 0, gap: 3 },
  sectionKicker: { ...typography.overline, color: c.brand, fontSize: 10 },
  sectionTitle: { ...typography.metric, color: c.text },
  sectionMeta: { ...typography.overline, color: c.textFaint, fontSize: 9, textAlign: 'right' },
  sectionBody: { ...typography.body, color: c.textMuted, maxWidth: 580 },
  metricLedger: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  leadMetric: { flexGrow: 1.35, flexBasis: 160, justifyContent: 'flex-end' },
  detailMetric: {
    flexGrow: 1,
    flexBasis: 100,
    justifyContent: 'flex-end',
    paddingLeft: 12,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: c.border,
  },
  metricLabel: { ...typography.overline, color: c.textFaint, fontSize: 9 },
  scoreValue: { ...typography.display, color: c.text, fontSize: 48, lineHeight: 51 },
  scoreSuffix: { ...typography.metric, color: c.brand },
  detailValue: { ...typography.metric, color: c.text },
  detailSuffix: { ...typography.bodyLarge, color: c.textMuted },
  metricCaption: { ...typography.bodySmall, color: c.textMuted, maxWidth: 540 },
  legendRow: {
    minHeight: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 8, height: 8, borderRadius: 2, backgroundColor: c.success },
  legendMissing: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.textFaint },
  legendLine: { width: 14, height: 2, backgroundColor: c.accent },
  legendText: { ...typography.overline, color: c.textMuted, fontSize: 9 },
  chartFrame: { flexDirection: 'row', width: '100%' },
  yAxis: {
    width: 44,
    height: CHART_HEIGHT,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  yAxisLabel: { ...typography.labelTiny, color: c.textFaint, fontSize: 10 },
  chartBody: { flex: 1, minWidth: 0 },
  plotArea: { height: CHART_HEIGHT, position: 'relative' },
  gridLineTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  gridLineMiddle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CHART_HEIGHT / 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  gridLineBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderStrong,
  },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 2, zIndex: 2, opacity: 0.88 },
  bars: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barColumn: {
    flex: 1,
    minWidth: 0,
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    maxWidth: 26,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: c.success,
  },
  missingDot: { width: 4, height: 4, borderRadius: 2, marginBottom: 1, backgroundColor: c.textFaint },
  xAxis: {
    flexDirection: 'row',
    minHeight: 34,
    paddingTop: 8,
  },
  axisLabel: {
    ...typography.labelTiny,
    flex: 1,
    color: c.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  axisLabelFirst: { textAlign: 'left' },
  axisLabelLast: { textAlign: 'right' },
  insightSection: {
    borderLeftWidth: 3,
    borderLeftColor: c.brand,
    paddingLeft: 18,
    paddingVertical: 4,
  },
  insightCopy: { gap: 7, maxWidth: 590 },
  insightKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  insightTitle: { ...typography.metric, color: c.text },
  insightBody: { ...typography.body, color: c.textMuted, maxWidth: 560 },
  weightRow: { flexDirection: 'row', alignItems: 'stretch' },
  weightMetric: { flex: 1, gap: 4 },
  weightDivider: { width: StyleSheet.hairlineWidth, backgroundColor: c.border, marginHorizontal: 16 },
  weightLabel: { ...typography.overline, color: c.textFaint, fontSize: 9 },
  weightValue: { ...typography.metric, color: c.text },
  snapshotNote: {
    ...typography.bodySmall,
    color: c.textFaint,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: c.background,
  },
  statePadding: { paddingHorizontal: 32 },
  stateTitle: { ...typography.metric, color: c.text, textAlign: 'center' },
  stateText: { ...typography.body, color: c.textMuted, textAlign: 'center' },
  emptyCard: {
    minHeight: 190,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: c.borderStrong,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyInline: { ...typography.body, color: c.textMuted, textAlign: 'center', paddingVertical: 20 },
  errorCard: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: c.danger,
    borderBottomWidth: 1,
    borderBottomColor: c.danger,
    backgroundColor: c.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorCopy: { flex: 1, gap: 2 },
  errorTitle: { ...typography.body, color: c.danger, fontWeight: '700' },
  errorMessage: { ...typography.bodySmall, color: c.textMuted },
  retryButton: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  retryText: { ...typography.overline, color: c.accent },
})

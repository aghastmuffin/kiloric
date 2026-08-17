import { useAuth } from '@/lib/AuthContext';
import { resolveGoalState } from '@/lib/goals';
import { getTodayMeals, listHistoricMeals, type MealDocument } from '@/lib/meals';
import { getProfile, type ProfileDocument } from '@/lib/profile';
import { useTheme } from '@/lib/theme/ThemeContext';
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
import { useCallback, useMemo, useState } from 'react';
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
}

const EMPTY_DATA: StatsData = { meals: [], profile: null }
const CHART_HEIGHT = 174

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function makeDays(meals: MealDocument[], count: number): DayTotal[] {
  const totals = new Map<string, { kcal: number; hasLog: boolean }>()
  for (const meal of meals) {
    const date = new Date(meal.$createdAt)
    if (Number.isNaN(date.getTime())) continue
    const key = dayKey(date)
    const previous = totals.get(key) ?? { kcal: 0, hasLog: false }
    totals.set(key, {
      kcal: previous.kcal + (typeof meal.kcal === 'number' ? Math.max(0, meal.kcal) : 0),
      hasLog: true,
    })
  }

  const today = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - index))
    const total = totals.get(dayKey(date))
    return {
      key: dayKey(date),
      date,
      kcal: total?.kcal ?? 0,
      hasLog: total?.hasLog ?? false,
    }
  })
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
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.toggleButton,
              selected && styles.toggleButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.toggleText, selected && styles.toggleTextSelected]}>
              {option === 'week' ? 'WEEKLY' : 'MONTHLY'}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function EnergyChart({ days, goal, period }: { days: DayTotal[]; goal: number | null; period: Period }) {
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const maxValue = Math.max(goal ?? 0, ...days.map((day) => day.kcal), 1)
  const scaleMax = maxValue * 1.12
  const goalBottom = goal ? Math.min(CHART_HEIGHT, (goal / scaleMax) * CHART_HEIGHT) : 0
  const barWidth = period === 'week' ? 28 : 12
  const gap = period === 'week' ? 14 : 7
  const chartWidth = period === 'week' ? '100%' : days.length * (barWidth + gap) + 16

  return (
    <View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={styles.legendSwatch} />
          <Text style={styles.legendText}>RECORDED KCAL</Text>
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
      <ScrollView
        horizontal
        bounces={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={period === 'week' ? styles.chartScrollerWeekly : undefined}
      >
        <View style={[styles.chart, { width: chartWidth, minWidth: period === 'week' ? 300 : undefined }]}>
          <View style={styles.gridLineTop} />
          <View style={styles.gridLineMiddle} />
          {goal ? (
            <View
              pointerEvents="none"
              style={[styles.goalLine, { bottom: 24 + goalBottom, backgroundColor: colors.accent }]}
            />
          ) : null}
          <View style={[styles.bars, { gap }]}>
            {days.map((day, index) => {
              const height = day.kcal > 0 ? Math.max(3, (day.kcal / scaleMax) * CHART_HEIGHT) : 0
              const showMonthLabel = period === 'week' || index === 0 || index === days.length - 1 || index % 5 === 0
              return (
                <View key={day.key} style={[styles.barColumn, { width: barWidth }]}>
                  <View style={styles.barArea}>
                    <View
                      accessibilityLabel={`${day.date.toLocaleDateString()}: ${Math.round(day.kcal)} kilocalories`}
                      style={[styles.bar, { height }]}
                    />
                  </View>
                  <Text style={styles.axisLabel}>
                    {showMonthLabel
                      ? period === 'week'
                        ? day.date.toLocaleDateString(undefined, { weekday: 'narrow' })
                        : day.date.getDate()
                      : ''}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default function StatsScreen() {
  const { user, loading: authLoading } = useAuth()
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<Period>('week')
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

  const days = useMemo(
    () => makeDays(data.meals, period === 'week' ? 7 : 30),
    [data.meals, period],
  )
  const goal = data.profile?.target_kcal && data.profile.target_kcal > 0
    ? data.profile.target_kcal
    : null
  const loggedDays = days.filter((day) => day.hasLog).length
  const onTargetDays = goal
    ? days.filter((day) => day.hasLog && Math.abs(day.kcal - goal) <= goal * 0.15).length
    : 0
  const consistency = goal
    ? Math.round(((loggedDays + onTargetDays) / (days.length * 2)) * 100)
    : Math.round((loggedDays / days.length) * 100)
  const insight = getInsight(days, goal)

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
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.stateText}>Loading your progress…</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.centered, styles.statePadding]}>
        <Ionicons name="stats-chart-outline" size={36} color={colors.success} />
        <Text style={styles.stateTitle}>Sign in to see your stats</Text>
        <Text style={styles.stateText}>Your meal history and profile goals will appear here.</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>PROGRESS, NOT PERFECTION</Text>
          <Text style={styles.title}>Your rhythm</Text>
          <Text style={styles.lede}>Recorded nutrition, viewed with a little perspective.</Text>
        </View>

        <PeriodToggle period={period} onChange={setPeriod} />

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>Stats unavailable</Text>
              <Text style={styles.stateText}>{error}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setReloadKey((key) => key + 1)}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>RETRY</Text>
            </Pressable>
          </View>
        ) : data.meals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="leaf-outline" size={30} color={colors.success} />
            <Text style={styles.stateTitle}>No meal history yet</Text>
            <Text style={styles.stateText}>Log your first meal and your energy pattern will begin here.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionKicker}>{period === 'week' ? 'LAST 7 DAYS' : 'LAST 30 DAYS'}</Text>
                  <Text style={styles.sectionTitle}>Energy vs goal</Text>
                </View>
                <Text style={styles.sectionMeta}>{loggedDays}/{days.length} LOGGED</Text>
              </View>
              <EnergyChart days={days} goal={goal} period={period} />
            </View>

            <View style={styles.scoreCard}>
              <View style={styles.scoreCopy}>
                <Text style={styles.sectionKicker}>CONSISTENCY SCORE</Text>
                <Text style={styles.scoreValue}>{consistency}<Text style={styles.scoreSuffix}>%</Text></Text>
              </View>
              <View style={styles.scoreExplanation}>
                <Text style={styles.scoreTitle}>
                  {goal ? 'Daily logging + goal range' : 'Daily logging'}
                </Text>
                <Text style={styles.scoreDetail}>
                  {goal
                    ? `${loggedDays} days logged · ${onTargetDays} within ±15% of goal`
                    : 'Set an energy goal to include goal adherence in this score.'}
                </Text>
              </View>
            </View>

            <View style={styles.insightCard}>
              <View style={styles.insightIcon}>
                <Ionicons name="sparkles-outline" size={21} color={colors.accent} />
              </View>
              <View style={styles.insightCopy}>
                <Text style={styles.sectionKicker}>RULE-BASED INSIGHT</Text>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightBody}>{insight.body}</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionKicker}>PROFILE SNAPSHOT</Text>
              <Text style={styles.sectionTitle}>Weight</Text>
            </View>
            <Ionicons name="scale-outline" size={22} color={colors.success} />
          </View>
          {weightSnapshot ? (
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
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingBottom: 112,
    gap: 16,
  },
  header: { gap: 3, marginBottom: 3 },
  eyebrow: { ...typography.labelSmall, color: c.success },
  title: { ...typography.headlineLarge, color: c.accent },
  lede: { ...typography.body, color: c.textMuted },
  toggle: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: 10,
    backgroundColor: c.surfaceAlt,
  },
  toggleButton: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  toggleButtonSelected: { backgroundColor: c.accent },
  toggleText: { ...typography.labelSmall, color: c.textMuted },
  toggleTextSelected: { color: c.onAccent },
  pressed: { opacity: 0.72 },
  card: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    padding: 16,
    gap: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionKicker: { ...typography.labelSmall, color: c.success, fontSize: 10 },
  sectionTitle: { ...typography.headline, color: c.accent },
  sectionMeta: { ...typography.labelSmall, color: c.textMuted, textAlign: 'right' },
  legendRow: {
    minHeight: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 8, height: 8, borderRadius: 2, backgroundColor: c.success },
  legendLine: { width: 14, height: 2, backgroundColor: c.accent },
  legendText: { ...typography.labelSmall, color: c.textMuted, fontSize: 9 },
  chartScrollerWeekly: { flexGrow: 1 },
  chart: { height: CHART_HEIGHT + 24, position: 'relative' },
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
  goalLine: { position: 'absolute', left: 0, right: 0, height: 2, zIndex: 2, opacity: 0.88 },
  bars: {
    height: CHART_HEIGHT + 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barColumn: { height: CHART_HEIGHT + 24, alignItems: 'center' },
  barArea: { height: CHART_HEIGHT, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', maxWidth: 28, minHeight: 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: c.success },
  axisLabel: { ...typography.labelSmall, color: c.textMuted, height: 24, paddingTop: 6, fontSize: 9 },
  scoreCard: {
    backgroundColor: c.accent,
    borderRadius: 10,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  scoreCopy: { minWidth: 92 },
  scoreValue: { ...typography.display, color: c.onAccent, fontSize: 44, lineHeight: 50 },
  scoreSuffix: { ...typography.headline, color: c.onAccent },
  scoreExplanation: { flex: 1, gap: 3 },
  scoreTitle: { ...typography.body, color: c.onAccent, fontWeight: '700' },
  scoreDetail: { ...typography.body, color: c.onAccent, opacity: 0.82 },
  insightCard: {
    backgroundColor: c.accentSoft,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCopy: { flex: 1, gap: 4 },
  insightTitle: { ...typography.bodyLarge, color: c.accent, fontWeight: '700' },
  insightBody: { ...typography.body, color: c.textMuted },
  weightRow: { flexDirection: 'row', alignItems: 'stretch' },
  weightMetric: { flex: 1, gap: 4 },
  weightDivider: { width: StyleSheet.hairlineWidth, backgroundColor: c.border, marginHorizontal: 16 },
  weightLabel: { ...typography.labelSmall, color: c.textMuted, fontSize: 10 },
  weightValue: { ...typography.headline, color: c.text },
  snapshotNote: {
    ...typography.labelSmall,
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
  stateTitle: { ...typography.headline, color: c.accent, textAlign: 'center' },
  stateText: { ...typography.body, color: c.textMuted, textAlign: 'center' },
  emptyCard: {
    minHeight: 210,
    padding: 28,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyInline: { ...typography.body, color: c.textMuted, textAlign: 'center', paddingVertical: 20 },
  errorCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: c.danger,
    borderRadius: 10,
    backgroundColor: c.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorCopy: { flex: 1, gap: 2 },
  errorTitle: { ...typography.body, color: c.danger, fontWeight: '700' },
  retryButton: { paddingHorizontal: 10, paddingVertical: 8 },
  retryText: { ...typography.labelSmall, color: c.accent },
})

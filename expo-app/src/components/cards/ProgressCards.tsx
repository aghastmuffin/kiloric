import { Badge, BarChart, Card, EmptyState, LineChart, Txt } from '@/components/ds'
import { parseDayKey, shortMonthDay, shortWeekday, weekdayInitial } from '@/lib/data/dateKeys'
import { formatKcal } from '@/lib/data/foodItem'
import { displayWeight, weightUnitLabel, type DayBar } from '@/lib/data/overview'
import type { WeightPoint } from '@/lib/data/weight'
import type { TrendPoint } from '@/lib/weightTrend'
import type { DisplayUnits } from '@/lib/units'
import { fonts, usePalette } from '@/lib/theme/palette'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

const RANGE_PHRASE: Record<string, string> = {
  week: 'over 7d',
  month: 'over 30d',
  quarter: 'over 90d',
  year: 'over 1y',
}

export function WeightCard({
  weights,
  trend,
  units,
  fallbackKg,
  range = 'month',
  overline,
  action,
  compact,
}: {
  weights: readonly WeightPoint[]
  /** Smoothed series; when present the chart and change badge follow the trend, not raw scale noise. */
  trend?: readonly TrendPoint[]
  units: DisplayUnits
  fallbackKg: number | null
  range?: string
  overline?: string
  action?: ReactNode
  compact?: boolean
}) {
  const c = usePalette()
  const unit = weightUnitLabel(units)
  const latestKg = weights.length > 0 ? weights[weights.length - 1].weightKg : fallbackKg
  const series = trend && trend.length === weights.length ? trend.map((point) => ({ day: point.day, weightKg: point.trendKg })) : weights
  const deltaKg = series.length >= 2 ? Math.round((series[series.length - 1].weightKg - series[0].weightKg) * 10) / 10 : null
  const trendKg = trend && trend.length >= 2 ? trend[trend.length - 1].trendKg : null
  const delta = deltaKg != null ? displayWeight(Math.abs(deltaKg), units) : null
  const sign = deltaKg != null && deltaKg < 0 ? '−' : '+'
  const mid = weights.length > 2 ? weights[Math.floor(weights.length / 2)] : null

  return (
    <Card style={compact ? styles.flexCard : undefined} testID="weight-card">
      <View style={styles.weightHeader}>
        <View>
          <Txt variant="caption" tone="muted">
            {overline ?? 'Weight'}
          </Txt>
          <View style={styles.valueRow}>
            <Text style={[styles.bigValue, { color: c.ink }]}>
              {latestKg != null ? displayWeight(latestKg, units) : '—'}
            </Text>
            <Text style={[styles.unit, { color: c.inkMuted }]}>{unit}</Text>
          </View>
          {trendKg != null ? (
            <Txt variant="caption" tone="muted">
              Trend {displayWeight(trendKg, units)} {unit}
            </Txt>
          ) : null}
        </View>
        {delta != null && delta > 0 ? (
          <Badge label={`${sign}${delta} ${unit} ${RANGE_PHRASE[range] ?? ''}`.trim()} tone="mint" />
        ) : (
          action ?? null
        )}
      </View>
      {weights.length >= 2 ? (
        <LineChart
          values={series.map((point) => displayWeight(point.weightKg, units))}
          labels={[
            shortMonthDay(parseDayKey(weights[0].day)),
            ...(mid ? [shortMonthDay(parseDayKey(mid.day))] : []),
            shortMonthDay(parseDayKey(weights[weights.length - 1].day)),
          ]}
          height={compact ? 120 : 150}
          accessibilityLabel={`Weight trend from ${displayWeight(weights[0].weightKg, units)} to ${displayWeight(weights[weights.length - 1].weightKg, units)} ${unit}`}
        />
      ) : (
        <EmptyState
          compact
          icon="scale-outline"
          title={weights.length === 1 ? 'One weigh-in so far' : 'No weigh-ins yet'}
          body="Log your weight a couple of times to see your trend."
        />
      )}
      {delta != null && delta > 0 && action ? <View style={styles.actionRow}>{action}</View> : null}
    </Card>
  )
}

export function CaloriesWeekCard({
  bars,
  goal,
  compact,
  initials = true,
}: {
  bars: readonly DayBar[]
  goal: number
  compact?: boolean
  initials?: boolean
}) {
  const hasData = bars.some((bar) => bar.kcal > 0)
  return (
    <Card style={compact ? styles.flexCard : undefined} testID="calories-week-card">
      <View style={styles.weekHeader}>
        <Txt variant="subheading">Calories, last 7 days</Txt>
        {goal > 0 ? (
          <Txt variant="caption" tone="muted">
            Goal {formatKcal(goal)}
          </Txt>
        ) : null}
      </View>
      {hasData ? (
        <BarChart
          data={bars.map((bar) => {
            const date = parseDayKey(bar.day)
            return { label: initials ? weekdayInitial(date) : shortWeekday(date), value: bar.kcal, highlight: bar.isToday }
          })}
          goal={goal}
          height={compact ? 120 : 130}
          accessibilityLabel={`Calories for the last 7 days: ${bars.map((bar) => formatKcal(bar.kcal)).join(', ')}`}
        />
      ) : (
        <EmptyState compact icon="bar-chart-outline" title="No meals logged this week" body="Your daily totals appear here as you log food." />
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  flexCard: { flex: 1 },
  weightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigValue: { fontFamily: fonts.heavy, fontSize: 34, letterSpacing: -1 },
  unit: { fontFamily: fonts.medium, fontSize: 16 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  actionRow: { marginTop: 14, alignItems: 'flex-start' },
})

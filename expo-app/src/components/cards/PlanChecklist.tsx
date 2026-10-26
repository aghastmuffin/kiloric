import { FEATURES } from '@/lib/features'
import { Badge, Card, CheckCircle, Divider, EmptyState, Txt, UButton } from '@/components/ds'
import { timeLabel } from '@/lib/data/dateKeys'
import type { PlanEntry } from '@/lib/data/mealPlan'
import type { Workout } from '@/lib/data/workouts'
import { usePalette } from '@/lib/theme/palette'
import { Fragment } from 'react'
import { StyleSheet, View } from 'react-native'

const MEAL_HOURS: Record<string, number> = { Breakfast: 8, Lunch: 12.5, Snack: 15.5, Dinner: 19, Other: 21 }

type Item =
  | { kind: 'meal'; key: string; hour: number; entry: PlanEntry }
  | { kind: 'workout'; key: string; hour: number; workout: Workout }

export function buildTodayItems(plan: readonly PlanEntry[], workouts: readonly Workout[]): Item[] {
  const items: Item[] = [
    ...plan.map((entry) => ({ kind: 'meal' as const, key: entry.$id, hour: MEAL_HOURS[entry.meal_type] ?? 21, entry })),
    ...workouts.map((workout) => {
      const date = new Date(workout.scheduled_at)
      return { kind: 'workout' as const, key: workout.$id, hour: date.getHours() + date.getMinutes() / 60, workout }
    }),
  ]
  return items.sort((a, b) => a.hour - b.hour)
}

type Props = {
  plan: readonly PlanEntry[]
  workouts: readonly Workout[]
  onToggleMeal: (entry: PlanEntry) => void
  onOpenWorkout: (workout: Workout) => void
  onPlan: () => void
  busyId?: string | null
  compact?: boolean
}

export function PlanChecklist({ plan, workouts, onToggleMeal, onOpenWorkout, onPlan, busyId, compact }: Props) {
  const c = usePalette()
  const items = buildTodayItems(plan, workouts)
  const done = items.filter((item) => (item.kind === 'meal' ? item.entry.logged : item.workout.status === 'done')).length

  return (
    <Card style={compact ? styles.flexCard : undefined} testID="today-plan">
      <View style={styles.header}>
        <Txt variant={compact ? 'subheading' : 'heading'}>Today's plan</Txt>
        {items.length > 0 ? (
          <Txt variant="caption" color={c.primary} style={styles.bold}>
            {done} of {items.length} done
          </Txt>
        ) : null}
      </View>
      {items.length === 0 ? (
        <EmptyState
          compact
          icon="calendar-outline"
          title="Nothing planned for today"
          body={FEATURES.workouts ? "Plan meals or schedule a workout and they'll show up here." : "Plan meals and they'll show up here."}
          actionLabel="Open meal plan"
          onAction={onPlan}
        />
      ) : (
        <View>
          {items.map((item) => {
            const isMeal = item.kind === 'meal'
            const checked = isMeal ? item.entry.logged : item.workout.status === 'done'
            const title = isMeal ? item.entry.name : item.workout.name
            const subtitle = isMeal
              ? [item.entry.meal_type, item.entry.prepped ? 'from prep' : item.entry.note].filter(Boolean).join(' · ')
              : [
                  'Workout',
                  timeLabel(new Date(item.workout.scheduled_at)),
                  item.workout.status === 'done' && item.workout.duration_min
                    ? `${item.workout.duration_min} min`
                    : item.workout.planned_minutes
                      ? `${item.workout.planned_minutes} min`
                      : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
            return (
              <Fragment key={item.key}>
                <Divider />
                <View style={styles.row}>
                  <CheckCircle
                    checked={checked}
                    disabled={busyId === item.key || (!isMeal && checked)}
                    accessibilityLabel={isMeal ? `Log ${title}` : `${title} workout`}
                    onPress={isMeal ? () => onToggleMeal(item.entry) : () => onOpenWorkout(item.workout)}
                  />
                  <View style={styles.rowText}>
                    <Txt variant="subheading" numberOfLines={1}>
                      {title}
                    </Txt>
                    <Txt variant="caption" tone="muted" numberOfLines={1}>
                      {subtitle}
                    </Txt>
                  </View>
                  {isMeal ? (
                    <Txt variant="label" tone="muted">
                      {item.entry.kcal} kcal
                    </Txt>
                  ) : checked ? (
                    item.workout.kcal_burned ? (
                      <Badge label={`${item.workout.kcal_burned} kcal`} tone="mint" />
                    ) : null
                  ) : (
                    <UButton
                      label={item.workout.status === 'active' ? 'Resume' : 'Start'}
                      tone="mint"
                      size="sm"
                      onPress={() => onOpenWorkout(item.workout)}
                    />
                  )}
                </View>
              </Fragment>
            )
          })}
        </View>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  flexCard: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bold: { fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  rowText: { flex: 1, gap: 2 },
})

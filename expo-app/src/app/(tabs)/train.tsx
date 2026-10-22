import {
  Badge,
  Card,
  CheckCircle,
  Divider,
  EmptyState,
  ErrorNote,
  IconButton,
  LoadingBlock,
  NumberCell,
  parseDecimal,
  ScreenHeader,
  ScreenScroll,
  SectionTitle,
  Txt,
  UButton,
  useShell,
} from '@/components/ds'
import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import { dayKey, longDate, parseDayKey, shortMonthDay, shortWeekday, timeLabel } from '@/lib/data/dateKeys'
import { loadProfileSummary, weightUnitLabel } from '@/lib/data/overview'
import { useFocusLoader } from '@/lib/data/useLoader'
import {
  completeSet,
  currentExerciseIndex,
  deleteWorkout,
  finishWorkout,
  formatElapsed,
  getWorkout,
  groupSets,
  listRecentWorkouts,
  listSets,
  listUpcomingWorkouts,
  previousPerformance,
  startWorkout,
  type Workout,
  type WorkoutSet,
} from '@/lib/data/workouts'
import { kgToLbs, lbsToKg, type DisplayUnits } from '@/lib/units'
import { fonts, usePalette } from '@/lib/theme/palette'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Fragment, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

const REST_SECONDS = 90

function toDisplay(kg: number, units: DisplayUnits): string {
  const value = units === 'imperial' ? kgToLbs(kg) : kg
  return String(Math.round(value * 2) / 2)
}

function fromDisplay(value: number, units: DisplayUnits): number {
  return units === 'imperial' ? lbsToKg(value) : value
}

export default function TrainScreen() {
  const params = useLocalSearchParams<{ workout?: string }>()
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(params.workout || null)
  const [seenParam, setSeenParam] = useState(params.workout)
  if (params.workout !== seenParam) {
    setSeenParam(params.workout)
    if (params.workout) setOpenId(params.workout)
  }

  if (openId) {
    return (
      <WorkoutSession
        key={openId}
        workoutId={openId}
        onClose={() => {
          setOpenId(null)
          router.setParams({ workout: '' })
        }}
      />
    )
  }
  return <TrainHome onOpen={setOpenId} />
}

function TrainHome({ onOpen }: { onOpen: (id: string) => void }) {
  const { user } = useAuth()
  const router = useRouter()
  const c = usePalette()
  const { wide } = useShell()
  const userId = user?.$id ?? null
  const [busy, setBusy] = useState<string | null>(null)

  const state = useFocusLoader(async () => {
    const [upcoming, recent] = await Promise.all([listUpcomingWorkouts(userId!), listRecentWorkouts(userId!, 8)])
    return { upcoming: upcoming.filter((workout) => workout.status !== 'done'), recent }
  }, userId)

  const upcoming = state.data?.upcoming ?? []
  const recent = state.data?.recent ?? []
  const active = upcoming.find((workout) => workout.status === 'active')

  async function remove(workout: Workout) {
    if (!userId) return
    setBusy(workout.$id)
    try {
      await deleteWorkout(userId, workout)
      await state.reload()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setBusy(null)
    }
  }

  const upcomingCard = (
    <Card style={styles.gap} testID="upcoming-workouts">
      <SectionTitle title="Up next" />
      {upcoming.length === 0 ? (
        <EmptyState
          compact
          icon="barbell-outline"
          title="No workouts scheduled"
          body="Plan a session with your exercises, sets and target weights."
          actionLabel="Plan a workout"
          onAction={() => router.push('/workout-editor')}
        />
      ) : (
        upcoming.map((workout, index) => {
          const when = new Date(workout.scheduled_at)
          const isToday = workout.day === dayKey()
          return (
            <Fragment key={workout.$id}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.workoutRow}>
                <View style={[styles.dateTile, { backgroundColor: isToday ? c.mint : c.chip }]}>
                  <Text style={[styles.dateTileDay, { color: isToday ? c.mintInk : c.inkMuted }]}>{shortWeekday(when)}</Text>
                  <Text style={[styles.dateTileNum, { color: isToday ? c.mintInk : c.ink }]}>{when.getDate()}</Text>
                </View>
                <View style={styles.flex}>
                  <Txt variant="subheading" numberOfLines={1}>
                    {workout.name}
                  </Txt>
                  <Txt variant="caption" tone="muted" numberOfLines={1}>
                    {[timeLabel(when), workout.focus, workout.planned_minutes ? `${workout.planned_minutes} min` : null].filter(Boolean).join(' · ')}
                  </Txt>
                </View>
                <IconButton
                  icon="trash-outline"
                  tone="chip"
                  size={34}
                  accessibilityLabel={`Delete ${workout.name}`}
                  onPress={() => void remove(workout)}
                />
                <UButton
                  label={workout.status === 'active' ? 'Resume' : 'Start'}
                  tone={isToday ? 'primary' : 'mint'}
                  size="sm"
                  disabled={busy === workout.$id}
                  onPress={() => onOpen(workout.$id)}
                  testID={`start-${workout.$id}`}
                />
              </View>
            </Fragment>
          )
        })
      )}
    </Card>
  )

  const historyCard = (
    <Card style={styles.gap} testID="workout-history">
      <SectionTitle title="History" />
      {recent.length === 0 ? (
        <EmptyState compact icon="time-outline" title="No finished workouts yet" body="Completed sessions and calories burned show up here." />
      ) : (
        recent.map((workout, index) => (
          <Fragment key={workout.$id}>
            {index > 0 ? <Divider /> : null}
            <View style={styles.workoutRow}>
              <View style={styles.flex}>
                <Txt variant="subheading" numberOfLines={1}>
                  {workout.name}
                </Txt>
                <Txt variant="caption" tone="muted">
                  {[shortMonthDay(parseDayKey(workout.day)), workout.duration_min ? `${workout.duration_min} min` : null].filter(Boolean).join(' · ')}
                </Txt>
              </View>
              {workout.kcal_burned ? <Badge label={`${workout.kcal_burned} kcal`} tone="mint" /> : null}
            </View>
          </Fragment>
        ))
      )}
    </Card>
  )

  return (
    <ScreenScroll refreshing={state.loading} onRefresh={state.reload} maxWidth={wide ? 1040 : undefined}>
      <ScreenHeader
        overline={longDate(new Date())}
        title="Train"
        right={<UButton label="New workout" size="sm" tone="inverse" onPress={() => router.push('/workout-editor')} testID="new-workout" />}
      />
      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}
      {active ? (
        <Card tone="mint" style={styles.activeCard}>
          <View style={styles.flex}>
            <Txt variant="caption" color={c.mintInk}>
              In progress
            </Txt>
            <Txt variant="heading" color={c.mintInk}>
              {active.name}
            </Txt>
          </View>
          <UButton label="Resume" onPress={() => onOpen(active.$id)} size="sm" />
        </Card>
      ) : null}
      {!state.data && state.loading ? (
        <LoadingBlock />
      ) : wide ? (
        <View style={styles.wideRow}>
          <View style={styles.flex}>{upcomingCard}</View>
          <View style={styles.flex}>{historyCard}</View>
        </View>
      ) : (
        <>
          {upcomingCard}
          {historyCard}
        </>
      )}
    </ScreenScroll>
  )
}

type Draft = { weight: string; reps: string }

function WorkoutSession({ workoutId, onClose }: { workoutId: string; onClose: () => void }) {
  const { user } = useAuth()
  const c = usePalette()
  const userId = user?.$id ?? null
  const [workoutOverride, setWorkoutOverride] = useState<Workout | null>(null)
  const [setOverrides, setSetOverrides] = useState<Record<string, WorkoutSet>>({})
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [exerciseIndex, setExerciseIndex] = useState<number | null>(null)
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState<string | null>(null)

  const state = useFocusLoader(async () => {
    const [workout, sets, summary] = await Promise.all([
      getWorkout(userId!, workoutId),
      listSets(userId!, workoutId),
      loadProfileSummary(userId!, user?.name),
    ])
    const names = [...new Set(sets.map((set) => set.exercise_name))]
    const previous = new Map(
      await Promise.all(names.map(async (name) => [name, await previousPerformance(userId!, name, workoutId)] as const)),
    )
    return { workout, sets, summary, previous }
  }, userId ? `${userId}:${workoutId}` : null)

  const workout = workoutOverride ?? state.data?.workout ?? null
  const units = state.data?.summary.units ?? 'metric'
  const unit = weightUnitLabel(units)
  const sets = (state.data?.sets ?? []).map((set) => setOverrides[set.$id] ?? set)
  const groups = groupSets(sets)
  const index = Math.min(exerciseIndex ?? currentExerciseIndex(groups), Math.max(0, groups.length - 1))
  const group = groups[index]
  const nextGroup = groups[index + 1]
  const isActive = workout?.status === 'active'
  const isDone = workout?.status === 'done'

  useEffect(() => {
    if (!isActive) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isActive])

  const elapsed = workout?.started_at ? (now - new Date(workout.started_at).getTime()) / 1000 : 0
  const restLeft = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0

  async function begin() {
    if (!userId || !workout) return workout
    if (workout.status !== 'planned') return workout
    const started = await startWorkout(userId, workout)
    setWorkoutOverride(started)
    setNow(Date.now())
    return started
  }

  async function toggleSet(set: WorkoutSet) {
    if (!userId) return
    const draft = drafts[set.$id]
    const weight = draft ? parseDecimal(draft.weight) : null
    const reps = draft ? parseDecimal(draft.reps) : null
    setBusy(set.$id)
    try {
      await begin()
      const saved = await completeSet(userId, set, {
        weight: weight != null ? fromDisplay(weight, units) : (set.weight ?? set.target_weight),
        reps: reps ?? set.reps ?? set.target_reps,
        done: !set.done,
      })
      setSetOverrides((current) => ({ ...current, [set.$id]: saved }))
      if (!set.done) {
        setRestEndsAt(Date.now() + REST_SECONDS * 1000)
        setNow(Date.now())
      }
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setBusy(null)
    }
  }

  async function startSession() {
    setBusy('start')
    try {
      await begin()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setBusy(null)
    }
  }

  async function finish() {
    if (!userId || !workout) return
    setBusy('finish')
    try {
      const finished = await finishWorkout(userId, workout, {
        bodyWeightKg: state.data?.summary.currentWeightKg,
        completedSets: sets.filter((set) => set.done).length,
      })
      setWorkoutOverride(finished)
      setRestEndsAt(null)
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setBusy(null)
    }
  }

  function updateDraft(set: WorkoutSet, field: keyof Draft, text: string) {
    setDrafts((current) => ({
      ...current,
      [set.$id]: {
        weight: current[set.$id]?.weight ?? toDisplay(set.weight ?? set.target_weight, units),
        reps: current[set.$id]?.reps ?? String(set.reps ?? set.target_reps),
        [field]: text,
      },
    }))
  }

  if (!workout || !group) {
    return (
      <ScreenScroll>
        <ScreenHeader title="Workout" right={<IconButton icon="close" accessibilityLabel="Close workout" onPress={onClose} />} />
        {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}
        {state.loading ? (
          <LoadingBlock />
        ) : (
          <Card>
            <EmptyState icon="barbell-outline" title="Workout not found" body="It may have been deleted on another device." actionLabel="Back to Train" onAction={onClose} />
          </Card>
        )}
      </ScreenScroll>
    )
  }

  const doneSets = sets.filter((set) => set.done).length
  const previous = state.data?.previous.get(group.name)
  const overline = isDone
    ? `${workout.name} · finished`
    : `Exercise ${index + 1} of ${groups.length}${isActive ? ` · ${formatElapsed(elapsed)}` : ''}`

  const footer = isDone ? (
    <UButton label="Back to Train" size="lg" fullWidth onPress={onClose} />
  ) : isActive ? (
    <UButton
      label={busy === 'finish' ? 'Finishing…' : 'Finish workout'}
      trailing={`${doneSets}/${sets.length} sets`}
      size="lg"
      tone="inverse"
      fullWidth
      disabled={busy === 'finish'}
      onPress={finish}
      testID="finish-workout"
    />
  ) : (
    <UButton label={busy === 'start' ? 'Starting…' : 'Start workout'} size="lg" fullWidth disabled={busy === 'start'} onPress={startSession} testID="start-workout" />
  )

  return (
    <ScreenScroll footer={footer}>
      <ScreenHeader
        overline={overline}
        title={group.name}
        right={<IconButton icon="close" accessibilityLabel="Close workout" onPress={onClose} testID="close-workout" />}
      />
      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}

      {isDone ? (
        <Card tone="mint" style={styles.gap}>
          <Txt variant="heading" color={c.mintInk}>
            Nice work
          </Txt>
          <Txt variant="body" color={c.mintInk}>
            {doneSets} sets in {workout.duration_min ?? 0} min
            {workout.kcal_burned ? ` · about ${workout.kcal_burned} kcal burned beyond resting` : ''}.
          </Txt>
        </Card>
      ) : null}

      <View style={styles.exerciseNav}>
        <IconButton icon="chevron-back" tone="chip" size={40} accessibilityLabel="Previous exercise" onPress={() => setExerciseIndex(Math.max(0, index - 1))} />
        <View style={styles.flex}>
          {group.muscleGroup ? <Badge label={group.muscleGroup} tone="blue" /> : null}
        </View>
        <IconButton
          icon="chevron-forward"
          tone="chip"
          size={40}
          accessibilityLabel="Next exercise"
          onPress={() => setExerciseIndex(Math.min(groups.length - 1, index + 1))}
        />
      </View>

      <Card style={styles.setsCard} testID="sets-table">
        <View style={styles.setRow}>
          <Text style={[styles.th, styles.colSet, { color: c.inkMuted }]}>SET</Text>
          <Text style={[styles.th, styles.colPrev, { color: c.inkMuted }]}>PREVIOUS</Text>
          <Text style={[styles.th, styles.colInput, { color: c.inkMuted }]}>{unit.toUpperCase()}</Text>
          <Text style={[styles.th, styles.colInput, { color: c.inkMuted }]}>REPS</Text>
          <View style={styles.colCheck} />
        </View>
        {group.sets.map((set) => {
          const prev = previous?.get(set.set_number)
          const current = !set.done && group.sets.find((candidate) => !candidate.done)?.$id === set.$id
          return (
            <View key={set.$id} style={[styles.setRow, current && { backgroundColor: c.mint, borderRadius: 16 }]}>
              <Text style={[styles.td, styles.colSet, { color: c.ink }]}>{set.set_number}</Text>
              <Text style={[styles.tdMuted, styles.colPrev, { color: c.inkMuted }]}>
                {prev ? `${toDisplay(prev.weight, units)} × ${prev.reps}` : '—'}
              </Text>
              <View style={styles.colInput}>
                <NumberCell
                  defaultValue={toDisplay(set.weight ?? set.target_weight, units)}
                  onChangeText={(text) => updateDraft(set, 'weight', text)}
                  accessibilityLabel={`Set ${set.set_number} weight in ${unit}`}
                  highlighted={set.done}
                  testID={`set-${set.set_number}-weight`}
                />
              </View>
              <View style={styles.colInput}>
                <NumberCell
                  defaultValue={String(set.reps ?? set.target_reps)}
                  onChangeText={(text) => updateDraft(set, 'reps', text)}
                  accessibilityLabel={`Set ${set.set_number} reps`}
                  highlighted={set.done}
                  testID={`set-${set.set_number}-reps`}
                />
              </View>
              <View style={styles.colCheck}>
                <CheckCircle
                  checked={set.done}
                  disabled={busy === set.$id || isDone}
                  accessibilityLabel={set.done ? `Undo set ${set.set_number}` : `Complete set ${set.set_number}`}
                  onPress={() => void toggleSet(set)}
                />
              </View>
            </View>
          )
        })}
      </Card>

      {restLeft > 0 && !isDone ? (
        <Card tone="rest" style={styles.restCard} testID="rest-timer">
          <View style={styles.flex}>
            <Txt variant="caption" color={c.restInk}>
              Rest
            </Txt>
            <Text style={[styles.restTime, { color: c.restInk }]}>{formatElapsed(restLeft)}</Text>
          </View>
          <UButton label="−15s" tone="card" size="sm" onPress={() => setRestEndsAt((t) => (t ?? Date.now()) - 15_000)} />
          <UButton label="+15s" tone="card" size="sm" onPress={() => setRestEndsAt((t) => (t ?? Date.now()) + 15_000)} />
          <UButton label="Skip" tone="mint" size="sm" onPress={() => setRestEndsAt(null)} />
        </Card>
      ) : null}

      {nextGroup ? (
        <Card style={styles.nextCard}>
          <View style={styles.flex}>
            <Txt variant="caption" tone="muted">
              Up next
            </Txt>
            <Txt variant="subheading">{nextGroup.name}</Txt>
            <Txt variant="caption" tone="muted">
              {nextGroup.sets.length} × {nextGroup.sets[0]?.target_reps ?? 0}
              {nextGroup.sets[0]?.target_weight ? ` · ${toDisplay(nextGroup.sets[0].target_weight, units)} ${unit}` : ''}
            </Txt>
          </View>
          <IconButton icon="arrow-forward" tone="chip" accessibilityLabel={`Go to ${nextGroup.name}`} onPress={() => setExerciseIndex(index + 1)} />
        </Card>
      ) : null}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  wideRow: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  dateTile: { width: 50, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateTileDay: { fontFamily: fonts.medium, fontSize: 12 },
  dateTileNum: { fontFamily: fonts.heavy, fontSize: 19 },
  activeCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  setsCard: { paddingHorizontal: 10, paddingVertical: 12, gap: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6 },
  th: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6 },
  td: { fontFamily: fonts.bold, fontSize: 17 },
  tdMuted: { fontFamily: fonts.medium, fontSize: 14 },
  colSet: { width: 34, textAlign: 'center' },
  colPrev: { flex: 1.2 },
  colInput: { flex: 1, alignItems: 'stretch', textAlign: 'center' },
  colCheck: { width: 40, alignItems: 'center' },
  restCard: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restTime: { fontFamily: fonts.heavy, fontSize: 32, letterSpacing: -1 },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
})

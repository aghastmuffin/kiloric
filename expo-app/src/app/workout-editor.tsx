import {
  Card,
  Chip,
  ErrorNote,
  Field,
  IconButton,
  parseDecimal,
  ScreenHeader,
  ScreenScroll,
  Txt,
  UButton,
} from '@/components/ds'
import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import { addDays, dayKey, shortMonthDay, shortWeekday, startOfDay } from '@/lib/data/dateKeys'
import { loadProfileSummary, weightUnitLabel } from '@/lib/data/overview'
import { useFocusLoader } from '@/lib/data/useLoader'
import { createWorkout, groupSets, listRecentWorkouts, listSets, type Workout } from '@/lib/data/workouts'
import { getSampleTemplate, SAMPLE_WORKOUT_TEMPLATES, type WorkoutTemplate } from '@/lib/data/workoutTemplates'
import { usePalette } from '@/lib/theme/palette'
import { kgToLbs, lbsToKg, type DisplayUnits } from '@/lib/units'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'

type DraftExercise = { key: string; name: string; muscleGroup: string; sets: string; reps: string; weight: string }

let nextKey = 0
function newExercise(values: Partial<Omit<DraftExercise, 'key'>> = {}): DraftExercise {
  nextKey += 1
  return { key: `ex-${nextKey}`, name: '', muscleGroup: '', sets: '3', reps: '8', weight: '', ...values }
}

function parseTime(text: string): { hours: number; minutes: number } | null {
  const match = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return null
  let hours = Number.parseInt(match[1], 10)
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0
  const suffix = match[3]?.toLowerCase()
  if (suffix === 'pm' && hours < 12) hours += 12
  if (suffix === 'am' && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

export default function WorkoutEditorScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ template?: string }>()
  const { user } = useAuth()
  const c = usePalette()
  const userId = user?.$id ?? null
  const days = Array.from({ length: 7 }, (_, index) => addDays(startOfDay(), index))

  const [name, setName] = useState('')
  const [day, setDay] = useState(dayKey())
  const [time, setTime] = useState('18:00')
  const [minutes, setMinutes] = useState('45')
  const [exercises, setExercises] = useState<DraftExercise[]>([newExercise()])
  const [formKey, setFormKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showPastPrompt, setShowPastPrompt] = useState(false)

  const state = useFocusLoader(async () => {
    const [summary, recent] = await Promise.all([loadProfileSummary(userId!, user?.name), listRecentWorkouts(userId!, 6)])
    return { summary, recent }
  }, userId)
  const units = state.data?.summary.units ?? 'metric'
  const unit = weightUnitLabel(units)

  useEffect(() => {
    if (params.template) {
      const template = getSampleTemplate(params.template)
      if (template) applySampleTemplate(template, units)
    }
  }, [params.template, units])

  function applySampleTemplate(tmpl: WorkoutTemplate, displayUnits: DisplayUnits = units) {
    setName(tmpl.name)
    setMinutes(String(tmpl.plannedMinutes))
    setExercises(
      tmpl.exercises.map((ex) => {
        const weight = ex.weightKg > 0 ? (displayUnits === 'imperial' ? kgToLbs(ex.weightKg) : ex.weightKg) : 0
        return newExercise({
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: String(ex.sets),
          reps: String(ex.reps),
          weight: weight > 0 ? String(Math.round(weight * 2) / 2) : '',
        })
      }),
    )
    setFormKey((value) => value + 1)
    setShowPastPrompt(false)
  }

  function update(key: string, field: keyof Omit<DraftExercise, 'key'>, value: string) {
    setExercises((current) => current.map((exercise) => (exercise.key === key ? { ...exercise, [field]: value } : exercise)))
  }

  async function copyFrom(workout: Workout) {
    if (!userId) return
    try {
      const groups = groupSets(await listSets(userId, workout.$id))
      setName(workout.name)
      setExercises(
        groups.map((group) => {
          const last = group.sets[group.sets.length - 1]
          const kg = last?.weight ?? last?.target_weight ?? 0
          return newExercise({
            name: group.name,
            muscleGroup: group.muscleGroup ?? '',
            sets: String(group.sets.length),
            reps: String(last?.reps ?? last?.target_reps ?? 8),
            weight: kg > 0 ? String(Math.round((units === 'imperial' ? kgToLbs(kg) : kg) * 2) / 2) : '',
          })
        }),
      )
      if (workout.planned_minutes) setMinutes(String(workout.planned_minutes))
      setFormKey((value) => value + 1)
    } catch (err) {
      showApiError(err, 'appwrite')
    }
  }

  const parsedTime = parseTime(time)
  const scheduledAt = parsedTime ? new Date(`${day}T00:00:00`) : null
  if (scheduledAt && parsedTime) {
    scheduledAt.setHours(parsedTime.hours, parsedTime.minutes, 0, 0)
  }
  const isPastTime = Boolean(scheduledAt && scheduledAt.getTime() < Date.now() - 60_000)

  async function save(overrideStatus?: 'planned' | 'done') {
    if (!userId) return
    if (!name.trim()) return setFormError('Name the workout, e.g. “Upper body”.')
    if (!parsedTime || !scheduledAt) return setFormError('Enter a start time like 18:00 or 6pm.')
    const plan = exercises
      .filter((exercise) => exercise.name.trim())
      .map((exercise) => {
        const weight = parseDecimal(exercise.weight) ?? 0
        return {
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          sets: Math.round(parseDecimal(exercise.sets) ?? 0),
          reps: Math.round(parseDecimal(exercise.reps) ?? 0),
          weightKg: units === 'imperial' ? lbsToKg(weight) : weight,
        }
      })
    if (plan.length === 0) return setFormError('Add at least one exercise.')
    if (isPastTime && !overrideStatus && !showPastPrompt) {
      setShowPastPrompt(true)
      return
    }
    setFormError(null)
    setSaving(true)
    try {
      await createWorkout(userId, {
        name,
        scheduledAt,
        plannedMinutes: Math.round(parseDecimal(minutes) ?? 0) || undefined,
        exercises: plan,
        status: overrideStatus ?? 'planned',
      })
      router.back()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScreenScroll
      footer={<UButton label={saving ? 'Saving…' : 'Schedule workout'} size="lg" fullWidth disabled={saving} onPress={save} testID="workout-save" />}
    >
      <ScreenHeader title="Plan a workout" right={<IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />} />
      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}
      <Card style={styles.gap}>
        <Txt variant="subheading">Sample templates</Txt>
        <View style={styles.chips}>
          {SAMPLE_WORKOUT_TEMPLATES.map((tmpl) => (
            <Chip key={tmpl.id} label={tmpl.label} selected={false} onPress={() => applySampleTemplate(tmpl)} />
          ))}
        </View>
        {state.data && state.data.recent.length > 0 ? (
          <>
            <Txt variant="subheading">Repeat a past workout</Txt>
            <View style={styles.chips}>
              {state.data.recent.map((workout) => (
                <Chip key={workout.$id} label={workout.name} selected={false} onPress={() => void copyFrom(workout)} />
              ))}
            </View>
          </>
        ) : null}
      </Card>
      <View style={styles.gap} key={formKey}>
        <Card style={styles.gap}>
          <Field label="Workout name" defaultValue={name} placeholder="Upper body" onChangeText={setName} maxLength={128} testID="workout-name" />
          <Txt variant="caption" tone="muted">
            Day
          </Txt>
          <View style={styles.chips}>
            {days.map((date) => {
              const key = dayKey(date)
              return (
                <Chip
                  key={key}
                  label={key === dayKey() ? 'Today' : `${shortWeekday(date)} ${shortMonthDay(date).split(' ')[1]}`}
                  selected={key === day}
                  onPress={() => setDay(key)}
                />
              )
            })}
          </View>
          <View style={styles.row}>
            <View style={styles.flexField}>
              <Field
                label="Start time"
                defaultValue={time}
                onChangeText={(text) => {
                  setTime(text)
                  setShowPastPrompt(false)
                }}
                maxLength={8}
                testID="workout-time"
              />
              {isPastTime ? (
                <Txt variant="caption" color={c.peachInk} style={styles.pastNotice}>
                  ⚠️ Start time is in the past
                </Txt>
              ) : null}
            </View>
            <Field label="Planned length" defaultValue={minutes} onChangeText={setMinutes} keyboardType="number-pad" suffix="min" />
          </View>
        </Card>
        {exercises.map((exercise, index) => (
          <Card key={exercise.key} style={styles.gap}>
            <View style={styles.exerciseHeader}>
              <Txt variant="subheading">Exercise {index + 1}</Txt>
              <IconButton
                icon="close"
                tone="chip"
                size={32}
                accessibilityLabel={`Remove exercise ${index + 1}`}
                onPress={() =>
                  setExercises((current) => (current.length > 1 ? current.filter((entry) => entry.key !== exercise.key) : [newExercise()]))
                }
              />
            </View>
            <View style={styles.row}>
              <View style={styles.wide}>
                <Field
                  label="Name"
                  defaultValue={exercise.name}
                  placeholder="Bench press"
                  onChangeText={(text) => update(exercise.key, 'name', text)}
                  maxLength={128}
                  testID={`exercise-${index}-name`}
                />
              </View>
              <Field
                label="Muscle group"
                defaultValue={exercise.muscleGroup}
                placeholder="Chest"
                onChangeText={(text) => update(exercise.key, 'muscleGroup', text)}
                maxLength={64}
              />
            </View>
            <View style={styles.row}>
              <Field label="Sets" defaultValue={exercise.sets} keyboardType="number-pad" onChangeText={(text) => update(exercise.key, 'sets', text)} testID={`exercise-${index}-sets`} />
              <Field label="Reps" defaultValue={exercise.reps} keyboardType="number-pad" onChangeText={(text) => update(exercise.key, 'reps', text)} testID={`exercise-${index}-reps`} />
              <Field
                label="Weight"
                defaultValue={exercise.weight}
                keyboardType="decimal-pad"
                suffix={unit}
                onChangeText={(text) => update(exercise.key, 'weight', text)}
                testID={`exercise-${index}-weight`}
              />
            </View>
          </Card>
        ))}
        {exercises.length < 12 ? (
          <UButton label="Add exercise" tone="mint" size="sm" onPress={() => setExercises((current) => [...current, newExercise()])} style={styles.start} testID="add-exercise" />
        ) : null}
        {showPastPrompt ? (
          <Card tone="peach" style={styles.gap}>
            <Txt variant="subheading">Start time is in the past</Txt>
            <Txt variant="body">
              The start time ({time}) has already passed. Would you like to log this as a completed workout now or schedule it for the future?
            </Txt>
            <View style={styles.promptButtons}>
              <UButton label="Log as completed" size="sm" tone="primary" onPress={() => void save('done')} testID="log-completed" />
              <UButton label="Schedule anyway" size="sm" tone="card" onPress={() => void save('planned')} testID="schedule-anyway" />
              <UButton label="Change time" size="sm" tone="ghost" onPress={() => setShowPastPrompt(false)} testID="change-time" />
            </View>
          </Card>
        ) : null}
        {formError ? <ErrorNote message={formError} /> : null}
      </View>
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  gap: { gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  flexField: { flex: 1, gap: 4 },
  wide: { flex: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  start: { alignSelf: 'flex-start' },
  pastNotice: { marginTop: 2 },
  promptButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})

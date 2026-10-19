import { netStrengthKcal } from '@/lib/exercise'
import { dayKey } from './dateKeys'
import { createRecordStore, type StoredRecord } from './recordStore'

export type WorkoutStatus = 'planned' | 'active' | 'done'

export type WorkoutFields = {
  name: string
  day: string
  scheduled_at: string
  status: WorkoutStatus
  focus?: string | null
  planned_minutes?: number | null
  started_at?: string | null
  finished_at?: string | null
  duration_min?: number | null
  kcal_burned?: number | null
}

export type Workout = StoredRecord<WorkoutFields>

export type WorkoutSetFields = {
  workout_id: string
  exercise_name: string
  exercise_order: number
  muscle_group?: string | null
  set_number: number
  target_reps: number
  target_weight: number
  weight?: number | null
  reps?: number | null
  done: boolean
  completed_at?: string | null
}

export type WorkoutSet = StoredRecord<WorkoutSetFields>

export type ExercisePlan = {
  name: string
  muscleGroup: string
  sets: number
  reps: number
  /** Stored in kg. */
  weightKg: number
}

export const workoutsStore = createRecordStore<WorkoutFields>({
  collectionId: process.env.EXPO_PUBLIC_APPWRITE_WORKOUTS_COLLECTION_ID ?? 'workouts',
  fallbackLimit: 30,
  recencyField: 'scheduled_at',
})

export const workoutSetsStore = createRecordStore<WorkoutSetFields>({
  collectionId: process.env.EXPO_PUBLIC_APPWRITE_WORKOUT_SETS_COLLECTION_ID ?? 'workout_sets',
  fallbackLimit: 160,
  recencyField: '$createdAt',
})

export function listWorkoutsBetween(userId: string, fromDay: string, toDay: string): Promise<Workout[]> {
  return workoutsStore.list(
    userId,
    [
      { field: 'day', op: 'gte', value: fromDay },
      { field: 'day', op: 'lte', value: toDay },
    ],
    { orderBy: 'scheduled_at', limit: 200 },
  )
}

export async function getWorkout(userId: string, workoutId: string): Promise<Workout | null> {
  const rows = await workoutsStore.list(userId, [{ field: '$id', op: 'eq', value: workoutId }], { limit: 1 })
  return rows[0] ?? null
}

export function listUpcomingWorkouts(userId: string, fromDay: string = dayKey()): Promise<Workout[]> {
  return workoutsStore.list(userId, [{ field: 'day', op: 'gte', value: fromDay }], {
    orderBy: 'scheduled_at',
    limit: 20,
  })
}

export function listRecentWorkouts(userId: string, limit = 10): Promise<Workout[]> {
  return workoutsStore.list(userId, [{ field: 'status', op: 'eq', value: 'done' }], {
    orderBy: 'scheduled_at',
    desc: true,
    limit,
  })
}

export async function createWorkout(
  userId: string,
  input: { name: string; scheduledAt: Date; focus?: string; plannedMinutes?: number; exercises: ExercisePlan[] },
): Promise<Workout> {
  const name = input.name.trim().slice(0, 128)
  if (!name) throw new Error('Name the workout.')
  const exercises = input.exercises.filter((exercise) => exercise.name.trim() && exercise.sets > 0)
  if (exercises.length === 0) throw new Error('Add at least one exercise with one set.')
  const workout = await workoutsStore.create(userId, {
    name,
    day: dayKey(input.scheduledAt),
    scheduled_at: input.scheduledAt.toISOString(),
    status: 'planned',
    focus: input.focus?.trim().slice(0, 64) || exercises[0].muscleGroup || null,
    planned_minutes: input.plannedMinutes ?? null,
  })
  let order = 0
  for (const exercise of exercises) {
    for (let setNumber = 1; setNumber <= Math.min(exercise.sets, 10); setNumber += 1) {
      await workoutSetsStore.create(userId, {
        workout_id: workout.$id,
        exercise_name: exercise.name.trim().slice(0, 128),
        exercise_order: order,
        muscle_group: exercise.muscleGroup.trim().slice(0, 64) || null,
        set_number: setNumber,
        target_reps: Math.max(1, Math.round(exercise.reps)),
        target_weight: Math.max(0, exercise.weightKg),
        weight: null,
        reps: null,
        done: false,
        completed_at: null,
      })
    }
    order += 1
  }
  return workout
}

export async function listSets(userId: string, workoutId: string): Promise<WorkoutSet[]> {
  const sets = await workoutSetsStore.list(userId, [{ field: 'workout_id', op: 'eq', value: workoutId }], {
    orderBy: 'exercise_order',
    limit: 200,
  })
  return sets.sort((a, b) => a.exercise_order - b.exercise_order || a.set_number - b.set_number)
}

export type ExerciseGroup = {
  name: string
  order: number
  muscleGroup: string | null
  sets: WorkoutSet[]
}

export function groupSets(sets: readonly WorkoutSet[]): ExerciseGroup[] {
  const groups = new Map<number, ExerciseGroup>()
  for (const set of sets) {
    const group = groups.get(set.exercise_order) ?? {
      name: set.exercise_name,
      order: set.exercise_order,
      muscleGroup: set.muscle_group ?? null,
      sets: [],
    }
    group.sets.push(set)
    groups.set(set.exercise_order, group)
  }
  return [...groups.values()]
    .sort((a, b) => a.order - b.order)
    .map((group) => ({ ...group, sets: group.sets.sort((a, b) => a.set_number - b.set_number) }))
}

/** The first exercise that still has an unfinished set (or the last one when all are done). */
export function currentExerciseIndex(groups: readonly ExerciseGroup[]): number {
  const index = groups.findIndex((group) => group.sets.some((set) => !set.done))
  return index === -1 ? Math.max(0, groups.length - 1) : index
}

/** Most recent completed performance per set number for an exercise, from earlier workouts. */
export async function previousPerformance(
  userId: string,
  exerciseName: string,
  excludeWorkoutId: string,
): Promise<Map<number, { weight: number; reps: number }>> {
  const sets = await workoutSetsStore.list(
    userId,
    [
      { field: 'exercise_name', op: 'eq', value: exerciseName },
      { field: 'done', op: 'eq', value: true },
    ],
    { orderBy: 'completed_at', desc: true, limit: 50 },
  )
  const latestWorkout = sets.find((set) => set.workout_id !== excludeWorkoutId)?.workout_id
  const result = new Map<number, { weight: number; reps: number }>()
  if (!latestWorkout) return result
  for (const set of sets) {
    if (set.workout_id !== latestWorkout || result.has(set.set_number)) continue
    result.set(set.set_number, { weight: set.weight ?? set.target_weight, reps: set.reps ?? set.target_reps })
  }
  return result
}

export function startWorkout(userId: string, workout: Workout): Promise<Workout> {
  return workoutsStore.update(userId, workout.$id, {
    status: 'active',
    started_at: workout.started_at ?? new Date().toISOString(),
    day: dayKey(),
  })
}

export function completeSet(
  userId: string,
  set: WorkoutSet,
  values: { weight: number; reps: number; done: boolean },
): Promise<WorkoutSet> {
  return workoutSetsStore.update(userId, set.$id, {
    weight: Math.max(0, values.weight),
    reps: Math.max(0, Math.round(values.reps)),
    done: values.done,
    completed_at: values.done ? new Date().toISOString() : null,
  })
}

export function finishWorkout(
  userId: string,
  workout: Workout,
  input: { bodyWeightKg: number | null | undefined; completedSets: number },
): Promise<Workout> {
  const finished = new Date()
  const started = workout.started_at ? new Date(workout.started_at) : finished
  const elapsedMinutes = (finished.getTime() - started.getTime()) / 60_000
  const estimate = netStrengthKcal({ elapsedMinutes, completedSets: input.completedSets, bodyWeightKg: input.bodyWeightKg })
  return workoutsStore.update(userId, workout.$id, {
    status: 'done',
    finished_at: finished.toISOString(),
    duration_min: Math.max(1, Math.round(elapsedMinutes)),
    kcal_burned: estimate.kcal,
  })
}

export async function deleteWorkout(userId: string, workout: Workout): Promise<void> {
  const sets = await listSets(userId, workout.$id)
  for (const set of sets) await workoutSetsStore.remove(userId, set.$id)
  await workoutsStore.remove(userId, workout.$id)
}

export function burnedOn(workouts: readonly WorkoutFields[], day: string): number {
  return workouts
    .filter((workout) => workout.day === day && workout.status === 'done')
    .reduce((total, workout) => total + (workout.kcal_burned ?? 0), 0)
}

export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const mm = hours > 0 && minutes < 10 ? `0${minutes}` : String(minutes)
  const ss = secs < 10 ? `0${secs}` : String(secs)
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

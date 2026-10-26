export type WorkoutTemplate = {
  id: 'upper' | 'lower' | 'full'
  name: string
  label: string
  plannedMinutes: number
  exercises: {
    name: string
    muscleGroup: string
    sets: number
    reps: number
    weightKg: number
  }[]
}

export const SAMPLE_WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'upper',
    name: 'Upper Body',
    label: 'Sample: Upper Body',
    plannedMinutes: 45,
    exercises: [
      { name: 'Bench Press', muscleGroup: 'Chest', sets: 3, reps: 8, weightKg: 60 },
      { name: 'Bent Over Row', muscleGroup: 'Back', sets: 3, reps: 10, weightKg: 50 },
      { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: 3, reps: 8, weightKg: 30 },
    ],
  },
  {
    id: 'lower',
    name: 'Lower Body',
    label: 'Sample: Lower Body',
    plannedMinutes: 45,
    exercises: [
      { name: 'Barbell Squat', muscleGroup: 'Legs', sets: 3, reps: 8, weightKg: 70 },
      { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', sets: 3, reps: 10, weightKg: 60 },
      { name: 'Calf Raise', muscleGroup: 'Calves', sets: 3, reps: 12, weightKg: 40 },
    ],
  },
  {
    id: 'full',
    name: 'Full Body',
    label: 'Sample: Full Body',
    plannedMinutes: 50,
    exercises: [
      { name: 'Goblet Squat', muscleGroup: 'Legs', sets: 3, reps: 10, weightKg: 20 },
      { name: 'Dumbbell Bench Press', muscleGroup: 'Chest', sets: 3, reps: 10, weightKg: 18 },
      { name: 'Lat Pulldown', muscleGroup: 'Back', sets: 3, reps: 10, weightKg: 45 },
    ],
  },
]

export function getSampleTemplate(id: string | null | undefined): WorkoutTemplate | undefined {
  if (!id) return undefined
  return SAMPLE_WORKOUT_TEMPLATES.find((t) => t.id === id)
}

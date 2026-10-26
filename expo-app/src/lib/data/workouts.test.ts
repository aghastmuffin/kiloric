// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    get: vi.fn(),
    getPrefs: vi.fn(),
    updatePrefs: vi.fn(),
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}))

vi.mock('@/lib/appwrite', () => ({
  account: { get: mocks.get, getPrefs: mocks.getPrefs, updatePrefs: mocks.updatePrefs },
  databases: {
    listDocuments: mocks.listDocuments,
    createDocument: mocks.createDocument,
    getDocument: mocks.getDocument,
    updateDocument: mocks.updateDocument,
    deleteDocument: mocks.deleteDocument,
  },
}))

vi.mock('react-native-appwrite', () => {
  return {
    AppwriteException: class extends Error {},
    ID: { unique: () => 'id-1' },
    Permission: { read: (r: string) => `read(${r})`, update: (r: string) => `update(${r})`, delete: (r: string) => `delete(${r})` },
    Role: { user: (id: string) => `user:${id}` },
    Query: {
      equal: (field: string, value: unknown) => `equal:${field}:${value}`,
      greaterThanEqual: (field: string, value: unknown) => `gte:${field}:${value}`,
      lessThan: (field: string, value: unknown) => `lt:${field}:${value}`,
      lessThanEqual: (field: string, value: unknown) => `lte:${field}:${value}`,
      orderAsc: (field: string) => `asc:${field}`,
      orderDesc: (field: string) => `desc:${field}`,
      limit: (value: number) => `limit:${value}`,
    },
  }
})

const { completeSet, finishWorkout, getWorkout, previousPerformance } = await import('./workouts')
const { resetRecordStoreSession } = await import('./recordStore')

beforeEach(() => {
  vi.clearAllMocks()
  resetRecordStoreSession()
  mocks.get.mockResolvedValue({ $id: 'u1' })
})

describe('getWorkout input validation', () => {
  it('returns null immediately for malformed workout IDs', async () => {
    expect(await getWorkout('u1', 'invalid id!')).toBeNull()
    expect(await getWorkout('u1', '../path/traversal')).toBeNull()
    expect(await getWorkout('u1', '')).toBeNull()
    expect(mocks.listDocuments).not.toHaveBeenCalled()
  })

  it('queries database for valid workout IDs', async () => {
    const mockWorkout = { $id: 'w123', name: 'Leg Day', owner: 'u1' }
    mocks.listDocuments.mockResolvedValue({ documents: [mockWorkout] })

    const result = await getWorkout('u1', 'w123')
    expect(result).toEqual(mockWorkout)
    expect(mocks.listDocuments).toHaveBeenCalledTimes(1)
  })
})

describe('completeSet weight & reps handling', () => {
  it('preserves null weight when untracked', async () => {
    const mockSet = {
      $id: 's1',
      $createdAt: '2025-01-01',
      $updatedAt: '2025-01-01',
      owner: 'u1',
      workout_id: 'w1',
      exercise_name: 'Pushups',
      exercise_order: 0,
      set_number: 1,
      target_reps: 10,
      target_weight: 0,
      done: false,
    }
    mocks.getDocument.mockResolvedValue(mockSet)
    mocks.updateDocument.mockImplementation(async (opts) => ({
      ...mockSet,
      ...opts.data,
    }))

    const updated = await completeSet('u1', mockSet, { weight: null, reps: 10, done: true })
    expect(updated.weight).toBeNull()
    expect(updated.done).toBe(true)
  })

  it('stores weight when provided', async () => {
    const mockSet = {
      $id: 's1',
      $createdAt: '2025-01-01',
      $updatedAt: '2025-01-01',
      owner: 'u1',
      workout_id: 'w1',
      exercise_name: 'Bench Press',
      exercise_order: 0,
      set_number: 1,
      target_reps: 8,
      target_weight: 60,
      done: false,
    }
    mocks.getDocument.mockResolvedValue(mockSet)
    mocks.updateDocument.mockImplementation(async (opts) => ({
      ...mockSet,
      ...opts.data,
    }))

    const updated = await completeSet('u1', mockSet, { weight: 65, reps: 8, done: true })
    expect(updated.weight).toBe(65)
  })
})

describe('previousPerformance null weight handling', () => {
  it('returns weight null when set has no weight and target_weight is 0', async () => {
    mocks.listDocuments.mockResolvedValue({
      documents: [
        {
          $id: 's10',
          workout_id: 'w-prev',
          exercise_name: 'Pullups',
          set_number: 1,
          weight: null,
          target_weight: 0,
          reps: 12,
          done: true,
          completed_at: '2025-01-01T10:00:00Z',
        },
      ],
    })

    const prev = await previousPerformance('u1', 'Pullups', 'w-curr')
    expect(prev.get(1)).toEqual({ weight: null, reps: 12 })
  })
})

describe('finishWorkout', () => {
  it('marks workout as done with calculated elapsed time and kcal estimate', async () => {
    const startedAt = new Date(Date.now() - 30 * 60_000).toISOString()
    const mockWorkout = {
      $id: 'w1',
      $createdAt: '2025-01-01',
      $updatedAt: '2025-01-01',
      owner: 'u1',
      name: 'Full Body',
      day: '2025-01-01',
      scheduled_at: startedAt,
      started_at: startedAt,
      status: 'active' as const,
    }
    mocks.getDocument.mockResolvedValue(mockWorkout)
    mocks.updateDocument.mockImplementation(async (opts) => ({
      ...mockWorkout,
      ...opts.data,
    }))

    const finished = await finishWorkout('u1', mockWorkout, { bodyWeightKg: 70, completedSets: 6 })
    expect(finished.status).toBe('done')
    expect(finished.duration_min).toBeGreaterThanOrEqual(29)
    expect(finished.kcal_burned).toBeGreaterThan(0)
  })
})

import { updateProfile } from '@/lib/profile'
import { dayKey } from './dateKeys'
import { createRecordStore, type StoredRecord } from './recordStore'

export type WeightLogFields = {
  weight_kg: number
  day: string
  logged_at: string
}

export type WeightLog = StoredRecord<WeightLogFields>

export const weightLogsStore = createRecordStore<WeightLogFields>({
  collectionId: process.env.EXPO_PUBLIC_APPWRITE_WEIGHT_LOGS_COLLECTION_ID ?? 'weight_logs',
  fallbackLimit: 120,
  recencyField: 'logged_at',
})

export function listWeightsSince(userId: string, since: Date): Promise<WeightLog[]> {
  return weightLogsStore.list(userId, [{ field: 'logged_at', op: 'gte', value: since.toISOString() }], {
    orderBy: 'logged_at',
    limit: 400,
  })
}

/** Records a weigh-in and keeps the profile's current weight in sync if this is the latest weigh-in. */
export async function logWeight(userId: string, weightKg: number, at: Date = new Date()): Promise<WeightLog> {
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400) {
    throw new Error('Enter a weight between 20 and 400 kg (44–880 lb).')
  }
  const rounded = Math.round(weightKg * 10) / 10
  const entry = await weightLogsStore.create(userId, {
    weight_kg: rounded,
    day: dayKey(at),
    logged_at: at.toISOString(),
  })
  const recentLogs = await weightLogsStore.list(userId, [], { limit: 10 }).catch(() => [])
  const isLatest = !recentLogs.some((log) => log.logged_at > at.toISOString())
  if (isLatest) {
    await updateProfile(userId, { weight: rounded })
  }
  return entry
}

export type WeightPoint = { day: string; weightKg: number }

/** One point per day (latest weigh-in wins), oldest first. */
export function dailyWeightSeries(logs: readonly WeightLogFields[]): WeightPoint[] {
  const byDay = new Map<string, WeightLogFields>()
  for (const log of logs) {
    const current = byDay.get(log.day)
    if (!current || log.logged_at > current.logged_at) byDay.set(log.day, log)
  }
  return [...byDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((log) => ({ day: log.day, weightKg: log.weight_kg }))
}

export function weightDelta(series: readonly WeightPoint[]): number | null {
  if (series.length < 2) return null
  return Math.round((series[series.length - 1].weightKg - series[0].weightKg) * 10) / 10
}

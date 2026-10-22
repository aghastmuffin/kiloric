import type { FoodEntrySource } from './foodLog'
import type { FoodItem } from './foodItem'

type Handoff = { item: FoodItem; source: FoodEntrySource; servings: number; expiresAt: number }

const handoffs = new Map<string, Handoff>()
const TTL_MS = 10 * 60 * 1000
const MAX_ITEMS = 10

/** Hand a food to the Review & log screen without serializing it into the URL. */
export function stashReviewItem(item: FoodItem, source: FoodEntrySource, servings = 1): string {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  handoffs.set(id, { item, source, servings, expiresAt: Date.now() + TTL_MS })
  while (handoffs.size > MAX_ITEMS) {
    const oldest = handoffs.keys().next().value
    if (typeof oldest !== 'string') break
    handoffs.delete(oldest)
  }
  return id
}

export function readReviewItem(id: string | undefined): Handoff | null {
  if (!id) return null
  const handoff = handoffs.get(id)
  if (!handoff || handoff.expiresAt < Date.now()) {
    handoffs.delete(id)
    return null
  }
  return handoff
}

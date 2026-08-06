type StoredResult = {
  query: string
  data: unknown
  expiresAt: number
}

const results = new Map<string, StoredResult>()
const MAX_RESULTS = 10
const RESULT_TTL_MS = 10 * 60 * 1000

export function storeSearchResult(query: string, data: unknown): string {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  results.set(id, {
    query: query.slice(0, 256),
    data,
    expiresAt: Date.now() + RESULT_TTL_MS,
  })
  while (results.size > MAX_RESULTS) {
    const oldest = results.keys().next().value
    if (typeof oldest !== 'string') break
    results.delete(oldest)
  }
  return id
}

export function takeSearchResult(id: string | undefined): StoredResult | null {
  if (!id || !/^[a-z0-9-]{1,64}$/i.test(id)) return null
  const stored = results.get(id)
  if (!stored || stored.expiresAt <= Date.now()) {
    results.delete(id)
    return null
  }
  return stored
}

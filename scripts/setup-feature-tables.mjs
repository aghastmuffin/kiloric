#!/usr/bin/env node
/**
 * Creates the Kiloric feature tables (food log, saved meals, meal plan, prep,
 * groceries, workouts, sets, weight) from `appwrite.config.json` via the REST
 * API, and adds the newer columns to the existing `users` profile table and the
 * `food_contributions` table. Idempotent: existing collections, attributes and
 * indexes are kept.
 *
 *   APPWRITE_API_KEY=... node scripts/setup-feature-tables.mjs
 *
 * The key needs databases.read/write, collections.read/write,
 * attributes.read/write and indexes.read/write. `npm run appwrite:push-tables`
 * does the same through the Appwrite CLI.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const FEATURE_TABLE_IDS = [
  'food_entries',
  'saved_meals',
  'meal_plan_entries',
  'prep_sessions',
  'grocery_items',
  'workouts',
  'workout_sets',
  'weight_logs',
]

/** Existing tables that only need their newer columns added. */
const EXTENDED_TABLE_IDS = ['users', 'food_contributions']

function loadPublicAppEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const [rawKey, ...rest] = line.split('=')
      const key = rawKey?.trim()
      if (!key?.startsWith('EXPO_PUBLIC_') || process.env[key] !== undefined) continue
      process.env[key] = rest.join('=').trim().replace(/^(['"])(.*)\1$/, '$2')
    }
  } catch {
    // App environment file is optional.
  }
}

loadPublicAppEnv()

const endpoint = (process.env.APPWRITE_ENDPOINT ?? process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? '').replace(/\/$/, '')
const projectId = process.env.APPWRITE_PROJECT_ID ?? process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID
const databaseId = process.env.APPWRITE_DATABASE_ID ?? process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID
const apiKey = process.env.APPWRITE_API_KEY

if (!endpoint || !projectId || !databaseId || !apiKey) {
  console.error('Missing endpoint, project, database, or APPWRITE_API_KEY.')
  process.exit(1)
}

const config = JSON.parse(readFileSync(resolve(process.cwd(), 'appwrite.config.json'), 'utf8'))
const tables = config.tables.filter((table) => FEATURE_TABLE_IDS.includes(table.$id))
const extendedTables = config.tables.filter((table) => EXTENDED_TABLE_IDS.includes(table.$id))

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      'X-Appwrite-Response-Format': '1.8.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    const error = new Error(payload?.message ?? response.statusText)
    error.status = response.status
    throw error
  }
  return payload
}

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms))

function attributeRequest(column) {
  const common = { key: column.key, required: column.required, array: column.array ?? false }
  const withDefault = (body) => (column.required || column.default == null ? body : { ...body, default: column.default })
  if (column.format === 'enum') return ['enum', withDefault({ ...common, elements: column.elements })]
  switch (column.type) {
    case 'varchar':
    case 'string':
      return ['string', withDefault({ ...common, size: column.size })]
    case 'text':
      return ['string', withDefault({ ...common, size: 65535 })]
    case 'integer':
      return ['integer', withDefault({ ...common, min: column.min, max: column.max })]
    case 'double':
    case 'float':
      return ['float', withDefault({ ...common, min: column.min, max: column.max })]
    case 'boolean':
      return ['boolean', withDefault(common)]
    case 'datetime':
      return ['datetime', withDefault(common)]
    default:
      throw new Error(`Unsupported column type ${column.type} for ${column.key}`)
  }
}

function collectionBase(table) {
  return `/databases/${table.databaseId ?? databaseId}/collections/${table.$id}`
}

async function ensureCollection(table) {
  const base = collectionBase(table)
  try {
    const existing = await request(base)
    if (!existing.documentSecurity) throw new Error(`${table.$id} must have document security enabled.`)
    return base
  } catch (error) {
    if (error.status !== 404) throw error
  }
  await request(`/databases/${table.databaseId ?? databaseId}/collections`, {
    method: 'POST',
    body: {
      collectionId: table.$id,
      name: table.name,
      permissions: table.$permissions,
      documentSecurity: true,
      enabled: true,
    },
  })
  return base
}

async function waitForAttribute(base, key) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const attribute = await request(`${base}/attributes/${key}`)
    if (attribute.status === 'available') return
    if (attribute.status === 'failed') throw new Error(`Attribute ${key} failed: ${attribute.error ?? ''}`)
    await sleep(750)
  }
  throw new Error(`Timed out waiting for ${key}`)
}

async function ensureAttributes(base, table) {
  const response = await request(`${base}/attributes`)
  const keys = new Set((response.attributes ?? []).map((attribute) => attribute.key))
  for (const column of table.columns) {
    if (keys.has(column.key) || column.type === 'relationship') continue
    const [path, body] = attributeRequest(column)
    await request(`${base}/attributes/${path}`, { method: 'POST', body })
    await waitForAttribute(base, column.key)
  }
}

async function ensureIndexes(base, table) {
  const response = await request(`${base}/indexes`)
  const keys = new Set((response.indexes ?? []).map((index) => index.key))
  for (const index of table.indexes ?? []) {
    if (keys.has(index.key)) continue
    await request(`${base}/indexes`, {
      method: 'POST',
      body: { key: index.key, type: index.type, attributes: index.columns, orders: index.orders },
    })
  }
}

for (const table of tables) {
  const base = await ensureCollection(table)
  await ensureAttributes(base, table)
  await ensureIndexes(base, table)
  console.log(`✓ ${table.$id}`)
}
for (const table of extendedTables) {
  const base = collectionBase(table)
  await request(base)
  await ensureAttributes(base, table)
  console.log(`✓ ${table.$id} (columns)`)
}
console.log(`Feature tables ready in database ${databaseId}.`)

#!/usr/bin/env node
/**
 * Creates the Appwrite `meals` collection and attributes (server API key required).
 *
 * Usage:
 *   APPWRITE_API_KEY=your_server_key node scripts/setup-meals-collection.mjs
 *
 * Optional env (defaults read from .env when present):
 *   APPWRITE_ENDPOINT          default: EXPO_PUBLIC_APPWRITE_ENDPOINT
 *   APPWRITE_PROJECT_ID        default: EXPO_PUBLIC_APPWRITE_PROJECT_ID
 *   APPWRITE_DATABASE_ID       default: EXPO_PUBLIC_APPWRITE_DATABASE_ID
 *   MEALS_COLLECTION_ID        default: EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID or "meals"
 *   PROFILES_COLLECTION_ID     default: EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID or "users"
 *   MEAL_TYPE_ELEMENTS         comma-separated enum values (must match Console if already set)
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadDotEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    // .env optional for CI
  }
}

loadDotEnv()

const endpoint = (
  process.env.APPWRITE_ENDPOINT ??
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ??
  ''
).replace(/\/$/, '')

const projectId = process.env.APPWRITE_PROJECT_ID ?? process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID
const databaseId = process.env.APPWRITE_DATABASE_ID ?? process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID
const collectionId =
  process.env.MEALS_COLLECTION_ID ??
  process.env.EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID ??
  'meals'
const profilesCollectionId =
  process.env.PROFILES_COLLECTION_ID ??
  process.env.EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ??
  'users'
const apiKey = process.env.APPWRITE_API_KEY

const mealTypeElements = (
  process.env.MEAL_TYPE_ELEMENTS ?? 'Breakfast,Lunch,Dinner,Snack,Other'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const INT_MAX = 9223372036854775807

if (!endpoint || !projectId || !databaseId) {
  console.error('Missing APPWRITE endpoint, project id, or database id. Check .env')
  process.exit(1)
}

if (!apiKey) {
  console.error(
    'Missing APPWRITE_API_KEY. Create a server API key with databases.write scope in Appwrite Console.',
  )
  process.exit(1)
}

async function appwrite(path, { method = 'GET', body } = {}) {
  const url = `${endpoint}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      'X-Appwrite-Response-Format': '1.8.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    const msg = data?.message ?? text ?? res.statusText
    const err = new Error(`${method} ${path} → ${res.status}: ${msg}`)
    err.status = res.status
    err.payload = data
    throw err
  }

  return data
}

async function waitForAttribute(key, { attempts = 30, delayMs = 1000 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const attr = await appwrite(
      `/databases/${databaseId}/collections/${collectionId}/attributes/${key}`,
    )
    if (attr?.status === 'available') {
      console.log(`  ✓ ${key} available`)
      return
    }
    console.log(`  … ${key} status: ${attr?.status ?? 'unknown'}, waiting`)
    await new Promise((r) => setTimeout(r, delayMs))
  }
  throw new Error(`Timed out waiting for attribute "${key}"`)
}

async function ensureCollection() {
  try {
    await appwrite(`/databases/${databaseId}/collections/${collectionId}`)
    console.log(`Collection "${collectionId}" already exists`)
    return
  } catch (err) {
    if (err.status !== 404) throw err
  }

  console.log(`Creating collection "${collectionId}"…`)
  await appwrite(`/databases/${databaseId}/collections`, {
    method: 'POST',
    body: {
      collectionId,
      name: 'Meals',
      permissions: ['create("users")'],
      documentSecurity: true,
      enabled: true,
    },
  })
  console.log('  ✓ collection created (Users → Create, document security ON)')
}

async function listAttributeKeys() {
  const res = await appwrite(
    `/databases/${databaseId}/collections/${collectionId}/attributes`,
  )
  return new Set((res?.attributes ?? res?.documents ?? []).map((a) => a.key))
}

async function createAttributeIfMissing(existing, key, createFn) {
  if (existing.has(key)) {
    console.log(`  skip ${key} (exists)`)
    return
  }
  await createFn()
  await waitForAttribute(key)
}

async function ensureAttributes() {
  const existing = await listAttributeKeys()

  await createAttributeIfMissing(existing, 'owner', () =>
    appwrite(`/databases/${databaseId}/collections/${collectionId}/attributes/relationship`, {
      method: 'POST',
      body: {
        key: 'owner',
        relatedCollectionId: profilesCollectionId,
        type: 'manyToOne',
        twoWay: true,
        twoWayKey: 'meals',
        onDelete: 'cascade',
      },
    }).then(() => console.log('  + owner (manyToOne → users, twoWay meals)')),
  )

  await createAttributeIfMissing(existing, 'friendlyname', () =>
    appwrite(`/databases/${databaseId}/collections/${collectionId}/attributes/text`, {
      method: 'POST',
      body: { key: 'friendlyname', required: false, array: false },
    }).then(() => console.log('  + friendlyname (text)')),
  )

  await createAttributeIfMissing(existing, 'type', () =>
    appwrite(`/databases/${databaseId}/collections/${collectionId}/attributes/enum`, {
      method: 'POST',
      body: {
        key: 'type',
        elements: mealTypeElements,
        required: false,
        array: false,
      },
    }).then(() => console.log(`  + type (enum: ${mealTypeElements.join(', ')})`)),
  )

  const intFields = [
    ['kcal', 0, 50000],
    ['protein', 0, INT_MAX],
    ['carbs', 0, INT_MAX],
    ['fat', 0, INT_MAX],
    ['fluid', 0, INT_MAX],
  ]

  for (const [key, min, max] of intFields) {
    await createAttributeIfMissing(existing, key, () =>
      appwrite(`/databases/${databaseId}/collections/${collectionId}/attributes/integer`, {
        method: 'POST',
        body: { key, required: false, min, max, array: false },
      }).then(() => console.log(`  + ${key} (integer ${min}–${max})`)),
    )
  }

  await createAttributeIfMissing(existing, 'nutrient_density_score', () =>
    appwrite(`/databases/${databaseId}/collections/${collectionId}/attributes/float`, {
      method: 'POST',
      body: {
        key: 'nutrient_density_score',
        required: false,
        min: 0,
        max: 100,
        array: false,
      },
    }).then(() => console.log('  + nutrient_density_score (float 0–100)')),
  )

  await createAttributeIfMissing(existing, 'items', () =>
    appwrite(`/databases/${databaseId}/collections/${collectionId}/attributes/text`, {
      method: 'POST',
      body: { key: 'items', required: false, array: true },
    }).then(() => console.log('  + items (text array — barcodes)')),
  )
}

async function main() {
  console.log('Appwrite meals collection setup')
  console.log(`  endpoint:   ${endpoint}`)
  console.log(`  project:    ${projectId}`)
  console.log(`  database:   ${databaseId}`)
  console.log(`  collection: ${collectionId}`)
  console.log(`  owner →    ${profilesCollectionId}`)
  console.log('')

  await ensureCollection()
  await ensureAttributes()

  console.log('\nDone. Set EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID=meals in .env if not already.')
}

main().catch((err) => {
  console.error('\nSetup failed:', err.message)
  if (err.payload) console.error(JSON.stringify(err.payload, null, 2))
  process.exit(1)
})

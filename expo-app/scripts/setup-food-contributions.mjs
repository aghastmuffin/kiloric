#!/usr/bin/env node
/**
 * Legacy food_contributions setup via REST API.
 * Prefer: npm run appwrite:push-tables (see docs/appwrite/food-contributions.md)
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadPublicAppEnv() {
  for (const filename of ['.env']) {
    try {
      const raw = readFileSync(resolve(process.cwd(), filename), 'utf8')
      for (const line of raw.split('\n')) {
        const [rawKey, ...rest] = line.split('=')
        const key = rawKey?.trim()
        if (!key?.startsWith('EXPO_PUBLIC_') || process.env[key] !== undefined) continue
        process.env[key] = rest.join('=').trim().replace(/^(['"])(.*)\1$/, '$2')
      }
    } catch {
      // optional
    }
  }
}

loadPublicAppEnv()

const endpoint = (
  process.env.APPWRITE_ENDPOINT ??
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ??
  ''
).replace(/\/$/, '')
const projectId = process.env.APPWRITE_PROJECT_ID ?? process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID
const databaseId =
  process.env.APPWRITE_FOODS_DATABASE_ID ??
  process.env.EXPO_PUBLIC_APPWRITE_FOODS_DATABASE_ID ??
  '6a4577f00008c718d204'
const collectionId =
  process.env.FOOD_CONTRIBUTIONS_COLLECTION_ID ??
  process.env.EXPO_PUBLIC_APPWRITE_FOOD_CONTRIBUTIONS_COLLECTION_ID ??
  'food_contributions'
const apiKey = process.env.APPWRITE_API_KEY

if (!endpoint || !projectId || !databaseId || !apiKey) {
  console.error('Missing endpoint, project, foods database, or APPWRITE_API_KEY.')
  process.exit(1)
}

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
    error.payload = payload
    throw error
  }
  return payload
}

const base = `/databases/${databaseId}/collections/${collectionId}`

const stringAttrs = [
  ['owner', 64, true],
  ['status', 32, false, 'pending'],
  ['photo_file_id', 64, true],
  ['source_query', 256, false],
  ['code', 64, false],
  ['product_name', 256, true],
  ['brands', 256, false],
  ['categories', 512, false],
  ['quantity', 128, false],
  ['serving_size', 128, false],
  ['allergens', 512, false],
  ['traces_tags', 512, false],
  ['image_url', 1024, false],
  ['nutriscore_grade', 8, false],
  ['ecoscore_grade', 8, false],
]

const floatAttrs = [
  'serving_quantity',
  'nova_group',
  'additives_n',
  'carbon_footprint_100g',
  'energy_kcal_100g',
  'energy_kj_100g',
  'proteins_100g',
  'carbohydrates_100g',
  'fat_100g',
  'fiber_100g',
  'sugars_100g',
  'added_sugars_100g',
  'polyols_100g',
  'saturated_fat_100g',
  'trans_fat_100g',
  'monounsaturated_fat_100g',
  'polyunsaturated_fat_100g',
  'sodium_100g',
  'cholesterol_100g',
  'vitamin_a_100g',
  'vitamin_c_100g',
  'vitamin_d_100g',
  'vitamin_b12_100g',
  'calcium_100g',
  'iron_100g',
  'potassium_100g',
  'magnesium_100g',
  'caffeine_100g',
  'taurine_100g',
]

async function ensureCollection() {
  try {
    const existing = await request(base)
    if (!existing.documentSecurity) {
      throw new Error('food_contributions must have document security enabled.')
    }
    console.log('Collection already exists:', collectionId)
    return existing
  } catch (error) {
    if (error.status !== 404) throw error
  }

  await request(`/databases/${databaseId}/collections`, {
    method: 'POST',
    body: {
      collectionId,
      name: 'Food contributions',
      documentSecurity: true,
      permissions: ['create("users")'],
      enabled: true,
    },
  })
  console.log('Created collection', collectionId)
}

async function ensureStringAttribute(key, size, required, defaultValue) {
  try {
    await request(`${base}/attributes/string`, {
      method: 'POST',
      body: {
        key,
        size,
        required,
        default: required ? undefined : defaultValue ?? null,
        array: false,
      },
    })
    console.log('  + string', key)
  } catch (error) {
    if (error.status === 409) return
    throw error
  }
}

async function ensureFloatAttribute(key) {
  try {
    await request(`${base}/attributes/float`, {
      method: 'POST',
      body: {
        key,
        required: false,
        default: null,
        min: -1e12,
        max: 1e12,
        array: false,
      },
    })
    console.log('  + float', key)
  } catch (error) {
    if (error.status === 409) return
    throw error
  }
}

await ensureCollection()
for (const [key, size, required, def] of stringAttrs) {
  await ensureStringAttribute(key, size, required, def)
}
for (const key of floatAttrs) {
  await ensureFloatAttribute(key)
}
console.log('Done. Wait for attributes to become available in the Console before writing.')

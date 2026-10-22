#!/usr/bin/env node
/**
 * Legacy water_logs setup via REST API.
 * Prefer: npm run appwrite:push-tables (see docs/appwrite/water.md)
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
      // App environment file is optional.
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
const databaseId = process.env.APPWRITE_DATABASE_ID ?? process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID
const collectionId =
  process.env.WATER_COLLECTION_ID ??
  process.env.EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID ??
  'water_logs'
const apiKey = process.env.APPWRITE_API_KEY

if (!endpoint || !projectId || !databaseId || !apiKey) {
  console.error('Missing endpoint, project, database, or APPWRITE_API_KEY.')
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
    throw error
  }
  return payload
}

const base = `/databases/${databaseId}/collections/${collectionId}`

async function ensureCollection() {
  try {
    const existing = await request(base)
    if (!existing.documentSecurity) {
      throw new Error('Existing water_logs collection must have document security enabled.')
    }
    const unsafe = (existing.$permissions ?? []).filter(
      (permission) => !permission.startsWith('create("users")'),
    )
    if (unsafe.length > 0) {
      throw new Error(`Unsafe collection permissions found: ${unsafe.join(', ')}`)
    }
    return
  } catch (error) {
    if (error.status !== 404) throw error
  }
  await request(`/databases/${databaseId}/collections`, {
    method: 'POST',
    body: {
      collectionId,
      name: 'Water logs',
      permissions: ['create("users")'],
      documentSecurity: true,
      enabled: true,
    },
  })
}

async function waitForAttribute(key) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const attribute = await request(`${base}/attributes/${key}`)
    if (attribute.status === 'available') return
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000))
  }
  throw new Error(`Timed out waiting for ${key}`)
}

async function ensureAttributes() {
  const response = await request(`${base}/attributes`)
  const keys = new Set((response.attributes ?? []).map((attribute) => attribute.key))
  const create = async (key, path, body) => {
    if (keys.has(key)) return
    await request(`${base}/attributes/${path}`, { method: 'POST', body: { key, ...body } })
    await waitForAttribute(key)
  }
  await create('owner', 'string', { size: 64, required: true, array: false })
  await create('amount_ml', 'integer', {
    required: true,
    min: 25,
    max: 4000,
    array: false,
  })
  await create('consumed_at', 'datetime', { required: true, array: false })
}

async function ensureIndexes() {
  const response = await request(`${base}/indexes`)
  if ((response.indexes ?? []).some((index) => index.key === 'owner_consumed_at')) return
  await request(`${base}/indexes`, {
    method: 'POST',
    body: {
      key: 'owner_consumed_at',
      type: 'key',
      attributes: ['owner', 'consumed_at'],
      orders: ['ASC', 'DESC'],
    },
  })
}

await ensureCollection()
await ensureAttributes()
await ensureIndexes()
console.log(`Water collection "${collectionId}" is ready.`)

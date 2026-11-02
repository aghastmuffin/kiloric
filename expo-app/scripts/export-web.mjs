import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { injectStaticRouteNormalization } from './export-web-utils.mjs'

const appDir = fileURLToPath(new URL('../', import.meta.url))
const output = fileURLToPath(new URL('../../website/app/', import.meta.url))
const basePath = process.env.KILORIC_BASE_PATH || '/app'
const result = spawnSync(process.execPath, ['node_modules/expo/bin/cli', 'export', '--platform', 'web', '--max-workers', '2', '--output-dir', output], {
  cwd: appDir,
  env: { ...process.env, EXPO_NO_TELEMETRY: '1', KILORIC_BASE_PATH: basePath, EXPO_PUBLIC_API_URL: 'https://api.kiloric.co' },
  stdio: 'inherit',
})
if (result.status !== 0) process.exit(result.status || 1)
writeFileSync(new URL('../../website/app/.nojekyll', import.meta.url), '')
writeFileSync(new URL('../../website/app/release.json', import.meta.url), JSON.stringify({
  release: 'b-1', version: '1.0.0-beta.1', api: 'https://api.kiloric.co/v1',
  basePath,
}, null, 2) + '\n')
// Directory indexes keep hard refreshes working on GitHub Pages for extensionless routes.
const { readdirSync } = await import('node:fs')
function addIndexes(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { addIndexes(`${dir}/${entry.name}`); continue }
    if (!entry.name.endsWith('.html') || ['index.html', '404.html', '+not-found.html'].includes(entry.name)) continue
    const route = `${dir}/${entry.name.slice(0, -5)}`
    mkdirSync(route, { recursive: true })
    writeFileSync(`${route}/index.html`, readFileSync(`${dir}/${entry.name}`))
  }
}
addIndexes(output)

// Normalize direct .html URLs before Expo Router reads the browser location.
function normalizeRoutes(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) { normalizeRoutes(path); continue }
    if (!entry.name.endsWith('.html')) continue
    const html = readFileSync(path, 'utf8')
    writeFileSync(path, injectStaticRouteNormalization(html, basePath))
  }
}
normalizeRoutes(output)

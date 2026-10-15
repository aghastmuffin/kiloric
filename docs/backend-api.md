# Backend API (Oracle / FastAPI)

Food and barcode data come from a **FastAPI backend**, not Appwrite. The app authenticates with a **JWT minted from the active Appwrite session**.

## Base URL

```
https://calcount.taeson.co
```

Defined via `src/lib/apiBackendPreferences.ts` and requested through `src/lib/apiUtils.ts`.

## Authenticated requests

```ts
import { authenticatedRequest } from '@/lib/apiUtils'

const data = await authenticatedRequest('/api/barcode/012345678905')
const results = await authenticatedRequest(`/api/fuzzy/${encodeURIComponent(query)}`)
```

### How it works

1. `getAccessToken()` calls `account.createJWT()` on the Appwrite client.
2. Request sends `Authorization: Bearer <jwt>` and `Content-Type: application/json`.
3. On failure, `showApiError(..., 'oracle')` displays a toast via `ApiErrorProvider`.
4. Throws `ApiRequestError` so callers can catch without double-toasting.

### When to use JWT vs Appwrite session

| Target | Auth mechanism |
|--------|----------------|
| Appwrite Databases | Session on `client` (via `signIn` / `restoreAppwriteSession`) |
| FastAPI backend | JWT from `getAccessToken()` |

## Endpoints used in the app

| Method | Path | Used by |
|--------|------|---------|
| GET | `/api/barcode/:code` | Log tab, camera scan, product detail (`Additions`) |
| GET | `/api/fuzzy/:query` | Log tab text search |

Response shapes vary; screens defensively read common keys (`product_name`, `code`, `barcode`, `calories`, etc.).

## Error handling

- HTTP errors: message extracted from `detail`, `message`, or `error` JSON fields (`formatOracleError`).
- Network errors: shown in toast + logged to console.
- Missing login: *"No active login session found. Please log in."*

Users must be signed in to Appwrite before backend calls succeed.

## Testing JWT from Account tab

The logged-in Account panel includes a dev action to copy/verify the JWT (`getAccessToken`) for debugging backend auth.

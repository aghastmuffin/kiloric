# Kiloric API

Account and user-created data are handled exclusively by the FastAPI service. Access and refresh tokens come from its auth endpoints and every user-data request uses the bearer access token.

## Base URL

```
https://api.kiloric.co
```

Defined via `src/lib/apiBackendPreferences.ts` and requested through `src/lib/apiUtils.ts`.

## Authenticated requests

```ts
import { authenticatedRequest } from '@/lib/apiUtils'

const data = await authenticatedRequest('/api/barcode/012345678905')
const results = await authenticatedRequest(`/api/fuzzy/${encodeURIComponent(query)}`)
```

### How it works

1. `getAccessToken()` reads the current FastAPI access token.
2. Request sends `Authorization: Bearer <jwt>` and `Content-Type: application/json`.
3. On failure, `showApiError(..., 'oracle')` displays a toast via `ApiErrorProvider`.
4. Throws `ApiRequestError` so callers can catch without double-toasting.

All authenticated endpoints use the same bearer token. A 401 triggers one refresh-token rotation and one retry.

## Endpoints used in the app

| Method | Path | Used by |
|--------|------|---------|
| GET | `/api/barcode/:code` | Log tab, camera scan, product detail (`additions`) |
| GET | `/api/fuzzy/:query` | Log tab text search |

Response shapes vary; screens defensively read common keys (`product_name`, `code`, `barcode`, `calories`, etc.).

## Error handling

- HTTP errors: message extracted from `detail`, `message`, or `error` JSON fields (`formatOracleError`).
- Network errors: shown in toast + logged to console.
- Missing login: *"No active login session found. Please log in."*

Users must be signed in before protected requests succeed.

## Testing JWT from Account tab

The logged-in Account panel includes a dev action to copy/verify the JWT (`getAccessToken`) for debugging backend auth.

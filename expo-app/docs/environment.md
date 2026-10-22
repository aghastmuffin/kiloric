# Environment variables

Copy `.env.example` to `.env` at the project root. All public vars use the `EXPO_PUBLIC_` prefix so Metro can inline them at build time.

**After any `.env` change, restart with a clean cache:**

```bash
npx expo start -c
```

## Required — Appwrite

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_APPWRITE_ENDPOINT` | e.g. `https://nyc.cloud.appwrite.io/v1` |
| `EXPO_PUBLIC_APPWRITE_PROJECT_ID` | Appwrite project ID |
| `EXPO_PUBLIC_APPWRITE_PLATFORM_ID` | Native app ID — `co.taeson.kiloric` (bundle / package name) |
| `EXPO_PUBLIC_APPWRITE_DATABASE_ID` | Database containing profile collection |
| `EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID` | Profile collection ID (typically `users`) |

## Optional — Appwrite

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_APPWRITE_PLATFORM_WEB` | Web platform hostname if registered separately in Appwrite |
| `EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID` | Meals table ID (typically `meals`) |
| `EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID` | Water logs table ID (typically `water_logs`) |

## Example

```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
EXPO_PUBLIC_APPWRITE_PLATFORM_ID=co.taeson.kiloric
EXPO_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID=users
EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID=meals
EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID=water_logs
```

## Validation

`src/lib/appwrite.ts` throws at import time if endpoint or project ID is missing — you'll see the error immediately in Metro if `.env` is incomplete.

## Security

- Never commit `.env` (listed in `.gitignore`).
- `EXPO_PUBLIC_*` values are embedded in the client bundle — only use them for non-secret IDs and public endpoints.
- User passwords and session secrets stay in Appwrite / AsyncStorage on device, not in env files.

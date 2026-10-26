# Environment variables

Copy `.env.example` to `.env` at the project root. All public vars use the `EXPO_PUBLIC_` prefix so Metro can inline them at build time.

**After any `.env` change, restart with a clean cache:**

```bash
npx expo start -c
```

## Required

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | API origin, for example `https://api.kiloric.co` |

## Example

```env
EXPO_PUBLIC_API_URL=https://api.kiloric.co
```

## Validation

If the variable is omitted, `src/lib/apiClient.ts` uses `https://api.kiloric.co`.

## Security

- Never commit `.env` (listed in `.gitignore`).
- `EXPO_PUBLIC_*` values are embedded in the client bundle — only use them for non-secret IDs and public endpoints.
- Passwords are sent only to the API over HTTPS. Access and refresh tokens are stored in AsyncStorage, not in env files.

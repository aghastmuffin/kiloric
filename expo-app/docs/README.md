# kiloric — project documentation

## Quick start

1. Copy `.env.example` → `.env` and set the Kiloric API URL.
2. `npm install` then `npx expo start -c` (clear cache after env changes).
3. Sign in on the **Account** tab; complete onboarding if prompted.

## Documentation index

| Topic | File |
|-------|------|
| App structure, staging flow, providers | [architecture.md](./architecture.md) |
| Environment variables | [environment.md](./environment.md) |
| FastAPI backend (`authenticatedRequest`) | [backend-api.md](./backend-api.md) |
| Kiloric API contracts and authentication | [backend-api.md](./backend-api.md) |
| `src/lib/*` and API Caching | [lib-reference.md](./lib-reference.md) |
| Reusable components | [components.md](./components.md) |
| Screens and routes | [screens-and-routing.md](./screens-and-routing.md) |
| Onboarding wizard + nutrition math | [onboarding-and-nutrition.md](./onboarding-and-nutrition.md) |
| Themes, fonts, and local preferences | [preferences-and-fonts.md](./preferences-and-fonts.md) |
| Food database build (USDA, CNF, Open Food Facts → SQL) | [../food-data/README.md](../food-data/README.md) |

## Source layout

```
src/
  app/           Expo Router screens (file-based routing)
  components/    Shared UI
  lib/           Auth, server persistence, profile, nutrition, preferences, API helpers
  styles/        Shared StyleSheet tokens
assets/
  fonts/         Custom font files (Redaction)
docs/            This documentation (safe for Expo)
food-data/       Python pipeline that builds the food catalog SQL database
```

## External services

| Service | Role |
|---------|------|
| **Kiloric FastAPI service** (`api.kiloric.co`) | Auth, profiles, user data, uploads, and exports |
| **Food search APIs** | Barcode lookup and fuzzy food search using the same bearer session |

## Related files not in `docs/`

- `.env.example` — template for required env vars
- `eas.json` — EAS Build profiles (`development`, `preview`, `production`)

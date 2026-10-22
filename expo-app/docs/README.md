# kiloric — project documentation

## Quick start

1. Copy `.env.example` → `.env` and fill in Appwrite values.
2. `npm install` then `npx expo start -c` (clear cache after env changes).
3. Sign in on the **Account** tab; complete onboarding if prompted.

## Documentation index

| Topic | File |
|-------|------|
| App structure, staging flow, providers | [architecture.md](./architecture.md) |
| Environment variables | [environment.md](./environment.md) |
| FastAPI backend (`authenticatedRequest`) | [backend-api.md](./backend-api.md) |
| Appwrite auth + database patterns | [appwrite/auth-and-db.md](./appwrite/auth-and-db.md) |
| Appwrite `users` profile collection | [appwrite/profiles.md](./appwrite/profiles.md) |
| Appwrite `meals` collection | [appwrite/meals.md](./appwrite/meals.md) |
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
  lib/           Auth, Appwrite, profile, nutrition, preferences, API helpers
  styles/        Shared StyleSheet tokens
assets/
  fonts/         Custom font files (Redaction)
docs/            This documentation (safe for Expo)
food-data/       Python pipeline that builds the food catalog SQL database
```

## External services

| Service | Role |
|---------|------|
| **Appwrite** | Email/password auth, user profile documents |
| **FastAPI backend** (`kiloric.kiloric.co`) | Barcode lookup, fuzzy food search (JWT from Appwrite session) |

## Related files not in `docs/`

- `.env.example` — template for required env vars
- `how-to-supabase.md` — legacy/alternate backend notes (not used by current Appwrite setup)
- `eas.json` — EAS Build profiles (`development`, `preview`, `production`)

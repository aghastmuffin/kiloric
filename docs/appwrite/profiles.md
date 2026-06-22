# Appwrite profile collection setup

Collection ID: **`users`** (set `EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID=users` in `.env`).

## Schema (must match Console)

| Column | Type | Required | App writes |
|--------|------|----------|------------|
| `$id` | string | auto | Auth user `$id` as document ID |
| `username` | string (64) | yes | yes |
| `email` | email | yes | yes |
| `dateOfBirth` | datetime | yes | yes |
| `lastLogin` | datetime | no | yes |
| `bio` | string (512) | no | yes |
| `country` | string (2) | no | yes |
| `weight` | double 0–1000 | yes | yes (metric kg) |
| `height` | double 0–300 | yes | yes (metric cm) |
| `role` | enum | yes | yes — value must be `user` |
| `meals` | relationship (many-to-one) | no | **no** — link meal doc IDs later |
| `target_kcal` | integer | no | yes |
| `target_protein` | integer | no | yes |
| `target_carbs` | integer | no | yes |
| `target_fat` | integer | no | yes |
| `daily_fluid` | integer | no | yes |
| `TDEE` | integer | no | yes |
| `goal_plain` | text | no | yes (includes diet + `· units:metric/imperial`) |
| `target_weight` | integer | no | yes (metric kg, rounded) |
| `weekly_deficit` | integer | no | yes |

## Permissions

**Settings → Document security:** ON

**Settings → Permissions:**

| Role | Create | Read | Update | Delete |
|------|:------:|:----:|:------:|:------:|
| Users | ✓ | — | — | — |

Row-level read/update/delete are set on each document for `Role.user(userId)`.

## Common errors

| Error | Cause |
|-------|--------|
| `404 document_not_found` on GET | Normal for new users (no profile yet) |
| `401` … `action 'create'` | Missing **Users → Create** on collection |
| `400 relationship_value_invalid` | Sent text into `meals` (relationship) — app skips this field now |
| Enum error on `role` | Console enum must include `user` |

## Env vars

```
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=
EXPO_PUBLIC_APPWRITE_PLATFORM_ID=co.taeson.calcount
EXPO_PUBLIC_APPWRITE_DATABASE_ID=
EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID=users
```

Restart Expo after changes: `npx expo start -c`.

## App-side helpers

See `src/lib/profile.ts`:

- `getProfile(userId)` — returns `null` on 404
- `saveProfileFields(userId, partial)` — upsert with type normalization
- `isProfileComplete(profile)` — gates onboarding
- `normalizeProfileWritePayload()` — rounds integers, skips relationship fields
- `formatProfileSaveError()` — user-facing Appwrite error text

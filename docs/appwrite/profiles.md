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
| `goal_plain` | text | no | yes — **legacy/human-readable only** |
| `target_weight` | integer | no | yes — **legacy**, metric kg, rounded |
| `weekly_deficit` | integer | no | yes — **legacy**, kcal/week |
| `goal_type` | enum (`lose` / `maintain` / `gain`) | no | yes |
| `goal_pace_kg_per_week` | double | no | yes — signed; negative = loss, positive = gain |
| `goal_start_weight_kg` | double | no | yes — body weight when goal was created |
| `goal_target_weight_kg` | double | no | yes — desired body weight |
| `goal_start_date` | datetime | no | yes — ISO 8601 goal creation timestamp |
| `goal_estimated_weeks` | integer | no | yes — estimated weeks to reach target at pace |
| `sex` | enum (`female` / `male`) | no | yes — BMR input |
| `activity_level` | enum (`sedentary` / `light` / `moderate` / `active` / `very_active`) | no | yes |
| `body_fat_pct` | double 3–60 | no | yes — optional; switches BMR to Katch–McArdle |
| `diet_style` | enum (`balanced` / `high_protein` / `low_carb` / `mediterranean` / `plant_forward` / `custom`) | no | yes |
| `goal_pace` | enum (`gentle` / `moderate` / `aggressive`) | no | yes — preset, not kg |
| `bmr` | integer 0–10000 | no | yes |
| `formula_version` | integer 0–1000 | no | yes — currently `5` |

The last seven columns are optional. If they haven't been created yet, Appwrite rejects the write with `document_invalid_structure` ("Unknown attribute"). `saveProfileFields` then retries without them and remembers that for the session. The app reads the same values from account prefs (`kiloricPlan`, falling back to `calcountPlan`), so nothing is lost. To add them, run `APPWRITE_API_KEY=... npm run appwrite:setup-features`.

## Goal state

`src/lib/goals.ts` defines the canonical `GoalState` type and progress math. New profiles should populate the `goal_*` columns. The app still reads legacy `target_weight` and `weekly_deficit` rows through `resolveGoalState()`, so old data keeps working until the user re-saves their profile.

The schema in `appwrite.config.json` already includes the new `goal_*` columns. Apply it to Appwrite Console (or re-deploy your project config) so the app can write them. If you see `400 attribute_not_found` on save, the columns have not been applied yet.

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

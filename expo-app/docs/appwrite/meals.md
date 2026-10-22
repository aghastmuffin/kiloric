# Appwrite meals collection

Collection ID: **`meals`** (`EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID=meals`).

## Schema

| Column | Type | Required | App writes | Notes |
|--------|------|----------|------------|-------|
| `$id` | string | auto | — | Unique meal document id |
| `owner` | relationship (many-to-one → `users`) | no* | yes | Profile / auth user id |
| `friendlyname` | text | no | yes | Display name |
| `type` | enum | no | yes | See enum values below |
| `kcal` | integer 0–50000 | no | yes | |
| `protein` | integer ≥ 0 | no | yes | |
| `carbs` | integer ≥ 0 | no | yes | |
| `fat` | integer ≥ 0 | no | yes | |
| `nutrient_density_score` | float 0–100 | no | yes | |
| `fluid` | integer ≥ 0 | no | yes | ml |
| `items` | text array | no | yes | Barcodes for logged items |
| `$createdAt` | datetime | auto | — | |
| `$updatedAt` | datetime | auto | — | |

\* `owner` should always be set when creating from the app.

### `type` enum (default setup script values)

`Breakfast`, `Lunch`, `Dinner`, `Snack`, `Other`

Update `MEAL_TYPE_OPTIONS` in `src/lib/meals.ts` if your Console enum differs.

### `owner` relationship

- **Type:** many-to-one → `users` collection
- **Two-way key on profiles:** `meals` (links meal documents to profile)
- **On delete:** cascade

Pass the profile document id (same as Appwrite Auth `user.$id`) when creating a meal.

## Permissions

**Document security:** ON

**Collection permissions:**

| Role | Create | Read | Update | Delete |
|------|:------:|:----:|:------:|:------:|
| Users | ✓ | — | — | — |

Each document gets read/update/delete for `Role.user(ownerId)` on create (see `createMeal` in `src/lib/meals.ts`).

**Indexes:** none on `owner` — Appwrite does not allow indexes on relationship attributes. Meal list queries fall back to client-side date filtering when needed (`getTodayMeals` / `listHistoricMeals`).

## Create collection via script

Requires a **server API key** with `databases.write` (never put this in the Expo app):

```bash
APPWRITE_API_KEY=your_server_key node scripts/setup-meals-collection.mjs
```

Reads project/database ids from `.env`. Override enum values:

```bash
MEAL_TYPE_ELEMENTS=Breakfast,Lunch,Dinner,Snack,Other APPWRITE_API_KEY=... node scripts/setup-meals-collection.mjs
```

## Create a meal from the app

```ts
import { createMeal } from '@/lib/meals'
import { useAuth } from '@/lib/AuthContext'

const { user } = useAuth()

await createMeal({
  owner: user!.$id,
  friendlyname: 'Greek yogurt',
  type: 'Breakfast',
  kcal: 150,
  protein: 15,
  carbs: 8,
  fat: 4,
  nutrient_density_score: 72,
  fluid: 0,
})
```

## Common errors

| Error | Cause |
|-------|--------|
| `401` on create | Missing **Users → Create** on meals collection |
| `relationship_value_invalid` on `owner` | Invalid profile id |
| Enum error on `type` | Value not in Console enum |
| `400` integer out of range | kcal > 50000 or negative macros |

## Env

```env
EXPO_PUBLIC_APPWRITE_MEALS_COLLECTION_ID=meals
```

Server-only (setup script):

```env
APPWRITE_API_KEY=your_server_api_key
```

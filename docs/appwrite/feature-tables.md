# Feature tables

The Today, Plan, Log food, Train and Progress screens store their data in eight
owner-scoped tables in the `main` database. Their schema lives in
[`appwrite.config.json`](../../appwrite.config.json).

| Table ID | Used by | Notes |
| --- | --- | --- |
| `food_entries` | Log food, Review & log, Today | One row per logged food. The per-day `meals` documents keep holding the daily totals; each entry links to its bucket via `meal_doc_id`. |
| `saved_meals` | Log food → My meals, plan auto-fill | `items_json` holds the foods in the meal. |
| `meal_plan_entries` | Plan, Today's plan | `day` is a local `YYYY-MM-DD`. Checking an entry for today logs it to the food log. |
| `prep_sessions` | Plan, dashboard prep card | One per week (`week_start` = Monday). `items_json` is `[{ name, portions }]`. |
| `grocery_items` | Grocery list | Scoped to `week_start`. |
| `workouts` | Train, Today's plan | `status` is `planned` → `active` → `done`. `kcal_burned` (MET 5 estimate) is added back to today's budget. |
| `workout_sets` | Train session | Weights are stored in kg; the UI converts for imperial users. |
| `weight_logs` | Progress, dashboard | Logging a weight also updates `users.weight`. |

Every table uses `create("users")` with row security, an `owner` varchar column,
and per-row `read/update/delete` permissions for the owner only.

## Provisioning

```bash
APPWRITE_API_KEY=... npm run appwrite:setup-features
# or, with the Appwrite CLI logged in:
npm run appwrite:push-tables
```

The script is idempotent and reads the table definitions from
`appwrite.config.json`.

## Before the tables exist

`src/lib/data/recordStore.ts` detects `collection_not_found` and keeps each
user's records in their Appwrite account prefs under `cc_<tableId>` (bounded
per table, about 60 KB in total) so every feature still syncs through Appwrite.
After a table is provisioned, the next read copies the parked records into it
and clears the prefs key.

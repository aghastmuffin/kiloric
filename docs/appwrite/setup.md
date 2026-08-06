# Appwrite setup (CLI)

This project keeps infrastructure in [`appwrite.config.json`](../../appwrite.config.json). Use the [Appwrite CLI](https://appwrite.io/docs/tooling/command-line/installation) to deploy and verify resources.

## Prerequisites

```bash
# Install (macOS)
brew install appwrite

# Log in and link project (once per machine)
appwrite login
appwrite client \
  --endpoint https://nyc.cloud.appwrite.io/v1 \
  --project-id 6a32cb15000698f57e0e
```

## Deploy tables

Tables in the `main` database (`6a32d624001ac88a8608`):

| Table ID | Purpose |
| --- | --- |
| `users` | User profiles and nutrition targets |
| `meals` | Logged meals |
| `water_logs` | Daily water intake entries |

```bash
npm run appwrite:push-tables
```

This runs `appwrite push tables --force --all` and applies any schema changes from `appwrite.config.json`.

> **Note:** `water_logs.owner` must stay type `varchar` in config. Using `string` causes the CLI to attempt a destructive column recreate.

## Verify deployment

```bash
# List tables
appwrite tables-db list-tables --database-id 6a32d624001ac88a8608

# Inspect water table
appwrite tables-db get-table \
  --database-id 6a32d624001ac88a8608 \
  --table-id water_logs
```

Expected `water_logs` permissions: `create("users")` with row security enabled. Columns: `owner`, `amount_ml`, `consumed_at`. Index: `owner_consumed_at` on `(owner, consumed_at)`.

## App environment

Copy `.env.example` → `.env` and restart Expo:

```bash
npx expo start -c
```

Required vars are documented in [environment.md](../environment.md). Water tracking needs `EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID=water_logs` (default in code if omitted).

## Related docs

- [profiles.md](./profiles.md) — user profile table
- [meals.md](./meals.md) — meals table
- [water.md](./water.md) — water log table
- [auth-and-db.md](./auth-and-db.md) — client auth + database patterns

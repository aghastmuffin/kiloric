# Appwrite water log table

Table ID: `water_logs` (`EXPO_PUBLIC_APPWRITE_WATER_COLLECTION_ID=water_logs`).

Defined in [`appwrite.config.json`](../../appwrite.config.json) under the `main` database (`6a32d624001ac88a8608`).

## Schema

| Column | Type | Required | Limits |
| --- | --- | --- | --- |
| `owner` | varchar | yes | Auth user ID, max 64 |
| `amount_ml` | integer | yes | 25–4000 |
| `consumed_at` | datetime | yes | ISO 8601 |

## Deploy with Appwrite CLI (recommended)

Prerequisites: [Appwrite CLI](https://appwrite.io/docs/tooling/command-line/installation) logged in and linked to this project (`appwrite init project` or `appwrite client`).

```bash
# Push all tables (users, meals, water_logs) from appwrite.config.json
npm run appwrite:push-tables

# Or push tables only
appwrite push tables --force --all
```

Verify the table exists:

```bash
appwrite tables-db get-table \
  --database-id 6a32d624001ac88a8608 \
  --table-id water_logs
```

## Legacy setup script

If you cannot use the CLI, a compatibility script is available:

```bash
APPWRITE_API_KEY=your_server_key node scripts/setup-water-collection.mjs
```

The server key must be supplied directly to the process or CI secret store. The script only loads `EXPO_PUBLIC_*` identifiers from `.env`.

## Permissions

- Row security (`documentSecurity`) must be enabled.
- Table-level permissions: **Users → Create** only.
- Each row created by the app sets read/update/delete for `Role.user(owner)`.
- Do not grant table-level read/update/delete.

For production hardening, route creation through an authenticated Appwrite Function, derive `owner` from the verified execution user, and remove table-level client Create permission.

## App integration

- Client module: [`src/lib/water.ts`](../../src/lib/water.ts)
- Home UI: quick-add (+250 / +350 / +500 ml) and undo on [`src/app/(tabs)/index.tsx`](../../src/app/(tabs)/index.tsx)
- Daily target comes from profile `daily_fluid` (set during onboarding / plan edit)

Water entries are separate from the meal `fluid` field. They represent independently editable drinks and are grouped into local calendar days by `consumed_at`.

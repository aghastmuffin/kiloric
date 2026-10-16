# How-to: Appwrite auth state + database reads/writes

This app uses **Appwrite Auth** for login and **Appwrite Databases** for user-owned rows (profiles, meals, etc.). The key idea: **the SDK client carries the session**, and **document permissions** decide who can read/update what.

Related docs in this repo:

- [profiles.md](./profiles.md) — profile collection schema + Console permissions
- `src/lib/appwrite.ts` — shared client
- `src/lib/AuthContext.tsx` — React auth state
- `src/lib/profile.ts` — create/read/update profile pattern

---

## 1. Setup (env + client)

`.env` (see [../environment.md](../environment.md) and `.env.example`):

```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
EXPO_PUBLIC_APPWRITE_PLATFORM_ID=co.taeson.calcount
EXPO_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID=users
```

Restart Expo after env changes: `npx expo start -c`.

The shared client lives in `src/lib/appwrite.ts`:

```ts
import { account, databases, client } from '@/lib/appwrite'
```

- `account` — sign in, sign up, `account.get()`, JWT minting
- `databases` — `createDocument`, `getDocument`, `updateDocument`, etc.
- `client` — session is attached here (see below)

`AuthProvider` wraps the app in `src/app/_layout.tsx`, so any screen under it can call `useAuth()`.

---

## 2. How auth state works in the app

### Session on the SDK client

When the user signs in, Appwrite returns a **session secret**. This app:

1. Calls `client.setSession(session.secret)` (`applyAppwriteSession`)
2. Stores the secret in AsyncStorage (`persistAppwriteSession`)
3. On next launch, restores it before `account.get()` (`restoreAppwriteSession`)

File: `src/lib/appwriteSession.ts`

**Every database call uses the same `client`.** If the session is missing or expired, Appwrite returns `401`.

### React auth state (`useAuth`)

File: `src/lib/AuthContext.tsx`

| Field / method | Meaning |
|----------------|---------|
| `user` | Appwrite user object, or `null` if logged out |
| `loading` | `true` while restoring session on startup |
| `user.$id` | Auth user ID — use as profile document ID |
| `user.email` | Email from Auth |
| `signIn(email, password)` | Creates session + sets `user` |
| `signUp(email, password)` | Creates account; may require email verification |
| `signOut()` | Deletes session + clears storage |

### Typical UI pattern

```tsx
import { useAuth } from '@/lib/AuthContext'

function MyScreen() {
  const { user, loading } = useAuth()

  if (loading) {
    return <ActivityIndicator />
  }

  if (!user) {
    return <Text>Sign in on the Account tab.</Text>
  }

  // user.$id is safe to use here
  return <Text>Hello {user.email}</Text>
}
```

Examples in this repo: `src/app/(tabs)/account.tsx`, `src/app/config.tsx`, `src/components/onboarding/OnboardingWizard.tsx`.

### Gate screens that need a logged-in user

`ProfileGate` (`src/components/ProfileGate.tsx`) waits for auth, then loads the profile and redirects to onboarding if incomplete. Wrap tab content when DB-backed setup is required.

---

## 3. Reading auth state outside React

### Current user ID (server-side of the SDK)

```ts
import { account } from '@/lib/appwrite'

const me = await account.get()
console.log(me.$id, me.email)
```

Use this in save helpers before creates. See `assertActiveSession()` in `src/lib/profile.ts`.

### JWT for your own backend (not Appwrite DB)

If you call **your FastAPI backend** (not Appwrite Databases), mint a JWT from the active session:

```ts
import { getAccessToken } from '@/lib/getAccessToken'

const token = await getAccessToken()
// Authorization: Bearer <token>
```

Used in `src/lib/apiUtils.ts` (`authenticatedRequest`).

Appwrite Databases do **not** need JWT — they use the session on `client`.

---

## 4. Database pattern used in this app

### One profile row per auth user

- **Document ID = `user.$id`** (same as Appwrite Auth user id)
- On create, set **document-level permissions** so only that user can read/update/delete

From `src/lib/profile.ts`:

```ts
import { Permission, Role } from 'react-native-appwrite'

function profileDocumentPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}
```

### Collection-level permissions (Appwrite Console)

For users to **create** their own row:

| Role | Create | Read | Update | Delete |
|------|:------:|:----:|:------:|:------:|
| Users | ✓ | — | — | — |

Read/update/delete on **their** row come from document permissions above.

Enable **Document security** on the collection.

### Read a document

```ts
import { getProfile } from '@/lib/profile'

const profile = await getProfile(user.$id)
// null = no row yet (404 is normal for new users)
```

### Create vs update (upsert-style)

Prefer a helper instead of calling create/update from every screen. This app uses `saveProfileFields(userId, partialFields)`:

1. `getProfile(userId)` — if exists → `updateDocument` with only changed fields
2. If missing → validate required fields → `createDocument` with permissions
3. Optionally patch extra optional fields in a second update

Call it from the UI **after** you know `user.$id`:

```tsx
const { user } = useAuth()

async function handleSave() {
  if (!user?.$id) return

  await saveProfileFields(user.$id, {
    username: 'levi',
    email: user.email ?? '',
    dateOfBirth: dateInputToIso('1990-01-15'),
    weight: 75,
    height: 180,
    role: 'user',
    bio: 'Hello',
  })
}
```

See `src/app/config.tsx` and `src/components/onboarding/OnboardingWizard.tsx`.

### Low-level create / update (new collections)

```ts
import { databases } from '@/lib/appwrite'
import { ID, Permission, Role } from 'react-native-appwrite'

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!
const COLLECTION_ID = 'meals'

// CREATE — pass userId for permissions + documentId strategy
await databases.createDocument({
  databaseId: DATABASE_ID,
  collectionId: COLLECTION_ID,
  documentId: ID.unique(), // or user.$id if one row per user
  data: {
    title: 'Breakfast',
    ownerId: userId, // optional attribute for queries / rules
  },
  permissions: [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ],
})

// UPDATE — user must own the doc (document permissions)
await databases.updateDocument({
  databaseId: DATABASE_ID,
  collectionId: COLLECTION_ID,
  documentId: mealDocId,
  data: { title: 'Lunch' },
})

// READ
const doc = await databases.getDocument({
  databaseId: DATABASE_ID,
  collectionId: COLLECTION_ID,
  documentId: mealDocId,
})
```

Always call these **after** the user is signed in and the session is on `client` (normal app flow after `signIn` or `restoreAppwriteSession`).

---

## 5. Checklist: adding a new collection

1. **Console** — create collection + attributes; enable Document security.
2. **Console permissions** — grant **Users → Create** (and any team/admin rules you need).
3. **`.env`** — add `EXPO_PUBLIC_APPWRITE_*` id if new database/collection.
4. **`src/lib/yourModule.ts`** — wrap `databases.*` calls; normalize types; set `Permission.read/update/delete(Role.user(userId))` on create.
5. **UI** — `const { user, loading } = useAuth()`; bail if `!user`; pass `user.$id` into helpers.
6. **Errors** — catch `AppwriteException`; log `code`, `type`, `message` (see `logAppwriteError` in `profile.ts`).

---

## 6. Auth + DB flow (diagram)

```text
App launch
  └─ AuthProvider.refreshUser()
       └─ restoreAppwriteSession()  → client.setSession(secret)
       └─ account.get()             → set user (or null)

User signs in
  └─ account.createEmailPasswordSession()
  └─ persistAppwriteSession()      → client + AsyncStorage
  └─ account.get()                 → set user

Screen saves profile
  └─ useAuth() → user.$id
  └─ saveProfileFields(user.$id, data)
       └─ assertActiveSession()    → account.get() sanity check
       └─ databases.createDocument / updateDocument
            (authorized as logged-in user + permissions)
```

---

## 7. Common mistakes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `401` on **create** | Collection missing **Users → Create** | Console → collection → Permissions |
| `401` on read/update | No session on client | Sign in again; check `restoreAppwriteSession` |
| `404 document_not_found` on GET | No row yet | Treat as empty state; call create on first save |
| DB works on web but not native | Session not restored | Ensure `persistAppwriteSession` ran after login |
| `useAuth()` throws | Component outside `AuthProvider` | Wrap tree in `_layout.tsx` (already done at root) |
| Wrote relationship field as string | Wrong attribute type | Skip relationship columns or pass linked doc IDs only |

---

## 8. Quick reference — which API when?

| Goal | Use |
|------|-----|
| Show login state in UI | `useAuth()` → `user`, `loading` |
| Get current user id in a helper | `await account.get()` or `assertActiveSession()` |
| Read/write Appwrite Database | `databases.*` via shared client (session auto-attached) |
| Call external backend with login | `getAccessToken()` → `Authorization: Bearer …` |
| First-time user profile | `saveProfileFields(user.$id, { …required fields })` |
| Update existing profile | `saveProfileFields(user.$id, { …changed fields only })` |

---

## 9. Minimal new feature template

```tsx
// src/app/my-feature.tsx
import { useAuth } from '@/lib/AuthContext'
import { databases } from '@/lib/appwrite'
import { Permission, Role } from 'react-native-appwrite'
import { useState } from 'react'
import { Button, Text, View } from 'react-native'

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!
const COLLECTION_ID = 'my_collection'

export default function MyFeatureScreen() {
  const { user, loading } = useAuth()
  const [status, setStatus] = useState('')

  async function createItem() {
    if (!user?.$id) return

    await databases.createDocument({
      databaseId: DATABASE_ID,
      collectionId: COLLECTION_ID,
      documentId: 'unique-id', // ID.unique() or user.$id
      data: { note: 'Hello' },
      permissions: [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ],
    })

    setStatus('Created')
  }

  if (loading) return <Text>Loading…</Text>
  if (!user) return <Text>Sign in first.</Text>

  return (
    <View>
      <Text>Signed in as {user.email}</Text>
      <Button title="Create item" onPress={createItem} />
      <Text>{status}</Text>
    </View>
  )
}
```

Replace collection schema, permissions, and data shape to match your Console setup.

# How Supabase Auth Works in This App

This document explains the email/password login flow end to end: what happens over the wire, where tokens live, how the pieces in this repo connect, and what to check when you audit the app.

It does **not** wire up product features (search, barcode lookup, etc.). It is a mental model reference.

---

## Table of contents

1. [The big picture](#the-big-picture)
2. [Your curl command, decoded](#your-curl-command-decoded)
3. [Step 1 — Configure the client](#step-1--configure-the-client)
4. [Step 2 — Sign in with email and password](#step-2--sign-in-with-email-and-password)
5. [Step 3 — What you get back (session + JWT)](#step-3--what-you-get-back-session--jwt)
6. [Step 4 — Where the session is stored](#step-4--where-the-session-is-stored)
7. [Step 5 — How the UI knows you are logged in](#step-5--how-the-ui-knows-you-are-logged-in)
8. [Step 6 — Getting the token later](#step-6--getting-the-token-later)
9. [Step 7 — Sending the token to your own backend](#step-7--sending-the-token-to-your-own-backend)
10. [Step 8 — Sign out](#step-8--sign-out)
11. [File map in this repo](#file-map-in-this-repo)
12. [Auditing checklist](#auditing-checklist)
13. [Common pitfalls](#common-pitfalls)
14. [Useful curl equivalents](#useful-curl-equivalents)

---

## The big picture

Supabase Auth is an identity service. Your app does not store passwords or mint JWTs itself. Instead:

1. The app sends email + password to **Supabase’s Auth API**.
2. Supabase validates credentials against `auth.users` in your project.
3. Supabase returns a **session** containing JWTs (`access_token`, `refresh_token`).
4. The Supabase JS client saves that session locally (AsyncStorage on React Native).
5. Your app reads the session when it needs the user id, email, or a bearer token for API calls.

The `@supabase/supabase-js` SDK is a thin wrapper around those HTTP calls. When you call `supabase.auth.signInWithPassword(...)`, you are making the same request your curl command makes — the SDK just handles headers, JSON, and storage for you.

---

## Your curl command, decoded

```bash
curl -X POST "https://cahitfvxroazudhoiixa.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: sb_publishable_XYm-dyC0_ny5NtpTSltLKA_ptuSD9TV" \
  -H "Content-Type: application/json" \
  -d '{ "email": "testuser@taeson.co", "password": "the_users_password" }'
```

| Part | Meaning |
|------|---------|
| `POST .../auth/v1/token?grant_type=password` | OAuth2-style **resource owner password** grant. “Here are email + password; give me tokens.” |
| `apikey: sb_publishable_...` | Your project’s **anon / publishable key**. Identifies *which* Supabase project the request is for. It is **not** a user secret; it is embedded in client apps. Row-level security (RLS) and server-side checks protect data — not hiding this key. |
| `Content-Type: application/json` | Body is JSON with `email` and `password`. |
| Response `access_token` | Short-lived JWT proving “this user is authenticated.” Send it as `Authorization: Bearer <token>` to Supabase or your own API. |
| Response `refresh_token` | Longer-lived token used only to obtain a new `access_token` when the old one expires. |

**App equivalent:**

```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'testuser@taeson.co',
  password: 'the_users_password',
})

// data.session.access_token  ← same value as curl's access_token
```

---

## Step 1 — Configure the client

**File:** `src/lib/supabase.ts`

```ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### What each piece does

| Setting | Why it matters |
|---------|----------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Base URL for all Supabase API calls (`/auth/v1/...`, `/rest/v1/...`, etc.). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Sent as `apikey` on every request — same header as your curl. |
| `storage: AsyncStorage` | React Native has no `localStorage`. Without this, sessions would not survive app restarts. |
| `persistSession: true` | Write session JSON to AsyncStorage after login. |
| `autoRefreshToken: true` | SDK silently calls the refresh endpoint before `access_token` expires. |
| `detectSessionInUrl: false` | For mobile apps; you are not handling OAuth redirect URLs in a browser tab. |
| `react-native-url-polyfill` | Supabase client uses URL APIs that RN does not provide natively. |

### Local setup

1. Copy `.env.example` → `.env` in the project root.
2. Fill in values from Supabase Dashboard → **Project Settings → API**.
3. Restart the Expo dev server (`npx expo start`). Env vars are baked in at bundle time.

**Audit note:** `EXPO_PUBLIC_*` variables are included in the client bundle. Anyone can extract them from the app binary. That is expected for the anon/publishable key. Never put the **service role** key in the app.

---

## Step 2 — Sign in with email and password

**File:** `src/components/Auth.tsx`

The login screen collects email and password, then calls:

```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
```

### What happens under the hood

1. SDK builds URL: `{SUPABASE_URL}/auth/v1/token?grant_type=password`
2. SDK sets headers: `apikey`, `Content-Type: application/json`, plus client metadata.
3. SDK POSTs body: `{ "email": "...", "password": "..." }`
4. Supabase checks `auth.users` (hashed password, email confirmed, etc.).
5. On success, SDK receives session JSON and saves it via `AsyncStorage` (because of `persistSession`).

### Sign up (creating a user)

`signUp` hits a different endpoint (`/auth/v1/signup`) but produces a similar session if your project allows immediate login. Whether a new user can sign in right away depends on **Auth → Providers → Email** settings (e.g. “Confirm email” on or off).

**Audit note:** Passwords only travel to Supabase over HTTPS during sign-in/sign-up. They are not stored in your app state long term (only in the TextInput while the user types).

---

## Step 3 — What you get back (session + JWT)

A successful login returns a `session` object. Important fields:

| Field | Role |
|-------|------|
| `access_token` | JWT for `Authorization: Bearer ...`. Typically expires in ~1 hour (project setting). |
| `refresh_token` | Used by the SDK to get a new access token. Never send this to your own backend unless you have a very specific reason. |
| `expires_at` | Unix timestamp when `access_token` expires. |
| `user.id` | UUID (`sub` in the JWT). Primary key in `auth.users`. |
| `user.email` | Email on the account. |

### What is inside the JWT?

An access token is three base64 chunks: `header.payload.signature`.

Decode the payload (middle part) at [jwt.io](https://jwt.io) or:

```bash
echo '<payload-segment>' | base64 -d 2>/dev/null | jq .
```

You will see claims like:

- `sub` — user id (same as `session.user.id`)
- `email` — user email
- `role` — usually `authenticated`
- `exp` — expiry
- `iss` — issuer (your Supabase auth URL)

Your **backend** should verify the JWT signature using Supabase’s JWT secret (or JWKS), not just trust the client. The app only *holds* the token; the server *validates* it.

---

## Step 4 — Where the session is stored

With `storage: AsyncStorage` and `persistSession: true`, the SDK writes a key (typically `sb-<project-ref>-auth-token`) into `@react-native-async-storage/async-storage`.

That means:

- Closing and reopening the app → still logged in (until refresh token is revoked or expires).
- `signOut()` → SDK removes that storage entry.
- Uninstalling the app → storage wiped.

**Audit note:** The access token is in device storage. Treat the device as a soft trust boundary. Sensitive operations on your backend should still validate the token server-side and apply authorization rules (user can only access their own rows, etc.).

---

## Step 5 — How the UI knows you are logged in

**File:** `src/app/(tabs)/account.tsx`

This screen is the auth “router”: show login form or account screen.

### On mount — check existing session

```ts
supabase.auth.getClaims().then(({ data: { claims } }) => {
  if (claims) {
    setUserId(claims.sub)
    setEmail(claims.email)
  }
})
```

`getClaims()` reads the persisted session, validates/refreshes if needed, and returns JWT claims without you parsing the token manually.

### On auth changes — listen for login / logout

```ts
const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {
  const { data: { claims } } = await supabase.auth.getClaims()
  // update userId / email or clear them
})

return () => subscription.unsubscribe()
```

Events include `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, etc. After `signInWithPassword` succeeds, this listener fires → `userId` is set → React re-renders `<Account />` instead of `<Auth />`.

**Alternative:** `onAuthStateChange((_event, session) => { ... })` gives you the `session` directly in the callback. `getClaims()` is convenient when you only need `sub` and `email`.

---

## Step 6 — Getting the token later

**File:** `src/lib/auth.ts`

Any time after login:

```ts
import { getAccessToken } from '@/lib/auth'

const token = await getAccessToken()
// null if not logged in
```

Implementation:

```ts
const { data: { session } } = await supabase.auth.getSession()
return session?.access_token ?? null
```

`getSession()` returns the in-memory session and may refresh it if expired (when `autoRefreshToken` is on).

### When you need the token

- Calling **your** API (`calcount.taeson.co`) with `Authorization: Bearer <access_token>`
- Calling **Supabase PostgREST** directly with the user’s token (RLS applies as that user)
- Debugging — compare `session.access_token` to what curl returned

You usually do **not** need to manually refresh; the SDK handles that if `autoRefreshToken: true`.

---

## Step 7 — Sending the token to your own backend

**File:** `src/lib/api.ts` (helper only — not wired to features)

Pattern for any authenticated `fetch`:

```ts
const token = await getAccessToken()
if (!token) throw new Error('Not logged in')

await fetch('https://calcount.taeson.co/your/path', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ /* ... */ }),
})
```

### What your backend should do (audit perspective)

1. Read `Authorization: Bearer <jwt>`.
2. Verify signature with Supabase JWT secret (Dashboard → API → JWT Settings) or fetch JWKS from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
3. Check `exp` (not expired).
4. Use `sub` as the authenticated user id.
5. Enforce authorization (this user may only access their data).

The anon key in the app does **not** replace this. The anon key identifies the project; the access token identifies the **user**.

---

## Step 8 — Sign out

**File:** `src/components/Account.tsx`

```ts
await supabase.auth.signOut()
```

This:

1. Calls Supabase `/auth/v1/logout` (invalidates refresh token server-side when possible).
2. Clears AsyncStorage session.
3. Fires `onAuthStateChange` with `SIGNED_OUT` → UI shows `<Auth />` again.

---

## File map in this repo

| File | Responsibility |
|------|----------------|
| `src/lib/supabase.ts` | Single shared Supabase client; env config; AsyncStorage session persistence. |
| `src/components/Auth.tsx` | Email/password UI; `signInWithPassword` / `signUp`. |
| `src/app/(tabs)/account.tsx` | Auth gate: `Auth` vs `Account` based on session. |
| `src/components/Account.tsx` | Logged-in profile UI; `signOut`. |
| `src/lib/auth.ts` | Thin helper: `getAccessToken()`. |
| `src/lib/api.ts` | Example pattern for bearer-token `fetch` to your backend (not connected to features). |
| `.env` / `.env.example` | `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. |

---

## Auditing checklist

Use this when reviewing auth security or debugging login issues.

### Configuration

- [ ] `.env` exists locally; `.env` is in `.gitignore` (secrets should not be committed — though `EXPO_PUBLIC_*` are public by design).
- [ ] `EXPO_PUBLIC_SUPABASE_URL` matches your project (no typo, correct project ref).
- [ ] App uses **anon/publishable** key only — never service role in client code.
- [ ] Expo dev server restarted after env changes.

### Login flow

- [ ] Test user exists in Dashboard → Authentication → Users (or sign-up works).
- [ ] If “Confirm email” is enabled, user has confirmed before password login succeeds.
- [ ] `signInWithPassword` errors are surfaced to the user (invalid credentials, etc.).
- [ ] After login, `getSession()` returns a non-null `session`.
- [ ] `access_token` from app matches curl for the same user/password.

### Session lifecycle

- [ ] Kill and reopen app — user stays logged in (persistSession).
- [ ] After ~1 hour (or your JWT expiry), `autoRefreshToken` renews without forcing re-login.
- [ ] `signOut` clears UI and storage; subsequent `getAccessToken()` returns `null`.

### Backend (when you connect APIs)

- [ ] Backend validates JWT signature, not just decodes payload.
- [ ] Backend uses `sub` from verified JWT as user id.
- [ ] RLS enabled on Supabase tables if querying Supabase directly from the client.
- [ ] Service role key only on server, never in the mobile bundle.

### Logging / privacy

- [ ] Remove or gate `console.log('access_token', ...)` in production builds — tokens in logs are a leak vector.
- [ ] Passwords never logged.

---

## Common pitfalls

| Symptom | Likely cause |
|---------|----------------|
| “Invalid API key” | Wrong `EXPO_PUBLIC_SUPABASE_ANON_KEY` or URL. |
| Login works in curl but not app | Env vars missing; restart Expo. Different project URL/key between curl and `.env`. |
| “Email not confirmed” | Supabase requires email verification before password login. |
| Always shown login screen | `onAuthStateChange` not updating state; storage not configured; sign-in error swallowed. |
| 401 from your API | Expired token (refresh failed), backend JWT secret mismatch, or missing `Authorization` header. |
| User logged in on wrong project | `.env` points at a different Supabase project than your curl/test users. |

---

## Useful curl equivalents

**Password login (same as `signInWithPassword`):**

```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@taeson.co","password":"..."}' | jq .
```

**Refresh token (what the SDK does automatically):**

```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=refresh_token" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"..."}' | jq .
```

**Get user with access token:**

```bash
curl -s "$SUPABASE_URL/auth/v1/user" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

**Sign out (invalidate refresh token):**

```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/logout" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Mental model summary

```
User enters email/password in Auth.tsx
        │
        ▼
signInWithPassword()  ──HTTP──►  Supabase /auth/v1/token?grant_type=password
        │                                    │
        │                                    ▼
        │                          Validates auth.users
        │                                    │
        ▼                                    ▼
SDK saves session ◄──────────────  { access_token, refresh_token, user }
  to AsyncStorage
        │
        ▼
onAuthStateChange in account.tsx  →  show Account screen
        │
        ▼
getAccessToken() / getSession()  →  Bearer token for your API or Supabase
        │
        ▼
Your backend verifies JWT  →  knows user id (sub)  →  authorized response
```

That is the full loop. The SDK handles HTTP and storage; you own the UI, when to call login, and how your backend trusts the token.

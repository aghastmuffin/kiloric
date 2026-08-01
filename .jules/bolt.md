# Bolt's Journal - CalCount Performance

## 2025-05-15 - JWT Caching and Parallelization
**Learning:** Appwrite JWTs were being requested on every authenticated API call without caching, leading to significant network overhead and potential rate limiting. Parallelizing sequential `await` calls in loops for processing local items provided a noticeable speedup in list rendering.

**Action:** Always implement a short-lived in-memory cache for auth tokens and parallelize non-dependent async operations in list processing. Use `Promise.all` for batch building UI sections.

## 2025-05-16 - Cache-First State Preloading & Stable Refs
**Learning:** Under-the-hood rendering on screens like `meals.tsx` can be heavily optimized by keeping previously fetched resource state in local component state when switching contexts (e.g., date changes), and using a mutable React `useRef` to perform incremental cache-first updates without triggering redundant network requests or Promise.all micro-tasks. Additionally, lazily initializing animated references via a `useState` initializer function instead of rendering-phase `useRef(new ...).current` prevents memory allocations on every re-render and ensures full compatibility with ESLint rules and the React Compiler.

**Action:** Always check local component state cache before triggering list-item fetches, and use stable state initializers `useState(() => new ...)[0]` instead of render-phase `.current` refs to satisfy the compiler and optimize memory.

## 2025-05-17 - Profile Document Caching & Deduplication
**Learning:** Concurrent mount and focus hooks on tabs (such as `ProfileGate` checking complete profiles and index `Dial` getting targets/goals) trigger simultaneous duplicate Appwrite query loads for the user's profile. Implementing short-lived in-memory cache and promise-level deduplication for `getProfile(userId)` cuts network queries by 50% and dramatically speeds up focus transitions.

**Action:** Implement short-lived memory caching (15 seconds) and Promise-level deduplication for database/document gets, while clearing on create/update endpoints.

## 2025-05-18 - Meals Cache-First & In-flight Deduplication
**Learning:** Multiple key screens (such as the Dial progress meter and Meals log) render concurrently on tab focus, triggering duplicate sequential calls to `getTodayMeals` which results in duplicate, overlapping Appwrite query hits. Adding a short-lived (15s TTL) memory cache alongside promise-level request deduplication cuts redundant queries to 0, drastically lowering database utilization. To resolve the Temporal Dead Zone compiler issue (TS2454) when matching resolving in-flight promises, chain the promise with `.then` and `.finally` handlers after constructing the promise.

**Action:** Implement memory cache and promise deduplication for frequent reads, invalidate on mutations, and chain the async promise with outside `.then()` / `.finally()` handlers to maintain compiler safety.

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

## 2026-08-02 - Today's Meals Query Caching and Request Deduplication
**Learning:** Concurrent mount/focus effects on screens like index/Dial and meals logs triggered redundant, simultaneous queries to Appwrite for today's meals. Implementing short-lived in-memory caching (15 seconds TTL) and in-flight promise deduplication reduces database load significantly. To check promise identity and update cache states without triggering Temporal Dead Zone (TS2454) compilation errors, chaining the promise using `.then()` and `.finally()` blocks outside the async block closure is the ideal solution. Invalidation must occur immediately on any mutating operations (create, update, move, or add) to guarantee fresh data reads on consecutive user transitions.

**Action:** Use Map-based caches and active promise tracking for frequently fetched user query documents. Utilize promise chains (.then/.finally) to set cache entries and delete inflight references safely to satisfy the TypeScript compiler.

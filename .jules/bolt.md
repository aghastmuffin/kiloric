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

## 2025-05-18 - getTodayMeals Caching, Deduplication, and TDZ Safety
**Learning:** Concurrent focus triggers in multi-tab navigation (Dial, meals logger, account stats) cause excessive duplicate database hits to `getTodayMeals`. Declaring the fetching wrapper as a synchronous function returning a Promise avoids V8's promise-wrapping microtask overhead. Safely chaining `.then()` and `.finally()` outside of the async block closure prevents Temporal Dead Zone warnings (TS2454) during compiler checks, and verifying background promise identity (`inflightPromise === currentPromise`) guards against out-of-order state overwrites.

**Action:** Always wrap async service fetchers in a synchronous wrapper that returns a Promise for strict identity checks, chain background-caching callbacks outside the async closure, and append `.catch(() => {})` on background side-chains to prevent unhandled promise rejections.

## 2025-05-19 - Custom Memoization for List Rows with Inline Callbacks
**Learning:** High-density list views (such as search matches and quick logging cards) frequently trigger list-wide re-renders when parent states change (e.g. typing in search, toggling active tabs, or loading states). Traditional `React.memo` is completely bypassed if these rows accept inline arrow function callbacks. Implementing a custom comparator that explicitly verifies only layout-relevant and visual state-affecting props (ignoring unstable callbacks) successfully prevents redundant re-renders and drastically reduces V8 memory allocations and CPU cycles.

**Action:** For lists/rows utilizing inline callback handlers from the parent component, use `React.memo` combined with custom comparator functions to ensure maximum rendering efficiency.

## 2025-05-20 - In-Memory Caching & Request Deduplication for AsyncStorage Reads
**Learning:** Repeatedly querying local persistent stores like `AsyncStorage` (e.g. for recent foods on tab focus or typing) introduces async bridge overhead and redundant `JSON.parse` operations. Adding a synchronous in-memory cache map alongside an `inflightRequests` promise map eliminates disk/bridge reads on sub-sequence requests, while synchronous cache updating during record writes ensures zero-latency reads for quick logging.

**Action:** Cache `AsyncStorage` list reads in memory and deduplicate pending promises; synchronously update the memory cache on writes and hook cache clearing into session logout handlers (`appwriteSession.ts`).

## 2025-05-21 - Authenticated Promise Deduplication and BOLA Safety
**Learning:** Returning cached data before running session validation (`authenticatedUserId`) creates a Broken Object Level Authorization (BOLA) vulnerability. At the same time, declaring fetch helpers as `async function` breaks strict promise identity (`p1 === p2`) in tests because the JS runtime wraps returned promises. Wrapping the execution in a synchronous function returning `authenticatedUserId(userId).then(...)` guarantees both session ownership checks and strict Promise reference identity for concurrent deduplication.

**Action:** Always run authentication checks inside the deduplicated Promise chain before resolving cached data, and use non-async functions returning explicit Promises to maintain reference identity for deduplication.

## 2025-05-22 - O(1) Map Lookups for Array Sorting Comparators
**Learning:** Using `Array.prototype.indexOf` on a priority ordering array (e.g., `ORDS_FIELD_PRIORITY` containing 56 strings) inside `Array.prototype.sort()` comparator callbacks causes $O(K \cdot M \log M)$ string scanning overhead per product card during food search rendering and detail modal updates. Pre-computing a module-level `Map<string, number>` at load time reduces priority rank resolution to $O(1)$ and drops comparator cost to $O(M \log M)$, eliminating thousands of redundant array iterations.

**Action:** Whenever sorting entries by a priority list of strings, pre-compute a module-scope `Map<string, number>` and use `map.get(key) ?? defaultRank` inside `sort` callbacks instead of calling `indexOf` on the priority array.

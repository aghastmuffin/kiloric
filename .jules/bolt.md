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

## 2025-05-20 - In-Memory Caching & Request Deduplication for Local Storage Services
**Learning:** Local storage access via `AsyncStorage.getItem` and `JSON.parse` in repeatedly accessed utilities like `foodFavorites` creates noticeable bridge I/O latency and CPU parsing overhead when components re-render or tab focus shifts. Adding an in-memory cache (`favoritesCache`) alongside in-flight promise deduplication (`inflightLoadFavorites`) turns subsequent reads into instant 0ms sync/promise resolves, while updating the cache synchronously on mutations (`saveFavoriteFoods`, `toggleFavoriteFood`) maintains strict consistency.

**Action:** For frequently read local storage data structures, use in-memory caching and in-flight request deduplication with synchronous cache updates on mutation methods.

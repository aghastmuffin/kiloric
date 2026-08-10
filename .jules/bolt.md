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

## 2025-05-19 - High-Frequency Input Component Memoization and Ref-Stabilized Callbacks
**Learning:** Preventing redundant re-renders of large search lists (like FoodQuickRow and ResultCard) on every single keystroke of a query input requires component memoization. However, using custom memoization comparison functions that ignore callback props to keep list rows stable is dangerous and causes stale closure bugs if the callbacks capture volatile state (like `selectedMealType` or `addStatuses`). To solve this safely, we must stabilize callbacks in the parent component using `useRef` hooks updated via `useEffect` to store volatile states. This allows removing volatile state from callback dependency arrays, keeping callbacks stable, and eliminating list re-renders entirely without any stale closure risks.

**Action:** When memoizing list row components, always store volatile parent states (such as active search queries or action statuses) in `useRef` hooks updated via `useEffect`. Reference these refs inside the callbacks so they can be declared with stable dependency arrays, enabling safe and bug-free custom `React.memo` comparisons that ignore callbacks.

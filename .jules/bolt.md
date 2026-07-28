# Bolt's Journal - CalCount Performance

## 2025-05-15 - JWT Caching and Parallelization
**Learning:** Appwrite JWTs were being requested on every authenticated API call without caching, leading to significant network overhead and potential rate limiting. Parallelizing sequential `await` calls in loops for processing local items provided a noticeable speedup in list rendering.

**Action:** Always implement a short-lived in-memory cache for auth tokens and parallelize non-dependent async operations in list processing. Use `Promise.all` for batch building UI sections.

## 2025-05-16 - Cache-First State Preloading & Stable Refs
**Learning:** Under-the-hood rendering on screens like `meals.tsx` can be heavily optimized by keeping previously fetched resource state in local component state when switching contexts (e.g., date changes), and using a mutable React `useRef` to perform incremental cache-first updates without triggering redundant network requests or Promise.all micro-tasks. Additionally, lazily initializing animated references via a `useState` initializer function instead of rendering-phase `useRef(new ...).current` prevents memory allocations on every re-render and ensures full compatibility with ESLint rules and the React Compiler.

**Action:** Always check local component state cache before triggering list-item fetches, and use stable state initializers `useState(() => new ...)[0]` instead of render-phase `.current` refs to satisfy the compiler and optimize memory.

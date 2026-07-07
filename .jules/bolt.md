# Bolt's Journal - CalCount Performance

## 2025-05-15 - JWT Caching and Parallelization
**Learning:** Appwrite JWTs were being requested on every authenticated API call without caching, leading to significant network overhead and potential rate limiting. Parallelizing sequential `await` calls in loops for processing local items provided a noticeable speedup in list rendering.

**Action:** Always implement a short-lived in-memory cache for auth tokens and parallelize non-dependent async operations in list processing. Use `Promise.all` for batch building UI sections.

## 2026-07-07 - React Compiler and PanResponder Stability
**Learning:** Using `useMemo` for `PanResponder` (to satisfy React Compiler's "no ref access in render" rule) requires a stable proxy for callbacks to avoid re-instantiating the responder on every change, which would terminate active gestures. Conditional prop passing for loading states in large lists prevents exponential re-render cascades.

**Action:** Prefer `useMemo` + stable callback proxies for complex native objects. Always evaluate if a global loading state can be localized to specific list items to minimize the render impact.

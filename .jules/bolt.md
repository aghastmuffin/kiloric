# Bolt's Journal - CalCount Performance

## 2025-05-15 - JWT Caching and Parallelization
**Learning:** Appwrite JWTs were being requested on every authenticated API call without caching, leading to significant network overhead and potential rate limiting. Parallelizing sequential `await` calls in loops for processing local items provided a noticeable speedup in list rendering.

**Action:** Always implement a short-lived in-memory cache for auth tokens and parallelize non-dependent async operations in list processing. Use `Promise.all` for batch building UI sections.

## 2025-05-16 - Incremental State Management for Async Previews
**Learning:** Resetting large record-based states (like `itemPreviews`) on every parent update triggers a cascade of redundant network requests and re-renders, even for items already cached in memory. Incremental updates using functional state updates (`prev => ({...prev, ...newItems})`) prevent this "flicker" and significantly reduce bandwidth.

**Action:** Use functional state updates for collection-based states and perform "diff-checks" before triggering async fetches for items already present in the local state.

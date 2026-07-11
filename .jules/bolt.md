# Bolt's Journal - CalCount Performance

## 2025-05-15 - JWT Caching and Parallelization
**Learning:** Appwrite JWTs were being requested on every authenticated API call without caching, leading to significant network overhead and potential rate limiting. Parallelizing sequential `await` calls in loops for processing local items provided a noticeable speedup in list rendering.

**Action:** Always implement a short-lived in-memory cache for auth tokens and parallelize non-dependent async operations in list processing. Use `Promise.all` for batch building UI sections.

## 2026-07-11 - Optimized Meal List Rendering and Fetching
**Learning:** Redundant item preview fetching for the same barcode across multiple meals was causing unnecessary network load and re-renders. Using a composite key for state objects where a stable ID (barcode) is available led to cache misses and full state replacements.
**Action:** Always key cached data by the most stable identifier available (e.g., barcode). Implement incremental state updates for large lists to minimize render-cycle overhead. Use "silent" refresh patterns for background focus-syncing to improve perceived performance.

# Bolt's Journal - CalCount Performance

## 2025-05-15 - JWT Caching and Parallelization
**Learning:** Appwrite JWTs were being requested on every authenticated API call without caching, leading to significant network overhead and potential rate limiting. Parallelizing sequential `await` calls in loops for processing local items provided a noticeable speedup in list rendering.

**Action:** Always implement a short-lived in-memory cache for auth tokens and parallelize non-dependent async operations in list processing. Use `Promise.all` for batch building UI sections.

## 2025-05-16 - API Deduplication and Render Filtering
**Learning:** Consolidating in-flight request protection to cover both cache lookups and network calls prevents redundant disk I/O in batch-loading scenarios. Backgrounding cache persistence calls further reduces the latency of the critical UI path.

**Action:** Always wrap the entire data retrieval flow (cache + fetch) in a single deduplicated promise. Use conditional prop passing (e.g., `isLoading={missingData && globalLoading}`) to prevent mass re-renders in large lists when global state updates.

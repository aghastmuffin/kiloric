# Bolt's Journal - CalCount Performance

## 2025-05-15 - JWT Caching and Parallelization
**Learning:** Appwrite JWTs were being requested on every authenticated API call without caching, leading to significant network overhead and potential rate limiting. Parallelizing sequential `await` calls in loops for processing local items provided a noticeable speedup in list rendering.

**Action:** Always implement a short-lived in-memory cache for auth tokens and parallelize non-dependent async operations in list processing. Use `Promise.all` for batch building UI sections.

## 2025-05-16 - Incremental State and Redundant Fetch Reduction
**Learning:** React screens using `useFocusEffect` for initial data fetching should avoid redundant `useEffect` calls on mount to prevent duplicate network requests. When managing a list of items with expensive previews (like barcodes), keying the cache by a stable ID (barcode) and implementing an incremental "fetch missing only" strategy with functional state updates significantly improves UI responsiveness and reduces backend load during item reorganization.

**Action:** Consolidate initial data fetching in focus hooks and always prefer incremental state updates for large asset caches to avoid redundant work.

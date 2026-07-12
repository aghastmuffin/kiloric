# Bolt's Journal - CalCount Performance

## 2025-05-15 - JWT Caching and Parallelization
**Learning:** Appwrite JWTs were being requested on every authenticated API call without caching, leading to significant network overhead and potential rate limiting. Parallelizing sequential `await` calls in loops for processing local items provided a noticeable speedup in list rendering.

**Action:** Always implement a short-lived in-memory cache for auth tokens and parallelize non-dependent async operations in list processing. Use `Promise.all` for batch building UI sections.

## 2025-05-15 - Meal Item Preview Deduplication and Incremental Caching
**Learning:** React Native lists rendering items with identical barcodes were triggering redundant parallel API calls and state updates. Furthermore, clearing the preview cache on every date change caused "pop-in" when navigating back to previously viewed dates.
**Action:** Deduplicate items by barcode before fetching and use functional state updates (`prev => ({...prev, ...new})`) to maintain an incremental local cache. Ensure PanResponder is initialized in `useMemo` rather than `useEffect` to prevent dead UI on the first render frame.

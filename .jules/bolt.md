# Bolt's Journal - CalCount Performance

## 2025-05-15 - JWT Caching and Parallelization
**Learning:** Appwrite JWTs were being requested on every authenticated API call without caching, leading to significant network overhead and potential rate limiting. Parallelizing sequential `await` calls in loops for processing local items provided a noticeable speedup in list rendering.

**Action:** Always implement a short-lived in-memory cache for auth tokens and parallelize non-dependent async operations in list processing. Use `Promise.all` for batch building UI sections.

## 2026-07-09 - Incremental State and Silent Sync
**Learning:** Re-fetching entire preview lists and clearing state on every change caused massive UI flicker and unnecessary network load in large meal logs. Additionally, global loading spinners on background refreshes disrupted UX during gesture-heavy interactions.

**Action:** Key item previews by stable identifiers (barcodes) and perform incremental updates. Implement "silent" fetch options for background synchronization to preserve UI state and avoid intrusive loading indicators.

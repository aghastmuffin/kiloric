# Bolt's Journal - CalCount Performance

## 2025-05-15 - JWT Caching and Parallelization
**Learning:** Appwrite JWTs were being requested on every authenticated API call without caching, leading to significant network overhead and potential rate limiting. Parallelizing sequential `await` calls in loops for processing local items provided a noticeable speedup in list rendering.

**Action:** Always implement a short-lived in-memory cache for auth tokens and parallelize non-dependent async operations in list processing. Use `Promise.all` for batch building UI sections.

## 2026-07-10 - Barcode-based Preview Caching
**Learning:** Keying UI previews by transient or complex keys (like `mealId-index-barcode`) prevents efficient data reuse. In this codebase, `barcode` is the stable unique identifier for product metadata.
**Action:** Always key product-related state by `barcode` to allow cross-meal and cross-date preview reuse, and use incremental functional updates to merge new previews without invalidating existing ones.

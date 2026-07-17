# Bolt's Journal - CalCount Performance

## 2025-05-15 - JWT Caching and Parallelization
**Learning:** Appwrite JWTs were being requested on every authenticated API call without caching, leading to significant network overhead and potential rate limiting. Parallelizing sequential `await` calls in loops for processing local items provided a noticeable speedup in list rendering.

**Action:** Always implement a short-lived in-memory cache for auth tokens and parallelize non-dependent async operations in list processing. Use `Promise.all` for batch building UI sections.

## 2025-07-17 - Animate Counter Text on UI Thread & Avoid Render-Phase Ref Access
**Learning:** Updating a counter's text value inside a gauge at 60/120fps via standard React props/state results in severe JS-thread rendering load and visible "jumps" (since the stroke animates smoothly on the UI thread while the text lags or jumps instantly). Offloading this via `AnimatedTextInput` with `useAnimatedProps` eliminates JS-thread renders. Furthermore, the React Compiler strictly prohibits render-phase ref access (such as `useRef().current` inside component body) and mutating refs in render, throwing compilation errors.

**Action:** Use `AnimatedTextInput` driven by `useAnimatedProps` to animate text/numeric values dynamically on the native thread. For stable handlers like PanResponder, replace render-phase ref mutations with a stable proxy object created via `useState` and synchronized inside `useEffect`.

## 2025-03-01 - [Semantic Accessibility for Visual Gauge Components]
**Learning:** Screen readers and accessibility engines are completely blind to visual gauge charts (such as SVG `RadialGauge`). Rather than letting individual child texts like "/ 2000" be fragmented, the parent container must be declared `accessible={true}` with an automated `accessibilityLabel` summarizing the state, combined with `accessibilityRole="progressbar"` and `accessibilityValue={{ min: 0, max, now }}` to conform to standard operating system accessibility standards.
**Action:** Wrap visual chart and progress indicators in an accessible container with progressbar role and clear labels summarizing progress.

## 2025-03-01 - [ESLint Flat Config Global Ignores Configuration]
**Learning:** In ESLint flat configuration (e.g., `eslint.config.js`), defining global ignores requires placing an object with *only* the `ignores` key as an element in the config array. Mixing ignores inside other objects or not separating them can cause the glob matching to fail, which allows deprecated directories (e.g. `src/dep/*`) to continue throwing errors during validation.
**Action:** Define a separate, standalone object with only the `ignores` property inside `defineConfig` to declare global flat ignores correctly.

## 2025-08-11 - [Dynamic Initial State Synchronization & Tactile Haptic Feedback]
**Learning:** For date-based or dynamic calendar lists, hardcoding a static initial selection state (such as `'mon'`) instead of computing it dynamically (such as `DAYS[0].key`) leads to visual incoherence where no calendar item is selected upon initial screen mount. Furthermore, state transitions on checklists, segment selectors, and rating buttons benefit immensely from physical, safety-wrapped haptic feedback (`triggerSelectionHaptic`), which transforms flat digital taps into tactile game-like interactions.
**Action:** Always synchronize initial state keys with dynamically generated collection bounds, and embed haptic feedback on discrete state-switching interactions to enhance mechanical satisfaction.

## 2025-08-12 - [Accessibility Semantics & Tactile Feedback for Transient Error Toasts]
**Learning:** Transient overlay components (such as `ApiErrorToast`) are completely ignored by screen readers when mounted dynamically unless explicitly marked with `accessibilityRole="alert"` and `accessibilityLiveRegion="assertive"`. Additionally, providing an `accessibilityHint` and tactile `triggerSelectionHaptic()` on icon-only dismiss buttons ensures accessible and tactile error control.
**Action:** Always annotate toast and alert containers with `accessibilityRole="alert"` and `accessibilityLiveRegion="assertive"`, and attach selection haptics to dismiss controls.

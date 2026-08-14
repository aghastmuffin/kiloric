## 2025-03-01 - [Semantic Accessibility for Visual Gauge Components]
**Learning:** Screen readers and accessibility engines are completely blind to visual gauge charts (such as SVG `RadialGauge`). Rather than letting individual child texts like "/ 2000" be fragmented, the parent container must be declared `accessible={true}` with an automated `accessibilityLabel` summarizing the state, combined with `accessibilityRole="progressbar"` and `accessibilityValue={{ min: 0, max, now }}` to conform to standard operating system accessibility standards.
**Action:** Always wrap visual chart and progress indicators in an accessible container with progressbar role and clear labels summarizing progress.

## 2025-03-01 - [ESLint Flat Config Global Ignores Configuration]
**Learning:** In ESLint flat configuration (e.g., `eslint.config.js`), defining global ignores requires placing an object with *only* the `ignores` key as an element in the config array. Mixing ignores inside other objects or not separating them can cause the glob matching to fail, which allows deprecated directories (e.g. `src/dep/*`) to continue throwing errors during validation.
**Action:** Define a separate, standalone object with only the `ignores` property inside `defineConfig` to declare global flat ignores correctly.

## 2026-08-14 - [Tactile Feedback and Accessible Semantics for Wellbeing Planner]
**Learning:** Micro-UX enhancements like adding safe native-wrapped haptic feedback (`triggerSelectionHaptic()`) to key interaction points (e.g., tab selection, toggling checkbox items, and choosing qualitative states like moods) significantly elevates physical immersion and satisfaction. Combining physical response with highly descriptive, localized `accessibilityLabel` attributes (such as describing selected days or option state inline) guarantees a high-quality, fully accessible experience.
**Action:** Always apply `triggerSelectionHaptic()` to custom interactive components alongside descriptive accessibility labels reflecting current selection state.

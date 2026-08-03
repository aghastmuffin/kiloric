## 2025-03-01 - [Semantic Accessibility for Visual Gauge Components]
**Learning:** Screen readers and accessibility engines are completely blind to visual gauge charts (such as SVG `RadialGauge`). Rather than letting individual child texts like "/ 2000" be fragmented, the parent container must be declared `accessible={true}` with an automated `accessibilityLabel` summarizing the state, combined with `accessibilityRole="progressbar"` and `accessibilityValue={{ min: 0, max, now }}` to conform to standard operating system accessibility standards.
**Action:** Always wrap visual chart and progress indicators in an accessible container with progressbar role and clear labels summarizing progress.

## 2025-03-01 - [ESLint Flat Config Global Ignores Configuration]
**Learning:** In ESLint flat configuration (e.g., `eslint.config.js`), defining global ignores requires placing an object with *only* the `ignores` key as an element in the config array. Mixing ignores inside other objects or not separating them can cause the glob matching to fail, which allows deprecated directories (e.g. `src/dep/*`) to continue throwing errors during validation.
**Action:** Define a separate, standalone object with only the `ignores` property inside `defineConfig` to declare global flat ignores correctly.

## 2025-03-02 - [Accessible and Safe React Native Easter Eggs]
**Learning:** Interactive secret features or easter eggs must maintain accessible styling. Utilizing properties like `accessibilityLabel`, `accessibilityRole="button"`, and a generic `accessibilityHint="Tap repeatedly to unlock a secret"` allows them to remain navigable by screen readers without spoiling the secret. To prevent stale closures and state updater impurity during rapid clicking, we must use functional state updaters (`setTapCount(prev => prev + 1)`) and decouple any resulting asynchronous side-effects from the React state transition using `setTimeout(sideEffect, 0)`.
**Action:** Always wrap interactive easter eggs in fully annotated accessible components, using functional state updaters and decoupled triggers for side-effects.

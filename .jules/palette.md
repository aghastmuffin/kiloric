## 2025-03-01 - [Semantic Accessibility for Visual Gauge Components]
**Learning:** Screen readers and accessibility engines are completely blind to visual gauge charts (such as SVG `RadialGauge`). Rather than letting individual child texts like "/ 2000" be fragmented, the parent container must be declared `accessible={true}` with an automated `accessibilityLabel` summarizing the state, combined with `accessibilityRole="progressbar"` and `accessibilityValue={{ min: 0, max, now }}` to conform to standard operating system accessibility standards.
**Action:** Always wrap visual chart and progress indicators in an accessible container with progressbar role and clear labels summarizing progress.

## 2025-03-01 - [ESLint Flat Config Global Ignores Configuration]
**Learning:** In ESLint flat configuration (e.g., `eslint.config.js`), defining global ignores requires placing an object with *only* the `ignores` key as an element in the config array. Mixing ignores inside other objects or not separating them can cause the glob matching to fail, which allows deprecated directories (e.g. `src/dep/*`) to continue throwing errors during validation.
**Action:** Define a separate, standalone object with only the `ignores` property inside `defineConfig` to declare global flat ignores correctly.

## 2025-07-31 - [Cross-Platform Alert Routing and Asynchronous Side-Effects in React State Updaters]
**Learning:** React Native Web's `Alert.alert` does not consistently route to native browser modal prompts (like standard `window.alert`) depending on bundler configurations, which can bypass Playwright or automation intercepts. Furthermore, scheduling side-effects like asynchronous API fetches inside React's `setState` functional updaters violates render purity. Conditionally routing to `alert` on web platforms (`Platform.OS === 'web'`) and deferring asynchronous flows outside the state updater using `setTimeout(fn, 0)` ensures strict compliance with React Compiler purity and bulletproof testing guarantees.
**Action:** Use conditional platform routing for browser alerts and delegate side-effects asynchronously via `setTimeout` to isolate them from React state transitions.

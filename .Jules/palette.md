## 2025-05-18 - Image Accessibility Semantics
**Learning:** React Native / Expo `Image` wrappers like `ImageViewer` require explicit `accessible={true}`, `accessibilityRole="image"`, and descriptive `accessibilityLabel` props to be properly recognized and announced by screen readers.
**Action:** Always expose an `accessibilityLabel` prop on image components and provide semantic fallback labels for placeholder images.

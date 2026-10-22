# Palette Journal

## 2025-02-18 - Tablist Item Accessibility on Segmented Controls
**Learning:** Adding `accessible={true}` to container `View`s that wrap native inputs or buttons masks child elements or creates invalid nested button trees on web. Instead, tab semantics (`accessibilityRole="tab"` and `accessibilityState={{ selected }}`) should be placed directly on the segment item container view within the `accessibilityRole="tablist"`.
**Action:** When decorating compound controls like segmented tablists with screen reader roles, apply `accessibilityRole="tab"` directly to item container `View`s.

## 2026-10-20 - Expo UI Universal TextInput Accessibility & Clearing
**Learning:** `@expo/ui` `TextInput` does not accept `accessibilityLabel` directly as a prop or plain string `value` without `ObservableState`. Search accessibility (`accessibilityRole="search"` and `accessibilityLabel`) is best applied on the parent `View` container, while imperative field reset uses `ref.current?.clear()`.
**Action:** When decorating `@expo/ui` `TextInput` wrappers with screen reader descriptions and clear buttons, place accessibility props on the outer `View` container and clear the input via `TextInputRef.clear()`.

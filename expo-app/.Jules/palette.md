# Palette Journal

## 2025-02-18 - Tablist Item Accessibility on Segmented Controls
**Learning:** Adding `accessible={true}` to container `View`s that wrap native inputs or buttons masks child elements or creates invalid nested button trees on web. Instead, tab semantics (`accessibilityRole="tab"` and `accessibilityState={{ selected }}`) should be placed directly on the segment item container view within the `accessibilityRole="tablist"`.
**Action:** When decorating compound controls like segmented tablists with screen reader roles, apply `accessibilityRole="tab"` directly to item container `View`s.

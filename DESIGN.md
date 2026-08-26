---
name: CalCount
colors:
  paper-light-background: "#F3EFE7"
  paper-light-surface: "#FCFAF5"
  paper-light-surface-alt: "#ECE6DB"
  paper-light-border: "#DED6C9"
  paper-light-ink: "#211F1B"
  paper-light-muted-ink: "#625C54"
  paper-light-rust: "#A33A2E"
  paper-light-on-rust: "#FFF9F1"
  paper-light-rust-wash: "rgba(163, 58, 46, 0.10)"
  paper-light-success: "#5C704E"
  paper-light-warning: "#8A641C"
  paper-light-danger: "#913C35"
  paper-dark-background: "#171612"
  paper-dark-surface: "#211F1A"
  paper-dark-surface-alt: "#2D2A24"
  paper-dark-border: "#3C3932"
  paper-dark-ink: "#F4EFE6"
  paper-dark-muted-ink: "#B5ADA1"
  paper-dark-rust: "#F07865"
  paper-dark-on-rust: "#171612"
  paper-dark-rust-wash: "rgba(240, 120, 101, 0.14)"
  paper-dark-success: "#8CA27A"
  paper-dark-warning: "#D7AA50"
  paper-dark-danger: "#E1877D"
typography:
  display:
    fontFamily: "InstrumentSerif"
    fontSize: "46px"
    fontWeight: 400
    lineHeight: "49px"
    letterSpacing: "-0.8px"
  headline-large:
    fontFamily: "InstrumentSerif"
    fontSize: "38px"
    fontWeight: 400
    lineHeight: "41px"
    letterSpacing: "-0.55px"
  headline:
    fontFamily: "InterTight"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "27px"
    letterSpacing: "-0.35px"
  body-large:
    fontFamily: "InterTight"
    fontSize: "17px"
    lineHeight: "24px"
  body:
    fontFamily: "InterTight"
    fontSize: "16px"
    lineHeight: "23px"
  body-small:
    fontFamily: "InterTight"
    fontSize: "14px"
    lineHeight: "20px"
  label:
    fontFamily: "InterTight"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "17px"
    letterSpacing: "0.1px"
  label-small:
    fontFamily: "InterTight"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.15px"
  label-tiny:
    fontFamily: "InterTight"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "14px"
    letterSpacing: "0.15px"
  metric:
    fontFamily: "InstrumentSerif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: "34px"
    letterSpacing: "-0.35px"
  overline:
    fontFamily: "InterTight"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "15px"
    letterSpacing: "1.15px"
  utility-mono:
    fontFamily: "JetBrainsMono"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "15px"
    letterSpacing: "1.2px"
rounded:
  sm: "8px"
  md: "14px"
  lg: "22px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.paper-light-rust}"
    textColor: "{colors.paper-light-on-rust}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "14px 20px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.paper-light-surface}"
    textColor: "{colors.paper-light-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "14px 20px"
    height: "48px"
  search-field:
    backgroundColor: "{colors.paper-light-surface}"
    textColor: "{colors.paper-light-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "13px 18px"
    height: "50px"
  filter-chip:
    backgroundColor: "{colors.paper-light-surface}"
    textColor: "{colors.paper-light-muted-ink}"
    typography: "{typography.label-small}"
    rounded: "{rounded.pill}"
    padding: "10px 14px"
    height: "44px"
  filter-chip-selected:
    backgroundColor: "{colors.paper-light-rust}"
    textColor: "{colors.paper-light-on-rust}"
    typography: "{typography.label-small}"
    rounded: "{rounded.pill}"
    padding: "10px 14px"
    height: "44px"
  surface-card:
    backgroundColor: "{colors.paper-light-surface}"
    textColor: "{colors.paper-light-ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  tab-active:
    backgroundColor: "{colors.paper-light-rust-wash}"
    textColor: "{colors.paper-light-rust}"
    typography: "{typography.label-small}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  ruled-ledger:
    backgroundColor: "{colors.paper-light-background}"
    textColor: "{colors.paper-light-ink}"
    padding: "22px 0"
  inline-error:
    backgroundColor: "{colors.paper-light-surface}"
    textColor: "{colors.paper-light-danger}"
    typography: "{typography.body-small}"
    rounded: "{rounded.sm}"
    padding: "14px"
---

# Design System: CalCount

## Overview

**Creative North Star: "The Calibrated Field Journal"**

The Calibrated Field Journal treats nutrition tracking like a well-kept working notebook: warm paper, measured serif observations, compact utility labels, and rust annotations that call attention without shouting. The interface is tactile but not nostalgic; every material cue supports faster logging, clearer targets, or more trustworthy review.

Warm editorial discipline governs the balance. Data-rich surfaces remain calm through narrow content columns, generous breathing room, and hairline structure. Rounded cards are reserved for self-contained tools and summaries, while account and statistics views often become ruled ledgers. The result is humane enough for a first-time calorie counter and precise enough for a macro-focused athlete.

**Key Characteristics:**

- Warm paper and deep ink carry the interface before accent color enters.
- Rust is scarce, intentional, and tied to action, selection, or meaningful progress.
- Instrument Serif creates reflective display moments; Inter Tight does the work; JetBrains Mono supplies coordinates and status.
- Cards and ruled sections coexist according to function instead of forcing every region into one container style.
- Motion is brief, physical, and subordinate to state clarity, with reduced-motion behavior preserved wherever the shared motion layer is used.

## Colors

The Paper palette combines parchment-toned foundations, porcelain working surfaces, carbon ink, and a restrained rust marker. The dark appearance is a purpose-built night notebook, not an inverted light theme.

### Primary

- **Rust Marker:** The brand action color for primary decisions, selected controls, progress accents, focus, and small identity marks.
- **Soft Rust Wash:** The quiet selected or highlighted background paired with Rust Marker text or rules.

### Neutral

- **Warm Parchment:** The page field that prevents long sessions from feeling clinical or stark.
- **Porcelain Sheet:** The highest resting surface for fields, cards, dialogs, and working containers.
- **Pressed Paper:** The secondary fill for headers, controls, clear actions, and grouped regions.
- **Carbon Ink:** The principal text color and, where a quieter action is needed, the high-contrast accent.
- **Graphite Note:** Secondary copy, metadata, helper text, and inactive navigation.
- **Hairline Fiber:** Borders and rules that organize information without creating heavy boxes.

### Feedback

- **Sage Measure:** Positive completion, logged-data charts, and macro progress.
- **Ochre Caution:** Warnings and streak moments that need attention without reading as failure.
- **Oxide Error:** Destructive actions and errors, usually paired with a soft field or a structural left rule instead of a large solid block.

### Dark Appearance

Night Parchment, Charcoal Sheet, and Ash Fiber preserve the same role relationships at lower luminance. Coral Rust becomes more luminous, while text and semantic colors soften enough to avoid glare. Onboarding owns a related but separate scoped palette; its dark rust is intentionally brighter than the main Paper theme.

**The Rust Annotation Rule.** Rust marks the primary decision, selected state, or consequential progress moment; it never floods the screen.

**The Ink Before Color Rule.** Hierarchy begins with ink weight, paper tone, and rules. Add color only when it carries state or meaning.

## Typography

**Display Font:** Instrument Serif

**Body Font:** Inter Tight

**Label/Mono Font:** JetBrains Mono

**Character:** The pairing feels like an editorial record built for daily use. Instrument Serif gives plans and measurements dignity without luxury affectation; Inter Tight keeps dense nutrition tasks fast and legible; JetBrains Mono appears sparingly as a navigational coordinate or technical annotation.

### Hierarchy

- **Display** (400, 46/49): Rare celebratory or identity moments.
- **Large Headline** (400, 38/41): Top-level screen and onboarding step titles.
- **Headline** (600, 22/27): Section titles and compact hierarchy inside task flows.
- **Metric** (400, 30/34): Calories, scores, totals, and other figures that deserve reflection rather than alarm.
- **Body Large** (17/24): Introductory or emphasized explanatory copy.
- **Body** (16/23): Default descriptions, field values, and readable operational copy.
- **Body Small** (14/20): Supporting data, captions, and secondary descriptions.
- **Label** (600, 13/17): Buttons, active controls, and compact high-priority labels.
- **Small and Tiny Labels** (500, 12/16 and 11/14): Metadata and dense secondary control text.
- **Overline** (600, 11/15, uppercase): Rust editorial eyebrows and section coordinates.
- **Utility Mono** (400, 11/15, uppercase): Stack headers, onboarding progress, and terse system status.

The baseline font preference is the editorial mix above. User-selected Serif and Mono modes deliberately override the full interface and should remain explicit accessibility or personality choices, not new component variants.

**The Three Registers Rule.** Instrument Serif carries reflection and magnitude, Inter Tight carries work, and JetBrains Mono carries coordinates and status; do not swap their jobs casually.

## Layout

CalCount is mobile-first and task-first. Primary screens use a centered single column with a practical maximum around 720px; reading and form-heavy regions commonly stop around 620px. Horizontal gutters are 16px below the 400px compact breakpoint and 24px otherwise. The core rhythm follows the 4, 8, 14, 20, and 28px spacing scale rather than a generic eight-point ladder.

Wide layouts add specific structure rather than stretching phone content. Onboarding success earns a two-column composition around 760px, while ledgers and metric groups wrap internally. Filter chips scroll horizontally, long settings disclose in place, and primary action groups stack when width or font scale makes a row fragile.

Safe areas and bottom navigation clearance are part of the composition. The floating tab bar remains constrained to 620px and sits above the device inset. The observed interaction floor is 44px; platform-native controls retain their native geometry, and Android adaptations should meet the platform's larger touch expectation.

**The One Honest Column Rule.** Primary task flows stay in one centered column; wide screens add breathing room or a specific second pane, not a stretched phone layout.

## Elevation & Depth

The system is flat at rest. Paper tones, hairline borders, clipped fills, and ruled sections create most depth. Shadows are structural evidence that an element has left the page: floating navigation, popovers, modals, toasts, and actively dragged rows may lift; ordinary cards do not need to.

### Shadow Vocabulary

- **Floating Chrome** (`0 5px 18px rgba(33, 31, 27, 0.10)`): The restrained ambient lift beneath the tab bar.
- **Popover Lift** (`0 4px 10px rgba(0, 0, 0, 0.12)`): Menus and small transient surfaces.
- **Modal Lift** (`0 12px 32px rgba(0, 0, 0, 0.45)` on web): Interruptive dialogs above the darkened paper field.
- **Active Drag Lift** (accent-colored, up to `0 8px 14px rgba(33, 31, 27, 0.22)`): Temporary physical feedback while reordering, never a resting-card style.

**The Flat Ledger Rule.** Resting content is separated by tone, borders, and rules. Shadows appear only when an element truly floats, overlays, or moves.

## Shapes

The form language alternates between book-like rules and gently curved working objects. Small curves at 8px belong to fields, notices, and compact dialogs. Medium 14px curves belong to search, chips, navigation items, and meal cards. Large 22px curves belong to self-contained hero summaries and generous empty states. Full pills belong to primary actions, compact selections, badges, and progress tracks.

Hairlines are the default separator. A 1px stroke gives fields and controls a deliberate boundary; 2–3px rust or danger rules mark selection, focus, drop targets, or error hierarchy. Circular forms are reserved for icon actions, avatars, radio indicators, and gauge geometry.

**The Shape Follows Task Rule.** Use medium curves for fields and working controls, generous curves for summary objects, and pills only for compact actions, selections, and progress.

## Components

**Component character:** Editorial structure, tactile controls.

### Buttons

- **Shape:** Primary and canonical secondary actions use a full pill with a minimum 48px height.
- **Primary:** Rust Marker with warm on-rust text and a semibold Inter Tight label.
- **Pressed / Focus:** Physical press moves down slightly; keyboard focus adds a visible rust outline without relying on color alone.
- **Secondary:** Porcelain or transparent paper with Carbon Ink and a hairline border.
- **Destructive:** Prefer an oxide-text ruled row or restrained danger treatment over a large red slab unless confirmation requires stronger interruption.

### Chips

- **Style:** Unselected filters use a Porcelain Sheet, hairline border, Graphite Note, and pill silhouette.
- **State:** Selected filters fill with Rust Marker and reverse to warm light text. Horizontal groups scroll rather than compressing labels into illegibility.

### Cards / Containers

- **Corner Style:** Meal groups and working cards use medium curves; summary heroes and empty states use large curves.
- **Background:** Porcelain Sheet on Warm Parchment, sometimes with Pressed Paper headers.
- **Shadow Strategy:** Flat at rest; use border, fill, and clipping before shadow.
- **Border:** Hairline for resting cards, stronger or colored rules for state.
- **Internal Padding:** Usually 14px for compact working rows and 20px for summary cards.

Account and statistics screens deliberately use ruled, transparent ledger sections instead of placing every metric in a rounded card.

### Inputs / Fields

- **Style:** Porcelain fill, visible border, Inter Tight body text, and an 8–14px curve according to context.
- **Focus:** Border, leading icon, or structural rule shifts to Rust Marker; focused state remains clear through more than color alone.
- **Error / Disabled:** Errors use Oxide Error with a soft field or left rule. Disabled controls retain readable text and reduce emphasis without disappearing.

### Navigation

The four-item floating tab bar uses compact Ionicons, small labels, a softly translucent Paper surface, and a strong hairline. The selected item receives Soft Rust Wash plus rust icon and label; inactive items remain faint but legible. Native safe areas and system back behavior are never replaced for visual novelty.

### Editorial Header

Top-level screens use a rust overline, a short fading rule, an Instrument Serif title, and constrained muted description. This header is the clearest reusable expression of the field-journal metaphor and should remain visually lighter than the task content below it.

### Progress and Data

Calories and major totals use serif metrics. Macro bars stay thin and sage; goal or selected progress may use rust. Charts must render missing logs as explicit absence, never as zero-height intake. Progress motion is measured and informative, with reduced-motion fallbacks required as direct animation paths are consolidated.

### States and Feedback

Loading uses a centered spinner with quiet explanatory copy. Inline failures use oxide color and structural rules. Empty states may use a large bordered paper card when they represent a self-contained task, or ruled space when they belong to a report. Modals and toasts are among the few surfaces allowed to cast clear shadows.

**The State Reads Twice Rule.** Interactive state must be communicated through at least two of color, fill, border, icon, label, or motion, never color alone.

## Do's and Don'ts

### Do:

- **Do** let warm paper and Carbon Ink establish hierarchy before introducing accent color.
- **Do** use Rust Marker sparingly for the primary decision, active selection, focus, or meaningful progress.
- **Do** choose between a rounded working card and a ruled ledger section according to the information's function.
- **Do** preserve the editorial type registers and constrain explanatory copy to readable line lengths.
- **Do** support light and dark Paper appearances, font scaling, reduced motion, safe areas, and explicit accessibility state.
- **Do** use native segmented controls, pickers, sheets, and system navigation behavior where the platform already provides the correct interaction.

### Don't:

- **Don't** turn CalCount into neon gamified fitness UI with saturated gradients, glowing rings, aggressive achievement chrome, or synthetic hype.
- **Don't** flood screens with rust or make every interactive accent the brand color; Carbon Ink and semantic colors have distinct jobs.
- **Don't** place every section in a rounded card or add shadows to resting content merely to create hierarchy.
- **Don't** stretch mobile content edge to edge on wide web layouts or leave a phone bottom bar unchanged on expanded native layouts.
- **Don't** treat missing nutrition data as zero or use visual completion to imply evidence the product does not have.
- **Don't** normalize the scoped onboarding palette, legacy themes, or known one-off controls into the Paper baseline.
- **Don't** use Instrument Serif for dense controls, long body copy, or technical metadata.

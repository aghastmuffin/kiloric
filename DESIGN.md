---
name: CalCount
colors:
  night-background: "#121110"
  night-surface: "#1B1A17"
  night-surface-alt: "#25231F"
  night-hairline: "#2F2C27"
  night-rule: "#45413A"
  night-ink: "#ECE6DA"
  night-muted: "#A39B8F"
  night-faint: "#776F65"
  night-accent: "#E0664E"
  night-on-accent: "#121110"
  night-accent-wash: "rgba(224, 102, 78, 0.12)"
  night-protein: "#93A67F"
  night-carbs: "#C9A25A"
  night-fat: "#8E9BB0"
  night-danger: "#E07A6E"
  paper-background: "#F3EFE7"
  paper-surface: "#FCFAF5"
  paper-surface-alt: "#ECE6DB"
  paper-hairline: "#DED6C9"
  paper-rule: "#C7BDAE"
  paper-ink: "#211F1B"
  paper-muted: "#625C54"
  paper-faint: "#70695F"
  paper-accent: "#211F1B"
  paper-brand: "#A33A2E"
  paper-on-brand: "#FFF9F1"
  paper-brand-wash: "rgba(163, 58, 46, 0.10)"
  paper-protein: "#5C704E"
  paper-carbs: "#8A641C"
  paper-fat: "#5E6E84"
  paper-danger: "#913C35"
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
  screen-title:
    fontFamily: "InstrumentSerif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: "27px"
    letterSpacing: "-0.3px"
  gauge:
    fontFamily: "InstrumentSerif"
    fontSize: "40px"
    fontWeight: 400
  body:
    fontFamily: "IBMPlexSans"
    fontSize: "16px"
    lineHeight: "23px"
  label:
    fontFamily: "IBMPlexSans"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "17px"
  numeric:
    fontFamily: "JetBrainsMono"
    fontSize: "15px"
    lineHeight: "20px"
    fontVariant: "tabular-nums"
rounded:
  control: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  xxxl: "48px"
---

# Design System: CalCount

## Overview

**Night ledger.** CalCount is a calm, dark calorie tracker. The default appearance is a warm black page with rust used only for the action that matters. Paper is the single light theme, kept for people who want a warm page in daylight. There is no adaptive system theme, no second dark palette, and no all-serif or all-mono font mode.

The interface reads like a ledger: screen titles and the large calorie number are set in Instrument Serif; everything else is IBM Plex Sans; gram and kilocalorie figures other than that large number are JetBrains Mono with tabular figures. Meal lists are ruled rows. Dark surfaces do not cast shadows.

## Themes

`AppThemeChoice` is `'night' | 'paper'`. The default is night. A stored `'dark'` maps to night and a stored `'light'` maps to paper. Older `'ios'` and `'barebones'` values also resolve to night.

Night does not follow the operating system. Paper does not follow it either. `userInterfaceStyle` in `app.json` is `dark`, and the splash and adaptive icon backgrounds are `#121110`.

Onboarding uses the same tokens as the rest of the app. There is no separate onboarding palette.

### Night ledger

| Role | Token | Value |
|------|--------|--------|
| Page | `background` | `#121110` |
| Surface | `surface` | `#1B1A17` |
| Raised surface | `surfaceAlt` | `#25231F` |
| Hairline | `border` | `#2F2C27` |
| Strong rule | `borderStrong` | `#45413A` |
| Ink | `text` | `#ECE6DA` |
| Muted | `textMuted` | `#A39B8F` |
| Faint | `textFaint` | `#776F65` |
| Accent and brand | `accent`, `brand` | `#E0664E` |
| Ink on accent | `onAccent`, `onBrand` | `#121110` |
| Accent wash | `accentSoft`, `brandSoft` | `rgba(224, 102, 78, 0.12)` |
| Protein / success | `protein`, `success` | `#93A67F` |
| Carbs | `carbs` | `#C9A25A` |
| Fat | `fat` | `#8E9BB0` |
| Danger | `danger` | `#E07A6E` |

### Paper

Paper keeps the existing warm light palette: parchment `#F3EFE7`, porcelain `#FCFAF5`, ink `#211F1B`, and rust brand `#A33A2E`. In paper, `accent` stays ink so quiet controls do not all turn rust. Protein, carbs, and fat reuse the paper success, warning, and a cool slate (`#5E6E84`).

Rust still marks the primary decision. It does not flood the screen.

## Typography

- **Instrument Serif** is only for the large calorie number and screen titles (`headlineLarge`, stack header titles).
- **IBM Plex Sans** is the body, label, and section-title face. It replaces Inter Tight.
- **JetBrains Mono** with `tabular-nums` is for gram and kilocalorie values other than the large gauge number (`typography.numeric`).

There is no font picker. The app always loads these three families.

Button labels are sentence case.

## Space, shape, and depth

Spacing is an 8-point scale: 4, 8, 12, 16, 24, 32, 48.

Inputs, sheets, and working controls use a 10px radius. Pills stay fully round for compact actions and progress tracks.

Dark mode has no shadows. Dialogs, toasts, dragged rows, and the success plate flatten in night. Paper may keep a light lift on those overlay surfaces. The tab bar is docked flush to the bottom with a hairline top border, no shadow, and no pill.

Meal lists are ruled rows: transparent, separated by a hairline, not cards.

Motion is for a real state change (a progress fill, a dialog, a drag). Rows do not stagger in, and the add control is a plain `+ Log` button.

## Goals

A missing calorie or macro target is an empty state with a Set goals link. The gauge and macro bars draw no fallback maximum. Hydration stays out of the checklist and Goals & body until water logging is turned on. `src/lib/water.ts` remains.

There is no XP, level, or streak.

# Screens and routing

Expo Router file-based routes live under `src/app/`. Typed routes are enabled.

## Main tabs

| File | Route | Description |
|------|-------|-------------|
| `(tabs)/index.tsx` | `/` | Today dashboard: nutrition targets, automatic indicators, personal tasks, and recent logs |
| `(tabs)/logfood.tsx` | `/logfood` | Food search, barcode entry, favorites, history, and meal logging |
| `(tabs)/stats.tsx` | `/stats` | Nutrition history and progress summaries |
| `(tabs)/account.tsx` | `/account` | Sign in, account summary, user preferences, privacy controls, and deletion |

`(tabs)/_layout.tsx` applies `ProfileGate`. Signed-in users cannot enter the main tabs until a complete, adult-eligible profile is confirmed.

The `meals`, `workouts`, `meds`, and `searchrewrite` files are hidden routes. Preview planners have no production navigation entry point.

## Stack screens

| File | Route | Description |
|------|-------|-------------|
| `signin.tsx` | `/signin` | Neutral CalCount introduction and password sign-in |
| `onboarding.tsx` | `/onboarding` | Eligibility-first account creation and profile setup |
| `onboard_success.tsx` | `/onboard_success` | Setup completion screen |
| `reset-password.tsx` | `/reset-password` | Completes Appwrite email recovery links |
| `cameraview.tsx` | `/cameraview` | Barcode scanner; opened only from an explicit scan action |
| `Additions.tsx` | `/Additions` | Product detail and add-to-meal |
| `config.tsx` | `/config` | Profile, goals, nutrition targets, and appearance preferences |
| `contribute-food.tsx` | `/contribute-food` | Submit a food record for review |
| `privacy-policy.tsx` | `/privacy-policy` | Privacy and retention policy |
| `credits.tsx` | `/credits` | Credits and acknowledgements |

## Authentication and eligibility

1. A new user confirms a date of birth and must be at least 18 before entering an email or password.
2. After account creation, onboarding gathers the fields needed for nutrition calculations.
3. `ProfileGate` revalidates profile completeness and age on every signed-in tab entry.
4. Profile edits reject an ineligible date of birth.
5. Password recovery begins from the sign-in password screen and returns through `/reset-password`.
6. Account deletion is available from the You tab and immediately blocks account access; server-side retention procedures complete the purge.

## Camera behavior

- Camera permission is requested only after an explicit scan or photo action.
- CalCount does not request microphone access.
- A permanently denied camera permission shows an Open settings action on native platforms.
- The iOS Simulator shows a physical-camera requirement instead of opening the scanner.

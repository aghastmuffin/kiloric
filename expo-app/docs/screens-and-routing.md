# Screens and routing

Expo Router file-based routes live under `src/app/`. Typed routes are enabled.

## Main tabs

| File | Route | Description |
|------|-------|-------------|
| `(tabs)/index.tsx` | `/` | Today: calorie ring (eaten / burned / goal), macro bars, today's plan checklist. On wide web it becomes the dashboard with prep, weight and 7-day calorie cards |
| `(tabs)/plan.tsx` | `/plan` | Weekly meal plan: day picker, planned meals with prepped badges, prep session card, auto-fill week |
| `(tabs)/logfood.tsx` | `/logfood` | Log food: meal segmented control, search + scan, Recent / Frequent / My meals, multi-select add |
| `(tabs)/train.tsx` | `/train` | Upcoming and past workouts; `?workout=<id>` opens the live session (sets table, rest timer, finish) |
| `(tabs)/progress.tsx` | `/progress` | Weight trend, weigh-in form, average intake, workouts this week, 7-day calories |
| `(tabs)/account.tsx` | `/account` | Sign in, account summary, user preferences, privacy controls, and deletion |

`(tabs)/_layout.tsx` applies `ProfileGate` and renders the shell with headless `expo-router/ui` tabs: a floating bottom bar (Today, Plan, centre +, Train, Progress) below 960 px, and a left sidebar with a logging-streak card at 960 px and above. Account is reached from the avatar on Today or the sidebar.

## Stack screens

| File | Route | Description |
|------|-------|-------------|
| `signin.tsx` | `/signin` | Neutral kiloric introduction and password sign-in |
| `onboarding.tsx` | `/onboarding` | Eligibility-first account creation and profile setup |
| `onboard_success.tsx` | `/onboard_success` | Setup completion screen |
| `reset-password.tsx` | `/reset-password` | Completes Appwrite email recovery links |
| `cameraview.tsx` | `/cameraview` | Barcode scanner; opened only from an explicit scan action, hands off to `/review-log` |
| `review-log.tsx` | `/review-log` | Review & log a food: servings / grams, quick picks, meal, macro impact on today, kcal left |
| `plan-entry.tsx` | `/plan-entry` | Add or edit a planned meal (`?day=`, `?meal=`, `?id=`) |
| `prep-edit.tsx` | `/prep-edit` | Schedule the week's prep session and its dishes (`?week=`) |
| `grocery.tsx` | `/grocery` | Weekly grocery checklist (`?week=`) |
| `workout-editor.tsx` | `/workout-editor` | Schedule a workout with exercises, sets, reps and target weights |
| `Additions.tsx` | `/Additions` | Product detail and add-to-meal |
| `config.tsx` | `/config` | Profile, goals, nutrition targets, and appearance preferences |
| `contribute-food.tsx` | `/contribute-food` | Add a food with guided photos (barcode, front, ingredients, label) for review |
| `privacy-policy.tsx` | `/privacy-policy` | Privacy and retention policy |
| `credits.tsx` | `/credits` | Credits and acknowledgements |

## Authentication and eligibility

1. A new user confirms a date of birth and must be at least 18 before entering an email or password. The same step collects race, country of residence, and whether they reside in any country in Asia.
2. Residents of the EU, Russia, or Vietnam are stopped with the version 101926 legal notice. An Asia “yes” (or an Asian country of residence) shows a red H. pylori screening warning.
3. After account creation, onboarding gathers the same body, activity, diet, and target fields the profile editor saves later.
4. `ProfileGate` revalidates profile completeness, age, and barred country of residence on every signed-in tab entry.
5. Profile edits reject an ineligible date of birth or a barred country of residence, and they edit the same race and Asia answer collected during onboarding.
6. Password recovery begins from the sign-in password screen and returns through `/reset-password`.
7. Account deletion is available from the You tab and immediately blocks account access; server-side retention procedures complete the purge.

## Camera behavior

- Camera permission is requested only after an explicit scan or photo action.
- kiloric does not request microphone access.
- A permanently denied camera permission shows an Open settings action on native platforms.
- The iOS Simulator shows a physical-camera requirement instead of opening the scanner.

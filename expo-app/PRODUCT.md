# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

kiloric serves adults aged 18 and older who are managing a weight goal, tracking calories, or executing fitness-oriented macro targets. It must be powerful enough for users who care about detailed macro planning while remaining straightforward for someone who only wants to count calories. Advanced nutrition detail should not become mandatory complexity: targets can be prefilled where useful and omitted or disabled when they are not part of the user's plan.

Signed-in users may also contribute verifiable packaged-food information for moderation when the catalog is incomplete.

## Product Purpose

kiloric helps people set a personalized nutrition plan, find foods by name or barcode, record what they eat, track calories, macros, and hydration, and understand progress over daily and multi-day periods.

Success means a user can move from a realistic plan to an honest food log with little friction, while a more advanced user can inspect and manage the detail needed for macro-focused goals. Nutrition is the product's durable core. Workouts and medication or wellbeing planners are not core capabilities; current versions of those experiences are samples and must not be represented as saved or clinically actionable tools.

## Positioning

kiloric combines a low-friction calorie-counting path with optional macro depth in the same product. It should make sensible choices for the user by default without hiding the detail that fitness-focused users need. Its progress reporting distinguishes missing data from zero intake and frames targets and trends as planning guidance rather than judgment or clinical fact.

## Operating Context

Users create an account, complete an adult eligibility and body-goal onboarding flow, review a calculated nutrition plan, and then use kiloric around meals, shopping, food preparation, and progress review.

Core workflows include:

- searching for packaged foods by name or barcode, including camera capture;
- adding foods to breakfast, lunch, dinner, snack, or other meal buckets;
- reviewing today's energy, macros, hydration, goal progress, and logged meals;
- reusing favorites and recent foods and organizing or removing logged items;
- reviewing 7- and 30-day logging and energy patterns without treating missing days as zero;
- editing body data, goals, targets, units, and relevant product preferences;
- submitting photographed food information to a pending moderation queue when catalog data is missing.

## Capabilities and Constraints

- kiloric is an Expo SDK 56 React Native application that deliberately supports iOS, Android, and responsive web from one product. Native use is currently portrait-oriented, and web is statically exported.
- Authentication, profiles, meals, tasks, and food contributions use the hosted Kiloric API. User-created records retain per-user ownership through bearer-token authorization enforced by the server.
- Food lookup currently uses hosted search APIs, with Oracle ORDS as the in-app default and a deprecated FastAPI option still present. The long-term canonical food-search backend remains undecided.
- Profiles store height and weight in metric units while allowing metric or imperial display.
- Nutrition targets are planning estimates. The current calculation uses sex-specific Mifflin-St Jeor inputs and enforces adult calorie floors. Changing those constraints requires an explicit product and health-safety decision.
- Users under 18 are not eligible to complete onboarding because the current targets are designed for adults.
- Hydration belongs to the core product, but the current dedicated water-log module is not yet connected to a complete user-facing logging flow.
- Food contributions require authentication, a product name, and a JPG or PNG image no larger than 10 MB. Contributions enter a pending queue; automatic approval, promotion, and search visibility must not be promised until that pipeline is confirmed operational.
- The exact canonical onboarding step count, persistence of guest access, whole-meal reuse behavior, recipe scope, serving customization, and offline meal staging are open product decisions.

## Brand Commitments

The product name is kiloric and the operator identity is Taeson NORTH AMERICA Ltd. Liability Co. Existing app-mark and app-icon assets live under `assets/images/`.

The established product voice is clear, calm, direct, and evidence-conscious. It should support disciplined goals without shame, hype, or invented certainty. Health and trend language must distinguish estimates, incomplete data, and sample functionality from clinical advice or proven outcomes.

## Evidence on Hand

The repository contains implemented account, onboarding, food search, meal logging, daily review, statistics, profile, preference, and contribution workflows; nutrition and data-layer tests; the FastAPI server; legal/privacy copy; and source logo assets.

There are no confirmed testimonials, customer logos, user counts, clinical outcomes, weight-loss results, retention metrics, awards, ratings, pricing, subscriptions, or app-store status. Future work must not fabricate or imply them. Source-level formula tests demonstrate implementation behavior, not clinical efficacy. Privacy, security, retention, and moderation statements require owner validation before being reused as external proof.

## Product Principles

1. **Simple by default, powerful on demand.** Calorie-only users get a clear path while macro-focused users can reach meaningful depth without changing products.
2. **Make the honest log valuable.** Reduce friction around recording real intake rather than rewarding performative completeness.
3. **Never turn missing data into false certainty.** Distinguish no log from zero intake and label estimates, rules, and samples accurately.
4. **Keep nutrition at the center.** Adjacent routines must not dilute the food, goal, hydration, and progress experience or masquerade as finished capabilities.
5. **Respect health context.** Use supportive language, preserve adult eligibility and safety constraints, and avoid clinical or outcome claims the product cannot substantiate.

>[!info]
> legally, this project does not meet any of the criterion of which the CPRA applies, it derives 0% of its revenue from user data (this is a net loss for me to host), we do engage in the commerce of the personal information of 100,000 California residents or households, and we do not have a gross annual revenue of 25 million dollars (USD). As an act of good faith, your data is held 100% in CPRA compliance; any rights beholden to you under California Civil Code 1798.100-1798.199.100. This courtesy extends to all users, not only those resident in California. 

>[!info] Kiloric is intellectual property of TAESON SAN FRANCISCO HOLDINGS Ltd Liability Co. Distributing modified copies of this program is disallowed.

>[!warning] You are NOT permitted to use the app if you are from the following nations (informal naming): The Federation of Russia, Vietnam, Brazil, The European Economic Area, China, The United Kingdom or if you area provides extra data compliance and residency. 

# The Privacy Policy

Kiloric respects user privacy and strictly minimizes data collection. Personal information and fitness tracking data are used exclusively to deliver application functionality. We do not sell, rent, or share user data with third parties for commercial or advertising purposes.

# The Data Retention Policy

User data is retained for as long as the user maintains an active account with Kiloric. Upon account deletion request (`DELETE /v1/me`), all user profile data and child database records (meals, water logs, food entries, saved meals, meal plans, prep sessions, grocery items, workouts, workout sets, weight logs, and tasks) are permanently deleted from our active database.

# The Data Collection Policy

*Audit Completed: October 25th, 2026*

Kiloric collects only data necessary to support user health, nutrition, and exercise tracking:

1. **User Profile & Credentials**: Email, hashed password, username, date of birth, sex, height, weight goals, activity level, and TDEE preferences.
2. **Nutrition & Meal Tracking**: Logged meals, custom food items, food entry timestamps, macro/micronutrient breakdown, water intake logs, saved meals, meal plan entries, meal prep sessions, and grocery lists.
3. **Fitness & Workouts**: Logged workouts, exercise types, workout sets (reps, weights), and weight tracking logs.
4. **App State & Preferences**: User task checklists, font choices, theme preferences, and search mode preferences.

### Data Access, Portability, and Single-File Export

In accordance with California Civil Code 1798.100-1798.199.100 (CPRA) and universal user data privacy standards:
- **Portability / Export**: Users can export all personal data and user-owned collections in a single packaged JSON file (`GET /v1/me/export`).
- **Deletion**: Users can request complete account and data removal (`DELETE /v1/me`), which immediately cascades and purges all associated collection records.
- **Third-Party Data Sourcing**: Catalog food dataset collection is built independently via public domain and open database sources (USDA FoodData Central, Health Canada Canadian Nutrient File, Open Food Facts) and consolidated into a single database package file.

/**
 * Feature flags for unreleased features. While a flag is false its screens
 * redirect home and nothing in the UI links to or mentions it. The data and
 * logic code stays in place, so setting the flag to true turns it back on.
 */
export const FEATURES: { workouts: boolean; water: boolean } = {
  workouts: false,
  water: false,
}

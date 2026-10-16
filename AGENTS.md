# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Cursor Cloud specific instructions

CalCount is a single Expo (SDK 56) React Native app that talks to a hosted Appwrite backend. There is no separate backend service to start in this repo. Standard commands live in `package.json` scripts and `docs/README.md`.

- Run the app in the cloud VM with `npx expo start --web` (Metro serves on port 8081). There is no iOS/Android simulator here, so use the web target. The first browser bundle takes ~15s to compile.
- Copy `.env.example` to `.env` (gitignored) and point it at the hosted Appwrite instance (`https://appwrite.calcount.taeson.co/v1`). On web, the Appwrite platform is derived from the browser hostname, and `localhost` is already an accepted origin, so email/password signup + sign-in work from the VM browser without extra config. The Appwrite session secret is stored with `expo-secure-store` on native and is not persisted on web.
- New accounts are gated: after first sign-in, `ProfileGate` redirects to the 5-step `/onboarding` wizard (which writes the profile document to Appwrite) before the main tabs become usable.
- Appwrite rejects disposable and non-canonical/aliased emails (e.g. `@example.com`, `gmail` with `+tags`). For throwaway test signups use a plain domain such as `@calcountdev.co`, `@outlook.com`, or `@proton.me`.
- Lint: `npm run lint`. Tests: `npm test` (Vitest). Test files live under `src/**/*.test.ts`. ESLint ignores those test files, so `import/no-unresolved` for `vitest` is not a lint failure.

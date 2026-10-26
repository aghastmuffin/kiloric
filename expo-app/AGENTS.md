# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Cursor Cloud specific instructions

kiloric is an Expo (SDK 56) React Native app backed exclusively by the FastAPI service in `../server`. Standard commands live in `package.json` scripts and `docs/README.md`.

- Run the app in the cloud VM with `npx expo start --web` (Metro serves on port 8081). There is no iOS/Android simulator here, so use the web target. The first browser bundle takes ~15s to compile.
- `.env` points at the hosted API (`https://api.kiloric.co`). The local FastAPI service can be run from `../server` when its Python environment is available.
- New accounts are gated: after first sign-in, `ProfileGate` redirects to the `/onboarding` wizard, which writes the profile to the Kiloric API before the main tabs become usable.
- For throwaway signup tests, use a unique address on a controlled plain domain such as `@kiloricdev.co` and delete the account after the test.
- Lint: `npm run lint`. Tests: `npm test` (Vitest; the `test` script and `vitest` devDependency were added during environment setup — there is currently one Vitest test file, `src/lib/authValidation.test.ts`).
- Known pre-existing lint error: `import/no-unresolved` for `vitest` in that test file. eslint-plugin-import's default resolver can't follow Vitest's `exports` map even though it is installed and the tests run fine; this is not an environment problem.

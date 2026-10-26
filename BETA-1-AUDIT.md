# Kiloric b-1 audit

Release: 1.0.0-beta.1 (b-1). App URL: https://kiloric.co/app/.
API origin: https://api.kiloric.co, with /v1 routes. Root landing page remains separate.

## Changes

- Production API origin is the default, including token refresh; an environment
  value ending in /v1 is normalized to avoid /v1/v1 URLs.
- Existing profile, preferences, meals, water, tasks, workouts, weight, food logs,
  saved meals and planning stores use the API bearer session through a compatibility
  boundary. Legacy query filters, sorting, pagination and timestamps are supported
  on the server; user ownership remains enforced independently of client filters.
- Logout submits its refresh token for revocation. Account deletion calls the
  cascading server endpoint and reports failures instead of hiding them.
- Missing SMTP or an SMTP delivery failure now produces a clear 503 error instead
  of reporting that a reset email was sent.
- Reset-password accepts the token query parameter emitted by the server.
  Production reset links target https://kiloric.co/app/reset-password.
- Fixed an existing React Compiler lint error and a missing icon asset reference.
- Reproducible web export goes to website/app, uses /app asset paths, supplies
  directory indexes for route reloads and marks the release in app/release.json.
  The original root page is retained; privacy content is also preserved.
- Both public and in-app privacy forms now prepare a real email draft and clearly require
  the user to send it, instead of inventing a ticket and claiming email delivery.
- GitHub Actions validates the app, checks that the new API is deployed, exports
  website/app, and uploads the entire website directory to Pages.

## Validation

- TypeScript: passed. ESLint: passed with existing warnings.
- Vitest: 40 files, 286 tests passed.
- Server: 8 tests passed, including real register/profile/preferences flows,
  refresh rotation and logout, owner isolation, validation errors, timestamp
  queries, data export, deletion, private contribution uploads and production-origin CORS.
  Command: CORS_ORIGINS=https://kiloric.co .venv/bin/python -m unittest discover -s tests
- Production static export completed successfully. No browser automation tool was
  available in this session; interactive visual flows and native devices are not verified.
- Through the public Cloudflare hostname: health 200; invalid login 401;
  temporary test account registration 201; profile, meals, water, tasks and data
  export 200; test account removed with DELETE /v1/me, returning 204.
- Live /v1/me/prefs returns 404: the deployed API does not yet include this release.

## Release blockers and operational requirements

1. Deploy updated server/ to the existing API host. The Pages workflow refuses
   publication until unauthenticated /v1/me/prefs returns 401, demonstrating that
   the new route is deployed. See server/deploy/deploy.txt. No host deployment
   credentials or automatic backend deployment workflow were available.
2. Pages configuration was initially blocked with integration HTTP 403. A later
   read confirmed that Pages now uses GitHub Actions with custom domain kiloric.co.
   The newly added repository-wide uploader was replaced with the checked release
   workflow, which uploads only website/. DNS/HTTPS and the final production app
   still require verification after deployment.
3. Food contributions and bounded private photo uploads now use /v1 API endpoints,
   with signature/type checks, a 10 MB per-photo limit, 200 MB account quota,
   ownership checks, exports and cascading account deletion. These routes need
   the same backend deployment and still require browser/native verification.
   Uploaded photos are stored in the API database; include these new tables in
   database backup/capacity plans. Exports include authenticated photo download paths.
   Existing Appwrite accounts/data are not automatically transferred; no legacy
   account/data migration was run.
4. Manual privacy requests open email drafts; users must send them. In-app data
   export now uses the server's complete collections export rather than a limited
   and potentially partial local aggregation. No email is claimed as sent.
5. Configure SMTP and a strong production JWT_SECRET on the actual host. Password
   email delivery and account recovery require a configured email service and
   were not verified end to end. Existing .env values override config defaults,
   so explicitly update CORS_ORIGINS and APP_RESET_URL on the host.

This export is a reproducible release candidate, not an assertion that every
production feature is ready. Resolve the blockers and verify sign-in, onboarding,
core writes and password recovery in a browser before announcing b-1.

Static artifact verification: all 60 exported HTML documents were checked for
missing /app asset references; none were missing. Direct-route index files for
sign-in and password reset are present.

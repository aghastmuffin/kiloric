# Kiloric website

`index.html` is the independent root page. `app/` contains the b-1 Expo web export
for https://kiloric.co/app/. Do not use website/app as the Pages artifact root;
publish website so /app asset and route URLs resolve correctly.

Regenerate from the repository root:

    cd expo-app
    npm ci
    npm run export:web

The export defaults to KILORIC_BASE_PATH=/app and pins the production API origin
to https://api.kiloric.co. Route directory indexes support direct reloads on Pages.
The GitHub Actions workflow builds and publishes this same directory after checks.
See ../BETA-1-AUDIT.md for deployment requirements and unresolved beta blockers.

# iPermit Mobile

Expo + React Native + TypeScript app for drivers and police officers. Uses Expo
Router (file-based navigation). See [../docs/design.md](../docs/design.md) for the
overall architecture.

## Structure

- `src/app/` — routes (Expo Router). `(auth)` = login/register (unauthenticated),
  `(app)` = authenticated screens. Root `index.tsx` redirects between them based on
  auth state.
- `src/api/` — backend HTTP client (axios) and per-domain API calls.
- `src/context/auth-context.tsx` — auth state, wraps the whole app.
- `src/lib/token-storage.ts` — JWT storage: Expo SecureStore on native, `localStorage`
  on web (SecureStore isn't available on web).
- `src/components/` — shared UI (themed text/view, text field).

## Run locally

```bash
cd mobile
cp .env.example .env   # adjust EXPO_PUBLIC_API_URL — see comments in the file
npm install
npm run web       # browser, easiest for iterating against the backend
npm run ios       # or npm run android
```

The backend must be running first — see [../backend/README.md](../backend/README.md)
(`docker compose up` from the repo root).

**Choosing `EXPO_PUBLIC_API_URL`:** `localhost` only reaches the backend from a web
browser or iOS simulator on the same machine. Android emulator needs
`http://10.0.2.2:8000`; a physical device via Expo Go needs your machine's LAN IP.

## Quality checks

```bash
npx tsc --noEmit
npx eslint .
```

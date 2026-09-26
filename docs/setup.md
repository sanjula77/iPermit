# Testing the Mobile App with Expo Go

This guide covers running the iPermit backend and mobile app so you can test the
driver/police experience on a physical phone via the Expo Go app. For running the
mobile app in a browser or simulator instead, see [mobile/README.md](../mobile/README.md).

## 1. Prerequisites

- Docker and Docker Compose (for the backend + Postgres)
- Node.js and npm (for the mobile app)
- **Expo Go** installed on your phone from the App Store / Play Store
- Your phone and your development machine connected to **the same Wi-Fi network** —
  Expo Go loads the app over your LAN, so a phone on mobile data or a different
  network will not be able to reach either the Expo dev server or the backend.
- Expo Go supports one SDK version at a time. This project targets **Expo SDK 57**
  (see `mobile/package.json`); if your installed Expo Go build only supports an older
  or newer SDK, either update the Expo Go app or use a
  [development build](https://docs.expo.dev/develop/development-builds/introduction/)
  instead — a mismatch shows as an immediate "Project is incompatible" error when you
  scan the QR code, not a silent failure.

## 2. Start the Backend

```bash
cp backend/.env.example backend/.env   # edit SECRET_KEY before anything beyond local testing
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

Wait for the backend container to report healthy. First startup downloads the face
recognition models (RetinaFace + ArcFace, ~275MB) into `.data/insightface/` — this
only happens once; subsequent restarts are fast.

**Where local data lives.** Postgres data (`.data/pgdata/`) and the face models
(`.data/insightface/`) are bind-mounted folders in the repo root, not Docker named
volumes, so they survive `docker system prune`, image deletion, or a Docker
reinstall. Both are gitignored. `.data/pgdata/` is owned by the container's
`postgres` user, so deleting it (to reset the database) needs `sudo`.

**Local pip wheelhouse.** The backend image installs Python packages from
`backend-wheels/` (gitignored) first and only downloads what's missing, so a rebuild
after Docker's cache is wiped doesn't re-download ~1GB of ML packages. Fill or
refresh it after changing `backend/requirements*.txt`:

```bash
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD/backend":/app:ro -v "$PWD/backend-wheels":/wheels -w /app \
  ipermit-backend pip wheel -w /wheels -r requirements-dev.txt opencv-python-headless==5.0.0.93
```

(On a brand-new machine with no `ipermit-backend` image yet, just run
`mkdir -p backend-wheels && docker compose up -d --build` first — pip falls back to
downloading — then run the command above.)

Day to day, use `docker compose up -d` without `--build`: `./backend` is mounted
live with `--reload`, so code changes never need a rebuild. Only rebuild after
changing `backend/requirements*.txt` or `backend/Dockerfile`.

Confirm it's up:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/ready   # confirms DB connectivity too
```

Bootstrap an admin account (only DRIVER accounts self-register):

```bash
docker compose exec backend python -m app.scripts.create_admin \
  --email admin@ipermit.lk --nic 000000000V --password <password> --role ADMIN
```

Bootstrap a police account the same way with `--role POLICE` if you want to test
roadside verification.

## 3. Find Your Machine's LAN IP

A physical phone cannot reach the backend at `localhost` — that always means "this
device," which from the phone's perspective is the phone itself, not your computer.
You need your development machine's LAN IP address instead:

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'

# Windows (PowerShell)
ipconfig | findstr IPv4
```

This gives something like `192.168.1.42`. Confirm the backend is actually reachable
at that address (not just `localhost`) from another device on the same network before
moving on — a firewall on the dev machine is a common reason this fails silently.

## 4. Configure the Mobile App

```bash
cd mobile
cp .env.example .env
```

Edit `mobile/.env` and set `EXPO_PUBLIC_API_URL` to your machine's LAN IP from step 3:

```
EXPO_PUBLIC_API_URL=http://192.168.1.42:8000
```

Then install dependencies:

```bash
npm install
```

## 5. Start Expo and Connect Expo Go

```bash
npm start
```

This opens the Expo CLI with a QR code in your terminal (and a browser dev-tools
page). Open the **Expo Go** app on your phone and scan the QR code — on iOS, scan it
with the regular Camera app, which hands off to Expo Go; on Android, use the
"Scan QR code" option inside Expo Go itself.

The app should load, showing the login/registration screen (`(auth)` route group in
`mobile/src/app/`). If it hangs on a loading screen or fails to fetch, re-check step 3
— an unreachable `EXPO_PUBLIC_API_URL` is the most common cause.

## 6. What You Can Actually Test in Expo Go

Everything in the app runs in Expo Go, but be aware of two features whose real-device
behavior has not been independently verified by this project (see
[docs/tasks.md](tasks.md) Phase 8):

- **Push notifications** — the plumbing (in-app notification creation, read-marking,
  Expo push token registration) works and is tested, but actual push delivery to a
  physical device has not been confirmed in this project's own development
  environment. Testing this now, with a real device, is useful new information — if
  it doesn't arrive, check that you accepted the notification permission prompt on
  first launch.
- **Road incident map view** — `react-native-maps` is expected to render natively in
  Expo Go, but this has similarly not been visually confirmed by this project (only
  the web no-op variant has been checked). This is a good thing to verify directly.

Camera-based face capture (enrollment, police face-scan) and QR scanning both need
camera permission — accept the OS prompt the first time either screen is opened.
Location-based road incident reporting similarly needs location permission; denying
it falls back to a default coordinate rather than failing the screen.

## 7. Testing a Full Flow

A reasonable end-to-end path to exercise most of the app in one pass:

1. Register a driver account in the app.
2. Submit a license application with 4 real face photos of the same person and 3
   filler documents (any valid image).
3. Approve the application as the admin account you created in step 2, either via
   `http://localhost:8000/docs` (Swagger UI, from your dev machine) or the admin-web
   dashboard (`cd admin-web && npm run dev`, separate from the mobile app).
4. Back in the mobile app, confirm the driver now has a digital license with a QR
   code and an initial PLATINUM badge.
5. If you also bootstrapped a police account, log into a second Expo Go session (or
   log out/in on the same phone) as that officer and try face-scan or NIC lookup
   against the driver you just enrolled.

## Known Gaps to Expect

These are documented, deliberate gaps in the current build (see
[docs/tasks.md](tasks.md) for the full list), not bugs to chase down while testing:

- Automated white-line violation detection is not implemented — violations must be
  recorded manually by an officer via the app.
- REQ-13 AC5 (notifying nearby drivers of a new high-severity incident) is
  deliberately unimplemented due to a conflict with the project's privacy
  requirement — see [docs/methodology.md](methodology.md) §4.7.
- Every numeric threshold in the system (face-match similarity, photo quality
  thresholds, point/fine schedule) is an explicitly unvalidated placeholder, not a
  tuned production value.

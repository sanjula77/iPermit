# Implementation Plan — iPermit

> Status: **nothing has been built yet.** This is a from-scratch build plan derived
> from [requirements.md](requirements.md) and [design.md](design.md). Earlier drafts
> of this file assumed an existing codebase (based on how the source thesis documents
> were worded) — that assumption was wrong; every task below starts at zero.

## Project Boundaries

**Must-have (MVP for final submission):**
- Driver/police/admin auth with RBAC
- License application, review, digital license + QR
- Face enrollment and roadside face verification
- White-line violation detection, point deduction, fine issuance, mock payment, appeals
- Rule-based driver badge/tier analytics
- Notifications (in-app minimum; push if time allows)

**Nice-to-have:**
- Road incident reporting and map
- Admin analytics dashboard beyond basic counts

**Out of scope for this version:**
- Real payment gateway integration (mock only)
- ANPR / number-plate recognition
- Danger-area / accident-blackspot prediction
- ML-based driver risk prediction (using rule-based badges instead)
- Production Kubernetes/cloud deployment (local/dev only)

**Technical stack:** FastAPI/Python backend, PostgreSQL, Expo/React Native +
TypeScript mobile app, Next.js + TypeScript admin web — per the [ADR](design.md#architecture-decision-record-adr).

## Phases

- [ ] 0. Project Scaffolding
  - [x] 0.1a Create backend/ repo structure — mobile/ and admin-web/ still pending
    - _Requirements: n/a (foundation)_
  - [x] 0.2 Docker Compose for local Postgres + backend dev environment (verified: builds, `db` healthcheck passes, backend reachable on :8000)
    - _Requirements: n/a (foundation)_
  - [x] 0.3a Python tooling: ruff + black configured and passing — TS tooling (eslint/prettier) still pending until 2.1/3.3 scaffold the JS apps
    - _Requirements: n/a (quality gate)_

- [x] 1. Backend Foundation
  - [x] 1.1 FastAPI project skeleton, PostgreSQL connection, SQLAlchemy models, Alembic migrations
    (verified: `alembic upgrade head` applied against real Postgres, `/ready` confirms DB connectivity)
    - _Requirements: REQ-1_
    - _Dependencies: 0.1, 0.2_
  - [x] 1.2 User model + JWT auth (register/login) + RBAC (DRIVER/POLICE/ADMIN)
    (verified end-to-end: register, login by email/NIC, wrong-password rejection,
    client-supplied `role` ignored on registration, JWT-protected `/me`, 7 automated
    tests passing)
    - _Requirements: REQ-1_
    - _Dependencies: 1.1_

- [x] 2. Mobile App Foundation
  - [x] 2.1 Expo app scaffold + Expo Router navigation structure
    (verified: `tsc --noEmit` and `eslint .` clean; `(auth)`/`(app)` route groups
    with redirect gating in both directions based on auth state)
    - _Requirements: n/a (foundation)_
    - _Dependencies: 0.1_
  - [x] 2.2 Registration/login screens wired to backend auth; secure token storage
    (Expo SecureStore on native, localStorage on web since SecureStore doesn't
    support web — verified end-to-end in a browser preview against the live backend:
    register → auto-login → home → logout → login again, token persists across reload)
    - _Requirements: REQ-1_
    - _Dependencies: 1.2, 2.1_

  **CORS added to backend** (not originally scoped, but required for any web-based
  client — mobile-web preview now, Next.js admin later — to call the API from a
  browser): `backend/app/main.py` + `cors_origins` in `backend/app/core/config.py`.
    - _Dependencies: 1.2, 2.1_

- [ ] 3. License Application Module
  - [x] 3.1 Backend: application model + submission endpoint (photo/document uploads)
    (verified end-to-end via live curl + 16 automated tests: exactly-4-photos rule,
    content-type + decodable-image validation, orphaned-file cleanup on partial
    failure, ownership-scoped list/get, driver-only RBAC, `file_path` never
    leaked in API responses. Basic structural image validation only — deeper
    blur/face-visibility checks are deferred to the Phase 4 face recognition
    module, see requirements.md REQ-2 AC2 note in code)
    - _Requirements: REQ-2_
    - _Dependencies: 1.2_
    - _Known gap: submission doesn't yet trigger a notification (REQ-2 AC3) —
      Notification model doesn't exist until Phase 8; hook point is in
      `application_service.submit_application`._
  - [x] 3.2 Mobile: application submission flow (camera/document picker)
    (4 face photo slots with camera+library capture via expo-image-picker,
    3 document slots via expo-document-picker, cross-platform FormData upload
    handling web `File` objects vs. native `{uri,name,type}`. Home screen
    fetches and displays the driver's own application status. Verified
    end-to-end in a browser preview: full multipart submission to the live
    backend, 201 response, redirect to home, PENDING status displayed.
    Found and fixed a real bug: `Link asChild` doesn't accept an array style
    on its child, needed `StyleSheet.flatten`)
    - _Requirements: REQ-2_
    - _Dependencies: 2.2, 3.1_
  - [x] 3.3 Admin web scaffold (Next.js) + application review list + approve/reject endpoints
    (Backend: GET /admin/applications with status filter, POST .../approve,
    POST .../reject with required reason, ADMIN-only RBAC, state-machine guard
    against re-deciding an already-approved/rejected application. Added
    driver email/NIC to ApplicationRead — a UUID-only review list wasn't
    actually usable. Added app/scripts/create_admin.py CLI to bootstrap the
    first admin, since only DRIVER self-registration exists over HTTP.
    Frontend: Next.js admin-web/ scaffold, admin-only login (client-side
    role check rejects non-admin credentials even though they're valid),
    filterable application list, inline approve/reject with reason textarea.
    Verified end-to-end in a browser preview against the live backend: login,
    filter, reject-with-reason, list refresh, non-admin login correctly
    rejected. Found and fixed two real bugs: a rate-limiter test-isolation
    bug (limiter.reset() now runs between tests) and a missing error-message
    path (extractErrorMessage only handled ApiError, so a deliberately-thrown
    plain Error's message was swallowed by the generic fallback) — also
    caught a pre-existing gitignore bug where admin-web's own `.env*` rule
    was shadowing the root's `!.env.example` negation.)
    - _Requirements: REQ-3_
    - _Dependencies: 3.1_
  - [x] 3.4 Digital license generation (license number, expiry, QR token) on approval
    (License model + migration, issued atomically with approval in the same
    DB transaction via application_service.approve_application — an
    application can never end up APPROVED with no license, or vice versa,
    if either write fails. license_no = "DL-" + random hex (no sequence
    table needed); qr_token = secrets.token_urlsafe(32); expiry = issued_at
    + license_validity_years (default 5, configurable). GET /licenses/me
    added for the driver's own current license. Verified end-to-end: 404
    before approval, license appears after approval with correct 5-year
    expiry, two drivers get distinct license_no/qr_token, a driver can't
    see another driver's license. 6 new tests, 31/31 passing.)
    - _Requirements: REQ-4_
    - _Dependencies: 3.3_
  - [~] 3.5 Mobile: digital license card screen (QR display, points, status)
    (Partially done as part of 3.4's verification loop: a LicenseCard on
    the Home screen shows license_no, expiry, ACTIVE/SUSPENDED status, and
    a real scannable QR code (react-native-qrcode-svg) rendered from
    qr_token — verified visually in the browser preview, including a real
    bug fix (an unstyled wrapper View was painting a background seam over
    the card). Silently and correctly shows nothing (not an error) when a
    driver has no license yet, confirmed for both cases live.
    Still open: **points balance** display — blocked on Phase 6 (points
    don't exist yet). Also open: this is a card on the shared Home screen,
    not the dedicated full-screen license view implied by "screen" in the
    task title — revisit if a dedicated view becomes worth the navigation
    overhead once points are added.)
    - _Requirements: REQ-4_
    - _Dependencies: 3.4_

- [x] 4. Facial Recognition Module
  - [x] 4.1 Stand up the face recognition service: RetinaFace detection + ArcFace embedding via ONNX Runtime
    (app/core/face_engine.py wraps insightface's `buffalo_l` model pack
    (RetinaFace det_10g.onnx + ArcFace w600k_r50.onnx) via ONNX Runtime
    CPUExecutionProvider. Model loading is lazy — first real use, not app
    startup — so uvicorn's --reload doesn't reinitialize a ~275MB model on
    every file save. Models are cached in a persistent Docker volume
    (ipermit_face_models) so they download once, not on every rebuild.
    Hit two real infra problems: insightface's own downloader isn't
    resumable and failed outright on a flaky connection — replaced with a
    custom retrying/resumable downloader (Range headers, 8 attempts,
    exponential backoff); and insightface's transitive deps pull in
    GUI-enabled opencv-python regardless of an explicit
    opencv-python-headless pin in requirements.txt, which crashes on this
    slim image (missing libxcb/libGL) — fixed with a forced
    uninstall-both-then-reinstall-headless step in the Dockerfile. Verified
    against real fixture images: correctly returns 1 face with a properly
    L2-normalized 512-dim embedding, 0 faces for a solid-color image, 2
    faces for a two-person composite.)
    - _Requirements: REQ-5_
    - _Dependencies: 1.1_
  - [x] 4.2 SQLite template store + FAISS index (build + rebuild-from-SQLite procedure)
    (app/core/face_template_store.py: plain sqlite3 — not SQLAlchemy — one
    table doesn't warrant a second ORM/migration universe alongside
    Alembic's Postgres one, and keeps biometric data isolated from the
    primary Postgres PII store per the NFR. One row per driver_id (upsert on
    re-enrollment). app/core/face_index.py: FAISS IndexIDMap wrapping
    IndexFlatIP (cosine similarity via inner product on L2-normalized
    vectors), with rebuild_index() reconstructing the whole index from
    SQLite — SQLite is the source of truth, FAISS is a derived/rebuildable
    cache, not the other way around. search() is implemented as a
    primitive but not yet wired to an endpoint — roadside verification is
    Phase 5 (REQ-6).)
    - _Requirements: REQ-5_
    - _Dependencies: 4.1_
  - [x] 4.3 Enrollment pipeline: multi-photo consistency check, wire into application-approval flow (3.4)
    (app/services/face_service.py: extracts one embedding per of the 4
    required FACE_PHOTO documents, requires every pairwise cosine
    similarity to clear face_match_threshold (default 0.42 — a commonly-
    cited ArcFace starting point, NOT validated on our own data, see
    config.py comment and requirements.md's "Benchmarks From Prior
    Research" note about the prior 100%-on-6-people overfitting mistake),
    then averages and re-normalizes into one template embedding. Wired into
    application_service.approve_application with a deliberate ordering
    across two storage systems that can't share one transaction: (1) build
    the face embedding FIRST, before touching Postgres — if photos are
    inconsistent or a photo has 0/2+ faces, FaceEnrollmentError propagates
    and the application stays PENDING, nothing written anywhere; (2) only
    then approve + issue the license in one Postgres transaction (existing
    3.4 behavior, unchanged); (3) only after that commits, persist the face
    template to SQLite/FAISS. Known gap: if step 3 fails, the approval and
    license already committed and are not rolled back — no cross-database
    two-phase commit was built for this academic-scope project. Verified
    end-to-end against the real running backend (not just tests): approving
    with 4 consistent real face photos succeeds, issues a license, and
    stores a retrievable/searchable (self-similarity 1.0) template in both
    SQLite and FAISS; approving with one no-face photo returns 422, leaves
    the application PENDING, issues no license, and stores no orphaned
    template. 9 new tests (5 pure-math consistency tests with synthetic
    vectors + 4 real-fixture integration tests covering success, no-face,
    multiple-faces, and existing admin/license tests updated to use a real
    face fixture since approval now runs real detection), 40/40 passing.)
    - _Requirements: REQ-5_
    - _Dependencies: 4.2, 3.4_
  - [x] 4.4 Liveness/anti-spoofing check (or explicit "disabled" disclosure if deferred)
    (Not implemented this phase — descoped per the project's academic
    timeline. Per REQ-5 AC4, made this an explicit, checkable fact instead
    of a silently skipped step: config.liveness_check_enabled = False, and
    GET /face/status discloses it along with a note that a face match
    confirms embedding similarity only, not that a live person is present.
    Verified live. Phase 5's police verification UI should surface this
    disclosure to officers rather than implying a face match alone proves
    liveness.)
    - _Requirements: REQ-5_
    - _Dependencies: 4.1_

- [~] 5. Police Verification & Violation Detection
  - [x] 5.1 Officer face-scan + QR-scan verification endpoints and mobile screens
    (Backend: POST /police/verify-face (live photo -> face_engine.detect_faces
    -> face_index.search top-3) and GET /police/verify-qr/{qr_token} (direct
    license lookup, no ambiguity since it's a token match not a biometric
    one), both POLICE-only via require_role. Added
    face_template_store.get_driver_id_by_rowid to resolve a FAISS rowid back
    to a driver (search only returns rowids). Mobile: new (app)/police-verify.tsx
    with a Face Scan tab (reuses the existing takePhoto() camera picker) and
    a QR Scan tab (added expo-camera's CameraView for real scanning, plus a
    manual-token text entry as a fallback that's actually what got exercised
    in the browser preview, since a headless preview has no real camera to
    point at a QR code). A confident face match or a QR/NIC hit navigates
    straight to (app)/police-driver.tsx with the driver summary passed as a
    route param. Verified live end-to-end: face-scan against an enrolled
    driver's own photo returns similarity 1.0 and auto-opens their detail
    view; a driver account gets 403 from every /police/* route.)
    - _Requirements: REQ-6_
    - _Dependencies: 4.2, 2.2_
  - [x] 5.2 NIC/license lookup for officers
    (GET /police/lookup?nic=|license_no= on the same DriverSummary shape as
    verify-face/verify-qr, added as the "NIC / License" tab on
    police-verify.tsx. Rejects with 422 if neither param is given, 404 if
    nothing matches. Verified live via the browser preview: looked up a
    driver by NIC, landed on their detail screen with correct license
    status/points/violation history.)
    - _Requirements: REQ-6_
    - _Dependencies: 1.2_
  - [x] 5.3 Manual-confirmation UI for low-confidence face matches
    (REQ-6 AC4: verify-face never auto-confirms below settings.face_match_threshold
    (the same 0.42 documented as unvalidated in Phase 4) or when the FAISS
    index has no match at all -- requires_manual_confirmation is set and the
    UI shows the ranked candidates (or "no close match" if none) instead of
    silently picking one. The officer must tap a specific candidate to open
    their detail view; nothing is auto-selected. Verified live: with no
    enrolled drivers, verify-face correctly returns
    requires_manual_confirmation=true with an empty candidate list rather
    than erroring.)
    - _Requirements: REQ-6_
    - _Dependencies: 5.1_
  - [ ] 5.4 Violation detection service: YOLOv8n-seg (lane) + YOLOv8n (vehicle) + three-tier
    overlap check — train/fine-tune on the JPJ Lane Dataset, expose as a callable service
    (Deliberately deferred, not an oversight: there is no dataset or GPU
    available in this environment to train from scratch per requirements.md's
    known gap ("no prior model or dataset is available to reuse"). Asked the
    project owner how to proceed (stub the pipeline now / source a public
    dataset and train elsewhere / defer entirely / bring your own trained
    weights) — decision was to explicitly skip 5.4/5.5 for now and continue
    with other phases, revisiting this once a dataset and training compute
    are sorted out separately. Come back to this before Task 9.2's
    evaluation step, since that depends on a trained model existing.)
    - _Requirements: REQ-7_
    - _Dependencies: 1.1_
  - [ ] 5.5 Officer confirmation UI for AI-flagged violations
    (Blocked on 5.4 -- there's no AI-flagged candidate to confirm yet. The
    manually-recorded violation flow built in 5.6 uses the same driver-detail
    screen and will be the base this extends once 5.4 exists.)
    - _Requirements: REQ-7_
    - _Dependencies: 5.4_
  - [x] 5.6 Violation recording + point deduction schedule + fine generation (single DB transaction)
    (Built ahead of 5.5 since an officer can record a violation manually
    (evidence_ref is an optional free-text field, ready for 5.4/5.5 to
    populate with a real evidence image reference later) -- AI-assisted
    flagging is an enhancement to this flow, not a prerequisite for it.
    New Violation/Fine models + a single Alembic migration that also adds
    License.points (server_default='0' to backfill existing rows). REQ-8
    AC1's schedule (WHITE_LINE=3, SPEEDING=4, RED_LIGHT=6, DRUNK_DRIVING=10
    points; placeholder LKR fine amounts) lives in
    models/violation.py:VIOLATION_POINTS and models/fine.py:VIOLATION_FINE_AMOUNT,
    both explicitly flagged as unsourced from any real traffic-fine schedule
    -- same honesty pattern as face_match_threshold. violation_service.record_violation
    creates the Violation + Fine and updates License.points in one
    transaction, suspending at the REQ-8 AC2 threshold (10). Also closed a
    known gap from task 3.5: License.points now exists and both the
    /licenses/me API response and the mobile LicenseCard display it, so the
    card's point balance is no longer blocked on this phase. Verified live:
    three violations recorded via the mobile UI/API against the same driver
    correctly accumulated 3+6+4=13 points and flipped the license to
    SUSPENDED at the threshold, both /police/lookup and the driver's own
    /licenses/me immediately reflected it. 14 new backend tests, 54/54
    passing; ruff/black clean.)
    - _Requirements: REQ-8, REQ-9_
    - _Dependencies: 5.3, 5.5_

- [ ] 6. Fine Payment, Points & Appeals
  - [ ] 6.1 Point balance tracking + suspension at 10 points
    - _Requirements: REQ-8_
    - _Dependencies: 5.6_
  - [ ] 6.2 Mock payment flow (mobile + backend) + transactional fine-status update
    - _Requirements: REQ-9_
    - _Dependencies: 5.6_
  - [ ] 6.3 Appeal submission (mobile) + admin resolution + reversal logic
    - _Requirements: REQ-10_
    - _Dependencies: 6.1, 3.3_

- [ ] 7. Driver Behavior Analytics
  - [ ] 7.1 Rule-based badge/tier calculation (Platinum…Suspended) recomputed on state change
    - _Requirements: REQ-11_
    - _Dependencies: 6.1, 6.2_
  - [ ] 7.2 Admin dashboard: badge distribution + attention queue
    - _Requirements: REQ-11, REQ-14_
    - _Dependencies: 7.1, 3.3_

- [ ] 8. Notifications & Road Incidents
  - [ ] 8.1 In-app notification model + Expo push integration for account/fine/appeal/badge events
    - _Requirements: REQ-12_
    - _Dependencies: 6.2, 6.3, 7.1_
  - [ ] 8.2 Road incident reporting (GPS, type, severity) + map display + confirm/clear + auto-expiry
    - _Requirements: REQ-13_
    - _Dependencies: 2.2

- [ ] 9. Testing, Evaluation & Report Writing
  - [ ] 9.1 Face recognition evaluation on a properly sized, held-out test set (avoid the
    small-dataset overfitting risk flagged in requirements.md); report Accuracy/FAR/FRR/EER
    - _Requirements: REQ-5_
    - _Dependencies: 4.3_
  - [ ] 9.2 Violation detector evaluation (mAP50, precision/recall) against the JPJ dataset split
    - _Requirements: REQ-7_
    - _Dependencies: 5.4_
  - [ ] 9.3 End-to-end functional test pass across every flow in requirements.md
    - _Requirements: all_
    - _Dependencies: 8.1, 8.2_
  - [ ] 9.4 Type/lint checks (`tsc --noEmit`, `npm run lint`, `python -m compileall` or `ruff`)
    - _Requirements: n/a (quality gate)_
  - [ ] 9.5 UAT session with sample drivers, police, and admins
    - _Requirements: REQ-6, REQ-14 (usability objective)_
    - _Dependencies: 9.3_
  - [ ] 9.6 Write up thesis chapters against the actual delivered system (avoids the
    stack/point-threshold drift seen in the source documents)
    - _Requirements: n/a (documentation)_
    - _Dependencies: 9.3_

## Parallelization Opportunities

- **Early parallel work:** once 1.2 (backend auth) lands, Phase 2 (mobile foundation)
  and Phase 4.1 (face recognition service) can both start immediately — neither
  depends on the other.
- **Phase 5 violation detection (5.4)** only depends on 1.1, not on the rest of Phase
  5 — you or a teammate can start training/building the YOLO pipeline in parallel with
  license-application and face-recognition work.
- **Sequential chain:** 3 → 4.3 (enrollment needs application-approval to exist first)
  → 5 → 6 → 7 → 8 is the critical path for a working end-to-end demo.

## Risks

- **Face recognition needs real data early.** The source documents show a prior
  attempt overfit badly on 6 people/68 photos. Start collecting/sourcing a larger,
  more diverse face dataset in parallel with Phase 1, not after Phase 4 starts —
  this is the single biggest risk to demo credibility.
- **Violation detector training time.** YOLOv8 fine-tuning on the JPJ Lane Dataset
  needs GPU time; scope Task 5.4 with a checkpoint/fallback (e.g., use the dataset's
  documented mAP50 ~0.85 as your target, not a from-scratch research goal).
- **Scope creep across 14 requirements.** If time is tight, the "must-have" list above
  is the real MVP — road incidents and the full admin analytics dashboard are cut
  first, not core license/verification/violation flows.

## What's Next

Start with **Phase 0 (Project Scaffolding)** and **Phase 1 (Backend Foundation)** —
every other phase depends on having a running backend with auth. See the next message
for a concrete first-task breakdown.

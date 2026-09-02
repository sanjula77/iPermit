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
  - [ ] 3.4 Digital license generation (license number, expiry, QR token) on approval
    - _Requirements: REQ-4_
    - _Dependencies: 3.3_
  - [ ] 3.5 Mobile: digital license card screen (QR display, points, status)
    - _Requirements: REQ-4_
    - _Dependencies: 3.4_

- [ ] 4. Facial Recognition Module
  - [ ] 4.1 Stand up the face recognition service: RetinaFace detection + ArcFace embedding via ONNX Runtime
    - _Requirements: REQ-5_
    - _Dependencies: 1.1_
  - [ ] 4.2 SQLite template store + FAISS index (build + rebuild-from-SQLite procedure)
    - _Requirements: REQ-5_
    - _Dependencies: 4.1_
  - [ ] 4.3 Enrollment pipeline: multi-photo consistency check, wire into application-approval flow (3.4)
    - _Requirements: REQ-5_
    - _Dependencies: 4.2, 3.4_
  - [ ] 4.4 Liveness/anti-spoofing check (or explicit "disabled" disclosure if deferred)
    - _Requirements: REQ-5_
    - _Dependencies: 4.1_

- [ ] 5. Police Verification & Violation Detection
  - [ ] 5.1 Officer face-scan + QR-scan verification endpoints and mobile screens
    - _Requirements: REQ-6_
    - _Dependencies: 4.2, 2.2_
  - [ ] 5.2 NIC/license lookup for officers
    - _Requirements: REQ-6_
    - _Dependencies: 1.2_
  - [ ] 5.3 Manual-confirmation UI for low-confidence face matches
    - _Requirements: REQ-6_
    - _Dependencies: 5.1_
  - [ ] 5.4 Violation detection service: YOLOv8n-seg (lane) + YOLOv8n (vehicle) + three-tier
    overlap check — train/fine-tune on the JPJ Lane Dataset, expose as a callable service
    - _Requirements: REQ-7_
    - _Dependencies: 1.1_
  - [ ] 5.5 Officer confirmation UI for AI-flagged violations
    - _Requirements: REQ-7_
    - _Dependencies: 5.4_
  - [ ] 5.6 Violation recording + point deduction schedule + fine generation (single DB transaction)
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

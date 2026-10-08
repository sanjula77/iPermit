# Design Document — iPermit

## Overview

**Status: written before the build as the target design; the system is now built.**
Where this document and the code disagree, the code is the reference (the thesis
chapters in `docs/thesis/` describe the system as built). The main differences: face
recognition runs in-process inside the FastAPI backend with an exact FAISS index, and
automated violation detection was deferred, so officers record violations manually
(see `docs/tasks.md` 5.4).

iPermit will be a
mobile-first system (Expo/React Native for drivers and police) backed by a FastAPI
service and PostgreSQL database, with a Next.js admin web dashboard. Face recognition
will run as an internal AI module (RetinaFace + ArcFace via ONNX Runtime, matched with
FAISS, templates persisted in SQLite). White-line violation detection (YOLOv8n-seg +
YOLOv8n) will be a second AI module, trained from scratch — no prior code or trained
model is available to reuse; the pipeline design below is informed by (but does not
reuse artifacts from) prior research on this problem. All clients will talk to the
database only through the FastAPI backend — no direct DB access from mobile or web.

## System Architecture

### Component Map

| ID | Name | Type | Responsibility | Talks To |
|----|------|------|-----------------|----------|
| COMP-1 | Mobile App | Client (Expo/React Native, TS) | Driver + police UI: auth, license, fines, face capture, incidents | COMP-3 |
| COMP-2 | Admin Web Dashboard | Client (Next.js, TS) | Admin UI: application review, appeals, analytics | COMP-3 |
| COMP-3 | API Backend | Service (FastAPI, Python) | Auth, applications, admin, licences, face, police, fines, appeals, badges, notifications, road-incidents and danger-zones routes; orchestrates AI modules and DB | COMP-4, COMP-5, COMP-6 |
| COMP-4 | Face Recognition Module | AI service (Python) | Enrollment, embedding extraction, FAISS matching | COMP-3, COMP-7 |
| COMP-5 | Violation Detection Module | AI service (Python) | Lane/vehicle detection, violation flagging | COMP-3 |
| COMP-6 | Primary Database | Data (PostgreSQL + Alembic) | Users, licenses, applications, violations, fines, appeals, incidents | COMP-3 |
| COMP-7 | Face Template Store | Data (SQLite + FAISS index file) | Face embeddings, rebuildable index | COMP-4 |
| COMP-8 | Notification Service | Service (Expo Push + in-app) | Push/in-app delivery for account/violation/incident events | COMP-1, COMP-3 |

### High-Level Architecture Diagram

```
┌────────────────┐     ┌──────────────────────┐
│  Mobile App     │     │  Admin Web Dashboard │
│ (Expo/RN, TS)   │     │  (Next.js, TS)       │
└────────┬────────┘     └──────────┬───────────┘
         │        REST (fetch, JWT)│
         └───────────┬─────────────┘
                      ▼
             ┌─────────────────┐
             │   API Backend    │
             │   (FastAPI)      │
             │  /auth /admin    │
             │  /applications   │
             │  /licenses /face │
             │  /police /fines  │
             │  /appeals        │
             │  /badges         │
             │  /notifications  │
             │  /road-incidents │
             │  /danger-zones   │
             └───┬──────────┬───┘
                 │          │
     ┌───────────▼─┐      ┌─▼─────────────────┐
     │ Face Recog.  │      │ Violation Detect. │
     │ RetinaFace + │      │ YOLOv8n-seg (lane)│
     │ ArcFace/ONNX │      │ YOLOv8n (vehicle) │
     └──────┬───────┘      └───────────────────┘
            │
     ┌──────▼───────┐
     │ SQLite +     │
     │ FAISS index  │
     └──────────────┘
                 │
             ┌───▼────────┐
             │ PostgreSQL │
             └────────────┘
```

## Data Flow Specifications

### 1. License Application → Approval → Digital License

```
1. Mobile App → API Backend: submit application (4 photos + documents)
2. API Backend → PostgreSQL: store application (status=PENDING), store uploads
3. Admin Dashboard → API Backend: approve application
4. API Backend → Face Recognition Module: generate face template from 4 photos
5. Face Recognition Module → SQLite/FAISS: persist embedding + index
6. API Backend → PostgreSQL: create license record, set application APPROVED
7. API Backend → Notification Service: notify driver
```

### 2. Police Roadside Verification + Violation

```
1. Mobile App (police) → API Backend: face photo or QR scan
2. API Backend → Face Recognition Module: match against FAISS index
3. Face Recognition Module → API Backend: best match + confidence score
4. IF confidence low → API Backend flags for manual officer confirmation
5. API Backend → PostgreSQL: fetch driver license/points/violation history
6. Officer submits violation evidence (image/frame) → API Backend
7. API Backend → Violation Detection Module: detect lane + vehicle + overlap check
8. Violation Detection Module → API Backend: candidate violation + confidence
9. Officer confirms → API Backend → PostgreSQL: record violation, deduct points,
   generate fine (transactional: violation + points + fine committed together)
10. API Backend → Notification Service: notify driver of fine/points/possible suspension
```

### 3. Fine Payment / Appeal

```
1. Mobile App → API Backend: submit mock payment for fine
2. API Backend → PostgreSQL (transaction): mark fine PAID (points are NOT restored:
   each violation's points count for 12 months from the offence, then expire)
3. [Alternative] Mobile App → API Backend: submit appeal
4. Admin Dashboard → API Backend: resolve appeal (UPHELD/OVERTURNED)
5. IF OVERTURNED → API Backend → PostgreSQL (transaction): reverse fine, stop counting
   its points, and recompute the licence (reactivates it if now under the threshold)
6. API Backend → Notification Service: notify driver of outcome
```

### 4. Road Incident Reporting

```
1. Mobile App → API Backend: report incident (GPS, type, severity)
2. API Backend → PostgreSQL: store incident (active, with expiry timestamp)
3. API Backend → Notification Service: notify nearby drivers (high severity)
4. Mobile App (other drivers) → API Backend: fetch active incidents near location
5. Mobile App → API Backend: confirm/clear incident → update status
```

## Integration Points

### Internal

| Source | Target | Protocol | Data Format | Purpose |
|--------|--------|----------|-------------|---------|
| Mobile App / Admin Dashboard | API Backend | HTTPS/REST | JSON | All client operations |
| API Backend | Face Recognition Module | In-process / internal call | NumPy arrays, JSON | Enrollment + matching |
| API Backend | Violation Detection Module | In-process / internal call | Image bytes, JSON | Violation detection |
| Face Recognition Module | SQLite + FAISS | Local file/DB | Embedding vectors | Template persistence + search |
| API Backend | PostgreSQL | SQLAlchemy/psycopg2 | SQL | Core data persistence |

### External

| System | Type | Purpose | Notes |
|--------|------|---------|-------|
| Expo Push Service | Push notification API | Mobile push delivery | Requires Expo push tokens per device |
| Mock Payment Provider | Simulated | Fine payment demo | **Not a real gateway** — explicitly mock in this version |
| Map Tiles (react-native-maps) | Map rendering | Road incident and danger-zone display | Esri World Street Map tiles on Android (no key): Google's base map needs an API key and a custom build, OSM's own tile servers block apps that don't identify themselves, and CARTO now needs a key; Apple Maps on iOS |

## Components and Interfaces

### API Backend (FastAPI)

**Responsibility:** Single entry point for all clients; owns business rules for
applications, points, fines, appeals, badges; orchestrates AI modules.

**Routes:** `/auth`, `/applications`, `/admin`, `/licenses`, `/face`, `/police`,
`/fines`, `/appeals`, `/badges`, `/notifications`, `/road-incidents`, `/danger-zones`,
plus `/health` and `/ready`. There is no `/users` router, and uploaded files are not
served over HTTP.

**Key interfaces:**
```python
POST /applications                 # submit license application
POST /admin/applications/{id}/approve
POST /police/verify-face           # returns match + confidence
POST /police/violations            # record confirmed violation
POST /fines/{id}/pay
POST /appeals
POST /appeals/{id}/resolve
POST /road-incidents
```

### Face Recognition Module

**Responsibility:** Detect, embed, and match faces.
**Pipeline:** RetinaFace detection → ArcFace embedding (ONNX Runtime, 512-dim) →
FAISS nearest-neighbor search (threshold-based match). An optional CLAHE step before
detection (`face_engine.detect_faces`, `settings.face_clahe_enabled`) is **off** by
default since 2026-09-29 (see below).
**Measured performance:** at the 0.42 threshold, FAR ≈ 0 and FRR 2.9% (LFW) / 9.9%
(South Asian celebrity set) — see
[evaluation/results/results_tables.md](evaluation/results/results_tables.md). The
threshold is deliberately conservative: officer verification is a 1:N search, where
false matches matter more than false rejections (handled by manual confirmation), so
the lower EER thresholds (~0.19–0.21) are not adopted.
**CLAHE decision (2026-09-29): off.** An ablation on LFW
([evaluation/results/clahe_ablation.md](evaluation/results/clahe_ablation.md)) found
CLAHE more than doubles FRR (2.95% vs 1.37%) with no FAR/EER benefit, likely because
ArcFace was trained on unprocessed photos. Stored templates were recomputed with
`python -m app.scripts.reembed_templates`; run it again after any preprocessing change.
The measured-performance figures above were taken with CLAHE on.
**Quality gate:** sharpness is the Laplacian variance of the face resized to 112×112
(the recogniser's input size), limit 30 — resolution-independent, so a sharp
high-resolution phone selfie (raw variance ~20) passes. Calibrated on LFW, synthetic
blur and three real selfies; not yet on Sri Lankan driver photos.
**Data:** face templates in SQLite; FAISS index rebuildable from SQLite at any time.
**Known limitation:** liveness/anti-spoofing is not implemented. `liveness_check_enabled`
(default `False`) is only a flag that `/face/status` reports, so the gap is disclosed to
clients; no liveness code exists behind it.

### Violation Detection Module

**Responsibility:** Detect lane markings and vehicles, flag white-line violations.
**Pipeline:** YOLOv8n-seg (lane segmentation) + YOLOv8n (vehicle detection, COCO) →
three-tier overlap check (bbox overlap → bottom-edge check → edge-proximity check).
**To be built from scratch:** train both YOLO models yourself (transfer learning from
COCO-pretrained weights for the vehicle model; fine-tune a segmentation model on a
lane dataset you source/build, similar in spirit to the JPJ Lane Dataset referenced in
prior research) and expose the pipeline as a callable service from the FastAPI backend
(see [tasks.md](tasks.md) Task 5.4).

## Data Models

```
User        { id, email, nic, password_hash, role[DRIVER|POLICE|ADMIN], created_at }
Driver      { id, user_id FK, name, dob, points(int, default 0), status[ACTIVE|SUSPENDED] }
Application { id, driver_id FK, status[PENDING|APPROVED|REJECTED], photos[], documents[], reason, requested_categories[] }
License     { id, driver_id FK, license_no, qr_token, issued_at, expiry_at }
LicenseCategory { id, license_id FK (CASCADE), category[A1|A|B1|B|C1|C|CE|D1|D|DE|G1|G|J], issued_at, expiry_at }
FaceTemplate{ id, driver_id FK, embedding(vector), created_at }  -- lives in SQLite/FAISS
Violation   { id, driver_id FK, officer_id FK, type, points_deducted, confirmed_at, evidence_ref }
Fine        { id, violation_id FK, amount, status[UNPAID|PAID|REVERSED], paid_at }
Appeal      { id, fine_id FK, driver_id FK, reason, status[PENDING|UPHELD|OVERTURNED], resolved_by }
Badge       { driver_id FK, tier[PLATINUM|GOLD|SILVER|BRONZE|AT_RISK|SUSPENDED], updated_at }
RoadIncident{ id, reporter_id FK, type, severity, lat, lng, status[ACTIVE|CLEARED|EXPIRED], expires_at }
Notification{ id, user_id FK, type, payload, read_at }
```

Relational integrity: `Fine.violation_id`, `Appeal.fine_id`, `Violation.driver_id`
enforce `ON DELETE RESTRICT` — financial/enforcement history must never be orphaned.

## Error Handling

- **Validation errors** (bad photo, missing document): 4xx with field-level detail.
- **Ambiguous face match**: never auto-confirm; return low-confidence result and
  require officer action.
- **Payment/point/fine updates**: wrapped in a single DB transaction; a failure at any
  step rolls back the whole update — no partial point deduction without a fine record.
- **FAISS index corruption**: rebuildable from SQLite templates; document the rebuild
  procedure as an operational runbook item.

## Testing Strategy

- **Unit**: business rules (point deduction schedule, badge-tier thresholds, appeal
  reversal logic).
- **Integration**: application → approval → license → face template pipeline;
  violation → fine → payment/appeal pipeline.
- **AI evaluation**: face recognition (FAR, FRR, EER, TAR@FAR, with identity-level
  bootstrap confidence intervals) on a held-out test set large enough to avoid the
  overfitting seen in the 6-person pilot — done on LFW + a South Asian celebrity set
  via [evaluation/face_evaluation.ipynb](evaluation/face_evaluation.ipynb); still to
  do on Sri Lankan driver photos. Accuracy is not used: with ~100× more impostor
  than genuine pairs it is uninformative. Violation detection (mAP50,
  precision/recall) against the JPJ dataset split.
- **UAT**: drivers, police, and admins evaluating ease of use and verification speed,
  per the original research objective 4.

## Deployment

- Planned: local/dev via Docker Compose (Postgres + backend), matching the dev
  environment style described in the source documents; production targets
  (Kubernetes/cloud) are stated goals for a hypothetical future rollout, not a build
  target for this project — say so explicitly in the final report.
- Environment separation: dev/test/prod config via environment variables; Alembic
  migrations gate schema changes.

## Performance Targets

These are targets to validate once each module is built, not current measurements —
you have no running system yet:
- Face verification: <2s per attempt (aspirational figure from prior research).
- Violation detection inference: 25–40 FPS GPU / 5–7 FPS CPU (figure reported by prior
  research on a similar YOLOv8 pipeline; re-measure once your own model is trained).

## Security Considerations

- JWT auth issued by API Backend; RBAC enforced per-route (DRIVER/POLICE/ADMIN).
- Password hashing (not reversible storage).
- Face templates isolated from primary user PII store (SQLite, separate from Postgres).
- Uploaded documents/photos served only to authenticated, authorized requesters.
- Consent capture required before biometric enrollment (ethics requirement from the
  proposal — implement as an explicit consent step, not just a ToS checkbox).

## Architecture Decision Record (ADR)

**Decision:** Treat FastAPI + PostgreSQL + SQLite/FAISS + Expo/React Native + Next.js
as the system of record for the final report and ongoing development.

**Superseded alternatives** (documented for the thesis's technical-decision narrative,
not for further implementation):
- Node.js/Express + MongoDB + React (web-only) + microservices-per-feature —
  described in Chapters 3 & 5; superseded once the FastAPI/Postgres implementation
  docs were written.
- Flutter + Firebase/Supabase + FaceAPI.js/TensorFlow.js — from the original July 2025
  research proposal; superseded before implementation began.
- React Native/Expo + Next.js + FastAPI + PostgreSQL + DeepFace/FAISS — the pitch-deck
  variant; closest to the final stack but used DeepFace/Facenet instead of
  ArcFace/InsightFace, and predates the road-incident feature.

**Why this matters for the report:** examiners may ask why the stack changed across
chapters — having this ADR lets you answer "here's what we tried, here's what we
learned, here's why we converged on the final stack" instead of it looking like an
inconsistency.

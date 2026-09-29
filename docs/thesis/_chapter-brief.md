# Shared brief for thesis chapters 4–7 (for the writers; not a thesis chapter)

## What the template requires

Source: `~/Desktop/fproject/The body of product-based (1).pdf` (Horizon Campus
product-based thesis template).

- **Ch 4 Design:** alternative design strategies (from scratch vs. open-source
  components, platform, system software) compared on requirements and cost,
  then one strategy selected with justification. Then: 4.1 Introduction;
  4.2 System Design Process: 4.2.1 Use Case Diagrams (with use case
  narratives), 4.2.2 Class Diagrams, 4.2.3 Sequence Diagrams, 4.2.4 Activity
  Diagrams; 4.3 Interface Design: 4.3.1 Design Principles, 4.3.2 Actual
  Screens; 4.4 Database Design: 4.4.1 ERD, 4.4.2 Normalization, 4.4.3
  Relational Schema; 4.5 Hardware Component (skip if none). Every figure and
  table must be referred to in the text.
- **Ch 5 System Development:** major code and module structures, a diagram of
  module interaction, implementation environment (hardware and software),
  reused code (credit the original authors), tools, platform dependence.
  Short code segments that fit on one page. 5.1 Navigation/Module Structure;
  5.2 Development Environment; 5.3 Tools and Technologies; 5.4 Deployment
  Architecture; 5.5 Major Code Segments.
- **Ch 6 Testing and Evaluation:** test plan, test cases, test data, results
  table, error behaviour, user acceptance testing. 6.1–6.5.
- **Ch 7 Conclusion and Recommendations:** objectives achieved or not (and
  why), lessons learned, limitations, future work. Positive but not defensive.

## Output format (same as `docs/thesis/chapter-3-analysis.md`; read it first)

- File: `docs/thesis/chapter-N-<name>.md`. It starts with a short "How to use
  this file" section, then the chapter sections with the template's exact
  numbering.
- Paste-ready prose goes in ` ```text ` blocks, **one paragraph per line**,
  with a blank line between paragraphs. Put a `**Paste this — <section>:**`
  label above each block.
- Tables go in a ` ```text ` block. The first line is the caption, e.g.
  `TABLE 4.2. Use Case Narrative: Verify Driver by Face Scan`. Rows are
  `|`-separated, with no leading or trailing pipe. Number tables per chapter
  (TABLE 4.1, 4.2 …) and refer to each one in the prose.
- Figures: after the prose that refers to one, write
  `**Insert Figure 4.3:** \`docs/thesis/diagrams/<file>.png\``
  and follow it with a ` ```text ` caption block, e.g.
  `Fig. 4.3. Sequence diagram for roadside face verification`. Number
  figures per chapter.
- Citations: IEEE numbers local to the chapter, in order of first appearance,
  with a "References for this chapter" section at the end. Only cite sources
  you opened and checked (DOI on Crossref, or the web page). Few citations
  are needed in Chapters 4–5; don't pad.
- End with "Notes for the authors": things only the team can confirm or
  supply.
- Use British spelling, as Chapter 3 does: licence (noun), analyse,
  organise, behaviour.

## Diagrams

- Tool: PlantUML at
  `/tmp/claude-1000/-data-iPermit/6b0ddd5d-a566-44ab-b64a-a02d7416c54e/scratchpad/thesis/plantuml.jar`.
  Render with `java -jar <jar> -tpng -Sdpi=150 file.puml`.
- Graphviz is **not installed**. For class, use case, component and ER
  diagrams, add `!pragma layout smetana` on the line after `@startuml`.
  Sequence and activity diagrams don't need it.
- Style (copy it from `docs/thesis/diagrams/usecase-proposed.puml`):
  `skinparam shadowing false`, Arial 13, black and white. Put
  `title \n\n` right after the layout line: without a title, smetana clips
  the top of the image. No real title text, since the caption lives in Word.
- Save `.puml` and `.png` in `docs/thesis/diagrams/`, prefixed `ch4-` or
  `ch5-`. After rendering, **open the PNG and look at it**. Fix clipping,
  overlaps and unreadable layouts before moving on.

## Writing rules (from the academic-paper skill's quality check)

- Don't use: delve, crucial, pivotal, robust, leverage, comprehensive,
  seamless, foster, landscape, streamline, holistic, cutting-edge,
  multifaceted, nuanced, showcase, testament, realm, embark.
- No more than 3 em dashes in the whole chapter, and ideally none. Use
  commas, parentheses or a new sentence instead.
- No throat-clearing openers ("In this section we will…"). Vary paragraph
  length.

## HARD RULES: honesty

The thesis must describe the system **as built**. Verify every claim in the
code under `/data/iPermit` (backend/, mobile/, admin-web/). Where the docs and
the code disagree, the code wins. Never invent results, user feedback, test
numbers, participants or hardware.

Facts that are easy to get wrong (all verified):

- Face recognition runs **in-process inside the FastAPI backend**
  (`backend/app/core/face_engine.py`, `app/services/face_service.py`). It is
  not a separate microservice.
- Face templates are stored in **SQLite** (`app/core/face_template_store.py`)
  with a **FAISS `IndexFlatIP`** index (`app/core/face_index.py`). That is an
  **exact linear search**, not approximate or sub-linear. The index can be
  rebuilt from SQLite. PostgreSQL does **not** store embeddings.
- Face pipeline: CLAHE, then RetinaFace + ArcFace (InsightFace `buffalo_l`,
  ONNX Runtime, CPU), 640×640 detection, 512-d embeddings. Enrolment takes
  4 photos, checks pairwise consistency, then averages and re-normalises
  them. The match threshold is 0.42 (configurable, still unvalidated on Sri
  Lankan photos). An ambiguous match sets `requires_manual_confirmation` and
  returns ranked candidates.
- The quality gate runs at submission: detection confidence, minimum face
  size, blur (Laplacian variance, default 100, which is too strict for phone
  selfies) and brightness range. Liveness detection is **not implemented**,
  and `/face/status` says so.
- Automated white-line violation detection (YOLOv8) is **not implemented**;
  it was deferred. Officers record violations manually through
  `POST /police/violations`, and an `evidence_ref` field is kept for a future
  detector.
- Points: WHITE_LINE 3, SPEEDING 4, RED_LIGHT 6, DRUNK_DRIVING 10. The
  licence is suspended at 10. Fines are LKR 2,000 / 5,000 / 10,000 / 25,000.
  All of these are placeholders. Recording a violation (points, fine,
  suspension) is one transaction. Payment and an overturned appeal share
  `restore_points_for_violation` in `app/services/violation_service.py`.
- Badges: a rule-based score, with tiers PLATINUM ≥ 90, GOLD ≥ 75,
  SILVER ≥ 60, BRONZE ≥ 40, AT_RISK below that. SUSPENDED is a
  licence-status override. The pure function is in `badge_service.py`.
- Notifications are a flat message string, created **after** commit on a
  best-effort basis. Expo push is also best effort. There are 9 notification
  types, and `NEARBY_INCIDENT` exists in the enum but is not triggered
  (REQ-13 AC5 is not implemented, for privacy reasons).
- Road incidents: 8 types, 3 severities, Haversine distance in Python
  (`app/core/geo.py`), lazy 4-hour expiry, and confirm/clear. Danger zones
  are a separate resource: a 50–1000 m circle, a severity, an optional
  reason, persistent until cleared, confirmable.
- Mobile: Expo SDK 57 (`expo ~57.0.19`), React Native 0.86.3, Expo Router
  with `NativeTabs`, one route group per tab (`(home)`, `(fines)`,
  `(incidents)`, `(notifications)`, `(police-verify)`, `(profile)`) plus
  `apply`, `police-driver`, `(auth)/login` and `register`. Android uses
  **OpenStreetMap tiles**, because Google tiles need an API key. When
  location permission is denied it falls back to Colombo, and **reporting is
  disabled** at the fallback location. Built-in `@expo/ui` components are
  used for Profile.
- Admin web: Next.js 16.3.4. **Every page is a client component**
  (`'use client'`), not server-rendered. Pages: login, applications, appeals,
  badges.
- Accounts: only DRIVER accounts self-register. POLICE and ADMIN accounts are
  created with `python -m app.scripts.create_admin --role …` (a CLI script,
  not an in-app admin screen).
- Auth: JWT with a 30-minute expiry, bcrypt, `require_role` dependency, and
  the role is read from the DB user. Rate limits (slowapi, per IP): 10/hour
  on application submit, 30/minute on face verification. Uploads max 10 MB.
- Deployment: Docker Compose with **two services only**, `db`
  (postgres:16-alpine) and `backend` (python:3.11-slim image). The mobile app
  is tested in **Expo Go** on an Android phone over the LAN. The admin web
  runs with `next dev`. There is no production or cloud deployment.
- Backend libraries: fastapi 0.115.6, uvicorn 0.34.0, sqlalchemy 2.0.36,
  alembic 1.14.0, psycopg2-binary 2.9.10, pydantic 2.10.4, passlib 1.7.4
  (bcrypt), python-jose 3.3.0, slowapi 0.1.9, numpy 2.4.6, opencv-headless
  5.0.0.93, onnxruntime 1.29.0, insightface 1.0.1, faiss-cpu 1.15.0.
- Dev machine: Intel Core i5-1145G7 (8 threads), 14 GiB RAM, Ubuntu 26.04
  LTS, Docker 29.5.3, Node 24.16.0. The face evaluation ran on Google Colab
  (Tesla T4, CPU execution provider).
- There is no consent screen before biometric enrolment (a known gap).
- No user acceptance test, survey or interview has been done. Don't write
  one.
- Chapter 3 IDs, to reference from later chapters: FR-01 … FR-15 (FR-07 is
  violation detection, deferred; FR-15 is danger zones), NFR-S1–S3,
  NFR-P1–P3, NFR-R1–R4, NFR-T1–T2, NFR-U1, NFR-F1, NFR-M1. The Chapter 3
  tables are TABLE 3.1–3.6 and the figures are Fig. 3.1–3.2.
- Reused third-party work that must be credited: InsightFace pretrained
  models (RetinaFace, ArcFace `buffalo_l`; check the model licence on the
  InsightFace GitHub, since the pretrained models are for non-commercial
  research use), FAISS (Meta), FastAPI, Expo/React Native, Next.js,
  react-native-maps, OpenStreetMap tiles (© OpenStreetMap contributors).
- Development used AI coding assistance. **Don't** write paste text claiming
  the students hand-wrote all the code. Keep it neutral ("the implementation
  …"), and add a Notes-for-the-authors item telling them to state their own
  contribution and any AI-tool use as the faculty requires.

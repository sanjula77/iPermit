# iPermit

AI-powered virtual driving license & traffic enforcement platform for Sri Lanka —
facial recognition identity verification, automated white-line violation detection,
and point-based penalty management.

**Working title:** *Design and Evaluation of an AI-Based Virtual Driving License
System for Driver Identification and Predictive Traffic Law Enforcement in Sri Lanka*
Final Year Project, BSc (Hons) Information Technology — Horizon Campus.

## Status

🚧 **Working prototype.** 13 of the 15 functional requirements are implemented and
verified: the backend API, the driver/police mobile app and the admin web dashboard
run end to end, and 167 automated backend tests pass. Not done: automated white-line
violation detection (deferred — no labelled lane dataset or GPU), push-notification
delivery on a physical device (untested), and a user acceptance study.

Face verification was evaluated on public datasets (LFW and a South Asian celebrity
set), not on Sri Lankan driver photos: at the deployed threshold, FAR is about 0.001%
and FRR is 2.9% (LFW) and 9.9% (South Asian set). See
[docs/evaluation/results/results_tables.md](docs/evaluation/results/results_tables.md)
and Chapters 6 and 7 in [docs/thesis/](docs/thesis/) for the full results and limitations.
The payment flow is simulated, and point and fine values are placeholders.

## Overview

iPermit replaces Sri Lanka's manual, paper-based driving license and traffic
enforcement process with a digital platform for three user types:

- **Drivers** — apply for a digital license, get a QR-coded virtual license card,
  view fines and violation history, pay fines, appeal disputed fines, and report/view
  road incidents.
- **Police Officers** — verify driver identity roadside via facial recognition or QR
  scan, look up license/violation history, confirm AI-flagged violations, and issue
  fines.
- **Admins** — review license applications, resolve fine appeals, and monitor driver
  risk/behavior analytics.

## Key Features

- Digital license application, review, and QR-based digital license
- Facial recognition enrollment and verification (RetinaFace + ArcFace + FAISS)
- Point-based violation and suspension management (officers record violations manually)
- Fine issuance, mock payment, and appeal workflow
- Rule-based driver behavior analytics (badge tiers)
- Road incident reporting and map, plus driver- and officer-marked danger zones
- In-app notifications and Expo push (push delivery not yet verified on a device)
- *Planned, not built:* automated white-line violation detection (YOLOv8 lane + vehicle detection)

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app (drivers & police) | Expo, React Native, TypeScript |
| Admin web dashboard | Next.js, React, TypeScript |
| Backend API | FastAPI (Python), SQLAlchemy, Alembic |
| Database | PostgreSQL |
| Face recognition | RetinaFace, ArcFace (ONNX Runtime), FAISS, SQLite |
| Violation detection (planned, not implemented) | YOLOv8 (Ultralytics), OpenCV |

See [docs/design.md](docs/design.md) for the full architecture, including an ADR
explaining earlier stack alternatives considered during planning.

## Documentation

- [docs/requirements.md](docs/requirements.md) — requirements and user stories
- [docs/design.md](docs/design.md) — system architecture and data flows
- [docs/tasks.md](docs/tasks.md) — implementation plan and current progress
- [docs/setup.md](docs/setup.md) — run the backend and test the mobile app on a phone
- [docs/methodology.md](docs/methodology.md) — how the system was built and verified
- [docs/thesis/](docs/thesis/) — thesis chapters 3-7, including testing and evaluation

## Team

- B.R Vindyani (ITBIN-2211-0122)
- J.P.I.S Jayasinghe (ITBIN-2211-0324)
- B.R.G.S Sandaruwan (ITBIN-2211-0278)

Supervisor: S. Wijewardhana — Faculty of Information Technology, Horizon Campus.

# iPermit

AI-powered virtual driving license & traffic enforcement platform for Sri Lanka —
facial recognition identity verification, automated white-line violation detection,
and point-based penalty management.

**Working title:** *Design and Evaluation of an AI-Based Virtual Driving License
System for Driver Identification and Predictive Traffic Law Enforcement in Sri Lanka*
Final Year Project, BSc (Hons) Information Technology — Horizon Campus.

## Status

📋 **Planning phase.** Requirements and architecture are defined; implementation has
not started. See [docs/tasks.md](docs/tasks.md) for the current build plan and
what's next.

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
- Automated white-line violation detection (YOLOv8 lane + vehicle detection)
- Point-based violation and suspension management
- Fine issuance, mock payment, and appeal workflow
- Rule-based driver behavior analytics (badge tiers)
- Road incident reporting and map
- In-app and push notifications

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app (drivers & police) | Expo, React Native, TypeScript |
| Admin web dashboard | Next.js, React, TypeScript |
| Backend API | FastAPI (Python), SQLAlchemy, Alembic |
| Database | PostgreSQL |
| Face recognition | RetinaFace, ArcFace (ONNX Runtime), FAISS, SQLite |
| Violation detection | YOLOv8 (Ultralytics), OpenCV |

See [docs/design.md](docs/design.md) for the full architecture, including an ADR
explaining earlier stack alternatives considered during planning.

## Documentation

- [docs/requirements.md](docs/requirements.md) — requirements and user stories
- [docs/design.md](docs/design.md) — system architecture and data flows
- [docs/tasks.md](docs/tasks.md) — implementation plan and current progress

## Team

- B.R Vindyani (ITBIN-2211-0122)
- J.P.I.S Jayasinghe (ITBIN-2211-0324)
- B.R.G.S Sandaruwan (ITBIN-2211-0278)

Supervisor: S. Wijewardhana — Faculty of Information Technology, Horizon Campus.

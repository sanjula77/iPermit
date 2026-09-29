# Chapter 4: Design (copy-paste draft)

Draft of thesis Chapter 4 for iPermit. It was written from the project's own
records (`docs/design.md`, `docs/requirements.md`, `docs/methodology.md`, the
design-system specs in `docs/superpowers/`) and then checked line by line
against the code in `backend/`, `mobile/src/` and `admin-web/src/`. Where the
documents and the code disagreed, the chapter follows the code. Every external
source was opened and checked on 2026-09-27.

## How to use this file

- Text inside ` ```text ` blocks is ready to paste into Word. Each paragraph is
  on one line, so Word won't insert stray line breaks.
- Tables are `|`-separated. Paste, select, then **Insert → Table → Convert Text
  to Table**, choose **Other** and type `|`. The first line of each block is
  the caption; put it above the table.
- Diagrams are in `docs/thesis/diagrams/` as `ch4-*.png` (rendered at 150 dpi)
  with the editable PlantUML source next to each one (`ch4-*.puml`). Insert
  each PNG at full text width.
- Figure 3.2 (`usecase-proposed.png`) belongs to Chapter 3 and is only
  referred to here, not inserted again.
- **Section 4.3.2 needs screenshots that only the team can take.** The file
  names and captions are ready; see TABLE 4.10 and Notes for the authors.
- Citations use IEEE numbering local to this chapter. [1] and [2] are the same
  papers as [1] and [2] in Chapter 3; merge them when you build the
  thesis-wide list.
- **Read "Notes for the authors" at the end before submitting.**

### Figures and tables in this chapter

| Item | File |
|---|---|
| Fig. 4.1 Driver use cases | `diagrams/ch4-usecase-driver.png` |
| Fig. 4.2 Police use cases | `diagrams/ch4-usecase-police.png` |
| Fig. 4.3 Administrator use cases | `diagrams/ch4-usecase-admin.png` |
| Fig. 4.4 Domain classes: licensing and enforcement | `diagrams/ch4-class-domain-core.png` |
| Fig. 4.5 Domain classes: notifications, road safety, face template | `diagrams/ch4-class-domain-safety.png` |
| Fig. 4.6 Enumerations | `diagrams/ch4-class-domain-enums.png` |
| Fig. 4.7 Layered backend design | `diagrams/ch4-class-layers.png` |
| Fig. 4.8 Design classes: licensing and face recognition | `diagrams/ch4-class-face-services.png` |
| Fig. 4.9 Design classes: enforcement and notification | `diagrams/ch4-class-enforcement-services.png` |
| Fig. 4.10 Design classes: authentication and location | `diagrams/ch4-class-support-services.png` |
| Fig. 4.11 Sequence: approval, licence, face enrolment | `diagrams/ch4-seq-approval.png` |
| Fig. 4.12 Sequence: roadside face verification | `diagrams/ch4-seq-verify-face.png` |
| Fig. 4.13 Sequence: recording a violation | `diagrams/ch4-seq-violation.png` |
| Fig. 4.14 Sequence: paying a fine | `diagrams/ch4-seq-pay-fine.png` |
| Fig. 4.15 Activity: licence application | `diagrams/ch4-act-application.png` |
| Fig. 4.16 Activity: roadside verification | `diagrams/ch4-act-verification.png` |
| Fig. 4.17 Activity: appeal resolution | `diagrams/ch4-act-appeal.png` |
| Fig. 4.18 ERD: licensing and enforcement | `diagrams/ch4-erd-core.png` |
| Fig. 4.19 ERD: notifications, road safety, face store | `diagrams/ch4-erd-safety.png` |
| Fig. 4.20 – 4.35 Screens | `screens/*.png` (to be taken by the team) |
| TABLE 4.1 – 4.13 | inline in this file |

---

## 4.1 Introduction

**Paste this — 4.1 Introduction:**

```text
This chapter describes the design of iPermit as it was built. It starts by comparing the alternative design strategies that were considered for the development approach, the platform and the system software, and explains the strategy that was selected (Sections 4.1.1 and 4.1.2). Section 4.2 presents the system design through UML use case, class, sequence and activity diagrams, with a narrative for each of the six core use cases. Section 4.3 describes the principles behind the user interface and lists the screens of the delivered system. Section 4.4 presents the database design: the entity relationship diagram, the normalisation of the tables, and the relational schema. Section 4.5 explains why the system has no custom hardware component. Throughout the chapter, requirement identifiers (FR-01 to FR-15 and the NFR codes) refer to TABLE 3.3 and TABLE 3.4 in Chapter 3.
```

**Paste this — 4.1.1 Alternative Design Strategies:**

```text
4.1.1 Alternative Design Strategies

Four design decisions had the largest effect on whether the requirements of Chapter 3 could be met within the project: how much of the system to build from scratch, which client platforms to target, how to structure the backend and store its data, and which system software to run it on. The project's own planning history supplied real alternatives for each decision, because earlier drafts of this project had proposed different technology stacks. The original research proposal proposed Flutter with Firebase or Supabase and a browser-based face library (FaceAPI.js or TensorFlow.js). Earlier thesis chapters described a web-only React client over Node.js and Express services with MongoDB, organised as one microservice per feature. A later pitch-deck version was close to the final stack but used DeepFace with the Facenet model for face recognition. Each of these was compared with the final design against the requirements it had to meet and what it would cost to build and run. Because every option considered is free or open-source software, cost is expressed mainly as development effort, operational complexity and risk rather than as licence fees.

The first decision was whether to build the recognition components from scratch or to assemble open-source components and pretrained models. Training a face detector and a face-recognition model from scratch would have required a large labelled face dataset and GPU time, neither of which the project had, and an earlier attempt on this project that trained on six people reached 100% training accuracy but only 60% test accuracy. Pretrained models avoid that problem. RetinaFace [1] detects and aligns faces and ArcFace [2] produces a 512-dimensional embedding, and both are distributed together in the InsightFace buffalo_l model pack, which runs on a CPU through ONNX Runtime. The cost of this choice is a licensing condition: the InsightFace code is MIT-licensed, but its pretrained models are available for non-commercial research purposes only [3], which suits a university prototype but would have to be renegotiated for a national deployment. The same reasoning was applied to violation detection (FR-07). A YOLOv8 detector could start from openly available pretrained weights, but it would still need a labelled Sri Lankan lane dataset and GPU training, which were not available, so the detector was deferred rather than built on inadequate data.

For the client platforms, three mobile options were compared: separate native Android and iOS applications, Flutter, and Expo with React Native. Native applications give the most direct access to device features but require two code bases in two languages. Flutter produces one code base, but in Dart, which would share no code or tooling with the TypeScript administrator dashboard. Expo with React Native produces one TypeScript code base for Android and iOS (NFR-F1), and Expo Go allowed the application to be tested on a real Android phone without installing native build tools. A web-only client, as in the earlier chapters, was also considered and rejected: the officer's camera, QR scanning and the driver's location and push notifications would all depend on browser support, and a digital licence that the driver shows at the roadside fits a mobile application better than a web page.

For the backend, a monolith with the face-recognition module running inside the API process was compared with one microservice per feature. Microservices would allow each feature to be deployed and scaled separately, but recording a violation changes the violation, the fine and the licence together (NFR-R1), and across services this would need a distributed transaction or a compensation protocol. A single FastAPI service lets each such update be one PostgreSQL transaction. Running face recognition in the same Python process avoids a network hop and a second deployable; its cost is that face inference shares CPU with the rest of the API, which the design limits by running inference in worker threads and rate-limiting the verification endpoint (NFR-S3).

For the data store, a document database (MongoDB, or Firebase in the proposal) was compared with PostgreSQL plus a separate store for face templates. A document store is flexible and, in Firebase's case, fully managed, but references between fines, violations and appeals would not be enforced by the database, and Firebase would place biometric data with a third-party cloud provider. PostgreSQL enforces foreign keys, including ON DELETE RESTRICT on enforcement records, and supports versioned migrations through Alembic (NFR-M1). Storing the face embeddings in PostgreSQL itself was possible, but it would place biometric data in the same database as the other personal data, contrary to NFR-P1. The templates were therefore placed in a separate SQLite file with a FAISS index that can be rebuilt from it (NFR-R3). The cost is that the two stores cannot share one transaction, a consequence discussed in Section 4.2.3.

Finally, the system software was either Linux containers or a direct installation on Windows. A direct installation would require every developer to install matching versions of Python, PostgreSQL and the native libraries used by the face pipeline by hand. Docker Compose with Linux images (postgres:16-alpine for the database and a python:3.11-slim image for the backend) gives every machine the same environment and takes its configuration from environment variables (NFR-F1). The cost is the Docker set-up itself and a large first download of the face models, which the design keeps in a persistent volume so that it happens only once. TABLE 4.1 summarises the comparison.
```

**Paste this — TABLE 4.1:**

```text
TABLE 4.1. Alternative Design Strategies Compared Against the Requirements and Their Cost
Decision|Option|How well it meets the Chapter 3 requirements|Cost and risk|Decision
Development approach|Build the face models from scratch|FR-05 and FR-06 only after collecting and labelling a large face dataset; an earlier six-person attempt overfitted (100% training, 60% test accuracy)|Dataset collection, GPU time and schedule risk that the project could not carry|Rejected
Development approach|Open-source frameworks with pretrained RetinaFace and ArcFace (InsightFace buffalo_l, ONNX Runtime, CPU)|Meets FR-05 and FR-06; threshold still to be validated on Sri Lankan photographs|No licence fee; pretrained models are for non-commercial research use only [3]|Selected
Development approach|Train a YOLOv8 white-line detector (FR-07)|Would meet FR-07|Needs a labelled lane dataset and GPU training, neither available|Deferred; manual recording (FR-08) instead
Face library|FaceAPI.js or TensorFlow.js (original proposal)|Runs on the device, but one-to-many search against every enrolled driver must run on the server to keep templates off phones (NFR-P1)|JavaScript models separate from the Python backend|Rejected
Face library|DeepFace with Facenet (pitch-deck version)|Would meet FR-05 and FR-06|Adds a second deep-learning framework dependency; replaced by one pack that does detection, alignment and embedding together|Rejected
Mobile platform|Native Android (Kotlin) and iOS (Swift)|Full device access; meets NFR-F1 only by building everything twice|Two code bases and two languages for a small team|Rejected
Mobile platform|Flutter with Firebase (original proposal)|One code base for Android and iOS|Dart shares no code or tooling with the TypeScript dashboard; ties the data model to Firebase|Rejected
Mobile platform|Expo and React Native (TypeScript)|One code base for Android and iOS (NFR-F1); camera, location, notifications and secure storage modules; tested in Expo Go|Some screens use an unstable API (native tabs); advanced native features would need a development build|Selected
Client scope|Web-only React client (earlier chapters)|Weak fit for roadside camera and QR use, location capture (FR-13, FR-15) and push notifications (FR-12)|One client to build|Rejected
Client scope|Mobile app for drivers and police, web dashboard for administrators|Matches each user's place of work (TABLE 3.2)|Two front ends to maintain|Selected
Backend structure|Node.js and Express microservices per feature, with MongoDB|Violation, fine and licence updates span services, which makes NFR-R1 hard; face recognition would still need a Python service|Several deployables, inter-service calls, distributed transactions|Rejected
Backend structure|One FastAPI service with face recognition in-process|Single-transaction updates (NFR-R1); layered code (NFR-M1)|Inference shares the API's CPU; cannot scale the face module separately|Selected
Data store|MongoDB or Firebase|Flexible documents; foreign-key integrity must be coded in the application; Firebase stores biometric data with a cloud vendor|Managed service (Firebase) or a second database technology to learn|Rejected
Data store|PostgreSQL for all records, face embeddings in PostgreSQL too|Relational integrity, but biometric data sits with other personal data (conflicts with NFR-P1)|One store only|Rejected
Data store|PostgreSQL plus a separate SQLite template store with a FAISS index|Foreign keys with ON DELETE RESTRICT, transactions, migrations (NFR-R1, NFR-M1); biometric data separated (NFR-P1); index rebuildable (NFR-R3)|The two stores cannot share one transaction; two things to back up|Selected
System software|Direct installation on Windows|Possible|Each machine configured by hand; differs from a Linux server|Rejected
System software|Linux containers with Docker Compose|Same environment on every machine; configuration by environment variables (NFR-F1)|Docker set-up; large one-off model download kept in a volume|Selected
```

**Paste this — 4.1.2 Selected Design Strategy:**

```text
4.1.2 Selected Design Strategy

The selected strategy combines open-source frameworks and pretrained models with domain logic written for this project. The backend is a single FastAPI service written in Python, organised into routers, services and repositories, and using SQLAlchemy and Alembic over PostgreSQL. Face recognition runs inside the same process: RetinaFace and ArcFace from the InsightFace buffalo_l pack, executed by ONNX Runtime on the CPU, with the templates stored in a separate SQLite file and searched with a FAISS index. Drivers and police use one Expo and React Native application written in TypeScript, and administrators use a Next.js dashboard in the browser. The database and the backend run as two Docker Compose services on Linux.

This strategy was chosen because it is the only one of those compared that meets all of the Must-have requirements that could be built with the available data, while keeping each multi-record update in a single database transaction and keeping biometric data out of the main database. It also concentrates the project's effort where the requirements are specific to iPermit: the point, fine, suspension, appeal and badge rules, the enrolment consistency check, and the officer-in-the-loop handling of uncertain face matches. The strategy has known costs, which later sections return to: the face module cannot be scaled separately from the API, the face-template write cannot be part of the PostgreSQL transaction, the pretrained models carry a non-commercial licence, and automated violation detection remains deferred. TABLE 4.2 summarises the selected strategy and the requirements each decision serves.
```

**Paste this — TABLE 4.2:**

```text
TABLE 4.2. Selected Design Strategy
Decision area|Selected option|Main reason|Requirements served
Development approach|Open-source frameworks and pretrained face models; project-specific business logic|No face dataset or GPU available for training; effort goes into the rules specific to iPermit|FR-05, FR-06, FR-08 to FR-11
Mobile client|Expo SDK 57, React Native 0.86, Expo Router, TypeScript|One code base for Android and iOS; testable in Expo Go on a phone|FR-01, FR-02, FR-04, FR-06, FR-09, FR-10, FR-12, FR-13, FR-15, NFR-F1
Administrator client|Next.js 16 web dashboard, all pages rendered as client components|Licensing staff work at a desk; same TypeScript language as the mobile app|FR-03, FR-10, FR-11, FR-14
Backend|One FastAPI service with routers, services and repositories; face recognition in-process|Single-transaction updates; one deployable; clear layers|NFR-R1, NFR-R2, NFR-M1, NFR-S1 to NFR-S3
Data store|PostgreSQL 16 for records; SQLite file plus FAISS IndexFlatIP for face templates|Referential integrity and migrations; biometric data kept apart; index rebuildable|NFR-R1, NFR-R3, NFR-P1, NFR-M1
System software|Linux containers (postgres:16-alpine, python:3.11-slim) under Docker Compose|Same environment everywhere; configuration by environment variables|NFR-F1
```

---

## 4.2 System Design Process

**Paste this — 4.2 introduction:**

```text
The system was modelled with the Unified Modeling Language (UML) [4]. Use case diagrams define what each actor can do (Section 4.2.1), class diagrams define the domain objects and the structure of the backend code (Section 4.2.2), sequence diagrams show how the components cooperate in the most important operations (Section 4.2.3), and activity diagrams show the decisions in the main workflows (Section 4.2.4). All diagrams describe the delivered code; elements that were designed but not built are marked as planned.
```

### 4.2.1 Use Case Diagrams

**Paste this — 4.2.1 Use Case Diagrams:**

```text
4.2.1 Use Case Diagrams

The top-level use cases of iPermit were shown in Fig. 3.2 in Chapter 3. That diagram has four actors: the driver, the police officer, the administrator, and the face-recognition module as an internal system actor. This section refines it into one diagram per human actor. Fig. 4.1 shows the driver's use cases for licensing and fines. Submitting an application includes a photo-quality check performed by the face-recognition module, and paying or appealing a fine extends the use case of viewing fines. Paying a fine always includes restoring the points of the related violation. The driver's use cases for road incidents and danger zones are unchanged from Fig. 3.2 and are not repeated.
```

**Insert Figure 4.1:** `docs/thesis/diagrams/ch4-usecase-driver.png`

```text
Fig. 4.1. Use case diagram for the driver: licensing and fines
```

```text
Fig. 4.2 shows the police officer's use cases. The three verification methods all include viewing the driver's record, so the officer reaches the same screen whichever method is used. Verification by face scan includes the one-to-many face match performed by the face-recognition module, and is extended by manual confirmation of identity when the match is uncertain (NFR-R4). Recording a violation always includes deducting points, issuing the fine and, when the threshold is reached, suspending the licence. Confirming an AI-flagged violation is shown in grey as planned, because automated violation detection (FR-07) was deferred.
```

**Insert Figure 4.2:** `docs/thesis/diagrams/ch4-usecase-police.png`

```text
Fig. 4.2. Use case diagram for the police officer: roadside verification and enforcement
```

```text
Fig. 4.3 shows the administrator's use cases on the web dashboard. Only accounts with the ADMIN role can log in to it. Approving an application includes enrolling the driver's face template and issuing the digital licence, and approving, rejecting and resolving an appeal all include notifying the driver. Reversing the fine and restoring the points extends the resolution of an appeal only when the appeal is overturned. Police and administrator accounts are not created through any of these use cases: they are provisioned with a command-line script on the server, so that no HTTP endpoint can create a privileged account (FR-01).

The six core use cases are described as narratives in TABLE 4.3 to TABLE 4.8. The flows and error responses were taken from the backend routers and services, so the status codes and quoted messages are those the system actually returns.
```

**Insert Figure 4.3:** `docs/thesis/diagrams/ch4-usecase-admin.png`

```text
Fig. 4.3. Use case diagram for the administrator: application review, appeals and badges
```

**Paste this — TABLE 4.3:**

```text
TABLE 4.3. Use Case Narrative UC-01: Submit Licence Application
Field|Description
Use case ID and name|UC-01 Submit licence application
Primary actor|Driver
Secondary actor|Face-recognition module (photo-quality check)
Preconditions|The driver is logged in with the DRIVER role. The driver has no issued licence and no application in PENDING status (earlier applications, if any, were all rejected).
Main flow|1. The driver taps "Apply for License" (or "Apply again" after a rejection) on Home. 2. The driver adds four face photographs, from the camera or the photo library, and the NIC, medical certificate and birth certificate as images or PDF files. 3. The Submit button becomes active once all seven files are selected; the driver submits. 4. The backend checks that the driver may apply and that exactly four face photographs were sent. 5. Each face photograph is checked for file type (JPEG or PNG), size (at most 10 MB) and dimensions (at least 200 × 200 pixels, at most 50 megapixels), and then passes the quality gate: exactly one face, detection score at least 0.7, face at least 80 pixels, sharpness (Laplacian variance) at least 100 and mean brightness between 30 and 220. 6. Each document is checked for type (JPEG, PNG or PDF) and size. 7. The backend stores the files and creates the application with status PENDING. 8. The app returns to Home, which shows "Application under review".
Alternative and exception flows|4a. The driver already has a licence or a pending application: 409 "Driver already has a license" or "An application is already under review". 4b. The number of face photographs is not four: 422 "Exactly 4 face photos are required, got n". 5a. A photograph fails a check, for example "Photo 2: No face detected in this photo", "Multiple faces detected -- only the driver should be in frame" or "Photo quality is too low: image too blurry (...)": every file saved so far is deleted and 422 is returned with the field name and photo index, so the app highlights that photo for the driver to replace. 5b. The face engine fails: saved files are deleted and 503 "Photo checks are temporarily unavailable. Please try again later." is returned. 6a. A document has an unsupported type or is too large: 422 naming the file. Any step: more than 10 submissions per hour from one address: 429.
Postconditions|Success: one application in PENDING status with seven documents (four FACE_PHOTO, one NIC, one MEDICAL_CERT, one BIRTH_CERT). Failure: no application and no uploaded files are left behind.
Related requirements|FR-02, FR-05 (quality gate), NFR-S3
```

**Paste this — TABLE 4.4:**

```text
TABLE 4.4. Use Case Narrative UC-02: Review Application (Approve or Reject, with Face Enrolment)
Field|Description
Use case ID and name|UC-02 Review application
Primary actor|Administrator
Secondary actor|Face-recognition module (enrolment)
Preconditions|The administrator is logged in to the web dashboard with the ADMIN role. The application is in PENDING status.
Main flow (approve)|1. The administrator opens the Applications page, optionally filtered by status, and reviews the applicant's email, NIC, submission time and the number of documents and photographs. 2. The administrator selects Approve. 3. The backend checks that the application is still PENDING and that the driver has no licence. 4. The face-recognition module detects the face in each of the four photographs, checks that all six pairs of embeddings have a cosine similarity of at least 0.42, and averages and re-normalises the four embeddings into one template. 5. In one database transaction the application is set to APPROVED and a licence is issued with a number of the form DL-XXXXXXXXXX, a random QR token and an expiry date five years ahead. 6. After the commit, the template is saved to the SQLite store and added to the FAISS index. 7. The driver's initial badge is computed and the driver is notified ("Your license application has been approved."). 8. The dashboard shows the application as APPROVED.
Alternative flow (reject)|2a. The administrator selects Reject, types a reason and confirms. 2b. The backend sets the application to REJECTED with the reason and notifies the driver ("Your license application was rejected: <reason>"). The driver may then apply again.
Exception flows|3a. The application does not exist: 404 "Application not found". 3b. It was already decided: 409 "Application is already APPROVED, cannot re-decide it" (or REJECTED). 3c. The driver already has a licence: 409 "Driver already has a license". 4a. A photograph has no face or several faces, or the photographs are inconsistent: 422, for example "Enrollment photos do not consistently show the same face (similarity 0.31 below threshold 0.42) -- ask the driver to resubmit with clearer, consistent photos"; the application stays PENDING and nothing is written, so the administrator can reject it with a reason. 4b. The face engine fails: 503 "Face enrollment is temporarily unavailable. Please try again later." 2a'. Rejection without a reason is refused by the dashboard and by the backend (422 "A rejection reason is required").
Postconditions|Approve: application APPROVED, one licence (status ACTIVE, 0 points), one face template for the driver, one badge, one LICENSE_APPROVED notification. Reject: application REJECTED with its reason, one LICENSE_REJECTED notification.
Related requirements|FR-03, FR-04, FR-05, FR-11, FR-12, NFR-R1, NFR-P1
```

**Paste this — TABLE 4.5:**

```text
TABLE 4.5. Use Case Narrative UC-03: Verify Driver by Face Scan
Field|Description
Use case ID and name|UC-03 Verify driver by face scan
Primary actor|Police officer
Secondary actor|Face-recognition module (one-to-many match)
Preconditions|The officer is logged in to the mobile app with the POLICE role and has camera access. The stopped driver has an approved licence and an enrolled face template.
Main flow|1. The officer chooses "Scan face" on Police Home or the Face mode of the Verify tab. 2. The officer photographs the driver's face. 3. The app uploads the photograph; the backend checks its type, size and dimensions. 4. The backend detects exactly one face and computes its embedding. 5. The embedding is compared with every enrolled template (exact inner-product search) and the three closest templates are returned with their cosine similarity. 6. For each candidate the backend looks up the driver's email, NIC, licence number, licence status, points and violation history. 7. If the best similarity is at least 0.42, requires_manual_confirmation is false and the app opens the driver's record directly. 8. The officer checks the record.
Alternative flows|7a. The best similarity is below 0.42: the app shows "Uncertain match. Confirm the driver's identity before continuing, or use QR or NIC instead." with the candidates ranked by percentage match; the officer opens the candidate they recognise, or rejects all of them and changes method. 7b. No enrolled driver is returned: the app shows "No enrolled driver resembles this photo closely enough to suggest. Use QR or NIC instead."
Exception flows|3a. Unsupported type, file over 10 MB or image too small: 422. 4a. No face or several faces: 422 "No face detected in the submitted photo" or "Multiple faces detected in the submitted photo -- only the stopped driver should be in frame". 4b. The face engine fails: 503 "Face matching is temporarily unavailable. Use QR or NIC lookup." 1a. A non-police account calls the endpoint: 403. More than 30 scans per minute from one address: 429.
Postconditions|The officer has the driver's record on screen, or has been directed to QR or NIC lookup. The photograph is used for the search and then discarded; it is not stored. No identity decision is made by the system alone.
Related requirements|FR-06, NFR-R4, NFR-S1, NFR-S3, NFR-P1, NFR-T1
```

**Paste this — TABLE 4.6:**

```text
TABLE 4.6. Use Case Narrative UC-04: Record Violation
Field|Description
Use case ID and name|UC-04 Record violation
Primary actor|Police officer
Secondary actors|None (the driver is notified)
Preconditions|The officer is logged in with the POLICE role and has opened the driver's record through face scan, QR code or NIC lookup. The driver has an issued licence.
Main flow|1. On the driver record the officer selects the violation type (white line, speeding, red light or drunk driving) and may enter an evidence reference. 2. The app shows a confirmation dialog with the points to be added, the new total, the fine amount and, if the total reaches 10, a warning that the licence will be suspended. 3. The officer confirms. 4. In one database transaction the backend inserts the violation with the points for its type (3, 4, 6 or 10), inserts an UNPAID fine for the amount for its type (LKR 2,000, 5,000, 10,000 or 25,000), adds the points to the licence and sets the licence to SUSPENDED if the total is 10 or more. 5. After the commit, the driver's badge is recomputed and the driver is notified of the fine (FINE_ISSUED), of a badge change if the tier changed, and of the suspension if it happened. 6. The app shows "Recorded <type>: n points and a LKR x fine." and updates the record.
Alternative flows|2a. The officer cancels the dialog: nothing is recorded. 2b. The licence is already suspended: the dialog says so; the violation can still be recorded.
Exception flows|4a. The driver has no issued licence: 404 "This driver has no issued license". 3a. An invalid violation type is sent: 422. 3b. A non-police account calls the endpoint: 403.
Postconditions|One violation, one fine linked to it, updated licence points and status, a recomputed badge and one or more notifications. If any database step fails, none of the violation, fine or point changes is kept.
Related requirements|FR-08, FR-11, FR-12, NFR-R1, NFR-R2 (FR-07 deferred; evidence_ref kept for it)
```

**Paste this — TABLE 4.7:**

```text
TABLE 4.7. Use Case Narrative UC-05: Pay Fine
Field|Description
Use case ID and name|UC-05 Pay fine (mock payment)
Primary actor|Driver
Secondary actors|None (no real payment provider)
Preconditions|The driver is logged in with the DRIVER role. The fine belongs to the driver, is UNPAID and has no appeal in PENDING status.
Main flow|1. The driver opens the fine from the Fines tab and chooses Pay. 2. The driver selects card, bank transfer or mobile wallet. 3. The app asks for confirmation ("Pay LKR x?"). 4. The backend marks the fine PAID and records the time and the method. 5. In the same transaction it subtracts the violation's points from the licence (never below zero) and, if the licence was SUSPENDED and the total is now below 10, sets it back to ACTIVE. 6. After the commit, the badge is recomputed and the driver is notified ("Your payment of LKR x was received."). 7. The app shows the new points total and whether the licence is active.
Alternative flows|3a. The driver cancels: nothing changes. 1a. An earlier appeal on this fine was rejected (UPHELD): the fine can still be paid.
Exception flows|4a. The fine does not exist or belongs to another driver: 404 "No such fine". 4b. The fine is already PAID or REVERSED: 409 "This fine is already paid" (or reversed). 4c. An appeal is pending: 409 "This fine has a pending appeal -- cannot pay it until resolved". 4d. An invalid payment method is sent: 422.
Postconditions|The fine is PAID with its method and time; the licence points are reduced by the violation's points and the licence may be reactivated; the violation itself stays on record.
Related requirements|FR-09, FR-08 (restoration rule), FR-11, FR-12, NFR-R1
```

**Paste this — TABLE 4.8:**

```text
TABLE 4.8. Use Case Narrative UC-06: Appeal Fine
Field|Description
Use case ID and name|UC-06 Appeal fine (submission and resolution)
Primary actors|Driver (submits), administrator (resolves)
Preconditions|Submission: the driver is logged in, the fine belongs to the driver, is UNPAID and has never been appealed. Resolution: the administrator is logged in to the dashboard and the appeal is PENDING.
Main flow|1. On an unpaid fine the driver chooses Appeal, writes a reason (1 to 1000 characters) and submits. 2. The backend creates the appeal in PENDING status; while it is pending the fine cannot be paid. 3. The administrator opens the Appeals page, filtered to pending appeals, and reviews the reason, the violation and the fine. 4a. Overturn: in one transaction the appeal is set to OVERTURNED with the administrator and the time, the fine is set to REVERSED, and the violation's points are restored under the same rule as payment. 4b. Uphold: the appeal is set to UPHELD with the administrator and the time, and the fine stays UNPAID. 5. After the commit, the badge is recomputed and the driver is notified: "Your appeal was accepted -- the fine has been reversed." or "Your appeal was reviewed and rejected -- the fine still stands."
Alternative flows|5a. After an upheld appeal the driver may pay the fine (UC-05) but cannot appeal it again.
Exception flows|1a. The fine does not exist or is not the driver's: 404 "No such fine". 1b. The fine is already paid or reversed: 409 "This fine is already paid and cannot be appealed". 1c. The fine was already appealed: 409 "This fine has already been appealed". 1d. Empty reason: 422. 3a. The appeal does not exist: 404 "No such appeal". 3b. The appeal was already resolved: 409 "This appeal is already upheld" (or overturned).
Postconditions|Exactly one appeal exists for the fine, resolved as UPHELD or OVERTURNED; an overturned appeal leaves the fine REVERSED and the points restored; the driver has been notified.
Related requirements|FR-10, FR-08 (restoration rule), FR-11, FR-12, NFR-R1
```

### 4.2.2 Class Diagrams

**Paste this — 4.2.2 Class Diagrams:**

```text
4.2.2 Class Diagrams

The domain model is taken directly from the SQLAlchemy models in the backend. It is shown in three figures so that each can be read at page width. Fig. 4.4 shows the classes for licensing and enforcement. A single User class represents every account, and its role (DRIVER, POLICE or ADMIN) determines which associations apply: a driver submits applications, holds a licence, commits violations, submits appeals and has a badge; an officer records violations; an administrator resolves appeals. There is no separate Driver class. The licence carries the driver's running point total and status, so the roadside check reads one row. An application is composed of exactly seven documents, and each violation generates exactly one fine, which can be contested by at most one appeal. The association between User and License is shown as 0..1 because the service layer refuses to issue a second licence to a driver, even though the licences table itself would allow more than one row per driver.
```

**Insert Figure 4.4:** `docs/thesis/diagrams/ch4-class-domain-core.png`

```text
Fig. 4.4. Domain class diagram: licensing and enforcement
```

```text
Fig. 4.5 shows the remaining domain classes. Notifications belong to one user. Road incidents and danger zones are created by one user, and a danger zone can also record the user who cleared it. Incident and zone locations are single points captured when the report is made; nothing in the model tracks a driver's position over time (NFR-P2). The face template is drawn in a separate package because it is not stored in PostgreSQL at all: it lives in its own SQLite file and refers to the user only by the user's identifier, with no database-level foreign key. The enumerations used by these classes are shown in Fig. 4.6, together with the placeholder point and fine values of each violation type, the score thresholds of each badge tier, and the one notification type (NEARBY_INCIDENT) that exists in the model but is never triggered, because notifying nearby drivers would require tracking their location.
```

**Insert Figure 4.5:** `docs/thesis/diagrams/ch4-class-domain-safety.png`

```text
Fig. 4.5. Domain class diagram: notifications, road safety and the face template
```

**Insert Figure 4.6:** `docs/thesis/diagrams/ch4-class-domain-enums.png`

```text
Fig. 4.6. Enumerations of the domain model
```

```text
The backend code follows a layered design, shown in Fig. 4.7. Routers handle HTTP only: they parse the request, check the caller's role through the require_role dependency, call one service function and translate its exceptions into status codes. Services hold the business rules and decide where each transaction begins and ends. Repositories contain the database queries, and the models map the tables. A set of core modules is shared by the other layers: configuration, the database session, password hashing and tokens (security), rate limiting, upload validation, the Haversine distance function (geo), Expo push delivery, and the four face modules. Only the core layer touches the SQLite template store and the external Expo push service.
```

**Insert Figure 4.7:** `docs/thesis/diagrams/ch4-class-layers.png`

```text
Fig. 4.7. Layered design of the backend
```

```text
Fig. 4.8 to Fig. 4.10 show the main design classes inside these layers, with their public operations. Each Python module is drawn as a class with a stereotype for its layer. Fig. 4.8 covers licensing and face recognition. The application service depends on the face service for the quality gate and enrolment, and on license_service for issuing the licence. The police service uses the same face engine for a live photograph, then searches the FAISS index and turns each result back into a driver through the template store. The face index wraps an exact inner-product index (IndexFlatIP) over 512-dimensional vectors, identified by the SQLite row identifier, and can be rebuilt from the template store at any time (NFR-R3).
```

**Insert Figure 4.8:** `docs/thesis/diagrams/ch4-class-face-services.png`

```text
Fig. 4.8. Design classes for licensing and face recognition
```

```text
Fig. 4.9 covers enforcement and notification. The restore_points_for_violation operation of the violation service is the only implementation of the point-restoration rule, and it is shared by payment and by an overturned appeal, the only two ways a fine can leave the UNPAID state. The badge service separates a pure scoring function, compute_safety_score, and a pure tier function, tier_for_score, from recompute_badge, which reads the data and saves the result; the pure functions can be unit-tested without a database. Every enforcement flow ends by calling the notification service, which saves the notification and then attempts an Expo push, logging rather than raising any push failure (NFR-R2). Fig. 4.10 shows the supporting services: registration and login, which use the security module for bcrypt hashing and 30-minute JWT access tokens, and the incident and danger-zone services, which use the geo module to find records within a radius of the user's location.
```

**Insert Figure 4.9:** `docs/thesis/diagrams/ch4-class-enforcement-services.png`

```text
Fig. 4.9. Design classes for enforcement, badges and notifications
```

**Insert Figure 4.10:** `docs/thesis/diagrams/ch4-class-support-services.png`

```text
Fig. 4.10. Design classes for authentication and location-based services
```

### 4.2.3 Sequence Diagrams

**Paste this — 4.2.3 Sequence Diagrams:**

```text
4.2.3 Sequence Diagrams

Four sequence diagrams show the operations in which several components and both data stores cooperate. Fig. 4.11 shows the approval of an application. The order of the steps is deliberate, because PostgreSQL and the SQLite template store cannot take part in one transaction. The face template is built first, before anything is written. If the four photographs are inconsistent, the request fails with status 422 and the application stays PENDING with nothing written anywhere. Only when the template has been built are the approval and the new licence written and committed together in one PostgreSQL transaction. The template is then saved to SQLite and added to the FAISS index. If this last write failed, the approval and the licence would remain, and the driver would have a licence without a face template until the enrolment was repeated. This is a known and documented gap; closing it would need a two-phase commit across the two stores, which was judged out of proportion for the prototype. The badge and the approval notification follow as separate, best-effort steps.
```

**Insert Figure 4.11:** `docs/thesis/diagrams/ch4-seq-approval.png`

```text
Fig. 4.11. Sequence diagram for approving an application: face enrolment, licence issuance and notification
```

```text
Fig. 4.12 shows roadside verification by face scan. The router applies the rate limit, the role check and the upload checks before any inference is run. The police service detects one face, searches the index for the three closest templates, and returns them with their similarity scores and the drivers' records. The response always contains the flag requires_manual_confirmation, which is true when there is no match or when the best similarity is below 0.42. The mobile app opens the driver record directly only when the flag is false; otherwise it shows a warning and the ranked candidates, and the officer decides. If the face engine fails, the error message itself directs the officer to QR or NIC lookup.
```

**Insert Figure 4.12:** `docs/thesis/diagrams/ch4-seq-verify-face.png`

```text
Fig. 4.12. Sequence diagram for roadside face verification, including the manual-confirmation branch
```

```text
Fig. 4.13 shows the recording of a violation. The violation, its fine and the change to the licence's points and status are written in one transaction. The violation is flushed first so that the database assigns its identifier, which the fine needs as its foreign key. Only after the commit does the service recompute the badge and create the notifications, each committed on its own; a failure in these steps cannot undo the violation (NFR-R2), and a failed push notification is only logged.
```

**Insert Figure 4.13:** `docs/thesis/diagrams/ch4-seq-violation.png`

```text
Fig. 4.13. Sequence diagram for recording a violation: points, fine, suspension, badge and notifications
```

```text
Fig. 4.14 shows the payment of a fine. The service refuses to pay a fine that is not the driver's, that is no longer unpaid, or that has a pending appeal. Otherwise it marks the fine as paid and calls the shared restoration function inside the same transaction, so the fine can never be marked as paid while the points remain on the licence. No payment provider is involved: the payment method is recorded only to demonstrate the flow.
```

**Insert Figure 4.14:** `docs/thesis/diagrams/ch4-seq-pay-fine.png`

```text
Fig. 4.14. Sequence diagram for paying a fine with point restoration
```

### 4.2.4 Activity Diagrams

**Paste this — 4.2.4 Activity Diagrams:**

```text
4.2.4 Activity Diagrams

Fig. 4.15 shows the licence application workflow with the photo-quality gate. The driver can start an application only when no licence has been issued and nothing is pending. The backend checks the files one at a time, and the first failure stops the submission: the files already saved are deleted and the response names the field and, for a photograph, its position, so the app can highlight the exact photo to replace. The loop ends when every file passes, at which point the application is created. A failure of the face engine is reported differently, with status 503, because the fault lies with the server and not with the driver's photographs.
```

**Insert Figure 4.15:** `docs/thesis/diagrams/ch4-act-application.png`

```text
Fig. 4.15. Activity diagram for submitting a licence application with the photo-quality gate
```

```text
Fig. 4.16 shows how an officer identifies a driver at the roadside. The officer chooses one of three methods, and any failure (an uncertain or empty face result, an unknown QR token, or an unknown NIC or licence number) returns the officer to the choice of method rather than ending the stop. This gives the fallback required by FR-06: if face matching is unavailable or uncertain, the QR code or the NIC still identifies the driver. The QR method also has its own fallback: if camera access is refused, the token can be typed in. Once the driver is identified, the officer reviews the record and may record a violation after the confirmation dialog.
```

**Insert Figure 4.16:** `docs/thesis/diagrams/ch4-act-verification.png`

```text
Fig. 4.16. Activity diagram for roadside verification by face, QR code or NIC
```

```text
Fig. 4.17 shows the appeal workflow from submission to resolution. A fine can be appealed once, and only while it is unpaid. The administrator's decision leads to one of two outcomes. An overturned appeal reverses the fine and restores the points in the same transaction, and may reactivate a suspended licence. An upheld appeal leaves the fine unpaid, so the driver can still pay it but cannot appeal again. In both cases the badge is recomputed and the driver is told the outcome in plain words ("accepted" or "rejected") rather than the internal status names, since "upheld" refers to the fine and could be misread as a successful appeal.
```

**Insert Figure 4.17:** `docs/thesis/diagrams/ch4-act-appeal.png`

```text
Fig. 4.17. Activity diagram for appeal resolution (overturned or upheld)
```

---

## 4.3 Interface Design

### 4.3.1 Design Principles

**Paste this — 4.3.1 Design Principles:**

```text
4.3.1 Design Principles

The interface was designed around the conditions in which each user works. Officers use the app at the roadside, often in a hurry and in daylight; drivers use it occasionally and need to see their status at once; licensing staff work at a desk through a queue of applications and appeals. The mobile app went through a redesign late in development, planned in two written specifications: the first fixed the fundamentals of the existing blue-and-white design (a mismatch between the navigation background and the screen background, oversized headings, the lack of any depth token, and buttons that gave no feedback when pressed), and the second moved the app to a native platform look, following Material conventions on Android and Apple's guidelines on iOS. The resulting principles are described below.

Design tokens as the single source of style. All colours, spacing, corner radii and shadows come from one file of tokens, with a light and a dark palette selected from the phone's system setting. TABLE 4.9 lists the tokens. Text uses a small type scale (sizes 34, 22, 16, 14 and 12) in the system font, so that headings, body text and captions stay consistent across screens.

Shared components instead of per-screen copies. Before the redesign, more than ten screens each defined their own button. The app now uses shared components: Button (primary, secondary and danger variants), Card, TextField (label, inline error, hint and a show-password toggle), StatusBadge, EmptyState, ScreenState for loading and error states, SegmentedControl, ProgressBar, and the licence card. A change to a component therefore changes every screen that uses it.

Native navigation and headers. The app uses the platform's own tab bar (native tabs in Expo Router), with SF Symbols icons on iOS and Material icons on Android. Each tab has its own stack with a native header, a large title on iOS and a standard top app bar on Android. The Profile screen is built from the platform's own grouped list rows through the @expo/ui library, and forms that interrupt a task, such as reporting an incident, open as modal screens.

Role-based navigation. The tab bar is built from the logged-in user's role. Drivers see Home, Fines, Incidents, Alerts and Profile; officers see Home, Verify, Incidents, Alerts and Profile, which stays within the five-tab limit of Android's native tab bar. Home itself changes with the role: for an officer it is a hub with three large actions (scan face, scan QR, look up driver), each opening the Verify tab in that mode.

Feedback and prevention of errors. Buttons dim while pressed and are visibly disabled while they cannot be used, and on the screens that submit data (applying, verifying, recording a violation, paying or appealing, reporting) a second tap during a request is ignored. Actions with consequences are confirmed first and the confirmation states the consequence: recording a violation shows the points, the new total, the fine and whether the licence will be suspended, and paying shows the amount and the method. Server errors are shown next to the field they concern, for example on the exact application photograph that failed the quality gate. The Submit button of an application stays disabled until all seven files are chosen, and a progress bar shows how many are ready.

Honesty about automated results. The face-scan screen tells the officer that "the match is a guide; you confirm the identity", and an uncertain match is shown as a warning with ranked candidates and percentage scores, never as a confirmed identity (NFR-R4). Where location permission is refused, the map falls back to Colombo for browsing but the report button is disabled, because a report must record where the hazard really is.

Accessibility. Custom controls declare their role, state and label to the screen reader: buttons, the segmented control (as a radio group), payment-method rows, and candidate rows, whose label reads the email, NIC and match percentage. The points bar and the file counter are announced as progress bars with their current and maximum values, and error banners on the main forms are live regions so that new errors are read out. Status is never shown by colour alone: every StatusBadge combines an icon with a text label. The points bar changes from green to amber at 5 points and to red at 8, and the numeric total is shown beside it. These measures were built into the components, but the app has not been formally audited against an accessibility standard.

The administrator dashboard follows a plainer, desk-based style. It uses Tailwind CSS with a neutral grey palette, a top bar with the three sections (Applications, Appeals and Badges) and the signed-in administrator's email, and a status filter above each list. Statuses appear as coloured badges that also show the status word. Rejecting an application opens an inline text box; confirming it without a reason shows an error and sends nothing. Each list has explicit loading, empty and error states. Every page is a client component that calls the same REST API as the mobile app, and the login page refuses any account whose role is not ADMIN.
```

**Paste this — TABLE 4.9:**

```text
TABLE 4.9. Design Tokens of the Mobile Application
Token group|Token|Light theme|Dark theme|Use
Colour|text / textSecondary|#000000 / #60646C|#FFFFFF / #B0B4BA|Body text and secondary text
Colour|background / backgroundElement / backgroundSelected|#FFFFFF / #F0F0F3 / #E0E1E6|#000000 / #212225 / #2E3135|Screen, card and selected or secondary surfaces
Colour|primary / onPrimary|#208AEF / #FFFFFF|#4DA3F5 / #FFFFFF|Primary buttons, links, active tab
Colour|success / warning / danger|#12805C / #B54708 / #D92D20|#3DD68C / #F79009 / #F04438|Status badges, points bar, errors, destructive actions
Spacing|half, one, two, three, four, five, six|2, 4, 8, 16, 24, 32, 64 px|same|Gaps and padding
Radius|small / medium|8 px / 16 px|same|Chips and inputs / cards and buttons
Shadow|card|0 1px 3px rgba(0,0,0,0.08)|same|The single elevation level, used by Card
Layout|MaxContentWidth|800 px|same|Maximum content width on large screens and the web preview
```

### 4.3.2 Actual Screens of the System

**Paste this — 4.3.2 Actual Screens of the System:**

```text
4.3.2 Actual Screens of the System

This section presents the main screens of the delivered system. The mobile screens were captured from the app running in Expo Go on an Android phone connected to the development backend, and the administrator screens from the dashboard running in a desktop browser. All data shown belongs to test accounts. The screens are grouped by user: the driver's screens (Fig. 4.20 to Fig. 4.29), the officer's screens (Fig. 4.30 to Fig. 4.32) and the administrator's dashboard (Fig. 4.33 to Fig. 4.35). TABLE 4.10 lists them with the requirement each one serves.
```

> **For the team:** the paragraph above states how the screenshots were taken.
> Keep it only if you really take them that way (Expo Go on an Android phone,
> dashboard in a desktop browser, test accounts). Take each screenshot in the
> role and state given in TABLE 4.10 and save it under the file name shown.

**Paste this — TABLE 4.10:**

```text
TABLE 4.10. Screens of the System
Figure|Screen|File|Role and state to capture|Requirements
Fig. 4.20|Login|docs/thesis/screens/login.png|Logged out; email or NIC and password fields, ideally with the "Invalid credentials" error visible|FR-01
Fig. 4.21|Driver Home with digital licence|docs/thesis/screens/driver-home.png|Approved driver with a few points (for example 3) and a badge; licence card with QR code, expiry, points bar and badge visible|FR-04, FR-11
Fig. 4.22|Driver Home, application under review|docs/thesis/screens/driver-home-pending.png|Driver whose application is PENDING|FR-02, FR-03
Fig. 4.23|Apply for licence|docs/thesis/screens/apply.png|Driver without a licence; four photo tiles and three documents chosen, with one photo highlighted by a quality-gate error if possible|FR-02, FR-05
Fig. 4.24|Fines list|docs/thesis/screens/fines.png|Driver with at least one unpaid fine, one paid fine and one fine with a pending appeal|FR-09, FR-10
Fig. 4.25|Fine details, payment|docs/thesis/screens/fine-pay.png|Unpaid fine with Pay selected and the three payment methods shown (or the "Pay LKR x?" confirmation)|FR-09
Fig. 4.26|Fine details, appeal|docs/thesis/screens/fine-appeal.png|Unpaid fine with the appeal reason box, or a fine whose appeal card shows its status|FR-10
Fig. 4.27|Incidents map|docs/thesis/screens/incidents-map.png|Location permission granted; at least one incident marker and one danger-zone circle on the map tiles, list below|FR-13, FR-15
Fig. 4.28|Report incident or danger zone|docs/thesis/screens/report.png|Report modal open, incident or zone selected, with type and severity chosen|FR-13, FR-15
Fig. 4.29|Notifications|docs/thesis/screens/notifications.png|Driver with several notifications, some unread, and the unread count on the Alerts tab|FR-12
Fig. 4.30|Police Home|docs/thesis/screens/police-home.png|Police account; the three verification actions|FR-06
Fig. 4.31|Verify, uncertain face match|docs/thesis/screens/police-verify-uncertain.png|Police account, Face mode, after a scan that returned candidates below the threshold (warning banner and ranked candidates)|FR-06, NFR-R4
Fig. 4.32|Driver record and violation confirmation|docs/thesis/screens/police-driver.png|Police account on a driver record with points and violation history, with the "Record ...?" confirmation dialog open|FR-06, FR-08
Fig. 4.33|Admin: applications|docs/thesis/screens/admin-applications.png|Browser, Pending filter, one application with the rejection reason box open|FR-03
Fig. 4.34|Admin: appeals|docs/thesis/screens/admin-appeals.png|Browser, a pending appeal with the Overturn and Uphold buttons|FR-10
Fig. 4.35|Admin: badges|docs/thesis/screens/admin-badges.png|Browser, tier distribution and a non-empty attention queue|FR-11, FR-14
```

**Insert Figure 4.20:** `docs/thesis/screens/login.png`

```text
Fig. 4.20. Login screen of the mobile application (drivers log in with email or NIC)
```

**Insert Figure 4.21:** `docs/thesis/screens/driver-home.png`

```text
Fig. 4.21. Driver Home showing the digital licence with its QR code, demerit points and behaviour badge
```

**Insert Figure 4.22:** `docs/thesis/screens/driver-home-pending.png`

```text
Fig. 4.22. Driver Home while the licence application is under review
```

**Insert Figure 4.23:** `docs/thesis/screens/apply.png`

```text
Fig. 4.23. Licence application screen with four face photographs and three supporting documents
```

**Insert Figure 4.24:** `docs/thesis/screens/fines.png`

```text
Fig. 4.24. The driver's fines, each with a status badge
```

**Insert Figure 4.25:** `docs/thesis/screens/fine-pay.png`

```text
Fig. 4.25. Fine details with the mock payment options
```

**Insert Figure 4.26:** `docs/thesis/screens/fine-appeal.png`

```text
Fig. 4.26. Appealing a fine from the fine details screen
```

**Insert Figure 4.27:** `docs/thesis/screens/incidents-map.png`

```text
Fig. 4.27. Map of nearby road incidents and danger zones (map tiles © Esri; sources include OpenStreetMap contributors)
```

**Insert Figure 4.28:** `docs/thesis/screens/report.png`

```text
Fig. 4.28. Reporting a road incident or marking a danger zone at the current location
```

**Insert Figure 4.29:** `docs/thesis/screens/notifications.png`

```text
Fig. 4.29. Notification history with unread notifications
```

**Insert Figure 4.30:** `docs/thesis/screens/police-home.png`

```text
Fig. 4.30. Police Home with the three verification methods
```

**Insert Figure 4.31:** `docs/thesis/screens/police-verify-uncertain.png`

```text
Fig. 4.31. An uncertain face match: the officer is warned and chooses from ranked candidates
```

**Insert Figure 4.32:** `docs/thesis/screens/police-driver.png`

```text
Fig. 4.32. Driver record seen by the officer, with the confirmation shown before a violation is recorded
```

**Insert Figure 4.33:** `docs/thesis/screens/admin-applications.png`

```text
Fig. 4.33. Administrator dashboard: reviewing licence applications
```

**Insert Figure 4.34:** `docs/thesis/screens/admin-appeals.png`

```text
Fig. 4.34. Administrator dashboard: resolving an appeal
```

**Insert Figure 4.35:** `docs/thesis/screens/admin-badges.png`

```text
Fig. 4.35. Administrator dashboard: badge distribution and the attention queue
```

---

## 4.4 Database Design

### 4.4.1 ERD

**Paste this — 4.4.1 ERD:**

```text
4.4.1 Entity Relationship Diagram

The database was designed as an entity relationship model [5] and implemented as eleven PostgreSQL tables created by eight Alembic migrations, plus one table in a separate SQLite file. The entity relationship diagram is drawn in crow's-foot notation and split into two figures. Fig. 4.18 shows the tables for licensing and enforcement. The users table is referenced by every other table, since drivers, officers and administrators are all users. Two tables reference users twice: violations (the driver and the recording officer) and appeals (the driver and the resolving administrator). The one-to-one relationships are enforced by unique foreign keys: one licence per application, one fine per violation, one appeal per fine, and one badge per driver, where the driver's identifier is itself the primary key of the badges table.
```

**Insert Figure 4.18:** `docs/thesis/diagrams/ch4-erd-core.png`

```text
Fig. 4.18. Entity relationship diagram: licensing and enforcement tables
```

```text
Fig. 4.19 shows the notifications, road-incident and danger-zone tables, and the face-template store. The face_templates table is kept in a separate SQLite file so that biometric data never enters the main database (NFR-P1). Its driver_id column holds a user's identifier as text and is unique, so each driver has at most one template, but no foreign key can cross from one database to another, so the link is maintained by the application and drawn as a dashed line. Each embedding is stored as a binary block of 512 32-bit floating-point numbers. The FAISS index is not a table: it is an in-memory structure built from this table and identified by its row numbers.
```

**Insert Figure 4.19:** `docs/thesis/diagrams/ch4-erd-safety.png`

```text
Fig. 4.19. Entity relationship diagram: notifications, road safety tables and the separate face-template store
```

### 4.4.2 Normalization

**Paste this — 4.4.2 Normalization:**

```text
4.4.2 Normalisation

The tables were normalised to third normal form, following the relational model [6], with a small number of deliberate exceptions. In first normal form every column holds a single value and there are no repeating groups. The early design document listed an application's photographs and documents as arrays inside the application record; the implementation instead places each file in its own row of application_documents, identified by its type (FACE_PHOTO, NIC, MEDICAL_CERT or BIRTH_CERT). Values with a fixed set of options, such as statuses, roles and violation types, are stored as PostgreSQL enumerated types, so an invalid value cannot be written.

Second normal form requires that no column depends on only part of a composite key. Every table has a single-column primary key (a UUID, or in the case of badges the driver's identifier), so partial dependencies cannot arise. Third normal form requires that no non-key column depends on another non-key column. Most of the tables meet it directly: a fine, for example, stores only its violation's identifier and not the driver, who is reached through the violation, and the fine repository joins through violations to list a driver's fines.

The exceptions are listed in TABLE 4.11. Each is either a value stored for speed and simplicity of reading, or a snapshot of a value at the moment of an event. In every case the redundant value is written only by the service function that also writes the data it depends on, and within the same transaction, which is what keeps it consistent. The early design also had a separate Driver table holding a name, a date of birth, the points and the licence status. The implementation has no such table: the points and the status belong to the licence, and the name and date of birth are not stored at all, so an officer identifies a driver by email, NIC and licence number.
```

**Paste this — TABLE 4.11:**

```text
TABLE 4.11. Deliberate Departures from Third Normal Form
Table.column|What it duplicates or derives|Why it is stored|How consistency is kept
licenses.points|The sum of points_deducted over the driver's violations whose fine is still UNPAID|Read on every roadside check and on every suspension decision; a running total avoids a join and a sum each time|Changed only by record_violation and restore_points_for_violation, each inside the transaction that changes the violation or fine
licenses.status|Follows from points (SUSPENDED at 10 or more)|Explicit state that the badge rule and the officer screen read directly; leaves room for suspensions for other reasons|Set in the same transactions as points
licenses.driver_id|applications.driver_id through licenses.application_id|Finding a driver's licence is the most frequent query; avoids a join|Both values are copied from the same application when the licence is issued
appeals.driver_id|violations.driver_id through fines.violation_id|Lists a driver's appeals and checks ownership without two joins|Set from the authenticated driver after the service has checked that the fine belongs to that driver
violations.points_deducted and fines.amount|The point and fine schedule for the violation type, held in code|Snapshots: a later change to the placeholder schedule must not rewrite past penalties, and restoration must undo exactly what was deducted|Written once when the violation is recorded, never updated
notifications.message|Text that could be generated from the notification type and the related fine, appeal or licence|A pre-rendered string is a simple, permanent record of what the driver was told; no link to the related record is needed|Written once; notifications are never edited
badges.tier and badges.safety_score|Computed from the licence, violations and fines|Lets the dashboard count tiers and list at-risk drivers with one query|Recomputed after every approval, violation, payment and appeal resolution (best effort, after the main commit)
road_incidents.status = EXPIRED|Follows from expires_at|No scheduler exists, so expiry is saved lazily when incidents are read|Checked and saved on every read
road_incidents.confirmation_count and danger_zones.confirmation_count|The number of confirmations, which a separate confirmations table could hold|A tally is enough for display; it never changes the record's status|Incremented on each confirmation; because no per-user record is kept, one user can confirm more than once
```

### 4.4.3 Relational Schema

**Paste this — 4.4.3 Relational Schema:**

```text
4.4.3 Relational Schema

TABLE 4.12 gives the relational schema as created by the migrations, and TABLE 4.13 lists the foreign keys with their delete rules. Every foreign key that protects enforcement or financial history uses ON DELETE RESTRICT, so a user, violation or fine that is referenced elsewhere cannot be deleted and no record can be orphaned. Two foreign keys use a different rule on purpose. Application documents are deleted with their application (CASCADE), because a document has no meaning without it. The user who cleared a danger zone is set to null if that user is removed (SET NULL), because the zone and its clearance remain valid without knowing who cleared it. All timestamps are stored without a time zone and hold UTC values; the API returns them marked as UTC.
```

**Paste this — TABLE 4.12:**

```text
TABLE 4.12. Relational Schema
Table|Column|Type|Key|Null|Constraint or note
users|id|uuid|PK|No|
users|email|varchar(255)||No|Unique index
users|nic|varchar(20)||No|Unique index
users|password_hash|varchar(255)||No|bcrypt hash
users|role|enum userrole (DRIVER, POLICE, ADMIN)||No|Default DRIVER; self-registration always creates DRIVER
users|created_at|timestamp||No|
users|push_token|varchar(255)||Yes|Expo push token, one per user
applications|id|uuid|PK|No|
applications|driver_id|uuid|FK users.id|No|Index
applications|status|enum applicationstatus (PENDING, APPROVED, REJECTED)||No|Default PENDING
applications|reason|text||Yes|Rejection reason
applications|created_at, updated_at|timestamp||No|
application_documents|id|uuid|PK|No|
application_documents|application_id|uuid|FK applications.id|No|Index
application_documents|doc_type|enum documenttype (FACE_PHOTO, NIC, MEDICAL_CERT, BIRTH_CERT)||No|
application_documents|file_path|varchar(512)||No|Path relative to the upload folder
application_documents|created_at|timestamp||No|
licenses|id|uuid|PK|No|
licenses|driver_id|uuid|FK users.id|No|Index
licenses|application_id|uuid|FK applications.id|No|Unique
licenses|license_no|varchar(32)||No|Unique index; format DL- followed by 10 hexadecimal characters
licenses|qr_token|varchar(64)||No|Unique index; random URL-safe token
licenses|status|enum licensestatus (ACTIVE, SUSPENDED)||No|Default ACTIVE
licenses|points|integer||No|Server default 0
licenses|issued_at, expiry_at|timestamp||No|Expiry five years after issue
violations|id|uuid|PK|No|
violations|driver_id|uuid|FK users.id|No|Index
violations|officer_id|uuid|FK users.id|No|
violations|type|enum violationtype (WHITE_LINE, SPEEDING, RED_LIGHT, DRUNK_DRIVING)||No|
violations|points_deducted|integer||No|3, 4, 6 or 10 (placeholders)
violations|evidence_ref|text||Yes|At most 512 characters (API); reserved for a future detector
violations|confirmed_at|timestamp||No|
fines|id|uuid|PK|No|
fines|violation_id|uuid|FK violations.id|No|Unique
fines|amount|integer||No|LKR 2,000, 5,000, 10,000 or 25,000 (placeholders)
fines|status|enum finestatus (UNPAID, PAID, REVERSED)||No|Default UNPAID
fines|created_at|timestamp||No|
fines|paid_at|timestamp||Yes|
fines|payment_method|enum paymentmethod (CARD, BANK, WALLET)||Yes|Mock payment only
appeals|id|uuid|PK|No|
appeals|fine_id|uuid|FK fines.id|No|Unique (one appeal per fine)
appeals|driver_id|uuid|FK users.id|No|
appeals|reason|text||No|1 to 1000 characters (API)
appeals|status|enum appealstatus (PENDING, UPHELD, OVERTURNED)||No|Default PENDING
appeals|resolved_by|uuid|FK users.id|Yes|The administrator
appeals|created_at|timestamp||No|
appeals|resolved_at|timestamp||Yes|
badges|driver_id|uuid|PK, FK users.id|No|One row per driver
badges|tier|enum badgetier (PLATINUM, GOLD, SILVER, BRONZE, AT_RISK, SUSPENDED)||No|
badges|safety_score|integer||No|0 to 100
badges|updated_at|timestamp||No|
notifications|id|uuid|PK|No|
notifications|user_id|uuid|FK users.id|No|Index
notifications|type|enum notificationtype (9 values)||No|NEARBY_INCIDENT defined but never used
notifications|message|text||No|Pre-rendered text
notifications|read_at|timestamp||Yes|
notifications|created_at|timestamp||No|
road_incidents|id|uuid|PK|No|
road_incidents|reporter_id|uuid|FK users.id|No|
road_incidents|type|enum roadincidenttype (8 values)||No|
road_incidents|severity|enum roadincidentseverity (LOW, MEDIUM, HIGH)||No|
road_incidents|lat, lng|double precision||No|Latitude -90 to 90, longitude -180 to 180 (API)
road_incidents|status|enum roadincidentstatus (ACTIVE, CLEARED, EXPIRED)||No|Default ACTIVE
road_incidents|confirmation_count|integer||No|Default 0
road_incidents|created_at, expires_at|timestamp||No|Expiry four hours after the report
danger_zones|id|uuid|PK|No|
danger_zones|creator_id|uuid|FK users.id|No|
danger_zones|lat, lng|double precision||No|
danger_zones|radius_m|double precision||No|50 to 1000 metres (API)
danger_zones|severity|enum dangerzoneseverity (LOW, MEDIUM, HIGH)||No|
danger_zones|reason|text||Yes|At most 500 characters (API)
danger_zones|status|enum dangerzonestatus (ACTIVE, CLEARED)||No|Default ACTIVE; no automatic expiry
danger_zones|confirmation_count|integer||No|Default 0
danger_zones|created_at|timestamp||No|
danger_zones|cleared_at|timestamp||Yes|
danger_zones|cleared_by|uuid|FK users.id|Yes|
face_templates (SQLite)|rowid|integer|PK|No|Autoincrement; used as the FAISS vector identifier
face_templates (SQLite)|driver_id|text||No|Unique; holds users.id (no foreign key across databases)
face_templates (SQLite)|embedding|blob||No|512 float32 values, L2-normalised
face_templates (SQLite)|created_at|text||No|ISO 8601 time
```

**Paste this — TABLE 4.13:**

```text
TABLE 4.13. Foreign Keys and Delete Rules
Foreign key|References|On delete|Unique
applications.driver_id|users.id|RESTRICT|No
application_documents.application_id|applications.id|CASCADE|No
licenses.driver_id|users.id|RESTRICT|No
licenses.application_id|applications.id|RESTRICT|Yes
violations.driver_id|users.id|RESTRICT|No
violations.officer_id|users.id|RESTRICT|No
fines.violation_id|violations.id|RESTRICT|Yes
appeals.fine_id|fines.id|RESTRICT|Yes
appeals.driver_id|users.id|RESTRICT|No
appeals.resolved_by|users.id|RESTRICT|No
badges.driver_id|users.id|RESTRICT|Yes (primary key)
notifications.user_id|users.id|RESTRICT|No
road_incidents.reporter_id|users.id|RESTRICT|No
danger_zones.creator_id|users.id|RESTRICT|No
danger_zones.cleared_by|users.id|SET NULL|No
face_templates.driver_id (SQLite)|users.id (logical link only)|Not enforced|Yes
```

---

## 4.5 Hardware Component

**Paste this — 4.5 Hardware Component:**

```text
No custom hardware was designed or built for iPermit. The system runs entirely on standard devices: the officer's smartphone camera captures the face photograph and scans the licence QR code, the driver's smartphone camera captures the enrolment photographs, and the phone's GPS receiver supplies the location of a reported incident or danger zone at the moment of reporting. The backend, the face-recognition module and the database run on an ordinary computer without a GPU, using the CPU for face inference. The development environment is described in Chapter 5.
```

---

## References for this chapter

Numbered in order of first appearance in this chapter. All entries were checked
on 2026-09-27: DOIs were resolved on Crossref, the UML specification was
checked on the OMG page, and the InsightFace licence statement was read in the
repository's README. [1] and [2] are also [1] and [2] in Chapter 3.

**Paste this:**

```text
[1] J. Deng, J. Guo, E. Ververas, I. Kotsia, and S. Zafeiriou, "RetinaFace: Single-shot multi-level face localisation in the wild," in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2020, pp. 5202–5211, doi: 10.1109/CVPR42600.2020.00525.

[2] J. Deng, J. Guo, N. Xue, and S. Zafeiriou, "ArcFace: Additive angular margin loss for deep face recognition," in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2019, pp. 4685–4694, doi: 10.1109/CVPR.2019.00482.

[3] InsightFace, "InsightFace: 2D and 3D face analysis project," GitHub repository, README, section "License." [Online]. Available: https://github.com/deepinsight/insightface (accessed Sep. 27, 2026).

[4] Object Management Group, "OMG Unified Modeling Language (OMG UML), Version 2.5.1," OMG document formal/17-12-05, Dec. 2017. [Online]. Available: https://www.omg.org/spec/UML/2.5.1/ (accessed Sep. 27, 2026).

[5] P. P.-S. Chen, "The entity-relationship model: Toward a unified view of data," ACM Trans. Database Syst., vol. 1, no. 1, pp. 9–36, Mar. 1976, doi: 10.1145/320434.320440.

[6] E. F. Codd, "A relational model of data for large shared data banks," Commun. ACM, vol. 13, no. 6, pp. 377–387, Jun. 1970, doi: 10.1145/362384.362685.
```

---

## Notes for the authors (read before submitting)

1. **Screenshots (Section 4.3.2) must be taken by the team.** No screenshots
   exist in the repository. Take the 16 screens in TABLE 4.10 on the phone
   (Expo Go, Android) and in the browser, in the role and state listed, and
   save them as `docs/thesis/screens/<name>.png`. Use test accounts only; don't
   show a real person's face, NIC or email. For Fig. 4.31 you need a driver
   whose scan falls below 0.42 (a different person's face, or poor lighting,
   usually does this). If you take them differently (for example on iOS or in
   the Expo web preview), change the intro paragraph of 4.3.2 to match. If you
   leave some out, renumber Fig. 4.20–4.35 and TABLE 4.10.
2. **The approval flow is not one transaction across both stores.** The
   approval and the licence are committed together in PostgreSQL; the face
   template is written to SQLite/FAISS *after* that commit (Fig. 4.11). The
   chapter says so and calls it a known gap. Don't describe it as "enrolment
   and licence issuance in one transaction" anywhere else in the thesis.
3. **Administrators cannot view the uploaded photographs or documents.** The
   backend has no endpoint that serves uploaded files, and the dashboard shows
   only the applicant's email, NIC, time and the number of documents. UC-02
   (TABLE 4.4) describes what the administrator really sees. This is a real
   gap for FR-03 ("only verified applicants"); mention it in Chapter 7, or add
   a protected document-viewing endpoint before submission and then update
   TABLE 4.4.
4. **No driver name or date of birth is stored.** Officers identify drivers by
   email, NIC and licence number. If your paper or earlier chapters mention a
   Driver table or the driver's name on the officer screen, fix them.
5. **Consent before biometric enrolment is still missing** (NFR-P3). The
   chapter doesn't claim it. If you add a consent step, add it to UC-01 and
   Fig. 4.15.
6. **InsightFace licence.** The pretrained buffalo_l models are "for
   non-commercial research purposes only" [3]. The chapter states this in
   4.1.1. Chapter 5 should credit InsightFace, FAISS, FastAPI, Expo/React
   Native, Next.js, react-native-maps and OpenStreetMap as well. Keep the
   Esri credit in the Fig. 4.27 caption (the screenshot shows Esri tiles).
7. **"Unstable API" in TABLE 4.1** refers to `expo-router/unstable-native-tabs`,
   which the tab layout imports. That's accurate for Expo SDK 57; check it
   hasn't become stable if you upgrade.
8. **The comparison in 4.1.1 is qualitative.** No option other than the final
   one was built or benchmarked, so the chapter compares them on requirements
   and effort, not on measured performance. Don't add numbers to TABLE 4.1
   unless you measured them.
9. **Styles of the diagrams.** All diagrams are black and white PlantUML with
   the editable `.puml` next to each PNG. Figures 4.11–4.14 are tall; if Word
   shrinks them too much, give each its own page.
10. **Your own contribution and AI tools.** Parts of the implementation and of
   this documentation were produced with AI coding assistance. The chapter is
   written neutrally ("the implementation …"). State your own contribution and
   any AI-tool use in the way Horizon Campus requires.
11. **US spelling inside quotes is deliberate.** Messages quoted from the
   app and the API ("Apply for License", "This driver has no issued license")
   and code names (`License`, `license_service`) keep the spelling used in the
   code. Everything else uses British spelling (licence, enrolment).
12. **Chapter cross-references assumed:** Chapter 5 (development environment,
   deployment), Chapter 6 (testing and evaluation), Chapter 7 (conclusion).
   Change them if your numbering differs.

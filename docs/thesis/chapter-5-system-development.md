# Chapter 5 (System Development): copy-paste draft

Draft of thesis Chapter 5 for iPermit, written from the code in `backend/`,
`mobile/` and `admin-web/`, `docker-compose.yml`, the Dockerfile, the
requirements and lock files, and the project records (`docs/design.md`,
`docs/methodology.md`, `docs/setup.md`, `docs/tasks.md`). Where the docs and the
code disagreed, the code was followed; the disagreements are listed in the Notes
for the authors. Versions were read from `backend/requirements*.txt`, the
installed packages in the `ipermit-backend` image, and `package-lock.json` in
each JavaScript app on 2026-09-27. External sources were opened and checked on
the same day.

## How to use this file

- Text inside ` ```text ` blocks is ready to paste into Word. Each paragraph is
  on one line, so Word won't insert stray line breaks.
- Tables are `|`-separated. Paste, select, then **Insert → Table → Convert Text
  to Table**, choose **Other** and type `|`. The first line of each table block
  is its caption.
- Figures are PNGs in `docs/thesis/diagrams/` (prefix `ch5-`). The `.puml`
  files next to them are the editable PlantUML sources.
- Code segments are in ` ```python ` / ` ```tsx ` blocks. Paste each one as a
  code figure (for example a one-cell table or a text box in a monospaced font
  such as Consolas 9 pt), with its caption above it. Every excerpt is copied
  exactly from the repository; lines replaced by `# ...` or `// ...` were
  removed only to shorten the excerpt (mostly docstrings). The line numbers in
  each caption are the lines of the original file.
- Citations use IEEE numbering local to this chapter. Renumber them when you
  merge chapters (the full entries are at the end of this file).
- **Read "Notes for the authors" at the end before submitting.** Several items
  are placeholders that only your team can fill in (phone model, editor, your
  own contribution).

---

## Chapter introduction

**Paste this:**

```text
This chapter describes how the design in Chapter 4 was implemented. iPermit consists of three applications that share one backend: a mobile application for drivers and police officers, a web dashboard for licensing staff, and a REST API that holds all business rules, the face-recognition module and the data stores. Section 5.1 explains how each application is organised, from the screen navigation of the two client applications to the layers and modules of the backend, and shows how the modules interact at run time. Section 5.2 describes the hardware and software environment in which the system was built and tested, and the platforms on which each part does and does not run. Section 5.3 lists the tools and libraries used, with their versions, and acknowledges the third-party code and models that the system reuses. Section 5.4 presents the deployment architecture that was actually run during development, and Section 5.5 explains ten short code segments that implement the most important rules of the system.
```

---

## 5.1 Navigation/Module Structure

**Paste this — 5.1 introduction:**

```text
The three applications are kept in separate folders of one Git repository: mobile/ for the Expo and React Native application, admin-web/ for the Next.js dashboard, and backend/ for the FastAPI service. The two client applications contain no business rules of their own. They display data and collect input, and every decision, such as whether a face matches, how many points a violation costs or whether a licence is suspended, is taken by the backend. Neither client connects to a database directly; all data passes through the REST API.
```

**Paste this — 5.1.1 Mobile application navigation:**

```text
5.1.1 Mobile Application Navigation

The mobile application uses Expo Router, which derives the navigation structure from the files under mobile/src/app. A folder whose name is in brackets, such as (auth) or (app), is a route group: it groups screens and gives them a shared layout without adding a segment to the URL. Each group has a _layout.tsx file that decides how its screens are presented, as a stack of pushed screens or as tabs. Fig. 5.1 shows the top level of this tree. The root layout wraps every screen in the theme and in an authentication context (AuthProvider), which loads the stored JWT when the application starts. The (auth) group holds the login and driver registration screens and sends a user who is already signed in to the home tab. The (app) group holds everything that requires a signed-in user: it redirects to the login screen when there is no user, and it registers the device for push notifications once a user is signed in. Inside (app), two screens are pushed on top of the tabs rather than being tabs themselves: the licence application form (apply.tsx) and the Driver Details screen (police-driver.tsx), on which an officer sees a driver's record and records a violation.
```

**Insert Figure 5.1:** `docs/thesis/diagrams/ch5-mobile-routes.png`

```text
Fig. 5.1. Top-level route structure of the mobile application (mobile/src/app)
```

**Paste this — 5.1.1 continued (tabs by role):**

```text
The tab bar is implemented with NativeTabs from Expo Router, which renders the platform's own tab bar (a Material bottom navigation bar on Android) instead of a JavaScript imitation. Drivers and police officers use the same application, so the tab layout reads the signed-in user's role and hides the tabs that do not apply to it. Fig. 5.2 shows the result. Home, Incidents, Alerts and Profile are shown to every role. The Fines tab is shown only to drivers, and the Verify tab only to police officers, so a driver sees Home, Fines, Incidents, Alerts and Profile, while an officer sees Home, Verify, Incidents, Alerts and Profile. Each tab is its own route group with its own stack, so moving deeper inside one tab, for example from the fine list to a fine's detail screen, does not affect the others. Three kinds of secondary screen are used. The fine detail screen (fine/[id].tsx) is a dynamic route pushed onto the Fines stack, where the driver pays or appeals a fine. The Report screen is presented as a modal over the Incidents list and is used both to report an incident and to mark a danger zone. The Verify tab offers face scan, QR scan and NIC or licence-number lookup, and a successful lookup pushes the Driver Details screen shown in Fig. 5.1. The Home screen is shared but renders different content by role: drivers see their licence card, badge and application status, while officers see a hub of the three verification methods, each of which opens the Verify tab in that mode.
```

**Insert Figure 5.2:** `docs/thesis/diagrams/ch5-mobile-tabs.png`

```text
Fig. 5.2. Tab structure of the mobile application for drivers and police officers
```

**Paste this — 5.1.2 Admin web page structure:**

```text
5.1.2 Administrator Web Dashboard

The administrator dashboard uses the Next.js App Router, in which each page.tsx file under admin-web/src/app is one page and the folder path gives its URL. Fig. 5.3 shows the pages. The root page redirects to the applications page or to the login page, depending on whether an administrator is signed in. The login page accepts only ADMIN accounts: a valid police or driver login is refused by the dashboard, because police use the mobile application. The three working pages share the (dashboard) layout, which draws the header and navigation links, provides the log-out button, and returns the user to the login page when signed out. The Applications page lists licence applications and lets the administrator approve one or reject it with a reason; the Appeals page lets the administrator uphold or overturn a driver's appeal; and the Badges page shows how many drivers hold each badge tier and lists the at-risk and suspended drivers who need attention. Every page is a client component (marked 'use client'), so pages are rendered in the browser and fetch their data from the API after loading, rather than being rendered on the server.
```

**Insert Figure 5.3:** `docs/thesis/diagrams/ch5-admin-pages.png`

```text
Fig. 5.3. Page structure of the administrator web dashboard (admin-web/src/app)
```

**Paste this — 5.1.2 continued (client code organisation):**

```text
Both client applications follow the same internal organisation, summarised in TABLE 5.1. Screens and pages contain presentation logic only. Calls to the backend go through one small API client per application, and each backend resource (applications, fines, badges and so on) has its own module of typed functions, so a screen calls, for example, getMyFines() rather than building a URL itself. TypeScript interfaces in the types folders mirror the response models of the backend, which lets the TypeScript compiler detect a mismatch between a screen and the data it receives.
```

**Paste this — TABLE 5.1:**

```text
TABLE 5.1. Code Organisation of the Mobile Application and the Administrator Dashboard
Application|Folder|Responsibility
Mobile|src/app/|Expo Router routes and layouts (Fig. 5.1 and Fig. 5.2); one file per screen
Mobile|src/api/|client.ts wraps HTTP requests, attaches the JWT and converts API errors into readable messages; one module per backend resource (auth, applications, licenses, fines, appeals, badges, police, notifications, road-incidents, danger-zones)
Mobile|src/components/|Shared interface components, for example Button, Card, the licence card with its QR code, the incidents map (with a separate web variant) and the tab stack header
Mobile|src/context/|auth-context.tsx: the signed-in user, login, registration and logout, available to every screen
Mobile|src/hooks/|Reusable screen logic: current location with fallback, push-token registration, unread notification count, the driver's fines, theme
Mobile|src/lib/|Token storage (Expo SecureStore on a phone, localStorage in the web preview), conversion of picked photos and documents into upload parts, small formatting helpers
Mobile|src/types/, src/constants/|TypeScript types matching the API responses; design tokens and display labels for incident and violation types
Admin web|src/app/|Next.js App Router pages and layouts (Fig. 5.3)
Admin web|src/lib/|api-client.ts (fetch wrapper with the JWT), one module per resource (auth, applications, appeals, badges), token storage in localStorage
Admin web|src/context/, src/components/, src/types/|Authentication context that admits ADMIN accounts only; a shared status badge; TypeScript types matching the API responses
```

**Paste this — 5.1.3 Backend module structure:**

```text
5.1.3 Backend Module Structure

The backend follows a layered structure in which each layer has one responsibility and depends only on the layers below it (Fig. 5.4). Routers in app/api/routers handle HTTP only: they read the request, declare which roles may call the endpoint, pass the input to a service and translate the service's exceptions into HTTP status codes. They never query the database themselves. Services in app/services hold the business rules, such as the point schedule, the suspension threshold and the badge formula, and they decide where a database transaction begins and ends. Repositories in app/repositories contain the SQLAlchemy queries and no rules. Models in app/models define the ORM entities and their enumerations, and Pydantic schemas in app/schemas define the shape of every request and response, which FastAPI uses both to validate input and to generate the interactive API documentation. Cross-cutting and infrastructure code lives in app/core: configuration, the database session, password hashing and JWT handling, rate limiting, file storage, the Haversine distance function, the Expo push client and the face-recognition modules. TABLE 5.2 lists the folders and their responsibilities.
```

**Insert Figure 5.4:** `docs/thesis/diagrams/ch5-backend-layers.png`

```text
Fig. 5.4. Layered module structure of the backend (backend/app)
```

**Paste this — TABLE 5.2:**

```text
TABLE 5.2. Code Organisation of the Backend
Folder or file|Responsibility
app/main.py|Creates the FastAPI application, registers the 12 routers, CORS and the rate limiter, and exposes /health and /ready (the latter also checks the database connection)
app/api/routers/ (12 modules)|HTTP endpoints grouped by resource (TABLE 5.3)
app/api/deps.py|get_current_user (decodes the JWT and loads the user from the database) and require_role (Code Segment 5.1)
app/schemas/ (12 modules)|Pydantic request and response models
app/services/ (12 modules)|Business rules and transaction boundaries, one module per resource (for example violation_service, face_service, badge_service)
app/repositories/ (10 modules)|Database queries through SQLAlchemy; where several records must change together, the repository only adds objects to the session and the calling service commits
app/models/ (10 modules)|SQLAlchemy entities: users, applications and their documents, licences, violations, fines, appeals, badges, notifications, road incidents and danger zones
app/core/ (12 modules)|config (all thresholds as named settings), database, security (bcrypt and JWT), rate_limit (slowapi), file_storage (upload validation), geo (Haversine), push_service (Expo push), face_engine, face_preprocessing (CLAHE and photo-quality gate), face_index (FAISS), face_template_store (SQLite) and face_evaluation (FAR/FRR/EER functions)
app/scripts/create_admin.py|Command-line tool that creates POLICE and ADMIN accounts; these roles cannot be registered through the API
alembic/versions/ (8 migrations)|Versioned database schema changes, applied with alembic upgrade head
tests/ (18 test modules)|pytest unit and integration tests; the fixtures in conftest.py run the API against an in-memory SQLite database and a temporary face-template store
scripts/evaluate_face_threshold.py|Command-line tool that computes FAR and FRR over a folder of labelled photographs
Dockerfile, requirements.txt, requirements-dev.txt, pyproject.toml|Container image, pinned dependencies, and ruff, black and pytest settings
```

**Paste this — 5.1.3 continued (API routers):**

```text
The API is divided into twelve routers, one per resource, listed in TABLE 5.3 with the roles allowed to call them. Access control is declared on each endpoint through the require_role dependency (Code Segment 5.1), so the rule for an endpoint is visible where the endpoint is defined. Three endpoints are public: registration, login and the face-recognition status endpoint, which reports that liveness detection is not implemented. Registration always creates a DRIVER account. Police and administrator accounts are created only with the create_admin command-line script, so a privileged account can never be created over HTTP. Two endpoints that are expensive or open to abuse are rate-limited per client IP address: licence application submission (10 per hour) and roadside face verification (30 per minute).
```

**Paste this — TABLE 5.3:**

```text
TABLE 5.3. Backend API Routers, Main Endpoints and Permitted Roles
Router (prefix)|Main endpoints|Permitted roles
auth (/auth)|POST /register, POST /login, GET /me|Public for register and login; any signed-in user for /me
applications (/applications)|POST (rate-limited to 10 per hour), GET, GET /{id}|DRIVER
admin (/admin)|GET /applications, POST /applications/{id}/approve, POST /applications/{id}/reject, GET /appeals, POST /appeals/{id}/resolve, GET /badges|ADMIN
licenses (/licenses)|GET /me|DRIVER
face (/face)|GET /status|Public
police (/police)|POST /verify-face (rate-limited to 30 per minute), GET /verify-qr/{qr_token}, GET /lookup, POST /violations|POLICE
fines (/fines)|GET /me, POST /{id}/pay|DRIVER
appeals (/appeals)|POST, GET /me|DRIVER
badges (/badges)|GET /me|DRIVER
notifications (/notifications)|GET /me, POST /{id}/read, POST /register-push-token|Any signed-in user
road_incidents (/road-incidents)|POST, GET (lat, lng, radius_km), POST /{id}/confirm, POST /{id}/clear|Any signed-in user
danger_zones (/danger-zones)|POST, GET (lat, lng, radius_km), POST /{id}/confirm, POST /{id}/clear|Any signed-in user
```

**Paste this — 5.1.4 Module interaction:**

```text
5.1.4 Interaction Between Modules

Fig. 5.5 shows how the modules interact at run time. Both clients send HTTP requests with a JWT bearer token to the API routers; the mobile application also sends multipart requests, which carry the application photos and the officer's roadside photo. The routers pass each request to a service. For most operations the service works through the repositories on PostgreSQL, which stores users, applications, licences, violations, fines, appeals, badges, notifications, road incidents and danger zones. Uploaded application photos and documents are validated by file_storage and written to an uploads folder on disk, and only their relative paths are stored in PostgreSQL.

The face-recognition module runs inside the backend process; it is not a separate service. When an administrator approves an application, the application service asks the face module to build a template from the four enrolment photographs, which are read from the uploads folder. The template is written to a separate SQLite database (face_templates.db) and added to an in-memory FAISS index. When an officer scans a face, the police service asks the face module for the closest templates and then loads the matching drivers' records from PostgreSQL. The biometric templates are therefore never stored in PostgreSQL, which keeps them apart from the other personal data (NFR-P1). SQLite is the source of truth for templates, and the FAISS index is rebuilt from it when the process starts using it or if it is lost (NFR-R3).

Notifications follow the main operation rather than being part of it. After a service has committed its main transaction, it creates an in-app notification and, if the user has registered a device, push_service sends a message to Expo's push API, which delivers it to the phone. A failure at this stage is logged and does not undo the main operation (NFR-R2). Delivery of a push message to a phone has not been confirmed (Section 5.2.4).
```

**Insert Figure 5.5:** `docs/thesis/diagrams/ch5-module-interaction.png`

```text
Fig. 5.5. Interaction between the modules of iPermit at run time
```

---

## 5.2 Development Environment

**Paste this — 5.2.1 Hardware:**

```text
5.2.1 Hardware

TABLE 5.4 lists the hardware used. All development and all testing of the backend and the administrator dashboard took place on one laptop, which ran the database, the backend container and both development servers at the same time. The laptop has no dedicated graphics card, which is one of the reasons automated violation detection, which needs GPU training time, was deferred (FR-07). The mobile application was tested on a physical Android phone connected to the same Wi-Fi network as the laptop, and the face-recognition evaluation was run on a Google Colab virtual machine.
```

**Paste this — TABLE 5.4:**

```text
TABLE 5.4. Hardware Used for Development, Testing and Evaluation
Device|Specification|Use
Development laptop|Dell Latitude 5520; Intel Core i5-1145G7 (4 cores, 8 threads, 2.60 GHz base); 14 GiB RAM reported by the operating system; integrated Intel Iris Xe graphics, no dedicated GPU|Development, running the Docker containers, the Next.js and Expo development servers, and backend tests
Android phone|[PHONE MODEL AND ANDROID VERSION: fill in]|Running the mobile application in Expo Go; testing face capture, QR scanning, location, the incidents map and file uploads on a real device
Google Colab virtual machine|Hosted runtime with an NVIDIA Tesla T4 GPU attached; the evaluation recorded the CPU execution provider of ONNX Runtime, so inference ran on the CPU|Face-verification evaluation on the LFW and South Asian celebrity datasets
```

**Paste this — 5.2.2 Software:**

```text
5.2.2 Software

TABLE 5.5 lists the software environment. The backend does not run directly on the host. It runs in a Docker container built from the official python:3.11-slim image, which fixes the Python version (the image built for this project contains Python 3.11.16) and the system libraries regardless of the host operating system, and PostgreSQL 16 runs in a second container. The two JavaScript applications run on the host with Node.js. Configuration that differs between machines, such as the database address, the JWT signing key and the API address used by each client, is supplied through environment files (.env) that are excluded from Git; the repository contains only .env.example templates.
```

**Paste this — TABLE 5.5:**

```text
TABLE 5.5. Software Environment
Software|Version|Role
Ubuntu (host operating system)|26.04 LTS|Operating system of the development laptop
Docker Engine and Docker Compose|29.5.3 and 5.1.4|Run the db and backend containers
Python (in the backend container)|3.11.16|Backend runtime
PostgreSQL (postgres:16-alpine image)|16.15|Main database
SQLite (Python standard library)|3.46.1|Face template store
Node.js and npm|24.16.0 and 11.13.0|Run the Expo and Next.js development servers and tools
Expo Go (on the Android phone)|[VERSION: fill in; must support Expo SDK 57]|Runs the mobile application during development without a native build
Git|2.53.0|Version control; the repository is hosted on GitHub
Code editor|[EDITOR AND VERSION: fill in, for example Visual Studio Code]|Writing and debugging code
Web browser|[BROWSER AND VERSION: fill in]|Using the administrator dashboard and the Expo web preview
Google Colab runtime|Python 3.13.15, InsightFace 2.0, ONNX Runtime 1.30.0, OpenCV 5.0.0, NumPy 2.1.3|Face-verification evaluation notebook
PlantUML|1.2025.4|Drawing the diagrams in this thesis
```

**Paste this — 5.2.3 Evaluation environment:**

```text
5.2.3 Evaluation Environment

The face-verification evaluation reported in Chapter 6 was run in a Jupyter notebook on Google Colab (docs/evaluation/face_evaluation.ipynb), because the public datasets are large and the notebook environment can download them directly. The notebook reproduces the backend's pipeline step by step: it applies the same CLAHE function, loads the same InsightFace buffalo_l models with the same 640 × 640 detection size, and applies the same 0.42 threshold. The library versions on Colab were newer than those pinned in the backend container (TABLE 5.5), so the embeddings were also recomputed inside the backend container as a check, and they reproduced the Colab results. No GPU acceleration was used, since the run recorded the CPU execution provider.
```

**Paste this — 5.2.4 Platform dependence:**

```text
5.2.4 Platform Dependence

TABLE 5.6 summarises where each part of the system runs and how far that has been tested. The backend depends only on Docker, so in principle it runs on any operating system that runs Linux containers; it was built and run only on the Ubuntu laptop. The local package cache used to build the image (backend-wheels/) holds wheels for 64-bit x86 Linux, so on another processor architecture the build would download its packages instead.

The mobile application is written once for Android, iOS and the web, but it was tested only on Android, in Expo Go on a physical phone and in the Expo web preview in a browser. No iOS device or simulator was available, so the iOS build is untested, including its map, which uses Apple Maps instead of OpenStreetMap. Several parts of the application behave differently by platform. On Android the incidents map uses OpenStreetMap tiles, because the default Google map tiles need an API key and a custom build and rendered blank grey in Expo Go. In the web preview there is no map at all: the web variant of the map component (incidents-map.web.tsx) deliberately renders nothing, because react-native-maps has no web renderer, and the screen shows the incidents as a list only. The web preview also stores the JWT in the browser's localStorage, because Expo SecureStore is available only on a phone. Finally, Expo Go does not include push-notification support; a development build is needed [1]. The application therefore skips push registration when it runs in Expo Go on Android, and push delivery to a device has not been tested.

The administrator dashboard is a standard web application and runs in any current browser. It was run only with the Next.js development server (next dev) on the laptop.
```

**Paste this — TABLE 5.6:**

```text
TABLE 5.6. Platform Dependence and Test Status
Component|Runs on|Tested on|Platform-specific behaviour or limitation
Backend API and face module|Any host that runs Linux containers (Docker)|Ubuntu 26.04 LTS, x86-64|Face inference runs on the CPU (ONNX Runtime CPU execution provider); local wheel cache is x86-64 only
PostgreSQL|Docker container|Ubuntu 26.04 LTS|Data kept in a bind-mounted folder (.data/pgdata)
Mobile application on Android|Expo Go or a native build|Physical Android phone in Expo Go|CARTO basemap tiles; remote push not available in Expo Go, so registration is skipped
Mobile application on iOS|Expo Go or a native build|Not tested|Apple Maps would be used; untested
Mobile application in a web browser|Expo web preview|Browser on the laptop, during development|Map not shown (no-op web component); token in localStorage; no push; used for development only
Administrator dashboard|Any current web browser|Browser on the laptop, with next dev|Not built or deployed for production
```

---

## 5.3 Tools and Technologies

**Paste this — 5.3 introduction:**

```text
TABLE 5.7 lists the tools and main libraries used in each part of the system, with the versions pinned in the project's requirements and lock files, and the purpose of each. The face-recognition module uses the RetinaFace detector [2] and the ArcFace recognition model [3] from the InsightFace model pack buffalo_l, run with ONNX Runtime on the CPU, so no face model was trained in this project. YOLOv8 and Ultralytics, which were selected in the design for automated violation detection, are not in the table because they were never installed: that feature was deferred (FR-07).
```

**Paste this — TABLE 5.7:**

```text
TABLE 5.7. Tools and Technologies Used
Category|Tool or library|Version|Purpose
Backend|FastAPI|0.115.6|REST API framework, request validation and interactive API documentation
Backend|Uvicorn|0.34.0|ASGI server that runs the FastAPI application
Backend|Pydantic and pydantic-settings|2.10.4 and 2.7.1|Request and response schemas; settings loaded from environment variables
Backend|SQLAlchemy|2.0.36|ORM and query layer
Backend|psycopg2-binary|2.9.10|PostgreSQL driver
Backend|PostgreSQL|16.15|Main relational database
Backend|python-jose|3.3.0|Signing and verifying JWT access tokens (HS256, 30-minute expiry)
Backend|passlib with bcrypt|1.7.4 with 4.0.1|Password hashing
Backend|slowapi|0.1.9|Per-IP rate limiting
Backend|python-multipart and Pillow|0.0.20 and 11.1.0|Multipart uploads; checking that an upload is a real image of acceptable size
Backend|requests|2.34.2|Calls to the Expo push API and download of the face models
Face recognition|InsightFace (buffalo_l model pack)|1.0.1|RetinaFace detection and ArcFace 512-dimensional embeddings
Face recognition|ONNX Runtime|1.29.0|Runs the InsightFace ONNX models on the CPU
Face recognition|OpenCV (headless)|5.0.0.93|Image decoding, CLAHE contrast enhancement, sharpness and brightness measures
Face recognition|NumPy|2.4.6|Embedding arithmetic (averaging, normalisation, cosine similarity)
Face recognition|FAISS (faiss-cpu)|1.15.0|Exact inner-product search over face templates (IndexFlatIP)
Face recognition|SQLite|3.46.1|Separate store for face templates
Mobile|Expo SDK (expo)|57.0.19|Managed React Native toolchain and native modules
Mobile|React Native and React|0.86.3 and 19.2.3|Cross-platform user interface
Mobile|Expo Router|57.0.18|File-based navigation, stacks, modals and NativeTabs
Mobile|@expo/ui|57.0.15|Native interface components used on the Profile screen
Mobile|expo-camera|57.0.4|Officer face capture and licence QR scanning
Mobile|expo-image-picker and expo-document-picker|57.0.15 and 57.0.1|Selecting application photos and documents
Mobile|expo-location|57.0.16|Point-in-time location for incident and danger-zone reports
Mobile|expo-notifications|57.0.17|Push-token registration
Mobile|expo-secure-store|57.0.3|Encrypted storage of the JWT on the phone
Mobile|react-native-maps|1.27.2|Incidents map, markers and danger-zone circles
Mobile|react-native-qrcode-svg|6.3.21|QR code on the digital licence card
Mobile|TypeScript|6.0.3|Static typing
Admin web|Next.js and React|16.3.4 and 19.2.8|Administrator dashboard (App Router, client components)
Admin web|Tailwind CSS|4.3.3|Styling
Admin web|TypeScript|5.9.3|Static typing
Testing and quality|pytest (with httpx and pytest-asyncio)|8.3.4 (0.28.1, 0.25.0)|Backend unit and integration tests through FastAPI's test client
Testing and quality|ruff and black|0.8.4 and 24.10.0|Python linting and formatting
Testing and quality|ESLint (eslint-config-expo, eslint-config-next)|9.39.5 (57.0.2, 16.3.4)|JavaScript and TypeScript linting
Testing and quality|TypeScript compiler (tsc --noEmit)|6.0.3 (mobile), 5.9.3 (admin web)|Type checking without producing output
DevOps|Docker Engine and Docker Compose|29.5.3 and 5.1.4|Reproducible backend and database environment
DevOps|Alembic|1.14.0|Versioned database migrations
DevOps|Git and GitHub|2.53.0|Version control; work on a dev branch, merged into main through pull requests
Evaluation|Google Colab, Jupyter|Hosted|Running the face-verification evaluation notebook
```

**Paste this — 5.3.1 Reused code and third-party components:**

```text
5.3.1 Reused Code and Third-Party Components

The implementation builds on open-source frameworks and on pretrained models, which are acknowledged here. The frameworks in TABLE 5.7 are used as libraries through their public interfaces, and their code is not copied into the project. TABLE 5.8 lists the components that the system depends on most directly, with their origin and licence terms.

The most important reused component is the InsightFace buffalo_l model pack, which provides the RetinaFace detector and the ArcFace recognition model. The system downloads it from the InsightFace GitHub releases the first time a face is processed. The InsightFace code is released under the MIT licence, but the project states that its pretrained models are available for non-commercial research purposes only, whether downloaded manually or automatically, and that licensing of the buffalo_l recognition models must be arranged with the InsightFace team [4]. Their use in this academic prototype is within those terms. A real deployment by a government agency would not be, and would need either a commercial licence or recognition models trained on data that the operator is licensed to use. FAISS, developed at Meta, is released under the MIT licence [5].

The Android map displays tiles from CARTO's Voyager basemap, which is drawn from OpenStreetMap data. The OpenStreetMap Foundation's own tile servers were used at first, but they refuse applications that do not identify themselves as the policy requires, and on the phone they returned a warning image instead of the map [7]. CARTO's basemaps need no key for light use, and both the data and the basemap must be credited [6], [8], so the map shows the notice "© OpenStreetMap contributors © CARTO" in its corner. This suits a prototype; a production deployment would need a tile service contract that permits production traffic (Section 5.4).

Some project code was adapted rather than written from scratch. The mobile application was started from the official create-expo-app template, and a few template files remain, such as the themed text and view components, the colour-scheme hooks and the reset-project script. The configuration files of the administrator dashboard (ESLint, PostCSS, TypeScript and Next.js configuration, and the favicon) are those generated by the create-next-app tool. The CLAHE contrast step and the photo-quality gate in backend/app/core/face_preprocessing.py were ported and adapted from an earlier face-recognition prototype by the project team, as the module's own header comment records, and the file-naming convention used by the evaluation script (for example gihan_1.jpg for the first photo of the person gihan) was taken from the same prototype. No other code from external sources was found in the repository.
```

**Paste this — TABLE 5.8:**

```text
TABLE 5.8. Reused Third-Party Components and Their Licences
Component|Origin|Licence or terms|How it is used in iPermit
InsightFace buffalo_l models (RetinaFace det_10g, ArcFace w600k_r50)|InsightFace project (deepinsight/insightface)|Pretrained models: non-commercial research purposes only; commercial licensing by arrangement [4]|Face detection and embedding, downloaded on first use
InsightFace Python library|InsightFace project|MIT [4]|Loads and runs the models (FaceAnalysis), including face alignment
FAISS|Meta (facebookresearch/faiss)|MIT [5]|Exact inner-product index over face templates
CARTO Voyager basemap tiles|OpenStreetMap contributors (data) and CARTO (basemap and tile servers)|Data under the Open Database License; attribution to both required; free for light use [6], [8]|Base map on Android
FastAPI, SQLAlchemy, Alembic, Expo, React Native, Next.js, react-native-maps and the other libraries in TABLE 5.7|Their respective open-source projects|Open-source licences of each project|Used as libraries, not modified
create-expo-app template and create-next-app configuration|Expo and Vercel|Template code of each project|Starting point of the mobile application; configuration files of the dashboard
CLAHE and photo-quality code|Earlier face-recognition prototype by the project team|Team's own work|Ported and adapted into face_preprocessing.py
```

---

## 5.4 Deployment Architecture

**Paste this:**

```text
Fig. 5.6 shows the deployment that was actually run during development and testing. Everything except the phone and three internet services runs on the development laptop. Docker Compose starts two containers and no others. The db container runs PostgreSQL 16 from the postgres:16-alpine image and publishes port 5432; its data directory is a bind-mounted folder in the repository (.data/pgdata), which is kept out of Git and survives the removal of containers and images. The backend container is built from a Dockerfile based on python:3.11-slim and runs Uvicorn on port 8000 with automatic reload. Compose starts it only when the database reports healthy. Two folders are bind-mounted into it: the backend source folder, mounted as /app so that code changes take effect without rebuilding the image, which also holds the uploads folder and the SQLite face-template file; and .data/insightface, which holds the face models. On first use the backend downloads the buffalo_l archive (about 275 MB) from the InsightFace GitHub releases into this folder, so it is downloaded only once.

The two client applications run outside Docker, on Node.js. The administrator dashboard runs with the Next.js development server on port 3000 and is used in a browser on the same laptop, which calls the API at localhost:8000. The mobile application is served by the Expo development server (Metro). The Android phone runs Expo Go, which loads the application's JavaScript bundle from Metro over the local Wi-Fi network and calls the API at the laptop's LAN address, configured through EXPO_PUBLIC_API_URL. Three internet services are involved: the phone loads CARTO basemap tiles for the incidents map, the backend sends push requests to Expo's push API, and the backend downloads the face models from GitHub once. No part of the system was deployed to a server or a cloud platform.
```

**Insert Figure 5.6:** `docs/thesis/diagrams/ch5-deployment.png`

```text
Fig. 5.6. Deployment architecture used during development and testing
```

**Paste this — production deployment (not built):**

```text
A production deployment was not built or tested in this project, and would differ from Fig. 5.6 in several ways. The backend would run without automatic reload, with several worker processes behind an HTTPS reverse proxy, and PostgreSQL would be a managed or replicated database with backups. Two in-process components would need to change before the backend could run as more than one process. The FAISS index is held in the memory of each process, so a template enrolled by one worker would not be visible to another until it rebuilt its index; the face module would have to become a shared service, or the index would need to be synchronised. The rate limiter also counts requests in process memory and would need a shared store. Uploaded documents and the face-template database would move to encrypted, access-controlled storage, the signing key would come from a secrets manager, and CORS would be limited to the real dashboard address. The mobile application would be distributed as a native build rather than through Expo Go, which would also make push notifications available, and the dashboard would be built with next build. The free CARTO basemap would be replaced by a tile service contracted for production traffic, and the InsightFace models would require a commercial licence or replacement (Section 5.3.1).
```

---

## 5.5 Major Code Segments

**Paste this — 5.5 introduction:**

```text
This section explains ten short code segments that implement the most important rules of the system. Each segment is copied from the repository; where lines were removed to shorten it, mostly documentation comments, the omission is marked with "# ..." or "// ...", and the caption gives the file and the original line numbers. The complete source code is included in the appendix.
```

### Code Segment 5.1: role-based access

**Paste this — explanation:**

```text
Code Segment 5.1 shows how access control is enforced. require_role is a dependency factory: it takes the roles that may call an endpoint and returns a function that FastAPI runs before the endpoint itself. That function depends in turn on get_current_user, defined in the same file, which decodes the JWT, rejects an invalid or expired token with HTTP 401, and loads the user from the database by the identifier in the token. The role that is checked is therefore the role stored in the database, not a value supplied by the client, so a user cannot raise their own privileges by altering a request. A user whose role is not in the allowed list receives HTTP 403. An endpoint declares its rule with a single parameter; the police router, for example, requires Depends(require_role(UserRole.POLICE)) on every officer endpoint. This implements NFR-S1.
```

**Insert Code Segment 5.1** (caption above the code):

```text
Code Segment 5.1. Role-based access dependency (backend/app/api/deps.py, lines 33–45)
```

```python
def require_role(*allowed_roles: UserRole):
    """Dependency factory — e.g. Depends(require_role(UserRole.ADMIN)).
    Role comes from the verified JWT via get_current_user, never from client input."""

    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return _check
```

### Code Segment 5.2: four-photo enrolment

**Paste this — explanation:**

```text
Code Segment 5.2 builds a driver's face template when an administrator approves an application (FR-05). build_enrollment_embedding reads the application's four face photographs and extracts one 512-dimensional ArcFace embedding from each; a photograph with no face, or with more than one, raises FaceEnrollmentError. Before the embeddings are combined, check_pairwise_consistency compares every pair of photographs (six pairs for four photographs) and rejects the whole set if any pair falls below the match threshold of 0.42, so an application containing photographs of two different people cannot produce a template. The four embeddings are then averaged and the average is divided by its length. Because every stored template has unit length, the inner product computed later by FAISS is equal to the cosine similarity. check_pairwise_consistency has no input or output of its own, which is why it can be tested with synthetic vectors, without loading the face model. The approval service calls this function before writing anything to PostgreSQL, so a rejected photo set leaves the application pending and nothing half-written.
```

**Insert Code Segment 5.2** (caption above the code):

```text
Code Segment 5.2. Pairwise consistency check and template averaging at enrolment (backend/app/services/face_service.py, lines 85–116, docstrings omitted)
```

```python
def check_pairwise_consistency(embeddings: list[np.ndarray], threshold: float) -> None:
    # ...
    for a, b in combinations(embeddings, 2):
        similarity = cosine_similarity(a, b)
        if similarity < threshold:
            raise FaceEnrollmentError(
                "Enrollment photos do not consistently show the same face "
                f"(similarity {similarity:.2f} below threshold {threshold:.2f}) -- "
                "ask the driver to resubmit with clearer, consistent photos"
            )


def build_enrollment_embedding(application: Application) -> np.ndarray:
    # ...
    paths = _read_face_photo_paths(application)
    embeddings = [
        _extract_single_embedding(path, index + 1) for index, path in enumerate(paths)
    ]

    check_pairwise_consistency(embeddings, settings.face_match_threshold)

    averaged = np.mean(embeddings, axis=0)
    norm = np.linalg.norm(averaged)
    if norm > 0:
        averaged = averaged / norm
    return averaged.astype(np.float32)
```

### Code Segment 5.3: roadside face verification

**Paste this — explanation:**

```text
Code Segment 5.3 is the core of roadside face verification (FR-06). The embedding of the face in the officer's photograph is searched in the FAISS index for the three closest templates (_CANDIDATE_COUNT is 3). FAISS returns only integer row identifiers, so each one is mapped back to a driver through the SQLite template store, and the driver's licence status, points and violation history are loaded from PostgreSQL. An uncertain result is never accepted automatically. requires_manual_confirmation is set whenever no enrolled face was found or the best similarity is below the configured threshold, and the ranked candidates are always returned. When the flag is not set, the mobile Verify screen opens the best match's Driver Details directly; when it is set, the screen lists the candidates with a warning that the officer must confirm the driver's identity or use QR or NIC lookup instead. This is how NFR-R4 is met: an uncertain AI result informs the officer's decision but does not replace it.
```

**Insert Code Segment 5.3** (caption above the code):

```text
Code Segment 5.3. One-to-many face search with the manual-confirmation flag (backend/app/services/police_service.py, lines 72–95)
```

```python
    matches = face_index.search(detections[0].embedding, k=_CANDIDATE_COUNT)
    candidates: list[FaceMatchCandidate] = []
    for similarity, rowid in matches:
        driver_id = face_template_store.get_driver_id_by_rowid(rowid)
        if driver_id is None:
            continue
        driver = user_repository.get_by_id(db, uuid.UUID(driver_id))
        if driver is None:
            continue
        candidates.append(
            FaceMatchCandidate(
                driver=_driver_summary(db, driver), similarity=similarity
            )
        )

    best_match = candidates[0] if candidates else None
    requires_manual_confirmation = (
        best_match is None or best_match.similarity < settings.face_match_threshold
    )
    return VerifyFaceResponse(
        requires_manual_confirmation=requires_manual_confirmation,
        best_match=best_match,
        candidates=candidates,
    )
```

### Code Segment 5.4: recording a violation

**Paste this — explanation:**

```text
Code Segment 5.4 records a violation reported by an officer (FR-08). The number of points comes from the VIOLATION_POINTS table (white line 3, speeding 4, red light 6, drunk driving 10) and the fine from VIOLATION_FINE_AMOUNT (LKR 2,000, 5,000, 10,000 and 25,000); both tables are marked in the code as placeholders, not an official schedule. The violation is added to the session and flushed so that the database assigns its identifier, which the fine needs as its foreign key. The fine is then created, the points are added to the licence, and the licence is suspended if the balance reaches SUSPENSION_POINTS_THRESHOLD, which is 10. All of these changes are committed by the single db.commit() call, so either all of them are saved or, if any step fails, none are (NFR-R1). The badge recomputation and the notifications that follow run only after this commit (lines 85–100 of the file), so a failure in those steps cannot undo the violation (NFR-R2). The evidence_ref argument is optional and is kept for a future automated detector (FR-07).
```

**Insert Code Segment 5.4** (caption above the code):

```text
Code Segment 5.4. Recording a violation, fine and suspension in one transaction (backend/app/services/violation_service.py, lines 12–13 and 57–80)
```

```python
# REQ-8 AC2: license suspends once cumulative points reach this threshold.
SUSPENSION_POINTS_THRESHOLD = 10
# ...
    license_ = license_repository.get_latest_for_driver(db, driver_id)
    if license_ is None:
        raise NotFoundError("This driver has no issued license")

    points = VIOLATION_POINTS[violation_type]
    violation = violation_repository.add(
        db,
        driver_id=driver_id,
        officer_id=officer_id,
        violation_type=violation_type,
        points_deducted=points,
        evidence_ref=evidence_ref,
    )
    db.flush()  # assigns violation.id, needed for the fine's FK

    fine = fine_repository.add(
        db, violation_id=violation.id, amount=VIOLATION_FINE_AMOUNT[violation_type]
    )

    license_.points += points
    if license_.points >= SUSPENSION_POINTS_THRESHOLD:
        license_.status = LicenseStatus.SUSPENDED

    db.commit()
```

### Code Segment 5.5: shared point restoration

**Paste this — explanation:**

```text
Code Segment 5.5 shows how points are given back when a fine is resolved in the driver's favour (FR-09, FR-10). There are exactly two ways for a fine to leave the UNPAID state and restore the driver's points: the driver pays it, or an administrator overturns the appeal against it. Both paths call the same function, restore_points_for_violation, instead of each implementing the rule, so the two cannot drift apart. The function subtracts the points that the violation added, never going below zero, and reactivates a suspended licence once the balance is below the threshold again. It does not commit: the caller commits the fine's new status and the licence change together. Part (b) shows the call in resolve_appeal, where an overturned appeal also marks the fine REVERSED; pay_fine in fine_service.py (line 54) makes the same call after marking the fine PAID. Because PAID and REVERSED are final states, and a fine with a pending appeal cannot be paid, the points of one violation can be restored only once.
```

**Insert Code Segment 5.5** (caption above the code):

```text
Code Segment 5.5. Shared point restoration: (a) backend/app/services/violation_service.py, lines 20–39, docstring omitted; (b) its use in backend/app/services/appeal_service.py, lines 78–83
```

(a)

```python
def restore_points_for_violation(db: Session, violation: Violation) -> License:
    # ...
    license_ = license_repository.get_latest_for_driver(db, violation.driver_id)
    if license_ is None:
        raise NotFoundError("This driver has no issued license")

    license_.points = max(0, license_.points - violation.points_deducted)
    if (
        license_.status == LicenseStatus.SUSPENDED
        and license_.points < SUSPENSION_POINTS_THRESHOLD
    ):
        license_.status = LicenseStatus.ACTIVE
    return license_
```

(b)

```python
    if resolution == AppealResolution.OVERTURNED:
        fine = appeal.fine
        fine.status = FineStatus.REVERSED
        restore_points_for_violation(db, fine.violation)

    db.commit()
```

### Code Segment 5.6: badge score and tier

**Paste this — explanation:**

```text
Code Segment 5.6 contains the rule that turns a driver's safety score into a badge (FR-11). The score itself is computed by compute_safety_score in the same file (lines 51–72), which starts from 100 and subtracts 5 for each point currently on the licence, 0.5 for each point ever deducted, and 5 for each unpaid fine, then adds 1 for each full quarter of a year the licence has been held, up to 10; the result is limited to the range 0 to 100. Paying a fine removes its current points but not its lifetime points, so a driver's standing recovers mostly, but not completely, after an offence. tier_for_score, shown in the segment, converts the score to a tier by checking the thresholds from the highest down: Platinum at 90 or more, Gold at 75, Silver at 60, Bronze at 40 and At-Risk below 40. The licence status is checked first, so a suspended licence always gives the Suspended tier, whatever the score. Both functions are pure, with no database access, so the formula can be explained to a driver and is tested at each boundary in test_badge_formula.py. The weights and thresholds are design choices for the prototype and have not been validated against real driver data.
```

**Insert Code Segment 5.6** (caption above the code):

```text
Code Segment 5.6. Badge tier thresholds and the tier function (backend/app/services/badge_service.py, lines 39–44 and 75–83, docstring omitted)
```

```python
_TIER_THRESHOLDS: list[tuple[int, BadgeTier]] = [
    (90, BadgeTier.PLATINUM),
    (75, BadgeTier.GOLD),
    (60, BadgeTier.SILVER),
    (40, BadgeTier.BRONZE),
]
# ...
def tier_for_score(score: int, license_status: LicenseStatus) -> BadgeTier:
    # ...
    if license_status == LicenseStatus.SUSPENDED:
        return BadgeTier.SUSPENDED
    for threshold, tier in _TIER_THRESHOLDS:
        if score >= threshold:
            return tier
    return BadgeTier.AT_RISK
```

### Code Segment 5.7: nearby search with the Haversine formula

**Paste this — explanation:**

```text
Code Segment 5.7 finds the road incidents near a user (FR-13). Part (a) is the Haversine formula, which gives the great-circle distance between two points from their latitudes and longitudes on a sphere with the Earth's mean radius of 6,371 km. Part (b) uses it: the service loads the active incidents, marks as EXPIRED any whose four-hour lifetime has passed (the expiry is applied lazily, when incidents are read, because the system has no background scheduler), computes each remaining incident's distance from the user, keeps those within the radius (5 km by default) and returns them nearest first. The danger-zone service uses the same function. The calculation is done in Python and examines every active incident on each request. This is adequate for the number of incidents in a prototype; a national deployment would use a spatial index in the database, for example the PostGIS extension, instead. The user's position is sent only with this request and is not stored, in line with NFR-P2.
```

**Insert Code Segment 5.7** (caption above the code):

```text
Code Segment 5.7. (a) Haversine distance (backend/app/core/geo.py, lines 6–16, docstring omitted); (b) nearby incident search (backend/app/services/road_incident_service.py, lines 69–81)
```

(a)

```python
def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    # ...
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(a))
```

(b)

```python
    candidates = [
        _expire_if_stale(db, incident)
        for incident in road_incident_repository.list_active(db)
    ]

    within_radius = [
        (incident, haversine_km(lat, lng, incident.lat, incident.lng))
        for incident in candidates
        if incident.status == RoadIncidentStatus.ACTIVE
    ]
    within_radius = [pair for pair in within_radius if pair[1] <= radius_km]
    within_radius.sort(key=lambda pair: pair[1])
    return [incident for incident, _distance in within_radius]
```

### Code Segment 5.8: ON DELETE RESTRICT in a migration

**Paste this — explanation:**

```text
Code Segment 5.8 is taken from the Alembic migration that created the violations and fines tables. Each fine refers to its violation through a foreign key declared with ON DELETE RESTRICT, so PostgreSQL refuses to delete a violation that still has a fine, and a unique constraint allows at most one fine per violation. The same rule is applied to every foreign key that records enforcement or financial history: violations to their driver and officer (lines 43–44 of the same migration), appeals to their fine, and licences to their driver and application. Enforcement records therefore cannot be orphaned by deleting a user or a violation. The only cascading delete in the schema is from an application to its uploaded document records. Every change to the schema is made through a migration of this kind, applied with alembic upgrade head, which keeps each database in step with the code (NFR-M1).
```

**Insert Code Segment 5.8** (caption above the code):

```text
Code Segment 5.8. Fines table with ON DELETE RESTRICT (backend/alembic/versions/727c78b70629_add_violations_fines_and_license_points.py, lines 50–67)
```

```python
    op.create_table(
        "fines",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("violation_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("UNPAID", "PAID", "REVERSED", name="finestatus"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["violation_id"], ["violations.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("violation_id"),
    )
```

### Code Segment 5.9: location fallback in the mobile app

**Paste this — explanation:**

```text
Code Segment 5.9 comes from the mobile application. Part (a) is the useCurrentLocation hook, which asks once for permission to use the device's location. If permission is refused, or the position cannot be determined, it returns a fixed location in Colombo with isFallback set to true and a note explaining why, so the Incidents screen can still show a map and a list instead of failing. A fallback position is acceptable for browsing but not for recording where something happened. Part (b), from the Report screen, therefore disables submission whenever the location is a fallback, and the handler checks the flag again before sending, so an incident or danger zone can never be reported at an invented position. The location is requested only when these screens are opened, and no background tracking exists (NFR-P2).
```

**Insert Code Segment 5.9** (caption above the code):

```text
Code Segment 5.9. (a) Location hook with a fallback (mobile/src/hooks/use-current-location.ts, lines 6–30); (b) reporting blocked at the fallback location (mobile/src/app/(app)/(tabs)/(incidents)/report.tsx, lines 46–50)
```

(a)

```tsx
// Colombo, Sri Lanka -- fallback only, used when location permission is
// denied or unavailable, so the screen still functions for a demo/preview.
const FALLBACK_LOCATION: LatLng = { lat: 6.9271, lng: 79.8612 };

// The device's location, asked for once on mount. When it isn't available the
// Colombo fallback is returned with `isFallback` set (fine for browsing a map,
// wrong for anything that records a position) and `note` explaining why.
export function useCurrentLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setNote('Location permission denied. Showing the area around Colombo instead.');
            setIsFallback(true);
            setLocation(FALLBACK_LOCATION);
          }
          return;
        }
```

(b)

```tsx
  const canSubmit =
    !!location && !isFallback && !isSubmitting && (kind === 'zone' || incidentType !== null);

  async function handleSubmit() {
    if (!location || isFallback || submittingRef.current) return;
```

### Code Segment 5.10: badges page in the admin dashboard

**Paste this — explanation:**

```text
Code Segment 5.10 shows how a page of the administrator dashboard obtains its data. Part (a) is the typed API function for the badge distribution, which calls GET /admin/badges through the shared API client; the client adds the administrator's JWT to the request, and the backend accepts the call only from an ADMIN account. Part (b) is the start of the Badges page. Because the page is a client component, it fetches the data in the browser after it has been displayed: a load function stores either the result or a readable error message in React state, and an effect runs it once when the page opens. The page then shows a loading message, the error or the tier counts and the attention queue. The other dashboard pages follow the same pattern.
```

**Insert Code Segment 5.10** (caption above the code):

```text
Code Segment 5.10. (a) Badge API function (admin-web/src/lib/badges-api.ts, lines 1–6); (b) data loading on the Badges page (admin-web/src/app/(dashboard)/badges/page.tsx, lines 20–37)
```

(a)

```tsx
import { apiClient } from '@/lib/api-client';
import type { BadgeDistribution } from '@/types/badge';

export async function getBadgeDistribution(): Promise<BadgeDistribution> {
  return apiClient.get<BadgeDistribution>('/admin/badges');
}
```

(b)

```tsx
export default function BadgesPage() {
  const [data, setData] = useState<BadgeDistribution | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await badgesApi.getBadgeDistribution());
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
```

**Paste this — 5.5 closing paragraph:**

```text
Taken together, these segments show three rules that were applied throughout the implementation. Decisions are made in the backend, and the clients only display them. Operations that change several records in PostgreSQL are committed as one transaction, while secondary steps such as badges and notifications follow the commit and cannot undo it. Every threshold that has not been validated with data, including the face-match threshold, the point schedule, the fine amounts and the badge weights, is a named value in one place, so that it can be found and replaced once evidence is available.
```

---

## References for this chapter

Numbered in order of first appearance in this chapter. All entries were checked
on 2026-09-27: DOIs were resolved (the RetinaFace and ArcFace DOIs are the same
as in Chapter 3), and web pages were opened and the statements used here found
on the page. [2] and [3] are [1] and [2] in Chapter 3; renumber when you merge.

**Paste this:**

```text
[1] Expo, "What you need to know about notifications," Expo Documentation. [Online]. Available: https://docs.expo.dev/push-notifications/what-you-need-to-know/ (accessed Sep. 27, 2026).

[2] J. Deng, J. Guo, E. Ververas, I. Kotsia, and S. Zafeiriou, "RetinaFace: Single-shot multi-level face localisation in the wild," in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2020, pp. 5202–5211, doi: 10.1109/CVPR42600.2020.00525.

[3] J. Deng, J. Guo, N. Xue, and S. Zafeiriou, "ArcFace: Additive angular margin loss for deep face recognition," in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2019, pp. 4685–4694, doi: 10.1109/CVPR.2019.00482.

[4] InsightFace, "InsightFace: 2D and 3D face analysis project," GitHub repository, README, "License" section. [Online]. Available: https://github.com/deepinsight/insightface (accessed Sep. 27, 2026).

[5] M. Douze, A. Guzhva, C. Deng, J. Johnson, G. Szilvasy, P.-E. Mazaré, M. Lomeli, L. Hosseini, and H. Jégou, "The Faiss library," arXiv:2401.08281, 2024, doi: 10.48550/arXiv.2401.08281.

[6] OpenStreetMap, "Copyright and license." [Online]. Available: https://www.openstreetmap.org/copyright (accessed Sep. 27, 2026).

[7] OpenStreetMap Foundation, "Tile usage policy." [Online]. Available: https://operations.osmfoundation.org/policies/tiles/ (accessed Sep. 27, 2026).

[8] CARTO, "Attributions." [Online]. Available: https://carto.com/attributions (accessed Sep. 29, 2026).
```

---

## Notes for the authors (read before submitting)

1. **Fill in the placeholders.** TABLE 5.4 needs the Android phone's model and
   Android version. TABLE 5.5 needs the Expo Go version, your code editor and
   the browser you used. Both VS Code (1.130.0) and Cursor are installed on the
   development laptop, but nothing in the repository says which one you worked
   in, so the row is a placeholder. If other team members developed or tested
   on other machines, add them to TABLE 5.4.
2. **State your own contribution and any AI-tool use.** The template asks you
   to mark your contribution where code is reused. The chapter credits the
   third-party code and the team's earlier prototype, and the paste text is
   written neutrally ("the implementation ..."). It does not say who wrote
   which part. Much of this project's code and documentation was written with
   an AI coding assistant (Claude Code). Add a statement of what the team did
   and how AI tools were used, in the form your faculty requires, either here
   in 5.3.1 or in a declaration at the front of the thesis.
3. **InsightFace model licence.** The InsightFace README (checked 2026-09-27)
   says the code is MIT-licensed but the pretrained models, including
   buffalo_l, are "for non-commercial research purposes only", and that
   licensing of buffalo_l goes through recognition-oss-pack@insightface.ai.
   An academic prototype is within those terms. Any real or commercial use
   (including a pilot with a government agency) is not, so don't describe the
   system as ready to deploy as it is. Chapter 7 should list this as a
   limitation or future work item. Check whether your supervisor wants the
   licence mentioned in the ethics section too.
4. **The earlier prototype.** Section 5.3.1 says the CLAHE and quality-gate
   code was adapted from "an earlier face-recognition prototype by the project
   team" (`face-recognition-pipeline`, GitHub `sanjula77`). Confirm that this
   was your own work. If it was built on someone else's code or a tutorial,
   credit that source as well.
5. **iOS is written as untested.** No evidence of an iOS test was found (no
   commit, task or note mentions an iPhone or a simulator). If you did test
   on iOS, update TABLE 5.6 and 5.2.4.
6. **Push notifications.** The mobile hook skips push registration in Expo Go
   on Android (`use-register-push-token.ts`, line 22), so push could not be
   tested with the setup you used. Chapter 6 should report push delivery as
   not tested, not as passed.
7. **The appendix.** The template says selected code goes in an appendix, and
   the 5.5 introduction says "The complete source code is included in the
   appendix". Change that sentence if the appendix will hold only selected
   files or a link to the repository.
8. **Docs that disagreed with the code have been corrected** (2026-09-28):
   `docs/design.md`, `docs/methodology.md`, `docs/setup.md` and
   `mobile/README.md` now match the code on the HTTP client (`fetch`), the
   route list, the database driver (psycopg2), map tiles, liveness (not
   implemented), admin page rendering (client components), the FAISS index
   (exact `IndexFlatIP`) and the test database (in-memory SQLite). Make sure
   the paper doesn't repeat the old statements (see Chapter 3 note 5 for
   "sub-linear"). One issue remains:
   `docs/diagrams/system-architecture-detailed.png` draws the admin web and
   the mobile app inside the FastAPI "application container". They are
   separate applications that run outside Docker (Fig. 5.6). Don't reuse
   that figure in the thesis without fixing it.
9. **A small inefficiency you may be asked about.** `face_engine.py` loads the
   whole buffalo_l pack (five models, including age/gender and landmark
   models), although only detection and recognition are used. This affects
   memory and start-up time, not results. It is not mentioned in the paste
   text.
10. **Templates.** 5.3.1 says the dashboard's config files came from
    `create-next-app`. The files match that tool's output, but the repository
    doesn't record how the folder was created. Confirm, or reword.
11. **Metro port.** Fig. 5.6 shows the Expo development server on port 8081,
    which is Expo's default (the backend's CORS list also names it). If you
    ran it on another port, change the figure.

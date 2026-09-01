# Requirements Document — iPermit

## Introduction

iPermit is an AI-powered virtual driving license platform for Sri Lanka. It replaces
physical driving licenses with a digital, facial-recognition-verified license, gives
traffic police a fast roadside identity/violation check, automates white-line traffic
violation detection from images/video, and manages a point-based penalty system with
fines, appeals, and driver behavior analytics. The system serves three user types:
**Drivers**, **Police Officers**, and **Administrators** (licensing department staff).

**Status: nothing has been built yet.** This document defines the *target* system to
build, based on the source thesis/proposal documents' most implementation-accurate
descriptions (`METHODOLOGY.md.docx` and `FRONTEND_TOOLS_AND_TECHNOLOGIES.md.docx`),
with the white-line violation detector included as an integrated core module per
project decision. No code, trained models, or repos from those documents are
available to reuse — every module described below is being built from scratch. Where
earlier thesis drafts (Chapters 3/5) described a different stack or scope, that is
noted as superseded — see [design.md § Architecture Decision Record](design.md#architecture-decision-record-adr).

## Glossary

- **Driver**: End user applying for/holding a digital license.
- **Police Officer**: Roadside enforcement user; verifies identity, issues fines.
- **Admin**: Licensing department staff; reviews applications, appeals, analytics.
- **Digital License**: QR-coded virtual license record tied to a driver's account.
- **Face Enrollment**: Capturing 4 reference photos to build a driver's face template.
- **Face Template**: ArcFace embedding vector(s) representing a driver's face.
- **FAISS Index**: Vector index used for fast nearest-neighbor face matching.
- **Violation**: A recorded traffic offense (white-line crossing, speeding, etc.).
- **Point**: Demerit unit deducted per violation; license suspends at threshold.
- **Badge/Tier**: Rule-based driver standing (Platinum/Gold/Silver/Bronze/At-Risk/Suspended).
- **Road Incident**: A driver- or police-reported hazard/event pinned on a map.
- **Appeal**: A driver's contest of an issued fine, resolved by an Admin.

## Requirements

### Requirement REQ-1: Driver Registration & Authentication

**User Story:** As a driver, I want to register and log in securely, so that I can
access my license, fines, and account information.

#### Acceptance Criteria
1. THE system SHALL allow a driver to self-register with email/NIC and a password.
2. THE system SHALL authenticate drivers via email or NIC plus password.
3. THE system SHALL issue a JWT on successful login and enforce it on protected routes.
4. THE system SHALL support three roles — DRIVER, POLICE, ADMIN — with POLICE and
   ADMIN accounts provisioned by an Admin, not self-registered.
5. IF login credentials are invalid, THEN THE system SHALL reject the request without
   revealing whether the email/NIC or password was incorrect.

### Requirement REQ-2: License Application Submission

**User Story:** As a driver, I want to submit a license application with my documents
and photos, so that I can be issued a digital license.

#### Acceptance Criteria
1. THE system SHALL accept an application containing 4 face photos and supporting
   documents (NIC, medical certificate, birth certificate).
2. THE system SHALL validate uploaded photos for basic quality (blur/face-visibility)
   before accepting the application.
3. WHEN an application is submitted, THE system SHALL set its status to `PENDING` and
   notify the driver of submission.
4. THE system SHALL allow a driver to view the status of their own application(s) only.

### Requirement REQ-3: Admin License Application Review

**User Story:** As an admin, I want to review and approve/reject license
applications, so that only verified drivers receive a digital license.

#### Acceptance Criteria
1. THE system SHALL let an Admin list applications filterable by status.
2. THE system SHALL let an Admin approve an application, triggering license and face
   template generation for that driver.
3. THE system SHALL let an Admin reject an application with a required reason.
4. WHEN an application is approved or rejected, THE system SHALL notify the driver.

### Requirement REQ-4: Digital License & QR

**User Story:** As a driver, I want a digital license with a QR code, so that I can
prove my identity and license status without a physical card.

#### Acceptance Criteria
1. THE system SHALL generate a virtual license card showing photo, license number,
   expiry date, and current point balance.
2. THE system SHALL encode a scannable QR token uniquely identifying the license.
3. THE system SHALL reflect current point balance and license status (active/suspended)
   on the card in real time.

### Requirement REQ-5: Facial Recognition Enrollment

**User Story:** As a driver, I want my face registered against my license, so that
police can verify my identity without physical documents.

#### Acceptance Criteria
1. WHEN a license application is approved, THE system SHALL generate a face template
   from the driver's 4 enrollment photos using RetinaFace (detection) + ArcFace
   (512-dim embedding via ONNX Runtime).
2. THE system SHALL check consistency across the 4 enrollment photos and reject
   enrollment if photos do not consistently match the same face.
3. THE system SHALL store face templates in a dedicated store (SQLite) and index
   embeddings in FAISS for fast lookup.
4. WHERE liveness/anti-spoofing is not enabled, THE system SHALL disclose this
   limitation rather than silently skipping the check.

### Requirement REQ-6: Police Roadside Identity Verification

**User Story:** As a police officer, I want to verify a driver's identity via face
scan or QR code, so that I can confirm license validity during a stop.

#### Acceptance Criteria
1. THE system SHALL let an officer submit a live face photo and return the best
   FAISS match with a confidence/distance score.
2. THE system SHALL let an officer scan a license QR code as an alternative/confirming
   verification method.
3. THE system SHALL let an officer look up a driver by NIC or license number.
4. WHEN a face match is ambiguous (low confidence), THE system SHALL require the
   officer to manually confirm identity — AI match does not replace officer judgment.
5. WHEN identity is confirmed, THE system SHALL show the officer the driver's current
   points, license status, and violation history.

### Requirement REQ-7: Automated White-Line Violation Detection

**User Story:** As a police officer / system operator, I want white-line traffic
violations detected automatically from an image or video frame, so that violations
can be flagged for confirmation without manual review of raw footage.

#### Acceptance Criteria
1. THE system SHALL accept an image or video frame and detect lane markings using a
   trained YOLOv8n-seg lane segmentation model.
2. THE system SHALL detect vehicles in the same frame using YOLOv8n (vehicle classes).
3. THE system SHALL apply the three-tier overlap check (bounding-box overlap →
   bottom-edge check → edge-proximity check) to flag a candidate violation.
4. THE system SHALL present flagged violations to an officer for confirmation before
   they are recorded against a driver — detections are not auto-finalized.
5. THE system SHALL target ≥85% detection accuracy, using the figures reported in
   prior research on this dataset (mask mAP50 0.85, combined accuracy 87.5%) as a
   benchmark — these numbers come from documents describing a separate prior
   attempt, not a model you currently have; they must be re-validated once your own
   model is trained (see [tasks.md](tasks.md) Task 9.2).

### Requirement REQ-8: Point-Based Violation & Suspension Management

**User Story:** As the system, I want to deduct points per confirmed violation and
suspend a license at a threshold, so that repeat offenders are progressively penalized.

#### Acceptance Criteria
1. WHEN a violation is confirmed, THE system SHALL deduct points per a defined
   per-offense schedule (e.g., white-line=3, speeding=4, red-light=6, drunk-driving=10).
2. THE system SHALL start each driver at 0 points and suspend the license WHEN
   cumulative points reach 10.
3. THE system SHALL restore points/reactivate a license after the associated fine(s)
   are paid, per the defined restoration rule.
4. THE system SHALL maintain a full violation history per driver, immutable once recorded.

### Requirement REQ-9: Fine Issuance & Payment

**User Story:** As a driver, I want to view and pay fines associated with my
violations, so that I can resolve penalties and restore my license standing.

#### Acceptance Criteria
1. WHEN a violation is confirmed, THE system SHALL generate an associated fine record.
2. THE system SHALL let a driver view fine history and outstanding balance.
3. THE system SHALL provide a mock payment flow (card/bank/wallet selection) — clearly
   not a real payment gateway integration in this version.
4. WHEN a payment is recorded, THE system SHALL update fine status and any dependent
   point/suspension state within the same transaction (no partial updates).

### Requirement REQ-10: Fine Appeal Workflow

**User Story:** As a driver, I want to appeal a fine I believe is incorrect, so that
an admin can review and potentially overturn it.

#### Acceptance Criteria
1. THE system SHALL let a driver submit an appeal against a specific fine with a reason.
2. THE system SHALL let an Admin resolve an appeal as `UPHELD` or `OVERTURNED`.
3. WHEN an appeal is overturned, THE system SHALL reverse the associated fine and any
   point deduction tied to it.
4. THE system SHALL notify the driver of the appeal outcome.

### Requirement REQ-11: Driver Behavior Analytics (Rule-Based Badges)

**User Story:** As an admin, I want drivers classified into standing tiers based on
their record, so that I can identify at-risk drivers and recognize safe ones.

#### Acceptance Criteria
1. THE system SHALL classify each driver into one of: PLATINUM, GOLD, SILVER, BRONZE,
   AT_RISK, SUSPENDED, using a transparent rule-based formula over violations, fines,
   points, tenure, and violation severity — explicitly not an ML model, for
   explainability in this version.
2. THE system SHALL recompute a driver's tier whenever their violation/fine/point
   state changes.
3. THE system SHALL show an Admin a dashboard of badge distribution, safety score, and
   an "attention queue" of AT_RISK/SUSPENDED drivers.

### Requirement REQ-12: Notifications

**User Story:** As a driver, I want to be notified about license, fine, and
violation events, so that I stay informed without checking the app constantly.

#### Acceptance Criteria
1. THE system SHALL send in-app and push (Expo) notifications for: license
   approval/rejection, new fines, payment confirmation, appeal outcomes, badge
   changes, suspensions, and nearby road incidents.
2. THE system SHALL persist notification history viewable within the app.

### Requirement REQ-13: Road Incident Reporting & Map

**User Story:** As a driver, I want to report and see road incidents near me, so that
I can avoid hazards and warn other drivers.

#### Acceptance Criteria
1. THE system SHALL let a driver report an incident with GPS location, one of 8 types
   (Accident, Traffic, Road block, Flood, Construction, Breakdown, Hazard, Other), and
   a severity level.
2. THE system SHALL display active incidents on a map (react-native-maps) within a
   relevant radius of the driver's location.
3. THE system SHALL let other drivers confirm or clear a reported incident.
4. THE system SHALL auto-expire incidents after a defined time window.
5. THE system SHALL notify nearby drivers of new high-severity incidents.

### Requirement REQ-14: Admin Analytics Dashboard

**User Story:** As an admin, I want an overview dashboard of applications, fines,
violations, and driver risk, so that I can monitor system health and enforcement trends.

#### Acceptance Criteria
1. THE system SHALL show pending application counts, fine/appeal queues, and badge
   distribution on a single dashboard.
2. THE system SHALL let an admin drill down from a summary metric to the underlying
   driver/application/fine records.

## Non-Functional Requirements

- **Performance**: Face verification should complete in a UX-acceptable time
  (target <2s per the thesis spec); this is a target, not yet independently benchmarked
  in the implementation docs — verify against real hardware before citing in the final
  report.
- **Security**: JWT-based auth with RBAC (DRIVER/POLICE/ADMIN); passwords hashed;
  face templates stored separately from primary user data; documents/uploads served
  only to authenticated, authorized requesters.
- **Reliability**: Database transactions for payment/fine/point updates; FAISS index
  rebuildable from the SQLite template store if corrupted/lost.
- **Privacy/Ethics**: Explicit consent for biometric enrollment; data used only for
  identity verification and enforcement; incident location is point-in-time only, not
  continuous tracking of a driver.
- **Usability**: Officer-in-the-loop confirmation for all AI-flagged violations and
  ambiguous face matches — the system assists enforcement, it does not replace it.
- **Honesty about scale claims**: Chapter 3's quantified targets (10,000 concurrent
  users, 99.9% uptime, WCAG 2.1 AA, GDPR alignment) are thesis-standard aspirational
  targets with no system to validate them against yet. State them as future
  production goals, not current guarantees, in the final report.

## Benchmarks From Prior Research (Not Your Own Data Yet)

These figures come from the source documents describing a separate, prior attempt at
this problem — you have no existing model or dataset of your own yet. Treat them as
targets to aim for and sanity-check against, not results you can currently cite:

- Face recognition: one document claimed "100% accuracy," another (evaluating the
  same approach more rigorously) reported 100% train / **60% test** accuracy on a
  tiny 6-person/68-image dataset — a textbook overfitting result. Lesson for your own
  build: get a larger, more diverse enrollment dataset before trusting any accuracy
  number (see [tasks.md](tasks.md) Task 9.1).
- White-line violation detection: prior work reported ~85% mAP50 / 87.5% combined
  accuracy using YOLOv8 on a lane dataset (JPJ Lane Dataset, ~1,000+ images). Use this
  as your target once you train your own model (see [tasks.md](tasks.md) Task 9.2) —
  you'll need to source or rebuild a similar dataset, since you don't have theirs.

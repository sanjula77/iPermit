# Chapter 3 — Analysis (copy-paste draft)

Draft of thesis Chapter 3 for iPermit, written from the project's own records
(`docs/requirements.md`, `docs/design.md`, `docs/methodology.md`,
`docs/tasks.md`, the code, and `docs/evaluation/results/`) plus verified
external sources. Prepared with the academic-paper research skill's integrity
rules: every external claim is cited to a source that was opened and checked on
2026-09-27, and nothing is claimed that the project did not do.

## How to use this file

- Text inside ` ```text ` blocks is ready to paste into Word. Each paragraph is
  on one line, so Word won't insert stray line breaks.
- Tables are `|`-separated. Paste, select, then **Insert → Table → Convert Text
  to Table**, choose **Other** and type `|`.
- Diagrams: `docs/thesis/diagrams/usecase-existing.png` (Figure 3.1) and
  `docs/thesis/diagrams/usecase-proposed.png` (Figure 3.2). The `.puml` files
  next to them are the editable sources (PlantUML).
- Citations use IEEE numbering, matching the team's literature review. The
  numbers here are local to this chapter. When you merge chapters, renumber
  them into the thesis-wide list (the full entries are at the end of this file).
- **Read "Notes for the authors" at the end before submitting.** It lists the
  things only your team can confirm.

---

## 3.1 Introduction

**Paste this:**

```text
This chapter analyses the problem that iPermit addresses and specifies what the system must do. It begins with a feasibility study covering the technical, economic, operational, legal and schedule aspects of the project (Section 3.2), followed by the fact-finding techniques used to understand the existing licensing and enforcement process (Section 3.3). Section 3.4 analyses the existing process through a top-level use case diagram, identifies its problems, introduces the proposed system, and describes its users, their jobs and how often they would use it, together with the success factors that must hold for the system to be used. Sections 3.5 and 3.6 specify the functional and non-functional requirements with their justification, and Section 3.7 describes and justifies the development methodology.
```

---

## 3.2 Feasibility Study

**Paste this — 3.2 introduction:**

```text
The feasibility of iPermit was assessed from five viewpoints: whether it can be built with available technology (technical), whether its costs are justified (economic), whether its users could adopt it (operational), whether it can operate within Sri Lankan law (legal and ethical), and whether it can be completed within the academic timeframe (schedule). The assessment distinguishes between the prototype built in this project and a future national deployment, because the two differ considerably in cost, legal requirements and scale. TABLE 3.1 summarises the conclusions.
```

**Paste this — 3.2.1 Technical Feasibility:**

```text
3.2.1 Technical Feasibility

Every component of the proposed system can be built with mature, openly available technology. The backend uses FastAPI with PostgreSQL, a widely used combination for typed REST services with strong relational integrity. The driver and police application is built once with Expo and React Native and runs on both Android and iOS, and the administrator dashboard uses Next.js. For face verification, pretrained RetinaFace detection [1] and ArcFace embedding [2] models are available through the InsightFace model pack and run on a standard CPU with ONNX Runtime, so no face-recognition model had to be trained from scratch. FAISS provides the similarity search over stored face templates.

The main technical risks lay in the AI components. Face verification depends on photo quality and on a matching threshold that must be validated with data, so an evaluation on public face datasets was planned as part of the project; its results are reported in Chapter 6. Automated white-line violation detection was technically feasible in principle, since YOLOv8 segmentation and detection models are openly available, but it required a labelled lane dataset and GPU training time that were not available to the project. This risk was identified during analysis, and the system was designed so that violations can be recorded manually by an officer and an automated detector added later without changing the database. The project was therefore judged technically feasible, with automated violation detection carried as a known risk.
```

**Paste this — 3.2.2 Economic Feasibility:**

```text
3.2.2 Economic Feasibility

For the prototype, the direct software cost is zero: every framework, library and model used is open source or free to use, and development, testing and deployment run on the team's own computers in Docker containers. The only other resources used were Android phones already owned by the team, for testing the mobile application, and the free tier of Google Colab, for running the face-recognition evaluation. No paid cloud service, payment gateway or commercial licence was required, because payment is simulated and the system runs locally.

A national deployment would carry costs that this project does not attempt to estimate precisely: production servers or cloud hosting, integration with existing government systems, security auditing, a licensed payment gateway, officer devices and training, and ongoing maintenance. Against these costs, a digital system would reduce the handling of paper fine tickets and physical licences and the time drivers and officers spend on offline steps (Section 3.4.2). Because the cost of a national deployment depends on decisions outside this project, the economic conclusion is limited to the prototype: it is economically feasible, and a full cost-benefit analysis would be needed before any national rollout.
```

**Paste this — 3.2.3 Operational Feasibility:**

```text
3.2.3 Operational Feasibility

Operational feasibility depends on whether drivers, officers and licensing staff could use the system in their daily work. Mobile connectivity in Sri Lanka is high: in late 2025 there were 30.3 million cellular connections, equal to 130% of the population, of which 91.3% were 3G, 4G or 5G, although only 59.7% of the population used the internet [3]. The scale of enforcement is also large. Sri Lanka Police recorded 3,660,711 traffic offence cases and issued 2,106,282 spot-fine tickets in 2024 [4], so any saving of time per stop would be multiplied across millions of interactions each year.

Recent changes show that digital tools are already entering the enforcement process. Traffic fines were traditionally paid at a post office, after which the driver had to take the receipt back to the police station to recover the licence [5]. Since 2025 the GovPay platform has allowed spot fines to be paid online, and by February 2026 it was available in all nine provinces; under GovPay the officer returns the licence once a payment confirmation SMS is received [6], [7]. Officers are therefore already working with mobile confirmations as part of the fine process.

Two constraints affect adoption. Because around 40% of the population did not use the internet at the end of 2025 [3], the system cannot assume that every driver carries a smartphone. iPermit addresses this because the officer can verify a driver by face scan or by NIC or licence-number lookup without any action on the driver's phone. Second, no survey of officer or driver acceptance was carried out in this project (Section 3.3), so user acceptance remains to be confirmed by a usability study. The system is judged operationally feasible on the basis of available infrastructure and existing practice, with user acceptance still to be measured.
```

**Paste this — 3.2.4 Legal and Ethical Feasibility:**

```text
3.2.4 Legal and Ethical Feasibility

The prototype raises no legal barrier, since it uses test accounts and public datasets only. A real deployment, however, would depend on three legal conditions. First, the digital licence must be legally recognised. In December 2024 the Cabinet approved the introduction of a new digital driving licence to replace the smart card [8], but the digital licence was not yet being issued at the time of writing. Second, a points system needs a legal basis. The Motor Traffic (Amendment) Act No. 8 of 2009 provides for "driver improvement points" to be entered on a licence, with the offences and point values to be prescribed by the Minister in regulations [9]. iPermit's point schedule and its 10-point suspension threshold are therefore placeholders that would have to follow the official regulations.

Third, the system processes biometric data. The Personal Data Protection Act No. 9 of 2022 defines biometric data as including facial images and treats biometric data used to identify a person uniquely as a special category of personal data [10]. The Act was amended in 2025 [11], and the main obligations on data controllers take effect from 1 January 2027 [12]. A deployment would therefore need a lawful basis and explicit consent for face enrolment, purpose limitation, secure storage and a data-protection impact assessment. The design already separates face templates from other personal data (NFR-P1) and avoids continuous location tracking (NFR-P2). Recorded consent before enrolment (NFR-P3) is specified but not yet implemented.

There are also ethical considerations. Face-recognition error rates differ between populations and image conditions, and the evaluation in Chapter 6 found a higher false-rejection rate on a South Asian dataset than on a Western one. For this reason no enforcement decision is taken on an AI result alone: an officer must confirm any uncertain match (NFR-R4). With these safeguards the system is judged legally and ethically feasible as a prototype, while a national deployment would require the legal changes and data-protection measures described above.
```

**Paste this — 3.2.5 Schedule Feasibility:**

```text
3.2.5 Schedule Feasibility

The project had to be completed within the final academic year. To keep the schedule achievable, the scope was divided into Must-have, Should-have and Could-have requirements (Section 3.5), and development was organised into eight phases, each ending with a working part of the system (Section 3.7). This meant that a delay in one component would not block the others. When automated violation detection was found to depend on a dataset and GPU time that were not available, it was deferred and the remaining phases continued, so the rest of the system could be completed on schedule. The project was therefore feasible within the timeframe, with the explicit trade-off that one Must-have requirement (FR-07) was deferred.
```

**Paste this — TABLE 3.1:**

```text
TABLE 3.1. Summary of the Feasibility Study
Aspect|Conclusion for the prototype|Conditions for a national deployment
Technical|Feasible: all components built with open-source frameworks and pretrained face models|Automated violation detection needs a labelled dataset and GPU training; face thresholds must be validated on Sri Lankan photographs
Economic|Feasible: no software, cloud or licence costs|Full cost-benefit analysis of hosting, integration, devices, training and maintenance
Operational|Feasible on available infrastructure and current practice|Usability study with drivers, officers and licensing staff; officer training
Legal and ethical|Feasible: test data only|Legal recognition of the digital licence; official points regulations; compliance with the Personal Data Protection Act, including consent for biometric enrolment
Schedule|Feasible, with automated violation detection deferred|Not applicable
```

---

## 3.3 Fact Finding Techniques

**Paste this:**

```text
Fact finding aimed to establish how driving licences are currently issued and checked in Sri Lanka, how traffic fines are issued and paid, and what a digital system would need to do to improve this process. Five techniques were used.

Document analysis. Publicly available official material was examined, including the Department of Motor Traffic's guidance on how to obtain a driving licence, Sri Lanka Police and government announcements on traffic fines and online fine payment, the Motor Traffic Act, and the Personal Data Protection Act No. 9 of 2022 [5]–[7], [9], [10], [13]. These sources were used to describe the existing process in Section 3.4.1 and to identify legal constraints in Section 3.2.4.

Literature review. Published research on digital driving licences, face recognition for identity verification, point-based violation systems and mobile enforcement tools, reviewed in Chapter 2, was used to identify common features, known risks such as demographic differences in face-recognition error rates, and relevant standards such as ISO/IEC 18013-5 for mobile driving licences [14].

Review of earlier project documents. The research proposal and earlier design drafts produced for this project were reviewed to recover the original objectives and scope. This review also found conflicting technology choices between drafts and an unverified face-recognition accuracy claim, which were resolved before implementation and recorded as design decisions.

Prototyping. Because the system combines several new technologies, working prototypes were used as a fact-finding tool. Building and testing each increment against real photographs and a real Android phone revealed requirements that were not visible on paper, for example that the initial photo-sharpness threshold rejected clear phone selfies, that the location fallback had to block incident reporting, and that some hazards needed a persistent danger zone rather than a one-off incident report.

Benchmarking on public data. The face-verification pipeline was evaluated on two public, labelled face datasets to establish realistic error rates before setting requirements that depend on them, such as the need for officer confirmation of uncertain matches.

Interviews and questionnaires with drivers, traffic police officers and licensing staff were planned in the research proposal but were not carried out, because access to police officers and Department of Motor Traffic staff could not be arranged within the project timeframe. The requirements in this chapter are therefore based on documents, literature and prototyping rather than on direct user input. This is a limitation of the analysis, and validating the requirements with real users is the first step of the usability study proposed as future work.
```

> The last paragraph gives a reason ("access … could not be arranged"). **Use
> your team's real reason** if it was different. Don't keep this one if it
> isn't true.

---

## 3.4 Requirement Analysis

**Paste this — 3.4.1 The Existing System:**

```text
3.4.1 The Existing System

Driving licences in Sri Lanka are issued by the Department of Motor Traffic (DMT). An applicant must first obtain a medical certificate from the National Transport Medical Institute (NTMI), issued no more than six months before the application. The applicant then registers and sits a written test (from age 17 for light vehicles), receives a learner's permit valid for up to 18 months, and after at least three months sits a practical driving test. The applicant must appear in person with the NIC or passport and a birth certificate, and the successful applicant receives a smart-card driving licence [13]. Online processing is available at the DMT head office in Werahera and at some district offices, while the other district offices still process applications offline [13].

On the road, a traffic police officer checks the physical licence and compares the photograph on the card with the driver. When an offence is detected, the officer issues a spot-fine ticket and keeps the driver's licence. Traditionally the driver paid the fine at a post office and then had to present the receipt at the police station to get the licence back [5]. Since 2025 the fine can also be paid online through GovPay, which was extended to all nine provinces by February 2026; the officer returns the licence once a payment confirmation SMS is received [6], [7]. The scale of this process is large: in 2024 Sri Lanka Police recorded 3,660,711 traffic offence cases, issued 2,106,282 tickets and collected about Rs. 2.27 billion in traffic fines [4].

Two planned improvements had not taken effect at the time of writing. A digital driving licence to replace the smart card was approved by the Cabinet in December 2024 [8], and the DMT's wider digitalisation programme was still described as being in transition in May 2026 [15]. A points system for traffic offences has had a legal basis since 2009 [9], and the government announced a nationwide pilot demerit scheme for September 2026 [16], but no points system was in operation when this analysis was carried out. Fig. 3.1 summarises the existing process as a top-level use case diagram.
```

**Insert Figure 3.1:** `docs/thesis/diagrams/usecase-existing.png`

```text
Fig. 3.1. Top-level use case diagram of the existing driving licence and traffic-fine process
```

**Paste this — 3.4.2 Problems with the Existing System:**

```text
3.4.2 Problems with the Existing System

Analysis of the existing process identified six problems, each of which is addressed by one or more of the functional requirements in Section 3.5.

P1. Identity is checked by eye. The officer compares the driver's face with a small photograph on a card. There is no independent check that the person holding the licence is its owner, and a driver who is not carrying the card cannot easily be identified at the roadside (addressed by FR-05 and FR-06).

P2. The licence depends on a physical card. The card can be lost, damaged or left at home, and while a fine is unpaid it is held by the police, leaving the driver without proof of entitlement to drive (FR-04, FR-09).

P3. Recovering the licence requires offline steps. Even with online payment through GovPay, the licence is returned only after the officer receives confirmation, and under the traditional process the driver must visit both a post office and a police station (FR-09).

P4. Repeat offending has no cumulative consequence in practice. Although the law has provided for driver improvement points since 2009, no points system was operating, so a driver's history of offences did not lead to progressive penalties (FR-08, FR-11).

P5. Drivers have no view of their own record. In the process described above, a driver cannot see outstanding fines, past offences or a standing that rewards safe driving in one place (FR-09, FR-11, FR-12). iPermit also adds a recorded route for contesting a fine (FR-10).

P6. Applying for a licence requires paper documents and in-person visits, and online processing is not available at every district office (FR-02, FR-03).
```

**Paste this — 3.4.3 The Proposed System:**

```text
3.4.3 The Proposed System

iPermit replaces the physical card with a digital licence held in a mobile application and linked to a face template created from four enrolment photographs. At the roadside, the officer can identify the driver by a live face scan, by scanning the licence QR code, or by entering the NIC or licence number, and then sees the driver's licence status, demerit points and violation history on one screen. An uncertain face match is never accepted automatically; the officer must confirm it. When the officer records a violation, the system deducts points, creates the fine and suspends the licence if the threshold is reached, all as a single operation. The driver sees the fine immediately, can pay it through the app or appeal it, and the licence is reinstated as soon as the payment is recorded. Licensing staff review applications, resolve appeals and monitor drivers' behaviour badges from a web dashboard. Drivers and officers can also report road incidents and mark danger zones, which other users see on a map. Fig. 3.2 shows the top-level use cases of the proposed system. The use case for confirming AI-flagged violations is shown as planned, because automated violation detection was deferred (Section 3.5).
```

**Insert Figure 3.2:** `docs/thesis/diagrams/usecase-proposed.png`

```text
Fig. 3.2. Top-level use case diagram of the proposed iPermit system
```

**Paste this — 3.4.4 Users of the System:**

```text
3.4.4 Users of the System

The system has three classes of human user and one internal system actor, the face-recognition module. TABLE 3.2 describes each user class, their job, the tasks they perform in iPermit, how often they would use it, and the size of the population the class represents. The national figures indicate the scale a full deployment would face; they were not used to size the prototype, which was tested with a small number of test accounts. No official count of licence holders or of traffic police officers was found in published sources, so the table uses the closest verified figures.
```

**Paste this — TABLE 3.2:**

```text
TABLE 3.2. User Classes, Their Jobs and Expected Frequency of Use
User class|Job|Main tasks in iPermit|Expected frequency of use|Scale of the population
Driver|Holder of, or applicant for, a driving licence|Apply for a licence; show the digital licence; view points, badge and fines; pay or appeal fines; receive notifications; report incidents and danger zones|Occasional: when applying, when stopped or fined, and when reporting a hazard; several times a year for most drivers|Not confirmed for licence holders; about 8.5 million registered vehicles in 2025 [17] indicate a driver population in the millions
Police officer|Traffic enforcement at the roadside|Verify identity by face, QR code or NIC; view the driver's record; record violations; report incidents|Frequent: many times per shift; nationally about 5,750 spot-fine tickets were issued per day in 2024|79,718 regular police officers at 607 police stations (31 December 2024) [4]; traffic-police strength not confirmed
Administrator|Licensing staff at the Department of Motor Traffic|Review and approve or reject applications; resolve appeals; monitor badge distribution and at-risk drivers|Daily, throughout the working day|Staff at the DMT head office and district offices; number not confirmed
Face-recognition module (system actor)|Internal service|Create face templates on approval; search templates during roadside verification|On every approval and every face scan|One module
```

> The "about 5,750 per day" figure is 2,106,282 tickets in 2024 ÷ 366 days
> (2024 was a leap year).

**Paste this — 3.4.5 Requirement Specification Approach:**

```text
3.4.5 Requirement Specification Approach

Each functional requirement was written as a user story and refined into acceptance criteria using the Easy Approach to Requirements Syntax (EARS) [18]. EARS provides a small set of sentence templates: "THE system SHALL ..." for rules that always apply, "WHEN <trigger>, THE system SHALL ..." for behaviour caused by an event, and "IF <condition>, THEN THE system SHALL ..." for unwanted situations that must be handled. For example, the requirement for roadside verification includes the criterion "WHEN a face match is ambiguous (low confidence), THE system SHALL require the officer to manually confirm identity", which makes explicit that an AI match alone never confirms identity. Each criterion states one condition and one observable result, so that it can later be checked against the running system. Every requirement was also given a MoSCoW priority and traced forward to the design components and implementation tasks that satisfy it.
```

**Paste this — 3.4.6 Success Factors:**

```text
3.4.6 Success Factors

The following prerequisites must hold for iPermit to be used successfully in practice.

1. Legal recognition. The digital licence must be accepted in law as equivalent to the smart card, and the point schedule and suspension threshold must follow the official driver improvement points regulations [9].

2. Data-protection compliance. Face enrolment requires the driver's informed, recorded consent, and the operator must meet the obligations of the Personal Data Protection Act for special categories of personal data, including a data-protection impact assessment [10], [12].

3. Validated face verification. The matching threshold and photo-quality limits must be validated on photographs of Sri Lankan drivers taken with ordinary phones, since the public datasets used in Chapter 6 do not represent that population.

4. Good enrolment data. Every template depends on four clear, consistent enrolment photographs, so applicants need clear instructions and immediate feedback on rejected photos.

5. Officer equipment and connectivity. Officers need a smartphone with a working camera and mobile data at the roadside; the system is designed to work even when the driver has no smartphone.

6. Officer training and trust. Officers must understand that a face match is a suggestion to be confirmed, not a decision, and must be trained in the fallback methods (QR and NIC lookup).

7. Integration with existing government systems. A real deployment must connect to DMT licensing records, police systems and a real payment channel such as GovPay, instead of the mock payment used in the prototype.

8. Reliable hosting and support. The backend must run on managed infrastructure with backups, monitoring and a support process, since enforcement cannot stop when the system is unavailable.
```

---

## 3.5 Functional Requirements

**Paste this — 3.5 introduction:**

```text
The functional requirements were derived from the problems identified in the existing process (Section 3.4.2), the objectives of the research proposal, and the capabilities of the technologies reviewed in Chapter 2. They are grouped into fifteen requirements, FR-01 to FR-15, each written as a user story with EARS-style acceptance criteria; FR-01 to FR-14 formed the original specification and FR-15 was added during development. TABLE 3.3 lists them with their priority and the problem they address. Priorities follow the MoSCoW scheme: Must-have requirements form the minimum system that could be submitted, Should-have requirements add clear value but the system still works without them, and Could-have requirements were built only when time allowed. The delivery status of each requirement is included for traceability and is discussed in Chapter 6.
```

**Paste this — TABLE 3.3** (caption above the table):

```text
TABLE 3.3. Functional Requirements of iPermit
ID|Requirement|Main user|Priority|Justification|Delivery status
FR-01|Driver self-registration and login with email or NIC and password; police and administrator accounts are provisioned, not self-registered; three roles (Driver, Police, Admin)|All|Must|Every other function depends on knowing who the user is and what they may do; public self-registration of police or admin accounts would allow privilege escalation|Implemented
FR-02|Submit a licence application with four face photographs and the NIC, medical certificate and birth certificate, with photo-quality checks at submission time|Driver|Must|Replaces the in-person paper application; checking photo quality at submission gives the applicant immediate feedback instead of a rejection days later|Implemented
FR-03|Review applications, approve or reject with a mandatory reason, and notify the driver|Admin|Must|Only verified applicants should receive a licence; a written reason makes rejections accountable|Implemented
FR-04|Digital licence with licence number, expiry, status, point balance and a unique QR code|Driver|Must|Removes the dependence on a physical card that can be lost, damaged or forged|Implemented
FR-05|Build a face template from the four enrolment photos, reject inconsistent photo sets, and store templates separately from other personal data|System|Must|Face verification needs a reliable reference; separate storage limits the exposure of biometric data|Implemented
FR-06|Roadside verification by live face scan (one-to-many search), QR scan, or NIC/licence-number lookup, with manual confirmation of any low-confidence face match|Police|Must|Officers need a fast identity check that still works when one method fails; an AI match alone must never decide identity|Implemented
FR-07|Automated white-line violation detection from an image, with officer confirmation before recording|Police|Must (deferred)|Automates detection of a common offence while keeping a human decision|Deferred: no training dataset or GPU was available; violations are recorded manually (FR-08)
FR-08|Record a violation, deduct demerit points by offence, generate a fine, and suspend the licence at 10 points, all in one transaction|Police|Must|Makes penalties consistent and visible; a single transaction prevents points being deducted without a matching fine|Implemented
FR-09|View fines and pay them through a mock payment flow; payment updates the fine, points and suspension in one transaction|Driver|Must|Removes the post-office and police-station visits needed to pay a fine and recover a licence; a real payment gateway is out of scope|Implemented (mock payment)
FR-10|Appeal a fine with a reason; an administrator upholds or overturns it, and an overturned appeal reverses the fine and points|Driver, Admin|Must|Gives drivers a recorded route to contest an incorrect fine|Implemented
FR-11|Rule-based driver behaviour badge (Platinum, Gold, Silver, Bronze, At-Risk, Suspended), recomputed after every relevant event, with an administrator view of the distribution and an attention queue|Driver, Admin|Must|Rewards safe drivers and highlights repeat offenders using a formula that can be explained to the driver|Implemented
FR-12|In-app notification history and push notifications for licence, fine, payment, appeal, badge and suspension events|Driver|Must (in-app), Should (push)|Drivers learn about fines and decisions without visiting an office or checking the app|In-app implemented; push implemented but delivery not confirmed on a device
FR-13|Report road incidents (8 types, 3 severity levels) at the current location, view them on a map, confirm or clear them, with automatic expiry|Driver, Police|Could|Shares real-time hazard information between road users|AC1–AC4 implemented; AC5 (alert nearby drivers) not implemented because it conflicts with the privacy requirement NFR-P2
FR-14|Administrator dashboard of pending applications, fine and appeal queues and badge distribution, with drill-down to records|Admin|Should|Lets licensing staff monitor workload and driver risk|Partially implemented as separate application, appeal and badge pages
FR-15|Mark a circular danger zone (radius 50–1000 m, severity, optional reason) that stays on the map until cleared|Driver, Police|Could|Records persistent hazards, such as a dangerous bend, that point-in-time incidents do not capture|Implemented (added during development)
```

**Paste this — 3.5 closing paragraphs:**

```text
Three requirements deserve comment. FR-07 was specified as a Must-have because white-line detection was one of the proposal's objectives, but it could not be delivered: no labelled Sri Lankan lane dataset or trained model from earlier work was available, and the development environment had no GPU for training. The decision to defer it was taken explicitly, and FR-08 was designed so that an officer records violations manually while an evidence-reference field is kept for a future detector. FR-13 AC5, which would notify drivers near a new high-severity incident, was not implemented because the system cannot know where other drivers are without tracking their location continuously, which the privacy requirement NFR-P2 forbids. FR-15 was not part of the original specification; it was added during development after it became clear that some hazards are persistent areas rather than one-off events.

The point schedule used by FR-08 (white line 3 points, speeding 4, red light 6, drunk driving 10) and the fine amounts (LKR 2,000 to 25,000) are placeholder values chosen for the prototype. They are not taken from a Sri Lankan fine schedule and must be replaced with values set by the relevant authority before any real use.
```

---

## 3.6 Non-Functional Requirements

**Paste this — 3.6 introduction:**

```text
The non-functional requirements are organised using the product quality characteristics of ISO/IEC 25010:2023 [19], which the standard itself recommends for eliciting requirements and defining acceptance criteria. Only the characteristics that matter for this system are included. Each requirement in TABLE 3.4 is stated with its justification and with the way it is met or checked in the prototype. Where a figure is a target rather than a measured value, it is marked as such; measured results are reported in Chapter 6.
```

**Paste this — TABLE 3.4:**

```text
TABLE 3.4. Non-Functional Requirements of iPermit
ID|Quality characteristic|Requirement|Justification|How it is met or checked
NFR-S1|Security|All protected endpoints require a signed JWT access token that expires after 30 minutes; each endpoint states which roles may call it, and the role is always read from the server-side user record|Licence, fine and biometric data are sensitive; a short token lifetime limits the damage of a stolen token|Role checks on every protected router; automated tests confirm that a driver receives HTTP 403 from officer-only routes
NFR-S2|Security|Passwords are stored only as bcrypt hashes; failed logins do not reveal whether the email/NIC or the password was wrong|Protects accounts if the database is exposed and prevents account enumeration|Password hashing library; login error message is identical for both cases
NFR-S3|Security|Abuse-prone endpoints are rate-limited per client address: 10 licence applications per hour and 30 face verifications per minute; uploads are limited to 10 MB per file|Face search is computationally expensive and uploads consume storage, so both must be protected from misuse|Rate limiter on the application and verification endpoints; upload size check
NFR-P1|Security (privacy)|Face templates are stored in a separate store (SQLite with a FAISS index), not in the main database, and are used only for identity verification|Limits who and what can reach biometric data; supports purpose limitation under Sri Lanka's data-protection law|Separate template store; the face-status endpoint states openly that liveness detection is not implemented
NFR-P2|Security (privacy)|Location is collected only at the moment a user reports an incident or danger zone; drivers are never tracked continuously|Continuous tracking of drivers is disproportionate to the purpose of incident reporting|No background location code; FR-13 AC5 deliberately not implemented
NFR-P3|Security (privacy)|Explicit, recorded consent before biometric enrolment|Biometric data require a clear legal basis|Target: not yet implemented as a separate step (see Notes for the authors)
NFR-R1|Reliability|Updates that change several records in the main database (licence approval; recording a violation; paying a fine; resolving an appeal) happen in a single database transaction|A partial update, for example points deducted with no fine, would leave the driver's record wrong|Single-transaction service functions; integration tests. The face template is kept in a separate store and is saved after the approval commits, so the two stores are not updated atomically (a known gap, see Chapter 4)
NFR-R2|Reliability|A failure in a secondary step (notifications, push delivery) must not undo the main operation|A failed notification should never reverse an approved licence or a recorded payment|Notifications are created after the main transaction commits, as best-effort steps
NFR-R3|Reliability|The face index can be rebuilt from the template store if it is lost or corrupted|The index is a derived structure and should not be a single point of failure|Index rebuilt from stored templates
NFR-R4|Reliability|An AI result never finalises a decision on its own: ambiguous face matches and (future) AI-flagged violations require officer confirmation|Recognition errors are inevitable (Chapter 6 measures them), so a human must stay responsible for enforcement decisions|Manual-confirmation flag with ranked candidates on the officer screen
NFR-T1|Performance efficiency (response time)|Target: a roadside face verification returns a result within 2 seconds; other API requests respond within 1 second on the reference deployment|A roadside stop should not be slower than checking a physical card|Target values; to be measured on the deployed hardware (Chapter 6)
NFR-T2|Performance efficiency (processing time)|Face search must stay within the NFR-T1 target as the number of enrolled drivers grows, and the search method must be replaceable without changing the rest of the system|A national system would compare each scan against a very large number of templates|The prototype uses an exact FAISS inner-product index, which is fast at prototype scale but grows linearly; an approximate FAISS index can replace it behind the same interface
NFR-U1|Interaction capability (usability)|The officer screens support three verification methods and show points, status and violation history on one screen; the driver app shows licence status and points without navigation|Officers work at the roadside under time pressure; drivers need their status at a glance|Screen design reviewed on an Android phone; formal usability testing is future work
NFR-F1|Flexibility (portability)|One mobile code base runs on Android and iOS; the administrator dashboard runs in any modern browser; the backend runs in Docker containers with configuration supplied through environment variables|The team could not maintain separate native apps, and the backend must move between development and production environments without code changes|Expo/React Native, Next.js, Docker Compose, environment-based settings
NFR-M1|Maintainability|The backend is separated into routers, services and repositories; database changes are made only through versioned migrations; every threshold that has not been validated is a named configuration value|Keeps business rules testable in isolation and makes unvalidated values easy to find and change|Layered code structure; Alembic migrations; automated unit and integration tests
```

**Paste this — 3.6 justification of the response-time targets:**

```text
Two of the requirements need further justification. The response-time target in NFR-T1 comes from the roadside workflow rather than from a technical limit: a digital check is only an improvement if it is at least as fast as reading a physical card, so a verification that takes longer than a few seconds would be abandoned in practice. The target applies to the complete request, including image upload, face detection, embedding and search, and it is stated as a target because it depends on the hardware used in deployment. NFR-T2 follows from the one-to-many design of roadside verification. A driver does not claim an identity before the scan, so each scan is compared against every enrolled driver. The prototype performs an exact search over all templates using a FAISS inner-product index. This is fast for a prototype-sized population, but its cost grows linearly with the number of drivers, so the requirement is written so that an approximate nearest-neighbour index can be substituted at national scale without changing the rest of the system.

Several quantitative targets that appeared in earlier drafts of this project, such as support for 10,000 concurrent users, 99.9% availability and WCAG 2.1 AA accessibility, are not adopted as requirements of this prototype. They describe a national production deployment that was not built or tested in this project, so stating them as requirements would imply a verification that did not take place. They are listed as goals for future work in Chapter 7.
```

---

## 3.7 Methodology for the System Development

**Paste this — 3.7.1 Candidate methodologies:**

```text
3.7.1 Candidate Methodologies

Four families of development methodology were considered. The waterfall model completes each stage (requirements, design, implementation, testing) before the next begins, which suits projects whose requirements are stable and well understood at the start [20]. The Rational Unified Process (RUP) is iterative but prescribes a large set of roles, models and documents across four phases, which is heavy for a small student team. Rapid Application Development (RAD) builds prototypes quickly with intensive user involvement and time-boxed delivery. Agile and incremental methods deliver the system as a series of small, working increments, each of which can be tested and reviewed before the next is started [21], [22].
```

**Paste this — TABLE 3.5:**

```text
TABLE 3.5. Comparison of Candidate Development Methodologies for iPermit
Criterion|Waterfall|RUP|RAD|Incremental (agile-influenced)
Handles requirements that change as AI components are tested|Poor|Good|Good|Good
Produces a working, testable system early|No|Partly|Yes|Yes
Documentation and ceremony overhead for a small team|Medium|High|Low|Low
Depends on frequent access to real end users|Low|Medium|High|Medium
Allows an evaluation step to be added when a risk is found|Poor|Good|Partly|Good
```

**Paste this — 3.7.2 Selected methodology:**

```text
3.7.2 Selected Methodology

An incremental, requirement-driven methodology influenced by agile practice was selected. The functional requirements were divided into eight implementation phases and a final evaluation phase (TABLE 3.6). Each phase delivered a complete vertical slice of the system, from database and API to the user interface, that could be run and tested on its own, instead of building one technical layer for the whole system at a time.

Three characteristics of the project made this choice appropriate. First, the behaviour of the AI components could not be fully specified in advance. The face-matching threshold, the photo-quality limits and the effect of image preprocessing could only be judged once the pipeline was running on real photographs, and one of them, the CLAHE contrast step, was later found to increase false rejections. A waterfall plan would have fixed these values before they could be tested. Second, earlier work on this project had reported a face-recognition accuracy that did not hold up under proper testing (100% training accuracy but 60% test accuracy on a six-person dataset). An incremental approach made it possible to build the pipeline first and add a dedicated evaluation step before making any accuracy claim. Third, RAD was not chosen because it depends on frequent sessions with real end users, and access to traffic police officers and licensing staff was not available during development.
```

**Paste this — TABLE 3.6:**

```text
TABLE 3.6. Development Phases and the Requirements Delivered in Each
Phase|Increment delivered|Requirements
1|Backend foundation: authentication, roles, database and migrations|FR-01
2|Mobile app foundation: login and registration screens, navigation by role|FR-01
3|Licence application, administrator review and digital licence with QR code|FR-02, FR-03, FR-04
4|Face-recognition module: detection, embedding, enrolment and template store|FR-05
5|Police roadside verification and manual violation recording (automated detection deferred)|FR-06, FR-07, FR-08
6|Fines, mock payment, point restoration and appeals|FR-09, FR-10
7|Rule-based driver badges and administrator dashboard|FR-11, FR-14
8|Notifications, road incidents and (later) danger zones|FR-12, FR-13, FR-15
9|Evaluation of face verification on public datasets; interface redesign; testing|All
```

**Paste this — 3.7.3 Development practices:**

```text
3.7.3 Development Practices

Four practices were applied in every phase. Requirements were written with EARS-style acceptance criteria [18], so that each criterion states a single observable condition that can be checked against the running system. Every implementation task was traced back to the requirement it satisfied, and design decisions that changed the specification, such as deferring FR-07 or leaving FR-13 AC5 unimplemented, were recorded with their reasons rather than made silently. A phase was treated as complete only when its features had been exercised against the running system, not only when its automated tests passed; defects found this way were fixed together with a new regression test. Finally, every numerical threshold that had not been validated with data, including the face-match threshold, the photo-quality limits, the point schedule and the fine amounts, was stored as a named configuration value marked as unvalidated, so that it could be identified and replaced once evidence became available.

The method also had limitations. Because no end users were available during development, feedback came from the development team's own testing rather than from drivers, police officers or licensing staff, and a usability study remains to be carried out. The cost of this trade-off is discussed in Chapter 7.
```

---

## References for this chapter

Numbered in order of first appearance in this chapter. All entries were checked
on 2026-09-27: DOIs were resolved on Crossref, and web sources were opened and
the quoted figures found on the page. Renumber them when merging into the
thesis-wide reference list; [1], [2] and [14] are already in your paper as well.

**Paste this:**

```text
[1] J. Deng, J. Guo, E. Ververas, I. Kotsia, and S. Zafeiriou, "RetinaFace: Single-shot multi-level face localisation in the wild," in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2020, pp. 5202–5211, doi: 10.1109/CVPR42600.2020.00525.

[2] J. Deng, J. Guo, N. Xue, and S. Zafeiriou, "ArcFace: Additive angular margin loss for deep face recognition," in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2019, pp. 4685–4694, doi: 10.1109/CVPR.2019.00482.

[3] S. Kemp, "Digital 2026: Sri Lanka," DataReportal, Nov. 8, 2025. [Online]. Available: https://datareportal.com/reports/digital-2026-sri-lanka (accessed Sep. 27, 2026).

[4] Sri Lanka Police, "Performance Report 2024," presented to the Parliament of Sri Lanka, 2025. [Online]. Available: https://www.parliament.lk/uploads/documents/paperspresented/1758173460045362.pdf (accessed Sep. 27, 2026).

[5] Newsfirst, "Online traffic fine payments via GOVPAY," Apr. 11, 2025. [Online]. Available: https://www.newsfirst.lk/2025/04/11/online-traffic-fine-payments-via-govpay (accessed Sep. 27, 2026).

[6] Sri Lanka Mirror, "Island-wide rollout of GovPAY digital traffic fine system complete," Feb. 5, 2026. [Online]. Available: https://srilankamirror.com/news/island-wide-rollout-of-govpay-digital-traffic-fine-system-complete/ (accessed Sep. 27, 2026).

[7] GovPay, "Pay traffic fines online with GovPay." [Online]. Available: https://govpay.lk/en/spot-fine (accessed Sep. 27, 2026).

[8] Cabinet Office of Sri Lanka, "Issuance of a new digital driving license," Cabinet decision, Dec. 9, 2024. [Online]. Available: https://www.cabinetoffice.gov.lk/cab/index.php?option=com_content&view=article&id=16&Itemid=49&lang=en&dID=12920 (accessed Sep. 27, 2026).

[9] Motor Traffic (Amendment) Act, No. 8 of 2009, Parliament of the Democratic Socialist Republic of Sri Lanka, Mar. 11, 2009. [Online]. Available: https://dmt.gov.lk/images/PDF/Downloads/act_no_08of2009_en.pdf (accessed Sep. 27, 2026).

[10] Personal Data Protection Act, No. 9 of 2022, Parliament of the Democratic Socialist Republic of Sri Lanka, Mar. 19, 2022. [Online]. Available: https://www.parliament.lk/uploads/acts/gbills/english/6242.pdf (accessed Sep. 27, 2026).

[11] Personal Data Protection (Amendment) Act, No. 22 of 2025, Parliament of the Democratic Socialist Republic of Sri Lanka, Oct. 30, 2025. [Online]. Available: https://www.parliament.lk/uploads/acts/gbills/english/6384.pdf (accessed Sep. 27, 2026).

[12] Daily FT, "Data protection compliance regime takes effect on 1 Jan. 2027," Aug. 10, 2026. [Online]. Available: https://www.ft.lk/front-page/Data-protection-compliance-regime-takes-effect-on-1-Jan-2027/44-795776 (accessed Sep. 27, 2026).

[13] Department of Motor Traffic, "New driving license." [Online]. Available: https://dmt.gov.lk/index.php?option=com_content&view=article&id=48&Itemid=164&lang=en (accessed Sep. 27, 2026).

[14] Personal Identification — ISO-Compliant Driving Licence — Part 5: Mobile Driving Licence (mDL) Application, ISO/IEC 18013-5:2021, Sep. 2021.

[15] The Sunday Times, "DMT digital overhaul mired in corruption, cost controversy," May 31, 2026. [Online]. Available: https://www.sundaytimes.lk/260531/business-times/dmt-digital-overhaul-mired-in-corruption-cost-controversy-643852.html (accessed Sep. 27, 2026).

[16] Daily Mirror, "Government to introduce demerit system for traffic offenses in September: Bimal," Jun. 9, 2026. [Online]. Available: https://www.dailymirror.lk/breaking-news/Government-to-introduce-demerit-system-for-traffic-offenses-in-September-Bimal/108-342407 (accessed Sep. 27, 2026).

[17] Daily Mirror, "73,489 new vehicles registered this year, total count rises to 8.5 Mn: DMT," Jun. 20, 2025. [Online]. Available: https://www.dailymirror.lk/print/front-page/73-489-new-vehicles-registered-this-year-total-count-rises-to-8-5-Mn-DMT/238-312075 (accessed Sep. 27, 2026).

[18] A. Mavin, P. Wilkinson, A. Harwood, and M. Novak, "Easy approach to requirements syntax (EARS)," in Proc. 17th IEEE Int. Requirements Eng. Conf. (RE), Atlanta, GA, USA, 2009, pp. 317–322, doi: 10.1109/RE.2009.9.

[19] Systems and Software Engineering — Systems and Software Quality Requirements and Evaluation (SQuaRE) — Product Quality Model, ISO/IEC 25010:2023, 2023.

[20] I. Sommerville, Software Engineering, 10th ed. Boston, MA, USA: Pearson, 2016.

[21] C. Larman and V. R. Basili, "Iterative and incremental development: A brief history," Computer, vol. 36, no. 6, pp. 47–56, Jun. 2003, doi: 10.1109/MC.2003.1204375.

[22] J. Highsmith and A. Cockburn, "Agile software development: The business of innovation," Computer, vol. 34, no. 9, pp. 120–127, Sep. 2001, doi: 10.1109/2.947100.
```

---

## Notes for the authors (read before submitting)

1. **No surveys or interviews were run**, so section 3.3 says so and gives a
   reason ("access … could not be arranged"). Replace that reason with your
   team's real one if it's different. Don't reuse the survey percentages from
   the old `projectDetails/CHAPTER 3.docx` (72% driver willingness, 68%
   officer support, 64% privacy concerns, 81% point-system support, "4.2
   minutes per check"). Nothing in the project records where they came from.
2. **Other figures from the old chapter are also dropped** because they're
   unverified or wrong for the built system: ">95% face accuracy", "ANPR"
   (out of scope), "suspension at 12 points" (the system uses 10), Flutter and
   Firebase (not the final stack), "10,000 concurrent users", "99.9% uptime".
   Section 3.6 explains why the scale targets aren't requirements.
3. **Chapter numbers assumed:** Chapter 2 is the literature review, Chapter 6
   testing and evaluation, and Chapter 7 conclusion and future work. Change
   the cross-references if your thesis numbers them differently.
4. **Consent (NFR-P3) isn't implemented.** The chapter says so. If you add a
   consent screen before submitting, change that row to "Implemented".
5. **Your paper's TABLE I says "FAISS gives sub-linear nearest-neighbour
   search".** That isn't true of the code: `backend/app/core/face_index.py`
   uses `IndexFlatIP`, an exact linear search. This chapter describes it
   correctly (NFR-T2). The paper row should be fixed in the same way.
6. **Two things changed recently in the real world**, and both are reflected
   here. GovPay online fine payment has been island-wide since 3 Feb 2026.
   A pilot demerit scheme was announced for September 2026. If the pilot has
   started by the time you submit, update 3.4.1 and P4 in 3.4.2.
7. **Numbers that couldn't be confirmed** from an official source are marked
   "not confirmed" in TABLE 3.2 (licence holders, traffic-police strength,
   DMT staff). If your supervisor has official figures, use them and cite them.
8. **Check your faculty's rules on AI tools.** Parts of this project's
   development and documentation used AI assistance. If Horizon Campus
   requires a declaration, add one.

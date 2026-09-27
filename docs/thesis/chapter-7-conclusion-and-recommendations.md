# Chapter 7 — Conclusion and Recommendations (copy-paste draft)

Draft of thesis Chapter 7 for iPermit. It judges the project against the aim,
objectives and research questions of the research proposal ("Research Proposal
Horizon Campus.pdf", signed 6 July 2025), using only results reported in
Chapters 3 to 6.

## How to use this file

- Text inside ` ```text ` blocks is ready to paste into Word, one paragraph per
  line. Tables are `|`-separated, with the caption on the first line (Insert →
  Table → Convert Text to Table, Other = `|`).
- The template gives no fixed sub-headings for this chapter, so the headings
  below (7.1–7.7) are a suggestion. Rename them if your supervisor prefers.
- If you run the user acceptance test before submitting, update the rows for
  Objective 4 and Research Question 3 (see "Notes for the authors").

---

## 7.1 Summary of the Project

**Paste this:**

```text
This project set out to replace the physical driving licence and the paper-based traffic-fine process in Sri Lanka with an integrated digital platform. The resulting system, iPermit, consists of a mobile application for drivers and traffic police officers, a web dashboard for licensing staff, and a backend service that holds the licensing, enforcement and biometric records. A driver applies for a licence with four face photographs and supporting documents, receives a digital licence with a QR code once an administrator approves the application, and can see their demerit points, fines, behaviour badge and notifications in the app. At the roadside, an officer identifies the driver by face scan, QR code or NIC lookup, sees the driver's record, and records violations; points, fines and suspension are applied in a single transaction, and the driver can pay or appeal the fine in the app. Drivers and officers can also report road incidents and mark danger zones on a shared map.

Of the fifteen functional requirements specified in Chapter 3, thirteen were implemented, two of them with documented exceptions (push delivery was not confirmed on a device, and alerts to drivers near a new incident were left out for privacy reasons); the administrator dashboard (FR-14) was implemented in part, and automated white-line violation detection (FR-07) was deferred. The implementation passed 165 automated backend tests and type checking and linting of both front-end applications (Chapter 6). The face-verification pipeline was evaluated on about two million impostor comparisons from two public datasets and produced no false match between genuinely different people at the deployed threshold, with false-rejection rates of 2.9% and 9.9%.
```

---

## 7.2 Achievement of the Objectives

**Paste this — introduction:**

```text
The research proposal defined one aim, four objectives and three research questions. TABLE 7.1 evaluates each objective against the evidence in Chapters 4 to 6, and TABLE 7.2 does the same for the research questions. Two objectives were achieved in part and two were not achieved; the reasons are discussed below the tables.
```

**Paste this — TABLE 7.1:**

```text
TABLE 7.1. Achievement of the Project Objectives
Objective (from the proposal)|What was delivered|Status|Evidence
O1. Implement and evaluate a facial recognition system for accurate, real-time authentication of drivers under realistic traffic conditions|Face enrolment from four photos with a consistency check and quality gate; one-to-many roadside verification with manual confirmation of uncertain matches; offline evaluation on LFW and a South Asian dataset|Partly achieved|Implemented and tested (TABLE 6.3); FAR 0.0013% and 0.0025%, FRR 2.91% and 9.89% (TABLE 6.7). Not evaluated on Sri Lankan drivers, under roadside conditions, or for response time; no liveness detection
O2. Develop and integrate intelligent traffic-monitoring features: white-line violation detection, accident location visualisation and a point-based penalty system|Point-based penalties with automatic suspension, fines and appeals; map of user-reported road incidents and danger zones|Partly achieved|Points, suspension, fines and appeals fully tested (TC-25 to TC-33); incident map and danger zones tested (TC-37 to TC-41). White-line detection not implemented (FR-07)
O3. Assess the predictive capabilities of AI in tracking driver behaviour and determining point deductions or suspensions|A transparent, rule-based behaviour badge recomputed after every relevant event|Not achieved as stated|No predictive AI model was built or assessed; the rule-based badge was chosen deliberately for explainability (Section 3.5)
O4. Design and conduct usability studies with traffic officers and licensed drivers|Acceptance test plan, tasks per user level and SUS questionnaire|Not achieved|Plan ready (Section 6.5); no study conducted
```

**Paste this — discussion of the objectives:**

```text
Objective 1 was achieved in its implementation but only partly in its evaluation. The system identifies enrolled drivers by face and never lets an uncertain match decide an outcome, and the evaluation on public data showed that the chosen threshold avoids false matches between different people. The objective asked for evaluation "under realistic traffic conditions", however, and no photographs of Sri Lankan drivers taken at the roadside were available. The higher false-rejection rate on South Asian faces, and the finding that the CLAHE preprocessing step doubles false rejections, show why this evaluation is still needed before the system could be trusted in the field.

Objective 2 was achieved for the point-based penalty system, which is the part of the objective with the most direct effect on accountability, and for location visualisation, which was delivered as a map of incidents and danger zones reported by users rather than by automatic accident detection. White-line violation detection was not delivered, because it required a labelled lane dataset and GPU training that the project could not obtain. This was the largest shortfall of the project. The system was designed so that a detector can be added later: officers already record violations through the same workflow, and each violation has a field reserved for the detector's evidence.

Objective 3 was not achieved in the form stated in the proposal. During requirement analysis the team decided that a predictive model deciding or suggesting penalties would be difficult to justify to the driver it affects, and that no historical Sri Lankan driver data existed to train one. The system therefore uses a transparent formula over points, unpaid fines, violation history and tenure, whose result a driver or administrator can recompute by hand. This answers the practical need behind the objective, identifying safe and at-risk drivers, but it does not assess predictive AI, and that question remains open.

Objective 4 was not achieved because no usability study could be arranged within the project timeframe. The acceptance test plan, tasks and questionnaire in Section 6.5 are ready to be used.
```

**Paste this — TABLE 7.2:**

```text
TABLE 7.2. Answers to the Research Questions
Research question (from the proposal)|Answer from this project|Strength of the evidence
RQ1. How accurately and reliably can facial recognition authenticate driver identities and retrieve licence data in real-time enforcement in Sri Lanka?|On public datasets, the pipeline produced no false match between different people at the deployed threshold, while rejecting about 3% (LFW) to 10% (South Asian set) of genuine attempts; licence data is retrieved as part of the same request|Partial: public celebrity data only; no Sri Lankan drivers, roadside conditions or timing measurements
RQ2. How effective are AI-powered modules, such as white-line detection, accident localisation and behaviour-based point deduction, in enhancing traffic monitoring and road safety?|Not answered: white-line detection was not built, localisation relies on user reports, and point deduction is rule-based; no road-safety outcome was measured|None
RQ3. How do drivers and enforcement personnel perceive the usability, efficiency and impact of moving to a virtual licence?|Not answered: no user study was conducted|None
```

---

## 7.3 Contribution of the Project

**Paste this:**

```text
Chapter 2 identified that existing work treats digital licences, face recognition, point-based enforcement and mobile platforms separately, and that little of it addresses Sri Lanka. The main contribution of this project is a working prototype that brings these parts together in one system: the same record links a driver's licence, face template, points, fines, appeals, behaviour badge and notifications, and it is used by all three user groups. The project also contributes an honest measurement of how an off-the-shelf face-recognition pipeline behaves on South Asian faces, including the finding that a common preprocessing step makes it worse, and a set of design decisions for this domain: an AI result never decides an enforcement outcome, drivers are never tracked continuously, and every threshold that has not been validated is stored and reported as such.

The prototype also has to be placed in the context of recent developments. Since this project began, Sri Lanka has rolled out online payment of traffic fines through GovPay across all nine provinces and has approved a digital driving licence and a pilot demerit scheme (Section 3.4.1). These initiatives cover payment, the licence card and points separately. iPermit shows how they could work as one system, and a real deployment should integrate with GovPay and the official points regulations rather than duplicate them.
```

---

## 7.4 Critical Evaluation

**Paste this:**

```text
The strongest part of the project is the reliability of its core enforcement workflow. Every change that affects several records in the main database happens in one transaction, every error the system is designed to reject is tested, and the face module fails safely by asking the officer to decide. The evaluation of face verification was also more rigorous than the project's earlier work, which had reported 100% accuracy on six people: it used about two million impostor comparisons, confidence intervals, and a check that the evaluation reproduced the deployed pipeline exactly.

The weaknesses are equally clear. The system has not been used by any real driver, officer or licensing officer, so its usability and its effect on the time taken at a roadside stop are unknown. The face pipeline has not been tested on the population it is meant to serve, and its default photo-sharpness limit rejected a clear selfie from a real phone, so real drivers would currently struggle to enrol. The prototype runs only on a development machine, has no consent step before biometric enrolment, and its backend code does not yet pass all of its own style checks. Finally, one of the proposal's two AI components was not built. These weaknesses do not invalidate the prototype, but they mean it demonstrates feasibility rather than readiness for deployment.
```

---

## 7.5 Lessons Learned

**Paste this:**

```text
Five lessons stand out from the project.

Measure AI components before trusting them. The earlier prototype's 100% face-recognition accuracy did not hold up, and this project's own evaluation changed two design assumptions: the match threshold was confirmed, but the CLAHE step that had been added to improve lighting turned out to increase false rejections. An accuracy figure without a proper test set, error rates and confidence intervals says very little.

Test on the real device early. Two problems appeared only on an Android phone: the photo-sharpness threshold rejected good selfies, and the default map tiles rendered as a blank grey area. Both were invisible in the browser preview used for most of the development.

Decide scope conflicts explicitly. When the violation detector could not be trained, and when the requirement to alert nearby drivers conflicted with the privacy requirement, the team recorded the decision and its reason instead of quietly dropping the feature. This kept the rest of the schedule intact and made the gaps easy to explain.

Keep a human in the loop for enforcement decisions. Designing the face search to return ranked candidates, rather than one answer, made the system usable even with the error rates measured in Chapter 6.

Automate quality checks. Style checks that were clean earlier in the project had drifted by the end, because they were run by hand. Running tests and linters automatically on every change would have caught this at once.
```

---

## 7.6 Limitations of the Final Product

**Paste this:**

```text
The main limitations of the final product are the following. Automated white-line violation detection is not implemented, and violations must be recorded manually. Face verification has not been validated on Sri Lankan drivers or roadside photographs, has no liveness detection and can therefore be deceived by a photograph of an enrolled driver, and its default photo-quality limits are too strict for ordinary phone cameras. No consent is recorded before biometric enrolment. The payment flow is simulated, and the point schedule, suspension threshold and fine amounts are placeholders rather than official values. Remote push notifications have not been confirmed on a device, the mobile app has not been tested on iOS, and alerts to drivers near a new incident were deliberately not implemented for privacy reasons. The face search compares each scan with every template, which is fast for a prototype but would need an approximate index at national scale. Finally, the system has only been run on a development machine and has not been load-tested or evaluated by users.
```

---

## 7.7 Recommendations and Future Work

**Paste this — introduction:**

```text
The recommendations in TABLE 7.3 are ordered by priority. The first four would be needed before any trial with real users; the remainder would be needed for a national deployment or would extend the system.
```

**Paste this — TABLE 7.3:**

```text
TABLE 7.3. Recommendations and Future Work
Priority|Recommendation|Reason
1|Recalibrate the photo-quality gate on real phone photos and remove the CLAHE step|Real selfies are currently rejected, and CLAHE doubled false rejections in the evaluation
2|Add an explicit, recorded consent step before face enrolment and carry out a data-protection impact assessment|Face data is a special category under the Personal Data Protection Act
3|Collect a consented dataset of Sri Lankan drivers photographed with phones and re-validate the matching threshold|The current error rates come from celebrity datasets and are higher on South Asian faces
4|Run the acceptance test in Section 6.5 with drivers, officers and licensing staff|Usability and acceptance are unknown (Objective 4, RQ3)
5|Add presentation-attack (liveness) detection and test it following ISO/IEC 30107-3 [1]|A printed photo or a screen could currently be presented to the camera
6|Train and integrate the white-line violation detector once a labelled lane dataset and GPU time are available, with officer confirmation of every detection|Completes Objective 2 and answers part of RQ2
7|Integrate with GovPay, DMT licensing records and the official driver improvement points regulations|Replaces the mock payment and placeholder values with the national systems
8|Replace the exact face index with an approximate FAISS index, measure response times and load-test the backend|Needed to meet NFR-T1 and NFR-T2 at national scale
9|Deploy on managed infrastructure with HTTPS, backups, monitoring, and automated tests and linting on every change|The prototype runs only on a development machine
10|Produce a standalone mobile build to test push notifications and iOS, and add Sinhala and Tamil interfaces|Push and iOS are unverified; the interface is English-only
11|Revisit a predictive driver-risk model once historical data exists, keeping it explainable to the driver|Objective 3 remains open
```

**Paste this — concluding paragraph:**

```text
iPermit shows that a digital driving licence, biometric roadside verification, points, fines, appeals and user-reported hazards can be combined in one working system built from open-source components, and that such a system can be designed so that its AI parts support, rather than replace, the judgement of the officer. The project did not deliver every AI feature it proposed and has not yet been tested with its users, but the prototype, its test suite and the evaluation of its face pipeline give a sound and honest starting point for the next stage: validating the system with real Sri Lankan users and data, and connecting it to the digital services the country is now introducing.
```

---

## References for this chapter

**Paste this:**

```text
[1] Information Technology — Biometric Presentation Attack Detection — Part 3: Testing and Reporting, ISO/IEC 30107-3:2023, Jan. 2023.
```

(Checked on the ISO page, https://www.iso.org/standard/79520.html, on
2026-09-27.)

---

## Notes for the authors (read before submitting)

1. **If you run the UAT before submitting**, change O4 in TABLE 7.1 and RQ3
   in TABLE 7.2 to the real outcome, replace "has not been used by any real
   driver…" in 7.4, and drop recommendation 4.
2. **Objective 3.** The chapter says the team chose a rule-based badge
   instead of predictive AI "during requirement analysis". That matches
   `docs/requirements.md` REQ-11 and the approval recorded in
   `docs/methodology.md` §4.6. Keep the wording if it matches how you
   remember the decision.
3. **Counts to re-check if the code changes:** "thirteen were
   implemented" (FR-01–06, 08–13 and 15, with the exceptions for FR-12 and
   FR-13 stated in the text), and "165 automated tests".
4. **If you fix the Ruff/Black findings** (Chapter 6), delete the sentence
   "its backend code does not yet pass all of its own style checks" in 7.4.

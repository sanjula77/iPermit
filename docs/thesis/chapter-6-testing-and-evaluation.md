# Chapter 6 — Testing and Evaluation (copy-paste draft)

Draft of thesis Chapter 6 for iPermit. Every result in this chapter comes from
a run on the development machine on 2026-09-27, or from the face-verification
evaluation in `docs/evaluation/results/`. Raw evidence for the appendix is in
`docs/thesis/evidence/`.

## How to use this file

- Text inside ` ```text ` blocks is ready to paste into Word, one paragraph per
  line. Tables are `|`-separated, with the caption on the first line: paste,
  select, then **Insert → Table → Convert Text to Table**, **Other** = `|`.
- The template asks for detailed test results as screenshots in an appendix.
  Use `docs/thesis/evidence/` (see "Appendix material" at the end).
- **Section 6.5 (Acceptance Testing) has no results yet**, because no user
  acceptance test has been carried out. It gives an honest status paragraph,
  a ready-to-run plan and questionnaire, and an empty results table to fill
  in after the sessions. Read "Notes for the authors" at the end.

---

## 6.1 Introduction

**Paste this:**

```text
This chapter shows how iPermit was tested and what the tests found. Testing had two purposes: verification, which checks that the system behaves as its functional and non-functional requirements specify (Sections 3.5 and 3.6), and validation, which checks that the system is suitable for its users. Section 6.2 describes the testing procedure and the levels at which the system was tested. Section 6.3 presents the test plan and the test cases, each traced to a requirement. Section 6.4 reports the test data and results, including the behaviour of the system when errors occur and a quantitative evaluation of face verification on public datasets. Section 6.5 covers acceptance testing by users.
```

---

## 6.2 Testing Procedure

**Paste this:**

```text
Testing was carried out at five levels, from the smallest unit of code to the complete running system (TABLE 6.1).

Static analysis was applied to all three applications. The TypeScript compiler was run in strict type-checking mode (tsc --noEmit) on the mobile app and the administrator dashboard, ESLint checked both for coding errors, and Ruff and Black checked the Python backend.

Unit tests covered the business rules that were written as pure functions without database or network access: the driver-behaviour score and tier thresholds, the consistency check between enrolment photographs, the photo-quality gate, CLAHE preprocessing, the Haversine distance calculation, the FAR/FRR/EER calculations used in the evaluation, and the serialisation of timestamps.

Integration tests exercised every group of API endpoints through FastAPI's test client, sending real HTTP requests and checking both the response and the resulting database state. They run against an isolated in-memory database that is created and destroyed for each test, a separate temporary face-template store, and the real face-recognition models applied to fixture photographs, so that enrolment and face search are tested with genuine inference rather than simulated results. Negative cases, such as missing tokens, wrong roles, invalid uploads, repeated actions and non-existent records, were tested as deliberately as the successful paths.

Live verification was performed at the end of every development phase against the running Docker deployment with a PostgreSQL database, using the administrator dashboard in a browser, the mobile application in a browser preview and on an Android phone through Expo Go, and direct API calls. A phase was not considered complete until this check had passed. When live verification exposed a defect that the automated tests had missed, the defect was fixed and a regression test was added.

Finally, the face-verification pipeline was evaluated quantitatively on two public, labelled face datasets using the same models and preprocessing as the backend, to measure its false-acceptance and false-rejection rates (Section 6.4.4).
```

**Paste this — TABLE 6.1:**

```text
TABLE 6.1. Testing Levels, Tools and Scope
Level|Tool|What was tested|Environment
Static analysis|TypeScript compiler (tsc), ESLint, Ruff, Black|Type errors, coding errors and formatting in all three applications|Development machine
Unit testing|pytest|Pure business-rule functions (badge formula, photo consistency and quality, CLAHE, Haversine, FAR/FRR/EER, timestamps)|Backend container
Integration testing|pytest with FastAPI TestClient|All API endpoint groups, including authentication, roles, validation, transactions and error responses, with real face inference on fixture photos|Backend container, in-memory database, temporary template store
Live verification|Browser, Android phone (Expo Go), curl|Complete user workflows for each role against the running system|Docker Compose (PostgreSQL + backend) on the development machine
AI evaluation|Jupyter notebook (Google Colab), evaluation harness|Face-verification error rates (FAR, FRR, EER, TAR) on LFW and a South Asian celebrity dataset|Google Colab; results reproduced in the backend container
```

---

## 6.3 Test Plan and Test Cases

**Paste this — 6.3.1 Test Plan:**

```text
6.3.1 Test Plan

The test plan in TABLE 6.2 defines what was tested, how, and when testing was considered complete. Its main principle was that every functional requirement must be covered by at least one automated test case and by a live check of the complete workflow, and that every error the system is designed to reject must be tested explicitly.
```

**Paste this — TABLE 6.2:**

```text
TABLE 6.2. Test Plan
Item|Description
Objective|Verify that the implemented functional requirements (FR-01 to FR-15, except the deferred FR-07) and the testable non-functional requirements behave as specified, and measure the error rates of face verification
Items under test|Backend REST API and services; face-recognition module; mobile application (driver and police roles); administrator dashboard
Features not tested|Automated violation detection (FR-07, not implemented); delivery of push notifications to a device; iOS; performance under concurrent load
Approach|Static analysis; unit tests for pure functions; integration tests through the HTTP API including negative cases; live end-to-end checks per phase; offline AI evaluation on public datasets
Test data|Synthetic users, applications, violations and fines created by each test; fixture face photographs (one face; two faces); invalid, oversized and non-image files; boundary and out-of-range values (e.g. danger-zone radius 10, 50, 1000 and 5000 m); public face datasets LFW and 100 Bollywood Celebrity Faces
Environment|Backend Docker image (Python 3.11), in-memory test database and temporary face store for automated tests; Docker Compose with PostgreSQL 16 for live checks; Android phone with Expo Go; Google Colab for the face evaluation
Entry criteria|Feature implemented; code passes type checking and linting
Exit criteria|All automated tests pass; the live workflow for the phase completes without errors; any defect found is fixed with a regression test
Deliverables|Test results (TABLES 6.3–6.7), test logs and screenshots in the appendix
```

**Paste this — 6.3.2 Test Cases:**

```text
6.3.2 Test Cases

TABLE 6.3 lists representative test cases, each traced to the requirement it verifies. Each case corresponds to one or more automated tests in the backend test suite, which contains 156 test functions in 18 files; one of them is parametrised over ten score values at the tier boundaries, so the suite runs 165 test cases in total. The full list is given in the appendix. Expected results are stated as the HTTP status code and the observable effect on the system.
```

**Paste this — TABLE 6.3:**

```text
TABLE 6.3. Representative Test Cases
TC|Req.|Test case|Test data / input|Expected result|Result
TC-01|FR-01|Register a new driver|Valid email, NIC and password|201 Created; account has role DRIVER|Pass
TC-02|FR-01, NFR-S1|Register with a client-supplied role|Registration request containing role = ADMIN|201 Created, but the account is a DRIVER; the supplied role is ignored|Pass
TC-03|FR-01|Register with a duplicate email or NIC|Email or NIC of an existing user|409 Conflict|Pass
TC-04|FR-01, NFR-S2|Log in with a wrong password|Correct email, wrong password|401 Unauthorized with no hint as to which field was wrong|Pass
TC-05|NFR-S1|Call a protected endpoint without a token|No Authorization header|401 Unauthorized|Pass
TC-06|FR-02|Submit a valid licence application|4 face photos, NIC, medical and birth certificates|201 Created; status PENDING|Pass
TC-07|FR-02|Submit with the wrong number of photos|3 face photos|422; no files left on disk|Pass
TC-08|FR-02|Submit a blurry face photo|Photo below the sharpness threshold|422; the error identifies which photo failed|Pass
TC-09|FR-02|Submit a non-image or corrupted file|Text file (text/plain) as a face photo; invalid image bytes|422 ("Unsupported file type" or invalid image); the error identifies the failing photo or document|Pass
TC-10|FR-02|Apply while an application is pending or after being licensed|Second application|409 Conflict|Pass
TC-11|FR-03|Non-administrator lists applications|Driver token|403 Forbidden|Pass
TC-12|FR-03, FR-04, FR-05|Approve an application|Pending application with 4 consistent face photos|200; licence issued with number, QR token and expiry; face template enrolled; badge PLATINUM|Pass
TC-13|FR-03|Approve an already decided application|Approved application|409 Conflict|Pass
TC-14|FR-03|Reject without a reason|Empty reason|422|Pass
TC-15|FR-05|Approve when a photo has no face or two faces|Fixture photo with two faces|422; application remains PENDING; no template created|Pass
TC-16|FR-05, NFR-R2|Face engine fails during approval|Simulated engine failure|503; application remains PENDING|Pass
TC-17|FR-04|Driver views another driver's licence|Second driver's token|404 Not Found; no data disclosed|Pass
TC-18|FR-06|Non-officer calls face verification|Driver token|403 Forbidden|Pass
TC-19|FR-06, NFR-R4|Face scan of an enrolled driver|Photo of the enrolled face|200; best match returned; no manual confirmation needed|Pass
TC-20|FR-06, NFR-R4|Face scan with no enrolled drivers|Any face photo, empty index|200; no candidates; requires_manual_confirmation = true|Pass
TC-21|FR-06|Face scan photo with no face or several faces|Blank image; two-face fixture|422|Pass
TC-22|FR-06, NFR-S3|Face scan with an invalid, oversized or huge image|Non-image; file over 10 MB; image with too many pixels|422|Pass
TC-23|NFR-S3|Exceed the face-verification rate limit|31 requests within a minute|Requests 1–30 processed; request 31 returns 429|Pass
TC-24|FR-06|Verify by QR code and by NIC or licence number|Valid and unknown tokens and numbers|200 with driver summary; 404 for unknown values|Pass
TC-25|FR-08|Record a violation|WHITE_LINE for a licensed driver|200; +3 points; fine of LKR 2,000 created|Pass
TC-26|FR-08|Repeated violations reach the threshold|Violations totalling 10 points|Licence SUSPENDED; badge SUSPENDED; suspension notification|Pass
TC-27|FR-08|Record a violation for a driver without a licence|Driver with no licence|404|Pass
TC-28|FR-09|Pay a fine|Unpaid fine|200; fine PAID; points restored; suspended licence reactivated|Pass
TC-29|FR-09|Pay a fine twice, or another driver's fine|Paid fine; other driver's fine|409 Conflict; 404 Not Found|Pass
TC-30|FR-10|Appeal a fine twice, or appeal a paid fine|Second appeal; paid fine|409 Conflict|Pass
TC-31|FR-10|Pay a fine while its appeal is pending|Fine with a pending appeal|409 Conflict|Pass
TC-32|FR-10|Administrator overturns an appeal|Pending appeal|Fine REVERSED; points restored; badge recovers; driver notified|Pass
TC-33|FR-10|Administrator upholds an appeal|Pending appeal|Fine stays UNPAID; points unchanged; driver notified|Pass
TC-34|FR-11|Badge score and tiers|Synthetic records at each tier boundary|Correct tier at each boundary; SUSPENDED overrides the score|Pass
TC-35|FR-12|Notifications for each event|Approval, rejection, violation, suspension, payment, appeal outcome|One notification per event; a driver cannot mark another driver's notification as read (403)|Pass
TC-36|FR-12|Push token triggers a push request|Registered Expo push token|Push request sent to the Expo API when the next notification is created|Pass
TC-37|FR-13|Report and list nearby incidents|Incident at a location; query within and far outside the radius|Incident listed nearby; excluded when far away|Pass
TC-38|FR-13|Incident expiry|Incident older than 4 hours|Excluded from the list and marked EXPIRED|Pass
TC-39|FR-13|Report an incident with an invalid latitude|Latitude outside -90 to 90|422|Pass
TC-40|FR-15|Danger-zone radius limits|Radius 10, 50, 1000 and 5000 m|50 and 1000 accepted; 10 and 5000 rejected with 422|Pass
TC-41|FR-15|Clear a danger zone|Zone cleared by its creator and by another user; cleared twice|Removed from the nearby list; clearing is idempotent|Pass
```

---

## 6.4 Test Data and Test Results

**Paste this — 6.4.1 Automated test results:**

```text
6.4.1 Automated Test Results

The backend test suite was run in the backend Docker image on the development machine (Intel Core i5-1145G7, 14 GB RAM, Ubuntu 26.04). TABLE 6.4 summarises the result by test file. All 165 test cases passed in 242.2 seconds. The readiness check (test_auth.py) requires the PostgreSQL container to be running: in an earlier run without the database it correctly reported the service as not ready and that single test failed, so the final run was made with the database started. The slowest tests, at four to eight seconds each, are those that run real face inference on the CPU.

Static analysis of the two TypeScript applications passed: the TypeScript compiler reported no errors and ESLint reported no problems in either the mobile application or the administrator dashboard. The first run of the Python style checks did not pass. Ruff 0.8.4 reported 70 findings, of which 26 were over-long lines and 44 were automatically fixable style issues (older type-annotation syntax, import order and two unused imports), and Black 24.10.0 reported that 11 files would be reformatted. Sixty of the Ruff findings were in database migration files generated by Alembic. Because a migration that has already been applied should not be edited, these files were excluded from both checks, which is the usual treatment for generated code. The remaining findings in application code, scripts and tests were corrected using the tools' automatic fixes and one manual line split. On the final run Ruff reported no findings, Black left all 102 files unchanged, and the full test suite still passed. None of the findings had been a correctness error.
```

**Paste this — TABLE 6.4:**

```text
TABLE 6.4. Backend Automated Test Results (Run on 28 September 2026)
Test file|Requirements|What it tests|Test cases|Passed|Failed
test_auth.py|FR-01, NFR-S1, NFR-S2|Registration, login, token checks, health and readiness|8|8|0
test_applications.py|FR-02|Application submission, validation, quality gate, ownership|14|14|0
test_admin.py|FR-03|Application review, approval, rejection, re-application rules|14|14|0
test_licenses.py|FR-04|Licence issue on approval, uniqueness, access control|6|6|0
test_face_consistency.py|FR-05|Consistency check between enrolment embeddings (unit)|5|5|0
test_face_enrollment.py|FR-05|Enrolment with real face inference, index updates, liveness disclosure|6|6|0
test_face_preprocessing.py|FR-02, FR-05|CLAHE and photo-quality gate (unit)|7|7|0
test_police.py|FR-06, FR-08, NFR-S3|Face, QR and NIC verification, uploads, rate limit, violation recording|20|20|0
test_fines.py|FR-09|Fine listing and mock payment, point restoration, reactivation|7|7|0
test_appeals.py|FR-10|Appeal submission and resolution (upheld and overturned)|9|9|0
test_badge_formula.py|FR-11|Badge score and tier thresholds (unit, 10 parametrised cases)|18|18|0
test_badges.py|FR-11|Badge creation and recomputation after events; admin distribution|9|9|0
test_notifications.py|FR-12|Notifications per event, read marking, push token|10|10|0
test_road_incidents.py|FR-13|Incident reporting, nearby search, confirm, clear, expiry|8|8|0
test_danger_zones.py|FR-15|Danger-zone marking, radius limits, confirm, clear|12|12|0
test_geo.py|FR-13, FR-15|Haversine distance (unit)|2|2|0
test_face_evaluation.py|Evaluation|FAR, FRR and EER calculations (unit)|6|6|0
test_utc_datetime.py|NFR-M1|Timestamp serialisation with UTC offset (unit)|4|4|0
Total (18 files)|||165|165|0
```

**Paste this — 6.4.2 Live verification results:**

```text
6.4.2 Live Verification Results

TABLE 6.5 summarises the end-to-end checks carried out on the running system at the end of each development phase. These checks found defects that the automated tests had not, including a rate-limiter state that leaked between tests, an error path that hid a specific exception, a rejected enrolment photo that was left on disk, an unstyled container that painted a visible seam over the licence card, and a photo-sharpness threshold that rejected clear selfies taken with a real phone. Each was fixed, and a regression test was added where the defect could be reproduced automatically.
```

**Paste this — TABLE 6.5:**

```text
TABLE 6.5. Live End-to-End Verification of the Main Workflows
Workflow|Role(s)|Checked on|Outcome
Register, log in by email and by NIC, wrong password rejected|Driver|API and browser preview|Pass
Submit an application with 4 photos and 3 documents, see status PENDING|Driver|Browser preview|Pass
Review, approve and reject applications|Admin|Admin dashboard in browser|Pass
Digital licence card with QR code shown after approval|Driver|Browser preview|Pass
Face scan of an enrolled driver returns the driver; empty index requires manual confirmation|Police|Browser preview and API|Pass
QR scan and NIC lookup open the driver's record|Police|Browser preview|Pass
Record violations until suspension at 10 points; reactivation after payment|Police, Driver|Mobile interface|Pass
Pay a fine through the mock payment flow|Driver|Browser preview|Pass
Submit an appeal and resolve it as upheld and as overturned|Driver, Admin|Mobile app and admin dashboard|Pass
Badge changes after violation, payment and appeal; admin badge distribution and attention queue|Driver, Admin|Mobile app and admin dashboard|Pass
Report, confirm and clear road incidents and danger zones; map shown on the phone|Driver, Police|Android phone (Expo Go)|Pass
Location permission denied: map falls back to Colombo and reporting is disabled|Driver|Mobile app|Pass
Application with a real phone selfie|Driver|Android phone|Fail at first: default sharpness threshold (100) rejected a clear selfie scoring about 23; open issue (see Section 6.4.3)
Remote push notification received on the phone|Driver|Android phone (Expo Go)|Not tested: Expo Go does not support remote push on Android
```

**Paste this — 6.4.3 System behaviour on errors:**

```text
6.4.3 System Behaviour When Errors Occur

The system was designed to fail safely: an error must never leave the database in a partially updated state, never reveal internal details, and never let an uncertain AI result decide an outcome. TABLE 6.6 lists the main error conditions, the behaviour the system shows, and the test cases that confirm it. Two design decisions underlie this behaviour. Operations that change several records in the main database, such as approving an application or paying a fine, run as a single database transaction, so an error at any step rolls back all of them. The face template is the exception: because it is kept in a separate store, it is built before the approval and saved after the approval has committed, so the two stores are not updated atomically. Secondary steps such as notifications run only after the main transaction has committed, so their failure cannot undo a completed operation.

One error condition is an open issue rather than a confirmed behaviour. On a real Android phone, a clear, well-lit selfie scored about 23 on the Laplacian-variance sharpness measure, below the default threshold of 100, so the application was rejected as blurry. The threshold was lowered locally for testing, but the default value has not yet been recalibrated on real phone photos. This must be done before user acceptance testing, otherwise drivers will not be able to apply.
```

**Paste this — TABLE 6.6:**

```text
TABLE 6.6. Error Conditions and Required System Behaviour
Error condition|System behaviour|Evidence
Missing, invalid or expired token|401 Unauthorized; no data returned|TC-05
User calls an endpoint for another role|403 Forbidden|TC-11, TC-18
Driver requests another driver's application, licence or fine|403 or 404; no data disclosed|TC-17, TC-29
Invalid input (wrong photo count, missing reason, out-of-range coordinates or radius)|422 with a message identifying the failing field or file|TC-07, TC-14, TC-39, TC-40
Unreadable, non-image, oversized or blurry upload|422; the failing photo or document is named; no files left on disk|TC-08, TC-09, TC-22
Repeated or conflicting action (duplicate registration, second decision, double payment, second appeal, payment during an appeal)|409 Conflict; state unchanged|TC-03, TC-13, TC-29, TC-30, TC-31
Too many face-verification requests|429 Too Many Requests|TC-23
Face engine failure during submission, approval or verification|503 without internal details; application stays PENDING; no partial licence or template|TC-16
No face, several faces or inconsistent enrolment photos|422; nothing enrolled|TC-15, TC-21
Face match below the threshold or no enrolled drivers|No automatic decision; ranked candidates and requires_manual_confirmation = true|TC-20
Push or notification failure after a successful operation|Main operation remains committed; failure logged|Design (NFR-R2); push request construction tested in TC-36
Face template cannot be saved after an approval has committed|Known gap: the licence remains issued, but the driver cannot be found by face scan until re-enrolled; QR and NIC lookup still work|Design review of the approval flow; not covered by an automated test
Location permission denied|Map uses a fallback location; incident and danger-zone reporting disabled|Live check (TABLE 6.5)
```

**Paste this — 6.4.4 Face-verification evaluation:**

```text
6.4.4 Evaluation of Face Verification

The automated tests show that face enrolment and search work, but not how often they make mistakes. To measure this, the complete face pipeline used by the backend (CLAHE, RetinaFace detection and ArcFace embedding with the InsightFace buffalo_l models) was evaluated offline on two public, identity-labelled datasets: LFW (96 identities with at least 15 images, mostly Western public figures) and the 100 Bollywood Celebrity Faces collection (100 South Asian identities), with up to 15 images per identity [1]–[3]. Every pair of images was compared, giving 9,396 genuine and 949,024 impostor pairs for LFW and 10,500 genuine and 1,113,750 impostor pairs for the Bollywood set. Following ISO/IEC 19795-1 [4], the results are reported as false accept rate (FAR), false reject rate (FRR), equal error rate (EER) and true accept rate at a fixed FAR, with 95% confidence intervals from an identity-level bootstrap. Re-computing the LFW embeddings inside the backend container reproduced the Colab embeddings exactly.

TABLE 6.7 gives the results at the deployed threshold of 0.42. The system accepted 12 of 949,024 LFW impostor pairs and 28 of 1,113,750 Bollywood impostor pairs, and every one of these 40 false accepts involved one of three photographs that were mislabelled in the datasets; no pair of genuinely different people exceeded the threshold. False rejections were more frequent: 2.91% on LFW and 9.89% on the Bollywood set, and the confidence intervals of the two do not overlap. The gap persisted after likely mislabelled images were removed, and it cannot be attributed to demographics alone, because the Bollywood images are film stills and publicity photographs that differ in style from the news photographs in LFW. A separate test on LFW showed that removing the CLAHE step reduced FRR from 2.95% to 1.37% with no change in FAR, so the preprocessing step increases false rejections.

These results support the design decision that an officer confirms any uncertain match (NFR-R4): the threshold is conservative enough that false matches between different people were not observed, while a false rejection falls back to QR or NIC lookup. They are, however, measured on celebrity photographs and not on Sri Lankan drivers photographed with phones, so they indicate the behaviour of the pipeline rather than its performance in the field.
```

**Paste this — TABLE 6.7:**

```text
TABLE 6.7. Face-Verification Results at the Deployed Threshold τ = 0.42 (95% Confidence Intervals)
Dataset|Genuine pairs|Impostor pairs|FAR|FRR|EER (threshold)|TAR at FAR = 0.1%
LFW|9,396|949,024|0.0013% (0–0.008%)|2.91% (1.79–4.09%)|0.32% (0.194)|99.63%
Bollywood Celebrity Faces|10,500|1,113,750|0.0025% (0–0.010%)|9.89% (8.30–11.72%)|1.13% (0.209)|98.40%
```

**Insert Figure 6.1:** `docs/evaluation/results/fig_det_curve.png`

```text
Fig. 6.1. Detection error trade-off (DET) curves for face verification on LFW and the Bollywood dataset; markers show the deployed threshold τ = 0.42
```

**Paste this — 6.4.5 Limitations of the testing:**

```text
6.4.5 Limitations of the Testing

Several limits of the testing should be stated. The automated integration tests use an in-memory database rather than PostgreSQL; the PostgreSQL behaviour was checked only through the live verification. The mobile application and the administrator dashboard have no automated user-interface tests and were checked manually. Remote push delivery was not confirmed on a device, and the mobile application was not tested on iOS. No load or concurrency test was carried out, so the response-time targets in NFR-T1 have not been measured. One endpoint, the list of a driver's own appeals, is exercised by the mobile application but has no automated test. Finally, the face evaluation used public celebrity datasets, not Sri Lankan drivers.
```

---

## 6.5 Acceptance Testing

**Paste this — status paragraph (use this until the UAT has been run):**

```text
User acceptance testing with drivers, traffic police officers and licensing staff has not yet been carried out, so no acceptance results are reported in this chapter. The plan for the acceptance test is described below; it will measure whether each user group can complete its main tasks, how usable the system is, and what changes users would ask for.
```

**Paste this — 6.5.1 Acceptance test plan:**

```text
6.5.1 Acceptance Test Plan

Participants will be recruited from each user level: licensed drivers, traffic police officers and licensing staff (TABLE 6.8). Each participant will be given a short introduction and then asked to complete the tasks for their role without help, on an Android phone (drivers and officers) or in a web browser (administrators), using test accounts and test data only. The observer will record whether each task is completed, the time taken and any errors. After the tasks, each participant will complete the System Usability Scale (SUS) questionnaire [5] and answer open questions about what worked, what did not, and what they would change. SUS scores will be interpreted using the adjective ratings of Bangor et al. [6]. Participation will be voluntary, informed consent will be obtained, and no real personal or biometric data will be collected.
```

**Paste this — TABLE 6.8:**

```text
TABLE 6.8. Acceptance Test Participants and Tasks
User level|Planned participants|Tasks
Driver|[number]|Register; submit a licence application; view the digital licence and QR code; view points and badge; pay a fine; appeal a fine; report an incident and mark a danger zone
Traffic police officer|[number]|Log in; verify a driver by face scan, by QR code and by NIC; view the driver's record; record a violation; report an incident
Licensing staff (administrator)|[number]|Log in; review and approve or reject applications; resolve an appeal; view the badge distribution and attention queue
```

**Questionnaire for the appendix (System Usability Scale, 1 = strongly disagree … 5 = strongly agree):**

```text
1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.
Open questions: (a) What did you find most useful? (b) What was difficult or confusing? (c) What would you change or add?
```

> SUS scoring: for odd items subtract 1 from the answer, for even items
> subtract the answer from 5, add the ten values and multiply by 2.5 to get a
> score from 0 to 100.

**Results table (fill in after the sessions, then replace the status paragraph):**

```text
TABLE 6.9. Acceptance Test Results
User level|Participants|Task completion rate|Mean SUS score|Main comments
Driver|[n]|[%]|[score]|[summary]
Traffic police officer|[n]|[%]|[score]|[summary]
Licensing staff|[n]|[%]|[score]|[summary]
```

---

## References for this chapter

Checked on 2026-09-27 (DOIs resolved on Crossref; web pages opened).

**Paste this:**

```text
[1] G. B. Huang, M. Ramesh, T. Berg, and E. Learned-Miller, "Labeled Faces in the Wild: A database for studying face recognition in unconstrained environments," Univ. of Massachusetts, Amherst, MA, USA, Tech. Rep. 07-49, Oct. 2007.

[2] havingfun, "100 Bollywood celebrity faces," Kaggle dataset. [Online]. Available: https://www.kaggle.com/datasets/havingfun/100-bollywood-celebrity-faces (accessed Sep. 20, 2026).

[3] J. Deng, J. Guo, N. Xue, and S. Zafeiriou, "ArcFace: Additive angular margin loss for deep face recognition," in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2019, pp. 4685–4694, doi: 10.1109/CVPR.2019.00482.

[4] Information Technology — Biometric Performance Testing and Reporting — Part 1: Principles and Framework, ISO/IEC 19795-1:2021, 2021.

[5] J. Brooke, "SUS: A 'quick and dirty' usability scale," in Usability Evaluation in Industry. London, U.K.: Taylor & Francis, 1996, pp. 189–194.

[6] A. Bangor, P. T. Kortum, and J. T. Miller, "An empirical evaluation of the System Usability Scale," Int. J. Hum.–Comput. Interact., vol. 24, no. 6, pp. 574–594, 2008, doi: 10.1080/10447310802205776.
```

---

## Appendix material

Files for the appendix are in `docs/thesis/evidence/`:

- `pytest-backend.txt`: full verbose output of the final test run (165 passed).
- `static-analysis-frontend.txt`: `tsc --noEmit` and `eslint .` for the mobile app and admin web (no errors).
- `static-analysis-backend.txt`: Ruff statistics and Black check for the backend after the fixes (no findings, no files to reformat).
- `pytest-summary.png` and `static-analysis.png`: screenshots of the above for the appendix.
- Face evaluation: `docs/evaluation/results/` (tables, DET curve, score distributions, per-person error tables).

---

## Notes for the authors (read before submitting)

1. **Don't report acceptance results until the sessions have happened.**
   Section 6.5 is written so you can submit without a UAT (status paragraph)
   or fill in TABLE 6.9 after running one. If your supervisor requires a
   client certification letter, it can only come from a real client
   evaluation.
2. **Fix the sharpness threshold before any UAT.** With the default
   `face_min_sharpness = 100`, real phone selfies are rejected (TABLE 6.5).
   Real drivers would not be able to apply.
3. **Re-run the tests right before submitting** if the code changes, and
   update TABLE 6.4 and the evidence files. Command:
   `docker compose run --rm --no-deps backend python -m pytest -v`.
4. **Reference [5] page numbers:** the SUS chapter is usually cited as
   pp. 189–194 of the 1996 print edition. The CRC digital re-issue (doi:
   10.1201/9781498710411-35) numbers it pp. 207–212. Use whichever edition
   your library has.
5. **TABLE 6.5 is based on the project's phase records** (`docs/tasks.md`)
   and your confirmation that the map renders on the phone. Remove any row
   you didn't personally see working.

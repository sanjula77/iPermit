# iPermit — Final Evaluation Presentation (13 slides, copy-paste ready)

Prepared 2026-10-01. Every number below comes from the repo (`docs/requirements.md`,
`docs/methodology.md`, `docs/thesis/chapter-3` to `chapter-7`, `docs/evaluation/results/`)
or was counted from the code on the date above. Nothing here is a claim the repo cannot back up.

## How to use this file

- Each slide has: **Slide text** (paste into PowerPoint), **Visual** (an existing image file to insert),
  **Say** (about 30-60 seconds of speaker notes).
- Target: 15-20 minutes for 13 slides, plus 5-6 minutes of live demo, plus Q&A.
- Keep slide text to the bullets given. Put the explanation in your voice, not on the slide.
- Before presenting, fill in the three `[PLACEHOLDER]` items in the checklist at the bottom.

## What strong final-year decks contain (from the web research)

The search results agree on one arc: **problem → objectives → existing work → design → implementation →
testing/results → demo → limitations → future work → conclusion.** Evaluators weight technical
understanding and implementation quality most, then innovation, then presentation. Specific advice that shaped this deck:

- Lead with a measurable problem and 3-5 objectives, not a feature list.
- Show *results with numbers*, then *honest limitations*. Panels trust a project that states its own gaps.
- A short live or recorded demo is expected; keep text to keywords and use large fonts and diagrams.
- Do a mock run with your supervisor; prepare for questions about the weakest parts first.

Sources:
- [Engineering Project PPT Structure for Viva, Thesis Defense, FYP & Capstone Review (2026)](https://www.projectiumresearch.com/2026/01/how-to-structure-engineering-project.html)
- [How to Make Final Year Project PPT 2026](https://www.edutechprojects.com/blog/how-to-make-final-year-project-ppt/)
- [Final Year Project - Viva Presentation](https://www.scribd.com/presentation/454314535/final-year-project-viva-presentation-converted-pptx)
- [BComp Dissertation (FYP) - Presentation (NUS)](https://www.comp.nus.edu.sg/programmes/ug/project/fyp/presentation)
- [Mastering Your Engineering Project Defense: A Student's Guide](https://friedengineers.com/engineering-project-defense-student-guide/)
- [Final Year Project Defense: Tips to a Successful Presentation](https://www.projecttopics.com/blog/final-year-project-defense-tips-to-a-successful-presentation/)

## Time plan

| Slides | Topic | Minutes |
|---|---|---|
| 1-4 | Title, problem, objectives, existing systems | 3 |
| 5-7 | Solution, architecture, workflow | 4 |
| 8-9 | Face recognition and what the evaluation changed | 4 |
| 10-11 | Testing, requirements status | 3 |
| Demo | Live walkthrough (see demo script) | 5-6 |
| 12-13 | Limitations, lessons, future work, conclusion | 3 |

---

## Slide 1 — Title

**Slide text**

- **iPermit**
- Design and Evaluation of an AI-Based Virtual Driving License System for Driver Identification and Traffic Law Enforcement in Sri Lanka
- BSc (Hons) Information Technology — Final Evaluation
- Horizon Campus, Faculty of Information Technology
- Presented by: [PLACEHOLDER: team member names and IDs, exactly as on your submission]
- Supervisor: S. Wijewardhana
- Date: [PLACEHOLDER]

**Visual:** project logo or the home screen of the driver app.

**Say:** "Good [morning]. I'm presenting iPermit, a digital driving license and enforcement platform for Sri Lanka. I'll cover the problem, what we built, how we tested it, and, just as importantly, what we did not finish and why."

---

## Slide 2 — The problem

**Slide text**

- Enforcement runs at national scale: **3,660,711** traffic offence cases and **2,106,282** spot-fine tickets in 2024; about **Rs. 2.27 billion** in fines collected
- The physical license is checked by eye: the officer compares the card photo with the driver's face
- Paying a fine traditionally meant a post office visit, then a police station visit to recover the license
- No points system in operation, so repeat offenders face no escalating consequence
- Result: slow roadside stops, easy identity fraud, no single record of a driver's standing

**Visual:** `docs/thesis/diagrams/usecase-existing.png` (the existing process).

**Say:** "These numbers are from Sri Lanka Police for 2024. Even a small saving per stop is multiplied across millions of interactions. And today the officer is trusting a photo on a card, the driver loses the license until a two-step offline process finishes, and nothing links offences together over time."

*Source: thesis Chapter 3, references [4], [5]-[9], [16].*

---

## Slide 3 — Aim, objectives and research questions

**Slide text**

- **Aim:** replace the physical license and paper fine process with one integrated, AI-assisted digital platform
- **O1** Implement and evaluate facial recognition for driver authentication
- **O2** Integrate traffic-monitoring features: white-line detection, incident map, point-based penalties
- **O3** Assess AI for tracking driver behavior and point decisions
- **O4** Conduct usability studies with officers and drivers
- Research questions: RQ1 face accuracy and reliability, RQ2 effectiveness of the AI modules, RQ3 user perception

**Visual:** none, or a simple four-box graphic.

**Say:** "These come from the signed research proposal. I'll come back to this slide near the end and tell you honestly which objectives were met, partly met, or not met."

---

## Slide 4 — What exists today, and the gap

**Slide text**

- **GovPay** (since 2025, all nine provinces by Feb 2026): online fine payment only
- **Digital driving license:** approved by Cabinet in Dec 2024, not yet in operation
- **Demerit points:** legal basis since 2009; nationwide pilot announced for Sept 2026
- Each initiative covers one piece: payment, or the card, or points
- **Gap:** nothing links license, identity verification, points, fines, appeals and driver standing in one system
- **iPermit** shows how these parts work as one platform

**Visual:** `docs/thesis/diagrams/usecase-proposed.png`.

**Say:** "This is not a project against the government's initiatives. It shows how they could connect. A real deployment should integrate with GovPay and the official points regulations rather than duplicate them."

*Source: thesis Chapter 3 and Chapter 7 section 7.3.*

---

## Slide 5 — The solution

**Slide text**

- **Drivers:** apply with 4 face photos and documents, hold a QR digital license, see points, fines, badge, notifications; pay or appeal fines; report incidents and danger zones
- **Police officers:** verify identity by **face scan, QR code or NIC lookup**; see license, points and history; record violations
- **Admins:** review applications, resolve appeals, monitor driver risk
- **Core rule:** the AI assists, the officer decides; an uncertain match is never accepted automatically

**Visual:** three phone screenshots (driver license card, police verify, fines) plus one admin dashboard screenshot.

**Say:** "Three roles, one shared record. The key design principle is that the AI never makes an enforcement decision. If the face match is uncertain, the system returns ranked candidates and the officer confirms."

---

## Slide 6 — Architecture and technology

**Slide text**

| Layer | Technology |
|---|---|
| Mobile (drivers, police) | Expo, React Native, TypeScript |
| Admin web | Next.js, React, TypeScript |
| Backend API | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| Face recognition | RetinaFace + ArcFace (ONNX Runtime), FAISS, SQLite template store |
| Layering | router → service → repository → model |

- Face templates stored **separately** from the main user database
- Multi-record changes run in **one database transaction**
- Built with open-source components; no model trained from scratch

**Visual:** `docs/diagrams/system-architecture-detailed.png`.

**Say:** "The backend is layered so business rules sit in services, not in endpoints. Biometric templates are in their own store for privacy. And anything that touches several records, like recording a violation or paying a fine, either fully succeeds or fully rolls back."

---

## Slide 7 — How it works end to end

**Slide text**

1. Driver submits application (4 photos + documents) → photo quality gate runs immediately
2. Admin approves → license issued, QR token created, face template enrolled
3. Officer verifies driver (face / QR / NIC) → sees points and history
4. Officer records violation → **points deducted, fine created, license suspended at 10 points, in one transaction**
5. Driver pays (mock gateway) or appeals → points and status restored
6. Behavior badge recomputed after every event; driver notified

**Visual:** `docs/thesis/diagrams/ch4-seq-violation.png` or `ch4-act-verification.png`.

**Say:** "This is the core loop. Notice step 4: points, fine and suspension happen together or not at all, so a driver can never be suspended without a matching fine record."

---

## Slide 8 — Face recognition: how we measured it

**Slide text**

- Pipeline: RetinaFace detection → ArcFace 512-d embedding → FAISS one-to-many search
- Threshold **0.42**, deliberately conservative: a wrong match is worse than a missed one
- Evaluated on two public datasets, through the backend's exact pipeline, with 95% confidence intervals

| Dataset | Genuine / impostor pairs | FAR | FRR | EER |
|---|---|---|---|---|
| LFW (96 people) | 9,396 / 949,024 | 0.0013% | 2.91% | 0.32% |
| Bollywood faces (100 South Asian) | 10,500 / 1,113,750 | 0.0025% | 9.89% | 1.13% |

- About **2.06 million** impostor comparisons; all 40 false accepts traced to **3 mislabelled dataset photos**
- Accuracy deliberately **not** reported (impostor pairs outnumber genuine ~100:1)

**Visual:** `docs/evaluation/results/fig_det_curve.png`.

**Say:** "A previous attempt behind this project claimed 100% accuracy on six people, and that fell to 60% on test data, a classic overfit. So we did the opposite: a large labelled evaluation, error rates instead of accuracy, and confidence intervals. At our threshold we saw no false match between genuinely different people."

---

## Slide 9 — What the evaluation changed

**Slide text**

- **CLAHE preprocessing removed:** it raised false rejections from **1.37% to 2.95%** on LFW with no benefit to false accepts (it helped in only 10.5% of same-person pairs); templates were re-embedded
- **Photo-quality gate fixed on a real phone:** a clear selfie scored ~23 sharpness against a threshold of 100 and was rejected; sharpness is now measured on the face resized to 112×112 (selfies 540-562, blurred faces ≤ 22), threshold set to **30**
- **Higher FRR on South Asian faces (9.9% vs 2.9%):** reported as indicative only, since photo style differs between the datasets
- Reproducibility checked: embeddings recomputed in the backend container matched exactly

**Visual:** `docs/evaluation/results/fig_far_frr_threshold.png`.

**Say:** "The value of measuring is that it changed the system. A preprocessing step we added to help lighting actually hurt, so we removed it. And a threshold that looked fine in a browser rejected good selfies on a real Android phone."

---

## Slide 10 — Testing and quality

**Slide text**

- **167 of 167** automated backend tests passed (18 test files, covering every implemented requirement)
- Three layers: unit tests (business rules), integration tests (API endpoints), live end-to-end checks on the running stack and an Android phone
- TypeScript compiler and ESLint: **0 errors** in both mobile and admin apps; Ruff and Black clean
- Live testing found defects the automated tests missed, including a photo left on disk after a rejected enrollment, a leaking rate-limiter state, and the sharpness problem
- Failure handling: errors never leave partial updates, never reveal internals, never let an uncertain AI result decide

**Visual:** `docs/thesis/evidence/pytest-summary.png`.

**Say:** "A passing test suite was necessary but not sufficient for us. Every phase was also verified against the running system, and each defect found that way got a regression test."

*Source: thesis Chapter 6, TABLE 6.4-6.6. Re-run the suite before the day (see checklist).*

---

## Slide 11 — Requirements and objectives: what was delivered

**Slide text**

| | Status |
|---|---|
| **13 of 15** functional requirements implemented | Registration, application, review, license + QR, face enrollment, roadside verification, points and suspension, fines and payment, appeals, behavior badges, notifications, incident map, danger zones |
| Partly | Admin dashboard (FR-14) |
| Deferred | Automated white-line detection (FR-07) |
| Exceptions | Push delivery not confirmed on a device; "alert nearby drivers" left out deliberately to protect privacy (no continuous tracking) |

| Objective | Result |
|---|---|
| O1 Face recognition | Partly: built and evaluated on public data, not on Sri Lankan drivers |
| O2 Monitoring features | Partly: penalties, appeals, maps done; white-line detection not built |
| O3 Predictive AI | Not as stated: rule-based, explainable badge instead |
| O4 Usability study | Not achieved: plan and SUS questionnaire ready |

**Visual:** none (tables are the visual).

**Say:** "I'd rather you hear the gaps from me. The detector needed a labelled lane dataset and GPU time we didn't have. The badge is a transparent formula on purpose, so a driver can recompute their own tier. And we have a ready usability test plan but didn't get participants in time."

---

## Slide 12 — Limitations and lessons learned

**Slide text**

**Limitations**
- No white-line detection; violations are recorded by officers
- Face verification not validated on Sri Lankan drivers or roadside photos; **no liveness detection** (a printed photo could fool it)
- No recorded consent step before biometric enrollment
- Payment is simulated; point schedule and fine amounts are placeholders, not official values
- Not tested on iOS, no load test, no real-user study

**Lessons**
- Measure AI before trusting it
- Test on a real device early
- Record scope conflicts and their reasons instead of silently dropping features
- Keep a human in the loop for enforcement decisions
- Automate lint and tests on every change

**Visual:** none.

**Say:** "Every unvalidated threshold in the code is marked as such, so there is an auditable list of what still needs real-world validation. That honesty is a deliberate design decision, not an afterthought."

---

## Slide 13 — Future work, contribution and conclusion

**Slide text**

**Next steps (in priority order)**
1. Validate the photo gate and threshold on drivers' own phones
2. Add a recorded consent step and a data-protection impact assessment
3. Collect a consented Sri Lankan driver dataset and re-validate
4. Run the user acceptance test with drivers, officers, and licensing staff
5. Add liveness detection; train and integrate the white-line detector
6. Integrate with GovPay and the DMT; move to an approximate FAISS index; deploy with HTTPS and CI

**Contribution**
- One working system linking license, face template, points, fines, appeals, badge and notifications
- An honest evaluation of an off-the-shelf face pipeline on South Asian faces
- Design rules: AI supports the officer, no continuous tracking, unvalidated values labeled

**Closing line:** "iPermit shows the pieces can work as one system. The next stage is validating it with real Sri Lankan users and data. Thank you. Questions?"

**Visual:** QR code or repo link, plus a "Thank you / Questions" graphic.

---

## Live demo script (5-6 minutes)

Run on the Android phone (Expo Go) with the admin dashboard in a browser. Seed data first so nothing depends on typing.

| Step | Role | Action | What to point out |
|---|---|---|---|
| 1 | Driver | Open the digital license card, tap "Show QR to officer" | QR code, points meter, badge |
| 2 | Police | Scan a face (enrolled driver) | Match percentage; ranked candidates if uncertain |
| 3 | Police | Open the driver record, record 2-3 violations at once | Points rise, fines created |
| 4 | Driver | Open Fines, show the new fines and the suspension if triggered | Immediate visibility |
| 5 | Driver | Pay one fine via the mock flow | Points restored, license reactivated |
| 6 | Admin | Show the dashboard: pending applications, badge distribution, attention queue | Rule-based badges |
| 7 | Driver or police | Open the Incidents map, mark a danger zone | Circle on the map, confirm/clear |

**Demo safety net**
- Record a 3-minute screen video of the same flow and keep it open in a second window.
- Remote push notifications cannot be shown in Expo Go on Android; do not promise them.
- Allow location permission beforehand (the map falls back to Colombo if denied).
- Keep Docker (`docker compose up`) running and test `/health` and `/ready` 10 minutes before.

---

## Likely questions and short answers

| Question | Answer |
|---|---|
| Why not report accuracy? | Impostor pairs outnumber genuine ~100:1, so accuracy is meaningless. We report FAR, FRR, EER and TAR with confidence intervals, following ISO/IEC 19795-1. |
| Why threshold 0.42, when EER is near 0.2? | Officer verification is one-to-many search; a false match is worse than a false reject, and a reject falls back to QR or NIC lookup. |
| Why is FRR higher on the South Asian set? | Possibly demographics, but the images are film stills and publicity photos, so style differs. We call it indicative and say it needs Sri Lankan driver photos. |
| Why wasn't white-line detection built? | It needs a labelled lane dataset and GPU training, which we could not obtain. The workflow and an evidence field are ready so a detector can plug in later. |
| Why a rule-based badge, not ML? | No historical Sri Lankan driver data exists, and a predictive model deciding penalties would be hard to justify to the driver. The formula is transparent and recomputable by hand. |
| Can someone spoof it with a photo? | Yes. There is no liveness detection; that is disclosed in the API and listed as a priority recommendation (ISO/IEC 30107-3). |
| What about privacy and consent? | Templates are stored separately, location is point-in-time only, and nearby-driver alerts were left out to avoid tracking. A recorded consent step is a known gap and priority 2 for future work. |
| Why SQLite for face templates? | Isolates biometric data from the main PostgreSQL store, and the FAISS index can be rebuilt from it. |
| Will it scale to a national level? | Not claimed. Search is an exact linear scan, fine for a prototype; an approximate index and load testing are listed as future work. |
| What did you test on real hardware? | An Android phone: the photo-gate bug and a blank map were found there. iOS and push delivery were not tested. |
| How is this different from GovPay? | GovPay handles payment only. iPermit links identity, license, points, fines, appeals and standing in one record. |
| What would you do differently? | Start sourcing a consented local dataset earlier, and run linters and tests automatically on every change from day one. |

---

## Checklist before presenting

1. **[PLACEHOLDER] Team names and IDs.** `README.md` lists three names (B.R Vindyani, J.P.I.S Jayasinghe, B.R.G.S Sandaruwan), but the git history shows commits from one author and `docs/methodology.md` describes a single-developer approach. Put on slide 1 whatever your university submission says, and be ready for the question "who built what".
2. **[PLACEHOLDER] Presentation date.**
3. **Re-run the tests** so "167 of 167" is true on the day: `docker compose up -d` then run the backend suite. If the count changed, update slide 10 and the Chapter 6 table.
4. **Stale text in the repo:** `README.md` still says "Planning phase, implementation has not started" and `CLAUDE.md` says "greenfield". The examiner may open the repo, so update the README status.
5. **Repo size, if asked** (measured 2026-10-01): about 4,400 lines of backend Python, about 7,700 lines of mobile TypeScript, about 1,550 lines of admin-web TypeScript (excluding tests); 35 REST endpoints; 10 data models; 9 database migrations; 114 commits.
6. Check your university's marking rubric and reorder time if it weights, for example, demo or ethics more heavily.
7. Do one timed mock run with your supervisor; cut slide text before cutting the demo.

## Image files to insert (all exist in the repo)

| Slide | File |
|---|---|
| 2 | `docs/thesis/diagrams/usecase-existing.png` |
| 4 | `docs/thesis/diagrams/usecase-proposed.png` |
| 6 | `docs/diagrams/system-architecture-detailed.png` |
| 7 | `docs/thesis/diagrams/ch4-seq-violation.png`, `ch4-act-verification.png` |
| 8 | `docs/evaluation/results/fig_det_curve.png` |
| 9 | `docs/evaluation/results/fig_far_frr_threshold.png` |
| 10 | `docs/thesis/evidence/pytest-summary.png` |
| Backup | `docs/thesis/diagrams/ch4-erd-core.png`, `ch5-deployment.png`, `ch5-mobile-tabs.png`, `fig_score_distributions.png` |

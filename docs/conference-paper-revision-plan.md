# iPermit conference paper — revision plan

Prepared 2026-10-18 from four inputs: `Project_Paper.pdf` (the current draft),
`splnproc1703.docm` (the conference Word template), `Quick Start.pdf` and
`SPLNPROC Word 2010-2016 Technical Instructions.pdf`. Every claim about the system below was
checked against this repository (`docs/`, `backend/`, `mobile/`); every reference was checked
against the web where it could be found. This is a **change plan**, not a rewritten paper:
it says what to fix, what to add, what to cut, and gives draft wording where the facts are
settled.

---

## 0. What to do first (priority order)

| # | Action | Why | Effort |
|---|---|---|---|
| 1 | Delete the "usability evaluation … showed the system is user-friendly" claim (Sect. 5) | It was never done. `docs/final-presentation.md` itself lists O4 as *"Not achieved: plan and SUS questionnaire ready"* | 5 min |
| 2 | Replace the face-evaluation numbers and Fig. 2 with the current results | The paper's numbers come from an older, non-like-for-like run (see C7 in Sect. 3.1) | 1 h |
| 3 | **Re-run the face evaluation with the deployed pipeline (CLAHE off)** | The reported FRR was measured with CLAHE **on**; the deployed system turned it off on 2026-09-29 | team task, ~1 session |
| 4 | Fix or remove every reference flagged in Sect. 8 | One citation has no entry (`[37]`), three have wrong details, eight could not be found | 2–3 h |
| 5 | Correct the architecture text (embeddings are **not** in PostgreSQL; the face module is **not** a microservice) | Contradicts `docs/design.md` and the paper's own Fig. 1 | 10 min |
| 6 | Add the new features (Sect. 5) and fix the points/payment text | Several statements in the draft are now untrue | 3–4 h |
| 7 | Re-flow into the Springer LNCS template (Sect. 2, 4) | Required by the conference | 2–3 h |
| 8 | Add the mandatory statements (Sect. 9) | Data availability, ethics, contributions, conflict of interest, funding, AI-use | 1 h |

---

## 1. Inputs and what they tell us

### 1.1 The template is Springer LNCS

`splnproc1703.docm` is **Springer's Computer Science Proceedings (LNCS) Word template**
(Word 2010–2016, macro-enabled; the Quick Start and instructions refer to the sibling
`splnproc1702`, dated March 1, 2017 — same style set). Read from the file itself:

| Property | Template value |
|---|---|
| Page | A4; text area 12.2 × 19.3 cm (margins 4.4 cm left/right, 5.2 cm top/bottom) |
| Font | Times New Roman; body 10 pt, justified; first paragraph after a heading/table/figure/equation **not** indented, later paragraphs indented 0.4 cm |
| Title | 14 pt bold, centred |
| Authors / affiliations | Names centred; affiliations 9 pt centred; ORCID optional (superscript, format `0000-1111-2222-3333`) |
| Abstract | 9 pt, indented 1 cm each side, starts with "Abstract." — **150–250 words** |
| Keywords | One line, "Keywords:" prefix, comma-separated (the sample shows three; many LNCS venues ask for 4–6 — check the call) |
| Headings | H1 12 pt bold numbered ("1 Introduction"); H2 10 pt bold numbered ("2.1 …"); H3 bold **run-in**, unnumbered; H4 italic run-in, unnumbered. Maximum four levels, **only two numbered** |
| Tables / figures | Caption **above** tables ("Table 1."), **below** figures ("Fig. 1."), 9 pt; vector graphics preferred over raster for line art |
| References | Numbered in square brackets, 9 pt, hanging indent; unnumbered "References" heading |
| Workflow | Use the *Springer Proceedings Macros* ribbon; text pasted from another document keeps its old formatting, so select it and re-apply styles (press *Normal Text* twice to clear stray formatting); insert special characters through *Insert → Symbol*; name the file `Surname_ShortTitle` |

### 1.2 What the template package does **not** tell us

These come from the conference's call for papers, which is not among the files. Confirm
before final formatting:

- conference name and track; **page limit** (LNCS venues commonly allow 12–16 pages
  including references — do not assume);
- whether review is **double-blind** (if so: remove author names, affiliations,
  acknowledgements, and self-identifying repository links from the review copy);
- keyword count, submission format (.docx or PDF), and any extra declarations required.

### 1.3 The current draft in one paragraph

14 pages, 7 sections (Introduction; Literature Review A–G; Methodology 3.1–3.7 with
3.4.1–3.4.7; System Design; Results and Evaluation; Conclusion; References), 21 references,
two figures (architecture; FAR/FRR curves) and one table (tech stack). IEEE-style numbering
and reference format, roman-numeral section references ("Section II"), a "N | Page" footer,
no author block, and 12 pt-style spacing. Roughly 5,900 words (estimate).

---

## 2. Template conformance — change list

| Item | Current draft | Required by LNCS template | Action |
|---|---|---|---|
| Title block | Title only | Title + authors + affiliations (+ ORCID, e-mail) | Add. Proposed names from the project: B.R. Vindyani, J.P.I.S. Jayasinghe, B.R.G.S. Sandaruwan; Faculty of Information Technology, Horizon Campus; supervisor S. Wijewardhana. **Authors to confirm names, order, e-mails, ORCID** |
| Title wording | "AI-Based Smart Driving License System for Sri Lanka" | 14 pt bold, centred | Keep or sharpen (options in Sect. 10.2) |
| Abstract | Heading "Abstract", 212 words | Run-in "Abstract.", 9 pt, 150–250 words | Re-style; rewrite per Sect. 10.1 |
| Keywords | Heading "Keywords", 8 items | One line "Keywords:" | Re-style; cut to 5–6 |
| Section headings | "1. INTRODUCTION" (caps, roman refs in text) | "1 Introduction", 12 pt bold, title case | Re-apply H1; replace "Section II/III/IV…" with "Sect. 2/3/4…" |
| Lit-review sub-heads | "A. Overview … G. Summary" (letters) | H2 numbered "2.1 …" | Convert to 2.1–2.x (and merge, see Sect. 4) |
| Third-level numbering | "3.4.1 … 3.4.7" numbered | Only two numbered levels | Make them H3 run-in bold ("**Authentication and access control.** Text…") or promote to H2 |
| Table caption | "TABLE I  Tools and Technology Stack", centred | "Table 1." above the table | Re-apply table caption style |
| Figure captions | "Fig 1.", "Fig: 2" | "Fig. 1." below | Correct "Fig: 2" → "Fig. 2." |
| Figures | Raster images | Vector for line art | Re-export Fig. 1 and Fig. 2 as PDF/SVG |
| Footer | "N | Page" | None (publisher paginates) | Remove |
| In-text citations | `[1], [2]`, **not in order of first appearance**, `[37]` has no entry | Numbered in order of first citation | Renumber after the reference clean-up (Sect. 8) |
| Reference format | IEEE ("N. D. Silva, “…,” ICTA Report, 2022.") | Springer: `Author, F.: Title. Journal 2(5), 99–110 (2016)` | Convert every entry (verified entries are pre-converted in Sect. 8.3) |
| Reference headings | "7. References" | Unnumbered | Remove number |
| Special characters | Typed from the keyboard | Insert → Symbol | Re-insert any Greek letters/symbols |
| Page count | 14 | Per the call | Budget in Sect. 4 |

---

## 3. Corrections to statements that are now wrong or unsupported

### 3.1 Critical

| # | Where in the draft | What it says | What is true | Fix |
|---|---|---|---|---|
| C1 | Sect. 5, first paragraph | "The usability evaluation conducted with drivers, police officers, and administrators showed … user-friendly" | No usability study was run. A plan and SUS questionnaire exist; no participants (`docs/final-presentation.md`, objectives table) | Delete. Move to Limitations and Future Work: "A usability study with the three user groups is planned" |
| C2 | Sect. 5, same paragraph | "Performance evaluation demonstrated effective communication between …" | No performance or load evaluation exists; load behaviour is stated as untested in Sect. 3.7 itself | Delete or replace with the test evidence in Sect. 6.4 |
| C3 | Sect. 3.5 vs Sect. 5.1 | 3.5: "no FAR, FRR, or EER performance claim is made"; 5.1 presents FAR/FRR/EER | Contradiction inside the paper | Rewrite 3.5; the measured results on **public** datasets are legitimate, a field-performance claim is not |
| C4 | Sect. 4 | "PostgreSQL … facial embeddings" and "AI service operates as an independent microservice" | Embeddings are in a **separate SQLite store** (+ FAISS index); the face module runs **in-process** inside the backend (`docs/design.md`, `face_template_store.py`) | Correct both sentences; Fig. 1 already shows SQLite + FAISS |
| C5 | Sect. 3.4.5 | "Payment and successful appeals use a shared point-restoration function"; "license reactivation following payment" | Paying a fine **no longer changes points**. Points count for a rolling 12 months; only a successful appeal removes them early; reinstatement is automatic when the total drops below 10 | Rewrite per Sect. 10.3 |
| C6 | Sect. 3.4.6 | "payment of an outstanding fine restores most of the associated score" | Still true for the **badge score** (unpaid-fine term) but not for points; wording currently reads as if points return | Keep, but separate the two clearly |
| C7 | Sect. 5.1 numbers and Fig. 2 | LFW 155,929 genuine / 7,778,207 impostor; Bollywood 8,808 / 934,443; "EER … equal at 0.220" | Superseded run (unequal image caps, so LFW vs Bollywood was not like-for-like — noted in `docs/evaluation/face_evaluation.ipynb`). Current: see Sect. 6.1 | Replace figures, tables and text with Sect. 6.1 |
| C8 | Sect. 3.4.3 | "CLAHE was incorporated to reduce lighting variations" | CLAHE was **turned off** on 2026-09-29: the ablation showed it more than doubled the false-reject rate (2.95% → 1.37% without it on LFW) | Rewrite as a finding, not a feature (Sect. 10.5) |
| C9 | References | See Sect. 8 | — | See Sect. 8 |

### 3.2 Major

| # | Issue | Fix |
|---|---|---|
| M1 | Abstract says all 14 requirements were "developed and verified" | REQ-7 (automated white-line detection) is deferred; REQ-13 AC5 (alert nearby drivers) is excluded for privacy; REQ-14 is partly done. State the split, e.g. "twelve of fourteen requirements implemented, one partly, one deferred" — **reconcile the count with `docs/tasks.md` first** (the presentation says "13 of 15", `requirements.md` has 14 requirements) |
| M2 | Sect. 3.7 says "single-developer" | There are three authors. Say what is true (e.g. "small student team") |
| M3 | Conclusion: "AI powered traffic monitoring features", "advanced driver behavior analysis" | Violation detection is not built; behaviour analysis is **rule-based**, not AI/ML. Remove or qualify. If the title keeps "AI-based", the AI component is the face-recognition pipeline — say so once, plainly |
| M4 | Sect. 3.4.4 and Sect. 3.4.7 | Add the new behaviour (Sect. 5). Keep the privacy argument against nearby-driver alerts; it is one of the paper's better design points |
| M5 | Methods and implementation are mixed | Move per-module detail out of "Methodology" into an "Implementation" section; keep Methodology to the process (Sect. 4) |
| M6 | The models the system uses are never cited | Add ArcFace, RetinaFace, FAISS, LFW, CLAHE primary sources (Sect. 8.4) |
| M7 | Verification narrative is thesis-style ("defects identified and resolved…") | Condense to one short paragraph and one table; conference readers want results, not the diary |

### 3.3 Minor

Abstract/keyword counts; "Fig: 2" caption; reference `[12]` has "details to be completed";
"Fig. 1" is called "Deployment architecture" but shows logical layers (call it "System
architecture"); Introduction's roadmap paragraph does not match the actual sections;
"iPermit" is introduced in the abstract but only defined in 3.1 — define it at first use.

---

## 4. Proposed structure and page budget

Assumes a **12-page limit including references**; scale to the real limit. At 10 pt in the
LNCS text area, one page holds about 550–600 words; figures and tables are counted in pages,
not words. Word counts are estimates.

| Sect. | Title | Words | Floats | Source material |
|---|---|---|---|---|
| — | Title, authors, abstract, keywords | 220 | — | Sect. 10.1 |
| 1 | Introduction | 600 | — | Keep current text; tighten; add contributions list; fix roadmap |
| 2 | Related Work | 900 | — | Current 2.1–2.6 merged to 4 subsections: digital licensing; face recognition for identity; demerit schemes and behaviour analysis; offline-first / data protection (new). Cut ADAS paragraph |
| 3 | System Design | 1,000 | Fig. 1; Table 1 | Current Sect. 4 + 3.3 stack table, shortened; roles; data stores; layering; requirements method (one paragraph) |
| 4 | Implementation | 1,700 | Table 2 (violation schedule), Fig. 2 (points lifecycle), Fig. 3 (offline sync) | Face pipeline; licence and categories; points, fines, appeals; behaviour analyser and badge; incidents and danger zones; offline queue; biometric protection |
| 5 | Evaluation | 1,300 | Tables 3–5; Fig. 4 | Face results; CLAHE ablation; software testing; what was **not** evaluated |
| 6 | Discussion and Limitations | 600 | — | Honest limits (Sect. 7.7) |
| 7 | Conclusion and Future Work | 250 | — | Rewrite |
| — | Statements | 250 | — | Sect. 9 |
| — | References | ~30–35 entries | — | Sect. 8 |

≈ 6,800 words + 4 figures + 5 tables ≈ 13–14 LNCS pages. If the limit is 12: drop Table 1's
rationale column, merge Tables 3 and 4, and drop Fig. 3 in favour of two sentences.

---

## 5. New features to add — where, what, and how far the claim goes

All facts below are taken from the repository. "Say" is supported by tests or documents;
"Do not say" is the boundary.

| Feature | Goes in | Facts to state | Say | Do not say |
|---|---|---|---|---|
| **Rolling 12-month demerit points** (replaces "payment resets points") | 4.2 | Points 1 / 3 / 4 / 6 (white line / speeding / red light / drunk driving) plus "other" 1–5 written by the officer (fine LKR 1,000 per point); limit 10; each violation counts for 12 months from confirmation; paying does not change points; automatic reinstatement below 10; displayed points capped at 10/10; an overturned appeal reverses the fine and the violation stops counting; all effects in one transaction | Design rationale: an earlier version reset points on payment and so let a driver pay and reoffend | That the schedule matches the official Sri Lankan scheme — values and fines are **placeholders** (`models/violation.py`, `models/fine.py`) |
| **Vehicle categories** | 4.1 | Driver requests categories on the application; admin confirms or edits; shown on the card back; visible to officers; categories are removed with the licence | Plain description | Exact DMT category names — they are plain-English labels the team wrote; restriction codes are not implemented |
| **Smart licence card** (QR sheet, separate points card, registration photo, flip card) | 4.1 | QR token is 256 bits from the OS random generator; looked up server-side by logged-in officers only; no personal data in the QR | Security reasoning | "Digitally signed licence" — the QR is **not** signed and not usable offline; a screenshot replays until the licence ends. List as a limitation |
| **Behaviour analyser** | 4.4 | Rule-based risk (Low / Medium / High), trend (last 90 days vs the 90 before; needs ≥ 2 violations), 24-month look-back, projected days to suspension at the recent rate, tip from the dominant violation type; reversed violations ignored; pure functions, 20 unit tests; plus the existing badge score | Explainable by construction; chosen because there is no Sri Lankan driver data to train or validate a model (cite interpretable-model argument, Sect. 8.4) | "Predictive AI" or "machine learning". Thresholds are starting points, not validated |
| **Incident photos** | 4.5 | One optional photo per incident; EXIF removed on upload; visible to signed-in drivers while the incident is active; deleted when cleared or expired (4 h); 5 km radius | Privacy-by-design choices | That faces/plates are blurred — they are not |
| **Offline violation queue and sync** | 4.6 + Fig. 3 | Local SQLite queue on the officer's phone; client UUID + offence time; automatic send on reconnect, app foreground, every 30 s; server accepts an id once (unique constraint) so retries never duplicate; offence time kept, accepted if ≤ 5 min in the future and ≤ 7 days old; refused items shown to the officer; app stays signed in when opened offline | Behaviour was demonstrated end to end in the browser preview (backend stopped, violation saved, backend restarted, one violation and one fine created, offence time preserved) | That the **phone SQLite queue was tested on a device** — it was not (preview used a localStorage stand-in); offline *identification* and evidence photos are out of scope; queue is not encrypted (minimal fields only) |
| **Envelope encryption of face templates** | 4.7 | AES-256-GCM per-template data key wrapped by a master key from the environment; driver id bound in as authenticated data; master-key rotation re-wraps keys only; deleting a row destroys its key | Matches the paper's privacy-isolation argument | That keys are in an HSM/KMS — the master key is an environment variable. That uploaded photos or API traffic are encrypted — they are not (HTTPS is future work) |
| **Signed audit log** | 4.7 | Every enrolment, officer face search, deletion, upgrade and key rotation recorded (time, action, actor, driver — never biometric data); hash-chained and Ed25519-signed; verifiable with the public key only; enrolment and search are refused if the log cannot be written; erasure is never blocked | Tamper evidence | Tamper *proof* — removing the newest entries is not detectable without an externally stored head hash |
| **PDPA alignment** | 3, 4.7, 6 | Sri Lanka's Personal Data Protection Act, No. 9 of 2022 treats biometric data used to identify a person as a special category and requires appropriate technical and organisational measures (encryption is named as an example) | "Designed to support" the duty | "Complies with the PDPA". The Act does not name AES-256, envelope encryption or signed logs; **verify the section numbers against the Act's text** and check commencement dates on the Data Protection Authority site. A consent step and a data-protection impact assessment are not done |
| **CLAHE off; sharpness gate recalibrated** | 4.1, 5.2 | Ablation on LFW: with CLAHE FRR 2.95%, without 1.37% (FAR 0.0013% vs 0.0016%); the quality gate measures sharpness on the face resized to 112 px (limit 30) so real phone selfies pass | An honest negative result — a good paragraph for a conference | That the lower FRR is already measured on both datasets (Bollywood was not re-run) |
| **Test evidence** | 5.3 | 304 backend tests in 30 files collected on 2026-10-18; 13 migrations; mobile type-check and lint clean (admin-web last checked earlier — re-run both before quoting) | See Sect. 6.4 for how to quote it safely | A pass count you have not just produced |

---

## 6. Evidence you can quote

### 6.1 Face verification — current results (`docs/evaluation/results/results_tables.md`)

Pipeline when measured: **CLAHE on**, buffalo_l (RetinaFace + ArcFace w600k_r50), det_size 640×640, ≤ 15 usable images per person, seed 42, identity-level bootstrap, 1,000 replicates.

| Dataset | People | Usable images | Genuine pairs | Impostor pairs |
|---|---|---|---|---|
| LFW | 96 | 1,385 | 9,396 | 949,024 |
| Bollywood (Kaggle `havingfun/100-bollywood-celebrity-faces`) | 100 | 1,500 | 10,500 | 1,113,750 |

| Dataset | FAR @ 0.42 | FRR @ 0.42 | EER (threshold) | TAR @ FAR = 0.001 |
|---|---|---|---|---|
| LFW | 0.001% [0.000–0.008] | 2.905% [1.794–4.090] | 0.318% (0.194) | 99.628% |
| Bollywood | 0.003% [0.000–0.010] | 9.886% [8.295–11.715] | 1.125% (0.209) | 98.400% |

Confusion counts at 0.42 — LFW: TP 9,123 / FN 273 / FP 12 / TN 949,012; Bollywood: TP 9,462 /
FN 1,038 / FP 28 / TN 1,113,722. Every observed false accept on the sets was traced to a
mislabelled photograph (`docs/methodology.md`).

### 6.2 CLAHE ablation (LFW, same 1,367 images both ways)

| Condition | FRR @ 0.42 | FAR @ 0.42 | EER (threshold) | Mean genuine score |
|---|---|---|---|---|
| With CLAHE | 2.952% | 0.0013% | 0.316% (0.194) | 0.6331 |
| Without CLAHE | 1.367% | 0.0016% | 0.309% (0.186) | 0.6684 |

### 6.3 **Re-run needed (team task)**

The deployed system runs with CLAHE off, so the paper's headline numbers should come from a
re-run of `docs/evaluation/face_evaluation.ipynb` with CLAHE disabled on **both** datasets.
Until then, report the table above as "measured with the pre-ablation pipeline" and put the
LFW ablation next to it. In the abstract use `[A]`, `[B]` (FAR) and `[X]`, `[Y]` (FRR) as
placeholders. Keep the same image cap (15) for both datasets so the comparison stays
like-for-like.

### 6.4 Software testing — how to quote it safely

`pytest --collect-only` on 2026-10-18 found **304 tests in 30 files**. The last **full** run
(239 tests) was before the newest features; the newer test files (incident photos, template
encryption and audit log, offline sync) were run individually and passed. **Run the whole
suite once and quote that number** instead of the collected count.

| Area | Test files | Tests collected |
|---|---|---|
| Authentication, users, admin | `test_auth`, `test_admin_users`, `test_admin` | 36 |
| Applications, licences, categories | `test_applications`, `test_licenses`, `test_vehicle_categories` | 38 |
| Face recognition (pipeline, evaluation, protection) | `test_face_enrollment`, `test_face_consistency`, `test_face_preprocessing`, `test_face_evaluation`, `test_face_template_encryption`, `test_face_audit` | 55 |
| Police, violations, points | `test_police`, `test_other_violation`, `test_officer_summary`, `test_points_expiry`, `test_offline_violations` | 50 |
| Fines and appeals | `test_fines`, `test_appeals` | 16 |
| Badges and behaviour | `test_badge_formula`, `test_badges`, `test_behaviour_analysis`, `test_behaviour` | 57 |
| Map | `test_road_incidents`, `test_danger_zones`, `test_geo`, `test_incident_photos` | 33 |
| Other | `test_notifications`, `test_demo_reset`, `test_utc_datetime` | 19 |

---

## 7. Section-by-section changes

### 7.1 Abstract, keywords, title
Replace per Sect. 10. Remove "verified incrementally … checked against the live running
system" (process narrative); lead with the problem and contributions; state limits in the
last sentence.

### 7.2 Introduction
Keep paragraphs 1–3 (good local context). Tighten paragraph 4 and end with a numbered list of
**contributions** (integrated licensing + enforcement prototype; rolling-window demerit
scheme with explainable behaviour analysis; protected biometric templates with a
tamper-evident log; offline-first officer workflow; evaluation on public data with stated
limits). Replace the roadmap with the real section order, using "Sect.".

### 7.3 Related work
- Merge to four subsections (see Sect. 4). Cut the ADAS paragraph (`[12]`, `[19]`, `[20]`
  are about in-vehicle aids, not licensing).
- Add: demerit-point schemes in practice (the draft's own statement that rolling windows
  stop pay-and-reoffend needs a source — UK, Australian and Singapore official scheme pages,
  and the Sri Lankan pilot announcement; **fetch the official pages and cite them; none are
  cited today**).
- Add: face-recognition primary sources (ArcFace, RetinaFace, FAISS, LFW) and the
  presentation-attack standard for the liveness limitation.
- Add: offline-first design and idempotent retries; data protection law and biometric
  security.
- Keep the **research gap** paragraph but make it narrower and checkable: the gap is the
  *combination* in one deployable prototype under Sri Lankan conditions, not that nothing
  exists.

### 7.4 Methodology → "System Design" (+ short method paragraph)
Keep: incremental requirements-driven process; EARS-style criteria (one paragraph, one
example); the two design-tension examples (nearby-driver alerts vs privacy; badge formula agreed
before coding). Cut: the long verification-discipline narrative (3.6) to three sentences.
Fix C4 and M2. Update the stack table (add `expo-sqlite`, NetInfo, `cryptography`; remove
the YOLO row or keep it labelled "planned, not built").

### 7.5 Implementation (new, from 3.4.x)
Seven short H3 run-in paragraphs (≈ 200–250 words each) in this order: face pipeline and
quality gate; licences and categories; points, fines and appeals; behaviour analyser and
badge; incidents, danger zones and photos; offline queue and sync; biometric protection.
Each ends with one sentence on what was verified and how. Draft text for four of them is in
Sect. 10.

### 7.6 Evaluation
Four short parts: **(a)** face verification on public data (Sect. 6.1–6.3, Fig. 4 =
FAR/FRR versus threshold for both datasets from `fig_far_frr_threshold.png`, regenerated as
vector); **(b)** CLAHE ablation (Sect. 6.2); **(c)** software testing (Sect. 6.4, one
table); **(d)** an explicit "not evaluated" list. Keep the paper's good sentence that the
threshold is deliberately conservative because a false match is worse than a false reject.

### 7.7 Discussion and limitations (new)
No liveness detection (a printed photo could be accepted; cite ISO/IEC 30107-3);
evaluation on public celebrity images, not Sri Lankan drivers or roadside photos; no
recorded consent step or impact assessment before biometric enrolment; automated violation
detection not built (no labelled lane dataset or GPU time); payment is a mock gateway;
point values and fines are placeholders; QR is replayable and online-only; master key in an
environment variable, uploaded photos and API traffic unencrypted; offline identification
and evidence photos out of scope; phone queue untested on a real device; no usability
study, load test or iOS test; push delivery unverified on a physical device; native map not
visually verified in the browser preview.

### 7.8 Conclusion and future work
Rewrite in ≈ 250 words: what was built, what was measured, what was **not**. Future work in
priority order (matches slide 14): validate on Sri Lankan drivers' phone photos; consent and
impact assessment; liveness detection; a user-acceptance study; HTTPS, key management
service, and offline identification; the white-line detector; integration with GovPay and
the licensing authority.

---

## 8. Reference audit

Method: each entry searched on the web on 2026-10-18. "Not found" means the search did not
return the item — it does **not** prove the item is fake. Per the project's own rule, an
entry that cannot be confirmed from its DOI or publisher page must be **replaced or
removed** before submission.

### 8.1 Status of the 21 references

| Ref | Draft entry (short) | Status | Fix |
|---|---|---|---|
| [1] | Silva, ICTA Report 2022 | Not searched (grey literature) | Add URL and access date, or remove |
| [2] | Ministry of Transport, Annual Road Accident Report 2023 | Not searched (government report) | Add URL and access date |
| [3] | Wang & Wu, Shenzhen smart policing, *Int. J. Surveillance Tech.* 2020 | **Not found** | Confirm the source or remove; do not cite on trust |
| [4] | "Impact of Biometric Surveillance on Reducing Violent Crime", PMC 2021 | **Incomplete** (no authors/identifier) | Find the PMC article and cite it fully, or remove |
| [5] | Zhao et al., ACM Comput. Surv. 35(4), 399–458 | **Verified; year wrong** (2019 → **2003**; DOI 10.1145/954339.954342) | Correct year |
| [6] | Cheng, Wang & Liu, *IEEE T-ITS* 21(4), 1418–1430, 2020 | **Not found** | Confirm via IEEE Xplore or remove |
| [7] | World Bank, Smart Transport Systems in Developing Countries, 2021 | Not searched | Add URL/report number or remove |
| [8] | Wang, De Vos, Smart & Wang, *Transport Policy* 168, 87–100, 2025 | **Verified**, but wrong use: it studies **youth licence acquisition**, not driver risk or incidents | Keep only where licensing is the topic; remove from "[6], [8]" in 2.4 |
| [9] | Wang & Li, hierarchical network for traffic violations, "2020" | **Verified, details wrong**: *IEEE Access*, January 2024 (affiliations were listed instead of the venue) | Replace with IEEE Access entry; fetch volume, pages and DOI |
| [10] | Liu & Albina, RFID-TA 2022 | **Verified** (pp. 217–219; DOI 10.1109/RFID-TA54958.2022.9924028) | Add pages and DOI |
| [11] | Zhang, FaceNet mobile system, ISCTIS 2025 | **Not found** | Confirm or remove |
| [12] | Birrell, Fowkes & Jennings, smart driving aid | **Verified**: *IEEE T-ITS* 15(4), 1801–1810, 2014 | Complete the entry (or drop with the ADAS paragraph) |
| [13] | Thai, Huh & Seo, SME attendance, "Korea 2023" | **Found as *IEEE Access* 2024** (authors listed Thai, Seo, Huh) | Replace with the journal entry; confirm author order, volume and DOI |
| [14] | Moralwar et al., face recognition + OTP access control | **Not found** | Confirm or remove |
| [15] | Burade et al., Smart Driving License test, NCAEAS 2017 | **Not found** | Confirm or remove |
| [16] | Alymbaeva, UNESCAP evaluation, Lao PDR, 2024 | **Verified** (UNESCAP, December 2024) | Cite as a report with the repository URL |
| [17] | Varshney et al., "BioTrace", *JISEM* 2025 | **Not found** | Confirm or remove |
| [18] | Kimulu, Kisumu County thesis, 2024 | **Not found** | Confirm via the University of Nairobi repository or remove |
| [19] | Horgan et al., arXiv:2103.14362 | **Verified, ID wrong**: the arXiv ID is **2104.12583** | Correct; a conference version may exist — cite that if so; or drop with ADAS |
| [20] | "Multiple Authors", *Sensors* 22(6), 2022 | **Verified, details wrong**: González-Saavedra, Figueroa, Céspedes & Montejo-Sánchez, *Sensors* 22(8), 3040 | Correct authors and issue; or drop with ADAS |
| [21] | Jain et al., SMART Driving License IoT, Taylor & Francis 2024 | **Not found** | Confirm or remove |
| **[37]** | Cited in 2.2 (and nowhere in the list) | **Dangling citation — no entry exists** | Remove from the text or add the source |

Summary: **9 found on the web** — of these, [10], [12], [16] are correct as cited (after
completing details) and [8] is real but misused; **5 have wrong details in the draft** ([5]
year, [9] venue/year, [13] venue/year, [19] arXiv ID, [20] authors/issue). **8 not found**
([3], [6], [11], [14], [15], [17], [18], [21]). **4 not searched** ([1], [2], [4], [7] — grey
literature or incomplete). **1 dangling** citation ([37]). If the unconfirmed entries cannot be sourced, the related-work section
will have to rest on fewer, better references. That is acceptable; it is better than an
unverifiable list.

### 8.2 Citation hygiene rules for the rewrite
1. Number references in order of first citation (LNCS); renumber everything after clean-up.
2. No citation without an entry, no entry without a citation (check both directions).
3. Every entry with a DOI shows it. Web pages carry "last accessed 2026/10/DD".
4. Cite a source only for what it says. Re-read the sentence next to each number.
5. Replace "Multiple Authors", "Publication details to be completed", affiliations-as-venue.

### 8.3 Entries ready to paste (Springer format) — verified items
- Zhao, W., Chellappa, R., Phillips, P.J., Rosenfeld, A.: Face recognition: a literature survey. ACM Comput. Surv. 35(4), 399–458 (2003). https://doi.org/10.1145/954339.954342
- Wang, K., De Vos, J., Smart, M., Wang, S.: Explaining youth driver licensing determinants using XGBoost and SHAP. Transp. Policy 168, 87–100 (2025)
- Liu, Q., Albina, E.M.: Application of face recognition technology in mobile payment. In: 2022 IEEE 12th International Conference on RFID Technology and Applications (RFID-TA), pp. 217–219. IEEE (2022). https://doi.org/10.1109/RFID-TA54958.2022.9924028
- Birrell, S.A., Fowkes, M., Jennings, P.A.: Effect of using an in-vehicle smart driving aid on real-world driver performance. IEEE Trans. Intell. Transp. Syst. 15(4), 1801–1810 (2014)
- Alymbaeva, A.: Evaluation of the project "Improvement of driver licensing system in the Lao PDR". UNESCAP, Bangkok (2024). https://repository.unescap.org/bitstreams/f0961705-788c-4de7-bf66-54da058923a4/download
- González-Saavedra, J.F., Figueroa, M., Céspedes, S., Montejo-Sánchez, S.: Survey of cooperative advanced driver assistance systems: from a holistic and systemic vision. Sensors 22(8), 3040 (2022)
- Horgan, J., Hughes, C., McDonald, J., Yogamani, S.: Vision-based driver assistance systems: survey, taxonomy and advances. arXiv:2104.12583 (2021)
- Wang, M., Li, N.: A hierarchical network-based method for predicting driver traffic violations. IEEE Access (2024) — **add volume, pages, DOI from the publisher page**

### 8.4 Sources to add for the new content
All are standard, widely cited works; still confirm volume/pages from the publisher record
before submission (the same rule applies to them).

| Needed for | Entry (Springer format) |
|---|---|
| ArcFace | Deng, J., Guo, J., Xue, N., Zafeiriou, S.: ArcFace: additive angular margin loss for deep face recognition. In: Proc. IEEE/CVF CVPR, pp. 4690–4699 (2019) |
| RetinaFace | Deng, J., Guo, J., Ververas, E., Kotsia, I., Zafeiriou, S.: RetinaFace: single-shot multi-level face localisation in the wild. In: Proc. IEEE/CVF CVPR, pp. 5203–5212 (2020) |
| FAISS | Johnson, J., Douze, M., Jégou, H.: Billion-scale similarity search with GPUs. IEEE Trans. Big Data 7(3), 535–547 (2021) |
| LFW dataset | Huang, G.B., Ramesh, M., Berg, T., Learned-Miller, E.: Labeled faces in the wild: a database for studying face recognition in unconstrained environments. Tech. Rep. 07-49, University of Massachusetts, Amherst (2007) |
| Bollywood set | Kaggle dataset `havingfun/100-bollywood-celebrity-faces` — cite as a dataset with access date |
| CLAHE | Zuiderveld, K.: Contrast limited adaptive histogram equalization. In: Heckbert, P.S. (ed.) Graphics Gems IV, pp. 474–485. Academic Press (1994) |
| Liveness limitation | ISO/IEC 30107-3:2017: Information technology — biometric presentation attack detection — Part 3: testing and reporting |
| AES-GCM | Dworkin, M.: Recommendation for block cipher modes of operation: Galois/Counter Mode (GCM) and GMAC. NIST SP 800-38D (2007) |
| Key management | Barker, E.: Recommendation for key management: part 1 — general. NIST SP 800-57 Part 1 Rev. 5 (2020) |
| Ed25519 | Josefsson, S., Liusvaara, I.: Edwards-curve digital signature algorithm (EdDSA). RFC 8032 (2017) |
| Offline-first | Kleppmann, M., Wiggins, A., van Hardenberg, P., McGranaghan, M.: Local-first software: you own your data, in spite of the cloud. In: Onward! 2019, pp. 154–178. ACM (2019) |
| Idempotent retries | Fielding, R., Nottingham, M., Reschke, J.: HTTP semantics. RFC 9110 (2022) |
| Rule-based over black-box | Rudin, C.: Stop explaining black box machine learning models for high stakes decisions and use interpretable models instead. Nat. Mach. Intell. 1(5), 206–215 (2019) |
| Data protection law | Personal Data Protection Act, No. 9 of 2022. Parliament of the Democratic Socialist Republic of Sri Lanka (2022) — **cite the gazetted text; check section numbers and commencement** |
| Demerit schemes | **To fetch:** official UK, Australian state and Singapore penalty-point pages, and the official Sri Lankan pilot notice. None were available to verify here; do not cite from memory |

---

## 9. Mandatory statements (add before References)

The paper has none of these today.

| Statement | Draft content (authors to confirm) |
|---|---|
| **Data availability** | The face-evaluation datasets are public (LFW; Kaggle Bollywood set). No data from Sri Lankan drivers was collected. The evaluation notebook and result files are in `docs/evaluation/` of the project repository. State whether the repository will be public, or "available on request". **Decision for the authors**; remove repository links from a double-blind copy |
| **Ethics** | No human participants were recruited (no usability study was run). Face images are from public celebrity datasets. Biometric enrolment in a real deployment would need a recorded consent step and a data-protection impact assessment (not yet built) |
| **Author contributions** | Use the CRediT roles; one line per author. Placeholders: Conceptualisation, Software, Validation, Writing — original draft / review, Supervision. Authors to assign |
| **Conflict of interest** | "The authors declare no competing interests." — confirm |
| **Funding** | "No external funding." — confirm |
| **Use of AI assistance** | The project was built and this plan prepared with AI assistants. Springer's policy is that such tools are never authors and that use beyond copy-editing should be documented. **State honestly which tools were used, for what, and that the authors reviewed and verified the results**; check the conference's own policy. Do not omit this |

---

## 10. Draft text

### 10.1 Abstract (217 words; limit 150–250)

> Driving-licence administration and traffic enforcement in Sri Lanka still depend on
> physical cards, visual identity checks and paper-based fine handling. This paper presents
> iPermit, a working prototype of a virtual driving-licence platform for drivers, police
> officers and administrators. Drivers hold a QR-based digital licence; officers verify
> identity by face scan, QR code or NIC lookup; and a rolling 12-month demerit-point scheme
> (suspension at 10 points) drives fines, appeals, suspension and automatic reinstatement. A
> rule-based behaviour analyser gives each driver an explainable risk level and trend, and a
> community map shares road incidents and danger zones without tracking drivers. Face
> verification uses RetinaFace and ArcFace on ONNX Runtime with a FAISS index. Templates sit
> in a separate store under AES-256-GCM envelope encryption, and every biometric action is
> written to a hash-chained, Ed25519-signed audit log, a design intended to support the
> data-protection duties for biometric data under Sri Lanka's Personal Data Protection Act.
> An offline-first queue lets officers record violations without coverage and synchronise
> them without duplicates. On two public datasets (LFW and a South Asian celebrity set), at
> a similarity threshold of 0.42, the false-accept rate was [A]% and [B]% and the
> false-reject rate [X]% and [Y]% respectively. These results come from public images, not
> Sri Lankan drivers. Liveness detection, automated violation detection and user-acceptance
> testing remain future work.

Replace `[A] [B] [X] [Y]` after the re-run (Sect. 6.3). For reference, the pre-ablation run
gave FAR 0.001% / 0.003% and FRR 2.9% / 9.9%.

**Keywords (5–6):** virtual driving licence; face verification; demerit points; offline-first
systems; biometric data protection; Sri Lanka.

### 10.2 Title options
1. *iPermit: A Virtual Driving-Licence Platform with Face Verification, Demerit Points and Offline Enforcement for Sri Lanka* (descriptive, accurate)
2. *An AI-Assisted Virtual Driving-Licence System for Sri Lanka: Design, Protection of Biometric Data and Evaluation on Public Data*
3. Keep the current title if the venue wants a short one — but avoid "Predictive", which the system does not do.

### 10.3 Points, fines and appeals (replaces 3.4.5's second half)

> **Points, fines and appeals.** An officer records a violation of a listed type (white line
> 1 point, speeding 3, red light 4, drunk driving 6) or an "other" violation with a written
> description and 1–5 points. Recording, the fine and any suspension commit in one database
> transaction. Points count for 12 months from the day the violation was confirmed; paying a
> fine does not change them, because an earlier design that reset points on payment let a
> driver pay and reoffend [cite]. A licence is suspended when the counted points reach 10
> and reactivated automatically when they fall below 10; drivers see at most 10/10, the date
> the next points expire and, if suspended, the date the suspension ends. A successful
> appeal reverses the fine and the violation stops counting. Point values and fine amounts
> are placeholders pending the official schedule.

### 10.4 Behaviour analyser

> **Behaviour analysis.** Each driver receives a risk level (low, medium, high) from
> transparent rules over their violations that still count: high if the licence is
> suspended, a drink-driving violation occurred in the last 24 months, two or more
> violations fall in the last 90 days, or the counted points reach 7 of 10; medium for a
> single recent violation, repeat violations, a previous suspension, a worsening trend or
> 4–6 points. The trend compares the last 90 days with the 90 before and is reported only
> with at least two violations. The analyser also projects the days remaining to suspension
> at the recent rate and shows the reasons and a tip based on the most frequent violation.
> The rules are pure functions covered by unit tests. They are an explainable indicator, not
> a trained model: no Sri Lankan driver data exists to train or validate one [cite Rudin],
> and the thresholds are starting points to be tuned on real data.

### 10.5 Face pipeline: CLAHE finding

> **Pre-processing.** An initial design applied contrast-limited adaptive histogram
> equalisation (CLAHE) [cite] before detection to reduce lighting variation. An ablation on
> LFW (1,367 images, both conditions) showed that it more than doubled the false-reject rate
> at the 0.42 threshold (2.95% with CLAHE, 1.37% without) with no benefit to the false-accept
> rate, so it was disabled and stored templates were recomputed. The photo-quality gate was
> also recalibrated: sharpness is measured on the face resized to the recogniser's 112 px
> input, so sharp high-resolution phone selfies are not rejected.

### 10.6 Offline sync

> **Offline recording.** Officers often work without coverage. The app therefore saves each
> confirmed violation to a local SQLite queue with a client-generated identifier and the
> time of the offence, then sends it at once; if the connection is down it retries on
> reconnection, when the app returns to the foreground, and every 30 seconds, oldest first.
> The server stores the identifier under a unique constraint, so a retried request returns
> the first result instead of creating a second violation and fine, and it rejects an
> identifier used by another officer [cite RFC 9110]. The recorded time is kept, so points
> count from the offence, and is refused if more than five minutes ahead of the server or
> older than seven days. Refused items stay visible to the officer with the reason. Driver
> identification and evidence photos still need a connection.

### 10.7 Biometric protection

> **Protection of biometric data.** Each face template is encrypted with AES-256-GCM [cite]
> under its own random data key, which is wrapped by a master key held in the server
> environment; the driver identifier is bound in as authenticated data, so a stored value
> cannot be moved to another driver. Rotating the master key re-wraps only the data keys, and
> deleting a driver's row destroys their key. Every enrolment, officer face search and
> deletion is appended to an audit log in which each entry carries the hash of the previous
> one and an Ed25519 signature [cite]; the log can be verified with the public key alone.
> Enrolment and search are refused if the log cannot be written, while erasure is never
> blocked. This design addresses the integrity and confidentiality duty for biometric data
> in Sri Lanka's Personal Data Protection Act [cite] but is not a claim of compliance: the
> master key is an environment variable, uploaded photos and network traffic are not yet
> encrypted, and removing the newest log entries is detectable only against an externally
> stored head hash.

---

## 11. Figures and tables plan

| Item | Content | Source / action |
|---|---|---|
| Fig. 1 | System architecture | Redraw as vector. Mark the face module as in-process; keep SQLite + FAISS separate from PostgreSQL; show detection as "planned"; add the phone queue and the audit log |
| Fig. 2 | Points lifecycle | New state diagram: violation → counts 12 months → suspended at 10 → reinstated below 10; appeal removes it |
| Fig. 3 | Offline sync sequence | New: save → send → fail → queue → reconnect → send with id → accepted / already received / refused |
| Fig. 4 | FAR/FRR versus threshold, both datasets | Regenerate from the notebook as PDF/SVG after the re-run |
| Table 1 | Technology stack | Shorten; drop the rationale column if space is tight |
| Table 2 | Violation schedule | Types, points, fine (mark as placeholders) |
| Table 3 | Datasets and pairs | Sect. 6.1 |
| Table 4 | FAR / FRR / EER with intervals | Sect. 6.1 (re-run values) |
| Table 5 | CLAHE ablation | Sect. 6.2 |
| Table 6 (optional) | Tests by area | Sect. 6.4 |

---

## 12. Pre-submission checklist and open questions

**Open questions for the authors**
1. Conference name, page limit, blind or not, keyword count, file format (Sect. 1.2).
2. Author names, order, e-mails, ORCID; is the supervisor an author?
3. Was development really by one person or three? (Sect. 3.2 M2.)
4. Will the repository be public? (Data availability; blind review.)
5. Who runs the face re-run with CLAHE off, and when? (Sect. 6.3.)
6. Which AI tools were used and for what? (Sect. 9.)
7. Reconcile "13 of 15" in the presentation with the 14 requirements.

**Checklist**
- [ ] Usability and performance claims removed (C1, C2).
- [ ] Face numbers, Table 4 and Fig. 4 replaced; CLAHE paragraph rewritten (C7, C8).
- [ ] No `[37]`; every reference confirmed or removed; numbering in order (Sect. 8).
- [ ] Architecture text corrected (C4); payment/points text corrected (C5, C6).
- [ ] New features added within their claim limits (Sect. 5).
- [ ] Abstract 150–250 words; keywords as required; title block complete.
- [ ] Template styles applied with the Springer macros; "Normal Text" pressed twice on pasted text; vector figures; captions above tables and below figures; no footer.
- [ ] "Sect.", "Fig.", "Table" used consistently; special characters inserted via *Insert → Symbol*.
- [ ] Mandatory statements added (Sect. 9), including AI-use disclosure.
- [ ] Full backend suite run once; the pass count in the paper is that number.
- [ ] Page count within the limit; file named `Surname_ShortTitle`.
- [ ] Final read for claims that outrun the evidence (liveness, "AI", "predictive", PDPA compliance, "tamper-proof").

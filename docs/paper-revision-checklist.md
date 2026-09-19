# iPermit Paper — Revision Checklist

Tracks known issues in `Project_Paper.docx` (the academic paper draft, kept
outside this repo) and the fixes needed before submission. Found via a
research-skills review cross-checked against this project's own
`docs/methodology.md`, `docs/tasks.md`, and a sample citation-verification
pass against original sources.

## Already Fixed

- [x] **Figure 1 (Architecture Diagram)** — regenerated via Eraser.io. All
  labels now accurate — no "Deploytment" typo, no garbled "LOGICAL SYSTEM
  FLOLY" text, "Public Route" no longer mislabeled as a "Gateway Layer",
  Violation Detection clearly marked "Planned, not yet built."

## Critical — Must Fix Before Submission

### 1. Figure 2 (Confusion Matrix) contradicts the Methodology section

The Methodology section states "no FAR, FRR, or EER performance claim is
made for the implemented system" because a proper evaluation dataset isn't
available yet. But the Results section then shows a confusion matrix with 6
named individuals (~10 test samples) implying ~70% accuracy — exactly the
kind of tiny-sample overfitting result the paper itself warns against two
paragraphs earlier ("100% train / 60% test on a six-person, sixty-eight-image
dataset").

**Fix — pick one, don't leave it unresolved:**

- **Option A (recommended if this was just a quick informal test):** Remove
  Figure 2 and the confusion-matrix paragraph entirely. Keep the honest
  statement that formal evaluation hasn't been done yet, and list it as
  future work.
- **Option B (if you want to keep it):** Reframe it explicitly as a small,
  non-representative pilot/sanity check — NOT a performance evaluation.
  State exactly how many individuals and samples were used, why this sample
  size cannot support a generalization claim, and that it exists only to
  confirm the pipeline runs end-to-end, not to measure accuracy. Do not
  report an accuracy percentage from it anywhere.

### 2. Reference [12] is an incomplete placeholder

Current text: *"S. A. Birrell, M. Fowkes, and P. A. Jennings, 'Effect of
Using an In-Vehicle Smart Driving Aid on Real-World Driver Performance,'
[Publication details to be completed if available]."*

**Fix:** Find the actual publication (journal/conference, year, volume,
pages, or DOI) and complete the citation. If it can't be found, remove the
citation and rewrite the sentence that cites it so it doesn't depend on an
unverifiable source.

### 3. Reference [37] is cited but does not exist

The Literature Review cites "[15], [37]" in the "Smart Driving License
Systems" paragraph, but the reference list only goes up to [21] — [37] has
no corresponding entry.

**Fix:** Either find the correct reference number that was meant (renumber
it) or remove "[37]" if it was a leftover from an earlier draft.

### 4. Multiple references have factual errors — re-verify all 21

Confirmed errors found so far:

- **[5]** Zhao, Chellappa, Phillips, Rosenfeld — cited as 2019; actual year
  is **2003** (ACM Computing Surveys, vol 35, no 4).
- **[19]** Horgan et al. — cited arXiv ID 2103.14362 is wrong; correct ID is
  **arXiv:2104.12583**.
- **[9]** Wang & Li — cited as 2020 with institutional affiliation listed as
  the venue; actual publication is **IEEE Access, January 2024**, DOI
  10.1109/ACCESS.2024.3450935.
- **[4]** "The Impact of Biometric Surveillance on Reducing Violent Crime" —
  cited as "PMC, Jun. 2021" with no author; actual paper is by **Patricia
  Haley**, published in **MDPI Sensors, 2025**. Add the author name and
  correct venue/year.
- **[1]** N. D. Silva, "Digital Transformation in Public Services in Sri
  Lanka," ICTA Report, 2022 — could not be located anywhere. Either find the
  exact source and confirm these details, replace it with a verifiable one,
  or remove the claims that depend on it.

**Fix:** Go through every one of the 21 references and confirm author names,
year, venue, volume/pages, and DOI/arXiv ID directly against the original
source (Google Scholar, the publisher's page, or arxiv.org) before
submitting. Do not trust a citation just because the topic sounds right.

## Important — Should Fix

### 5. Missing Abstract and Index Terms / Keywords

The paper goes straight from the title into "INTRODUCTION" with no Abstract
or Keywords section — both are normally required for a conference/journal
submission.

**Fix:** Add an Abstract (150-250 words) covering: the problem (manual,
fragmented traffic/license management in Sri Lanka), the proposed approach
(iPermit — facial recognition, point-based violations, mobile/web platform),
what was actually built and verified, and an honest note on what hasn't been
evaluated yet (face-recognition accuracy, automated violation detection).
Add 4-6 Index Terms/Keywords below it (e.g., digital licensing, facial
recognition, traffic enforcement, driver behavior analytics, Sri Lanka,
smart transportation).

### 6. System Design section is too thin

The section is one paragraph plus Figure 1, but claims "the system design
includes UML models, user interface designs, database structures, and REST
API specifications" without showing any of them.

**Fix:** Either add real supporting content (a simplified data model/ER
diagram, a short table of key API endpoints, or a sequence diagram for one
core flow like license approval), or remove the sentence claiming these
exist and describe only what's actually shown.

### 7. Results and Evaluation section lacks quantitative evidence

The usability evaluation is described only as "conducted with drivers,
police officers, and administrators" with no participant count, method, or
results.

**Fix:** Add specifics — how many participants of each role, what method was
used (survey, structured interview, task-based observation), and at least a
brief summary of findings (e.g., a short Likert-scale table, or 2-3
representative quotes/observations). If this evaluation genuinely wasn't run
yet, say so directly instead of describing it as completed.

## Minor — Polish

### 8. Grammar

*"The number of registered vehicles and road users increases, there is a
greater need..."* — missing "As" at the start of the sentence. Should read
*"As the number of registered vehicles and road users increases, there is a
greater need..."*

### 9. Formatting artifact

*"AI-based driver            verification"* has stray extra spaces
(leftover from editing) in the Results and Evaluation section — search and
remove.

# iPermit Paper — Revision Checklist

Tracks known issues in `Project_Paper.docx`/`Project_Paper.pdf` (the academic
paper draft, kept outside this repo) and the fixes needed before submission.
Found via a research-skills review cross-checked against this project's own
`docs/methodology.md`, `docs/tasks.md`, and a sample citation-verification
pass against original sources. Last verified against the actual PDF on
2026-09-20.

## Already Fixed (confirmed in the current PDF)

- [x] **Figure 1 (Architecture Diagram)** — regenerated via Eraser.io. All
  labels now accurate — no "Deploytment" typo, no garbled "LOGICAL SYSTEM
  FLOLY" text, "Public Route" no longer mislabeled as a "Gateway Layer",
  Violation Detection clearly marked "Planned, not yet built."

- [x] **Missing Abstract and Keywords** — added. Well-written: honest,
  appropriately scoped, explicitly notes limitations rather than
  overclaiming.

- [x] **Formatting artifact** — the stray double-spacing in "AI-based driver
  verification" (Results and Evaluation section) is gone.

## Drafted and ready, but NOT yet pasted into the paper

### 1. Figure 2 (Confusion Matrix) still contradicts the Methodology section

**As of the 2026-09-20 PDF, this is still the original flawed figure** — the
ameesha/keshan/lakshan/oshanda/pasindu/ravishan confusion matrix and its
surrounding text in "5.1 Facial Recognition Evaluation" are unchanged. The
replacement was already produced in a prior session and just needs to be
copied in:

- **New figure**: `docs/diagrams/face-recognition-far-frr-curve.png` — a
  FAR/FRR-vs-threshold curve (the methodologically correct visualization for
  a verification task) computed from a real evaluation run against two
  labeled datasets (LFW: 217 identities, 3,984 usable images; a Bollywood
  celebrity set: 100 identities, 1,374 usable images), both processed
  through the actual RetinaFace + ArcFace pipeline.
- **Result**: FAR near zero for both (0.01% LFW, 0.00% Bollywood at the 0.42
  threshold), but FRR much higher for the Bollywood set (6.31% vs 0.39%) and
  EER roughly 5x higher (0.81% vs 0.16%) — reported as an indicative,
  honestly-caveated finding (small Bollywood sample size, possible ArcFace
  training-data familiarity effect favoring LFW, differing photo styles
  between the two sets), not a definitive bias measurement.
- **Replacement paragraph text and figure caption**: already drafted in this
  project's conversation history — ask for it again if it's been lost, or
  reconstruct from the bullet points above.

**Fix:** swap the figure and paste in the replacement paragraph text; remove
the old confusion-matrix figure and its surrounding paragraph entirely.

## Critical — Must Fix Before Submission

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

### 5. System Design section is too thin

The section is one paragraph plus Figure 1, but claims "the system design
includes UML models, user interface designs, database structures, and REST
API specifications" without showing any of them.

**Fix:** Either add real supporting content (a simplified data model/ER
diagram, a short table of key API endpoints, or a sequence diagram for one
core flow like license approval), or remove the sentence claiming these
exist and describe only what's actually shown.

### 6. Results and Evaluation section lacks quantitative evidence

The usability evaluation is described only as "conducted with drivers,
police officers, and administrators" with no participant count, method, or
results.

**Fix:** Add specifics — how many participants of each role, what method was
used (survey, structured interview, task-based observation), and at least a
brief summary of findings (e.g., a short Likert-scale table, or 2-3
representative quotes/observations). If this evaluation genuinely wasn't run
yet, say so directly instead of describing it as completed.

## Minor — Polish

### 7. Grammar

*"The number of registered vehicles and road users increases, there is a
greater need..."* — missing "As" at the start of the sentence. Should read
*"As the number of registered vehicles and road users increases, there is a
greater need..."*

### 8. Inconsistent heading style

Sections 1 ("INTRODUCTION") and 2 ("LITERATURE REVIEW") are in all-caps,
while Sections 3–7 ("Methodology", "System Design", etc.) are in title case.
Pick one style and apply it throughout.

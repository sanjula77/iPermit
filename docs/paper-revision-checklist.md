# iPermit Paper — Revision Checklist

> **Superseded (2026-09-27):** see [paper-fixes.md](paper-fixes.md), a full
> review of the 2026-09-27 PDF with copy-paste fixes. Its reference numbering
> ([22]–[30]) replaces the [22]–[29] numbering used below.

Tracks known issues in `Project_Paper.docx`/`Project_Paper.pdf` (the academic
paper draft, kept outside this repo) and the fixes needed before submission.
Found via a research-skills review cross-checked against this project's own
`docs/methodology.md`, `docs/tasks.md`, and a sample citation-verification
pass against original sources. Last verified against the actual PDF on
2026-09-27.

**Where the paper lives:** the only copy on the dev machine is the PDF export,
`~/Desktop/Project_Paper.pdf` (14 pages, exported from Microsoft Word on
2026-09-19, document author "bashi rashmika"). The editable `.docx` is with that
teammate, so every edit below has to be applied in their Word file — the PDF
can't be edited cleanly.

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

### 1. Replace Section 5.1 (and Figure 2) with the v2 face-verification evaluation

**As of the 2026-09-19 PDF, Section 5.1 still shows the original flawed
figure** — the ameesha/keshan/lakshan/oshanda/pasindu/ravishan 6-person
confusion matrix. A closed-set confusion matrix describes a different problem
(classifying a fixed set of people) from what iPermit does (open-set
verification: "is this the same person?"), so it must be removed entirely,
together with its surrounding paragraph.

**What the current Section 5.1 contains, and what to do with each part:**

| Current part (as in the PDF) | Action |
|---|---|
| Paragraph 1: *"The facial recognition module was evaluated using real photographs against the running backend. Consistent four-photo enrollments…"* (enrollment and quality-check behaviour) | **Keep.** Still accurate — it describes functional verification. Place it before 5.1.1 as a short lead-in. |
| Paragraph 2: *"The recognition behavior was further examined using a confusion matrix…"* | **Delete.** |
| *Fig. 2. Confusion matrix of the facial recognition evaluation.* | **Delete** and replace with the new Fig. 2 (DET curve). |
| Paragraph 3: *"The evaluation confirms the functional operation… the FAR, FRR, and EER evaluation framework has been implemented and unit-tested… but has not yet been evaluated…"* | **Delete.** Now false; replaced by 5.1.1–5.1.4 below. |

**Numbering in the paper:** the paper already has TABLE I (tools and technology
stack) and Fig. 1 (architecture), and references [1]–[21]. So the three new
tables become **TABLE II, TABLE III and TABLE IV** (IEEE style: roman numerals,
caption above the table), the figures are **Fig. 2** (replacing the confusion
matrix) and **Fig. 3**, and the new references are **[22]–[29]**. The draft
below already uses these numbers.

**Use the v2 evaluation (run 2026-09-26), not the v1 numbers.** An earlier
draft of this item cited a first Colab run (LFW FRR 0.39%, Bollywood FRR
6.31%, EER 0.16% / 0.81%, figure `docs/diagrams/face-recognition-far-frr-curve.png`).
Those numbers are **superseded and must not appear anywhere in the paper**:
that run skipped the backend's CLAHE step and used every LFW image, so
George W. Bush alone produced ~59% of all LFW genuine pairs and the
LFW-vs-Bollywood comparison was not like-for-like.

**Source of every number below** (all in the repo):
- Notebook: `docs/evaluation/face_evaluation.ipynb` (re-runnable in Colab)
- Results: `docs/evaluation/results/` — `results_tables.md`, `metrics.json`,
  per-person CSVs, figures. Raw embeddings/scores are in the Colab output
  zip (`ipermit_face_eval_results.zip`), kept outside the repo.

#### Figures and tables to put in the paper

| Paper item | File | Notes |
|---|---|---|
| **TABLE II** — datasets | `results/results_tables.md` (Table 1) | |
| **TABLE III** — performance with 95% CIs | `results/results_tables.md` (Table 2) | Main results table |
| **TABLE IV** — confusion counts at τ = 0.42 | `results/results_tables.md` (Table 3) | The correct replacement for the old confusion matrix |
| **Figure 2** — DET curve | `results/fig_det_curve.png` | Main figure (ISO/IEC 19795-1 standard view) |
| **Figure 3** — score distributions | `results/fig_score_distributions.png` | Shows *why* errors happen |
| (optional) FAR/FRR vs threshold | `results/fig_far_frr_threshold.png` | Only if space allows; DET already covers it |
| (not for paper) label-noise grids | `results/fig_lowest_genuine_pairs_*.png` | Evidence for the mislabelled-photo finding; appendix at most |

Paper-ready tables (copied from `results_tables.md`, rounded for print):

**TABLE II. Evaluation datasets (up to 15 usable images per identity).**

| Dataset | Identities | Usable images | Skipped: no face / 2+ faces / duplicate | Genuine pairs | Impostor pairs |
|---|---|---|---|---|---|
| LFW (funneled) | 96 | 1,385 | 6 / 276 / 0 | 9,396 | 949,024 |
| Bollywood Celebrity Faces | 100 | 1,500 | 17 / 119 / 1 | 10,500 | 1,113,750 |

**TABLE III. Verification performance (95% identity-bootstrap confidence intervals).**

| Dataset | FAR @ τ=0.42 | FRR @ τ=0.42 | EER (threshold) | TAR @ FAR=0.1% | TAR @ FAR=0.01% |
|---|---|---|---|---|---|
| LFW | 0.0013% (0–0.008%) | 2.91% (1.79–4.09%) | 0.32% (0.03–0.75%) at 0.194 | 99.63% (99.17–100%) | 99.35% (98.53–99.90%) |
| Bollywood | 0.0025% (0–0.010%) | 9.89% (8.30–11.72%) | 1.13% (0.54–1.77%) at 0.209 | 98.40% (97.53–99.13%) | 96.84% (85.82–98.06%) |

**TABLE IV. Confusion counts at the deployed threshold τ = 0.42.**

| Dataset | Genuine accepted | Genuine rejected | Impostor accepted | Impostor rejected |
|---|---|---|---|---|
| LFW | 9,123 | 273 | 12 | 949,012 |
| Bollywood | 9,462 | 1,038 | 28 | 1,113,722 |

#### Draft text for Section 5.1

> **5.1 Facial Recognition Evaluation**
>
> *5.1.1 Evaluation protocol.* The face-verification pipeline was evaluated
> offline with the same models and preprocessing as the deployed backend:
> CLAHE contrast enhancement, RetinaFace face detection [22] and a
> ResNet-50 ArcFace model [23] producing 512-dimensional embeddings
> (InsightFace `buffalo_l` model pack, 640×640 detector input). Two public,
> identity-labelled datasets were used: LFW [24] (funneled version; the 96
> identities with at least 15 images, mostly Western public figures) and the
> 100 Bollywood Celebrity Faces collection [25] (100 South Asian actors). To make
> the two datasets comparable, up to 15 usable images per identity were
> sampled with a fixed random seed. As in the backend, which rejects
> photographs containing no face or more than one face, such images were
> skipped (TABLE II). Every pair of retained images was compared by cosine
> similarity; same-identity pairs formed the genuine set and cross-identity
> pairs the impostor set. Following ISO/IEC 19795-1 [26], performance
> is reported as false accept rate (FAR), false reject rate (FRR), equal
> error rate (EER) and true accept rate (TAR) at fixed FAR, with 95%
> confidence intervals from an identity-level bootstrap (1,000 replicates;
> people rather than pairs are resampled, because pairs involving the same
> person are not independent) [27]. This all-pairs protocol differs from
> the standard 6,000-pair LFW benchmark, so the results are not directly
> comparable with published LFW accuracies. The evaluation ran in Google
> Colab; re-computing the LFW embeddings inside the backend's own container
> reproduced them exactly (cosine similarity 1.0000 for every image).
>
> *5.1.2 Results.* At the deployed threshold τ = 0.42 the system accepted 12
> of 949,024 LFW impostor pairs (FAR 0.0013%) and 28 of 1,113,750 Bollywood
> impostor pairs (FAR 0.0025%) (TABLES III and IV). Inspection showed that all
> 40 false accepts involved one of three mislabelled photographs being
> matched to photographs of the person actually shown: an LFW image filed
> under Recep Tayyip Erdoğan that depicts Abdullah Gül, and two Bollywood
> images filed under Arjun Rampal and Vaani Kapoor whose embeddings match
> Hrithik Roshan and Shilpa Shetty (median similarity 0.66 and 0.58 to those
> identities' images, against 0.18 or less to their labelled identities).
> Apart from these labelling errors, no pair of different people exceeded
> the threshold. False rejection rates were higher: 2.91%
> (95% CI 1.79–4.09%) on LFW and 9.89% (8.30–11.72%) on Bollywood. The EER
> was 0.32% at a threshold of 0.194 on LFW and 1.13% at 0.209 on Bollywood.
> The DET curves (Fig. 2) show the Bollywood curve above the LFW curve across
> the whole operating range, and the score distributions (Fig. 3) show that
> the difference comes from the genuine scores (mean genuine similarity 0.561
> versus 0.632), while the impostor distributions of the two datasets are
> nearly identical.
>
> Because web-collected datasets contain labelling errors, a sensitivity
> analysis removed images whose median similarity to the other images of the
> same identity was below 0.25 (2 LFW and 9 Bollywood images). This reduced
> FAR at τ to zero on both datasets and the EER to 0.08% (LFW) and 0.20%
> (Bollywood), while FRR changed only slightly (2.62% and 8.80%). The FRR gap
> is therefore not an artefact of labelling errors; Bollywood false
> rejections were also spread across 90 of the 100 identities, whereas LFW
> false rejections were concentrated in 29 of 96.
>
> *CLAHE ablation.* To check the contribution of the CLAHE step, the same
> 1,367 LFW images (those with exactly one detected face in both
> conditions) were re-embedded without it. Removing CLAHE reduced FRR at
> τ = 0.42 from 2.95% to 1.37%, with no meaningful change in FAR (0.0013%
> versus 0.0016%) or EER (0.32% versus 0.31%). CLAHE lowered the genuine
> similarity score in 89.5% of same-person pairs (mean change −0.035),
> plausibly because ArcFace was trained on unprocessed photographs, so
> contrast enhancement moves its input away from the training distribution.
> At a fixed threshold this lowers genuine scores without improving
> separation, so the preprocessing step described in the original design
> increases false rejections.
>
> *5.1.3 Discussion.* The deployed threshold is conservative: across about
> two million impostor comparisons it produced no false match between
> different people, at the cost of rejecting roughly 3% (LFW) to 10%
> (Bollywood) of same-person pairs. This trade-off suits iPermit's officer
> workflow, where a face scan is searched against every enrolled driver
> (one-to-many): the expected number of wrong candidates per search grows
> with the number of enrolled drivers multiplied by the per-comparison FAR,
> so a low FAR matters more than a low FRR, and false rejections are handled
> by the manual-confirmation step. The EER thresholds (about 0.19–0.21) would
> balance the two error rates, but would raise FAR by orders of magnitude in
> a one-to-many search and are therefore not adopted. The higher FRR on the
> South Asian dataset is statistically robust (the confidence intervals do
> not overlap), but its cause cannot be isolated with this data: the
> Bollywood images are film stills and publicity photographs with heavy
> make-up, stylised lighting and wide age ranges across long careers, while
> LFW consists largely of news photographs. The NIST FRVT demographic study
> found that differences in false non-match rates between demographic groups
> are comparatively small and largely driven by image quality, whereas larger
> demographic differentials appear in false match rates [28]. The
> observed gap is therefore consistent with photo-style and image-quality
> differences; a demographic contribution can be neither confirmed nor ruled
> out.
>
> *5.1.4 Limitations.* (i) Both datasets are celebrity photographs, not Sri
> Lankan drivers photographed with mobile phones, so the figures are
> indicative rather than a measure of field performance. (ii) The ArcFace
> model was trained on web-collected celebrity imagery (WebFace600K
> [29]), which may include some of the evaluated identities and
> favour both datasets. (iii) Only exact duplicate files were removed; some
> near-duplicate photographs remain, visible as genuine scores close to 1.0.
> (iv) The enrollment photo-quality gate was not applied, so enrolled
> templates in deployment would be of higher quality than some evaluation
> images. (v) The CLAHE ablation was run on LFW only; the Bollywood images
> are expected to behave similarly but this was not measured.

**Captions:**
- *TABLE II.* Evaluation datasets after sampling up to 15 usable images per identity.
- *TABLE III.* Verification performance of the iPermit face pipeline; 95% confidence intervals from an identity-level bootstrap (1,000 replicates).
- *TABLE IV.* Confusion counts at the deployed threshold τ = 0.42. All 40 impostor accepts involve mislabelled dataset images (Section 5.1.2).
- *Fig. 2.* Detection error trade-off (DET) curves on log–log axes. Markers show the deployed threshold τ = 0.42; the dotted diagonal marks FAR = FRR, where each curve crosses at its EER.
- *Fig. 3.* Distributions of genuine (same-person) and impostor (different-person) cosine similarities. Dashed line: deployed threshold τ = 0.42; dotted line: EER threshold.

**References to add** as [22]–[29], numbered in order of first citation in
Section 5.1 (verify each against the source before submitting, as item 4
requires). If the paper numbers strictly by first appearance, [28] moves
earlier because the Section 3.7 edit (item 1a) cites it first.
- [22] J. Deng, J. Guo, E. Ververas, I. Kotsia, and S. Zafeiriou, "RetinaFace: Single-Shot Multi-Level Face Localisation in the Wild," in *Proc. IEEE/CVF CVPR*, 2020, pp. 5203–5212.
- [23] J. Deng, J. Guo, N. Xue, and S. Zafeiriou, "ArcFace: Additive Angular Margin Loss for Deep Face Recognition," in *Proc. IEEE/CVF CVPR*, 2019, pp. 4690–4699.
- [24] G. B. Huang, M. Ramesh, T. Berg, and E. Learned-Miller, "Labeled Faces in the Wild: A Database for Studying Face Recognition in Unconstrained Environments," Univ. of Massachusetts, Amherst, Tech. Rep. 07-49, Oct. 2007.
- [25] havingfun, "100 Bollywood Celebrity Faces," Kaggle dataset. [Online]. Available: https://www.kaggle.com/datasets/havingfun/100-bollywood-celebrity-faces (accessed Sep. 20, 2026).
- [26] ISO/IEC 19795-1:2021, *Information technology — Biometric performance testing and reporting — Part 1: Principles and framework*.
- [27] R. M. Bolle, N. K. Ratha, and S. Pankanti, "Error analysis of pattern recognition systems — the subsets bootstrap," *Computer Vision and Image Understanding*, vol. 93, no. 1, pp. 1–33, 2004.
- [28] P. Grother, M. Ngan, and K. Hanaoka, "Face Recognition Vendor Test (FRVT) Part 3: Demographic Effects," NIST, NISTIR 8280, Dec. 2019, doi: 10.6028/NIST.IR.8280.
- [29] Z. Zhu *et al.*, "WebFace260M: A Benchmark Unveiling the Power of Million-Scale Deep Face Recognition," in *Proc. IEEE/CVF CVPR*, 2021.

**Fix (in the teammate's Word file):** keep paragraph 1 of the current 5.1;
delete paragraph 2, the old Fig. 2 and paragraph 3; insert the new 5.1.1–5.1.4
text, TABLES II–IV, Figs. 2–3 and their captions; append references [22]–[29].
Figure files: `docs/evaluation/results/fig_det_curve.png` (Fig. 2) and
`docs/evaluation/results/fig_score_distributions.png` (Fig. 3), both 300 dpi.

### 1a. Other sections still say "no evaluation has been done" — now factually wrong

Several sentences elsewhere in the paper say no real evaluation was
performed. Each needs a small, targeted edit so the paper stays consistent
with the new Section 5.1. (These replace the edit texts drafted on
2026-09-20, which quoted the superseded v1 numbers and made two claims the
v2 evaluation does not support: that the 0.22 EER threshold "would better
balance" errors for iPermit, and that the gap is a demographic disparity.)

**Abstract** — current: *"...while a driver-behavior badge formula and a
FAR/FRR/EER evaluation harness were implemented to support transparent,
auditable classification and future performance validation."*

Replace with: *"...while a driver-behavior badge formula was implemented to
support transparent, auditable classification, and the face-verification
pipeline was evaluated on two public labelled datasets (LFW and a South
Asian celebrity dataset). At the deployed threshold no false match between
different people was observed in about two million impostor comparisons,
while false-rejection rates were 2.9% and 9.9% respectively, underscoring
the need for validation on Sri Lankan driver photographs before
deployment."*

**Section 3.5 (Testing Strategy), final paragraph** — current: *"...The
evaluation functions were unit-tested using synthetic score distributions;
however, evaluation against a representative held-out dataset has not yet
been performed because a sufficiently sized project-specific evaluation
dataset is not currently available. Consequently, no FAR, FRR, or EER
performance claim is made for the implemented system."*

Replace the last two sentences with: *"The evaluation functions were
unit-tested using synthetic score distributions and then applied to two
labelled face-verification datasets — LFW (96 identities, mostly Western
public figures) and a Bollywood celebrity collection (100 South Asian
identities) — processed through the system's actual preprocessing,
detection and embedding pipeline. Results are reported in Section 5.1, with
caveats about dataset composition, labelling errors and generalisability to
Sri Lankan drivers stated explicitly."*

**Section 3.6 (Verification Discipline and Documentation Practice)** —
after the existing sentence documenting that the 0.42 face-match threshold
is unvalidated, add: *"The subsequent evaluation (Section 5.1) found
equal-error-rate thresholds of about 0.19–0.21 on the tested datasets.
Because the officer workflow performs a one-to-many search, in which false
matches matter more than false rejections, the evaluation supports keeping
the more conservative 0.42 rather than moving to the EER point; the
threshold has still not been validated on Sri Lankan driver photographs."*

**Section 3.7 (Limitations of the Adopted Methodology)** — add: *"The
evaluation (Section 5.1) also found a significantly higher false-rejection
rate on a South Asian celebrity dataset than on LFW (9.9% versus 2.9%)
using the identical pipeline. Because the two datasets also differ in
photographic style and image quality, the gap cannot be attributed to
demographic factors alone [28], and it has not yet been measured on
genuine Sri Lankan driver photographs."* Do **not** cite [4] for this — [4]
(Haley, biometric surveillance and crime) is not about demographic error
rates, and [17] (Varshney *et al.*, "Digital Identity Management Using
Biometric Systems: BioTrace") isn't either — cite only [28] (NIST FRVT Part 3).

**Section 6 (Conclusion and Future Work)** — current: *"Future enhancements
include improving facial recognition accuracy using larger Sri Lankan
datasets..."*

Replace with: *"Future enhancements include validating and tuning facial
recognition on a dedicated Sri Lankan driver dataset — motivated by the
higher false-rejection rate observed on South Asian faces during evaluation
(Section 5.1) — alongside integrating advanced driver behavior analysis and
drowsiness detection..."* (continue with the rest of the existing sentence
unchanged).

**Fix:** apply all five edits in the same revision pass as item 1 —
leaving any one of them unfixed would create a new internal contradiction.

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

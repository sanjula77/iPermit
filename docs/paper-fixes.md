# iPermit Paper — Required Fixes (review of 2026-09-27 PDF)

Review of `~/Desktop/Project_Paper.pdf` (14 pages, exported from Word on
2026-09-27 17:58). Every claim in the paper was checked against the actual
codebase, `docs/requirements.md`, `docs/design.md`, `docs/tasks.md`, the
face-evaluation results in `docs/evaluation/results/`, and (for references)
the original publisher/Crossref/arXiv records.

This file **supersedes `docs/paper-revision-checklist.md`**. The Section 5.1
text drafted there was never pasted in; the teammate wrote a different 5.1
using the old, superseded evaluation run. Reference numbers below also differ
from that file, because new references are now numbered in order of first
appearance.

## How to use this file

- Each item says **where** the problem is, **what is wrong**, and gives the
  **fix**.
- Text inside ` ```text ` blocks is ready to copy-paste into Word. Each
  paragraph is on a single line, so Word won't get stray line breaks.
- Tables are given as `|`-separated rows. To turn one into a Word table,
  paste it, select it, choose **Insert → Table → Convert Text to Table**,
  and under *Separate text at* pick **Other** and type `|`.
- Figures for the paper are already in the repo at 300 dpi:
  `docs/evaluation/results/fig_det_curve.png` and
  `docs/evaluation/results/fig_score_distributions.png`.
- Apply the items **together**. Many sections cross-reference each other
  (Abstract ↔ 3.5 ↔ 5.1 ↔ 6), so fixing only some of them creates new
  contradictions.

## Summary

| # | Where | Problem | Severity |
|---|---|---|---|
| 1 | §5.1 + Fig. 2 | Uses the superseded v1 evaluation run; numbers wrong; text contradicts its own figure | **Critical** |
| 2 | §5 intro | Claims a usability evaluation and performance evaluation that were never run | **Critical** |
| 3 | References | 4 appear fabricated, 1 is a placeholder, [37] doesn't exist, 12 others have errors | **Critical** |
| 4 | §4 System Design | Says embeddings are in PostgreSQL and the AI runs as a microservice (both false); claims UML/API specs that aren't shown | **Critical** |
| 5 | Abstract | Says all 14 requirements were verified; says face evaluation is still "future" | **Critical** |
| 6 | §3.5 last paragraph | Says no FAR/FRR/EER evaluation was done (now false) | **Critical** |
| 7 | §3.4.3, §3.6, §3.7 | Don't report what the evaluation found (CLAHE hurts; quality gate rejects real selfies); "single-developer" contradicts "research team" | Important |
| 8 | §3.4.7 | Outdated (fallback-location behaviour changed, map now runs on Android); danger zones missing | Important |
| 9 | TABLE I | "Server-rendered admin UI" is false; every admin page is client-rendered | Important |
| 10 | §1, §6 | Overclaims "behavior analysis" and "AI-powered traffic monitoring"; section roadmap doesn't match the paper | Important |
| 11 | §2 Literature Review | Missing sub-heading letter; reviews FaceNet but not ArcFace/RetinaFace (what the system uses); no mDL standard | Important |
| 12 | §3.5, §3.7 | "Source research" figures (100%/60%, ~85% mAP@50) are uncited | Important |
| 13 | Throughout | Grammar, heading style, figure captions, title vs. body naming, no author block | Minor |

---

## CRITICAL

### 1. Section 5.1 and Fig. 2 use the superseded evaluation run

**Where:** Section 5.1 (pages 12–13), Fig. 2.

**What is wrong:**

1. **The figure and pair counts come from the discarded v1 run.** The current
   Fig. 2 and text say *"LFW (155,929 genuine, 7,778,207 impostor pairs)"*,
   *"Bollywood (8,808 genuine, 934,443 impostor pairs)"* and *"EER … 0.220 on
   both datasets"*. That is the first Colab run
   (`docs/diagrams/face-recognition-far-frr-curve.png`), which was thrown out
   because it (a) skipped the backend's CLAHE step, so it was **not the
   deployed pipeline**, and (b) used every LFW image, so George W. Bush alone
   produced about 59% of all genuine pairs. The run that actually matches the
   deployed system (v2) gives: LFW 9,396 genuine / 949,024 impostor pairs,
   Bollywood 10,500 / 1,113,750, EER 0.32% at threshold 0.194 (LFW) and 1.13%
   at 0.209 (Bollywood). Source: `docs/evaluation/results/results_tables.md`.
2. **The text contradicts its own figure.** It says *"FRR stays near zero
   until the threshold approaches roughly 0.5–0.6"*, but the paper's own
   Bollywood panel shows FRR ≈ 7% at the 0.42 line. The measured FRR at 0.42
   is 2.91% (LFW) and **9.89% (Bollywood)**. Neither is "near zero".
3. **Unsupported fairness claim.** *"The similar EER across both datasets is
   an encouraging early sign that the threshold does not need
   demographic-specific recalibration"* is the opposite of what the correct
   data shows. Bollywood FRR is more than 3× the LFW FRR, and the confidence
   intervals don't overlap. The claim must go.
4. **The confusion-matrix paragraph is the wrong concept.** A closed-set
   confusion matrix doesn't apply to open-set verification. The correct
   fixed-threshold view is a table of genuine/impostor accept/reject counts,
   and that data already exists (TABLE V below).
5. **Fig. 2 has no proper caption.** It only says "Fig: 2".

**Fix:** keep only the first paragraph of the current 5.1 (the functional
check). Delete everything after it, including the old Fig. 2. Paste the text
below, then insert TABLES III–V and Figs. 2–3.

> Table numbering: TABLE I is the tech stack and TABLE II is the new API
> table from item 4, so the evaluation tables are III, IV and V. If you skip
> item 4's table, renumber these as II, III and IV.

**Paste this — Section 5.1** (after the kept first paragraph):

```text
5.1.1 Evaluation Protocol

The face-verification pipeline was evaluated offline using the same models and preprocessing as the deployed backend: CLAHE contrast enhancement, RetinaFace face detection [23] and a ResNet-50 ArcFace model [24] producing 512-dimensional embeddings (InsightFace buffalo_l model pack, 640×640 detector input). Two public, identity-labelled datasets were used: LFW [26] (funneled version; the 96 identities with at least 15 images, mostly Western public figures) and the 100 Bollywood Celebrity Faces collection [27] (100 South Asian actors). To make the two datasets comparable, up to 15 usable images per identity were sampled with a fixed random seed. As in the backend, which rejects photographs containing no face or more than one face, such images were skipped (TABLE III). Every pair of retained images was compared by cosine similarity; same-identity pairs formed the genuine set and cross-identity pairs the impostor set. Following ISO/IEC 19795-1 [28], performance is reported as false accept rate (FAR), false reject rate (FRR), equal error rate (EER) and true accept rate (TAR) at fixed FAR, with 95% confidence intervals from an identity-level bootstrap (1,000 replicates; people rather than pairs are resampled, because pairs involving the same person are not independent) [29]. This all-pairs protocol differs from the standard 6,000-pair LFW benchmark, so the results are not directly comparable with published LFW accuracies. The evaluation ran in Google Colab; re-computing the LFW embeddings inside the backend's own container reproduced them exactly (cosine similarity 1.0000 for every image).

5.1.2 Results

At the deployed threshold τ = 0.42 the system accepted 12 of 949,024 LFW impostor pairs (FAR 0.0013%) and 28 of 1,113,750 Bollywood impostor pairs (FAR 0.0025%) (TABLES IV and V). Inspection showed that all 40 false accepts involved one of three mislabelled photographs being matched to photographs of the person actually shown: an LFW image filed under Recep Tayyip Erdoğan that depicts Abdullah Gül, and two Bollywood images filed under Arjun Rampal and Vaani Kapoor whose embeddings match Hrithik Roshan and Shilpa Shetty (median similarity 0.66 and 0.58 to those identities' images, against 0.18 or less to their labelled identities). Apart from these labelling errors, no pair of different people exceeded the threshold. False rejection rates were higher: 2.91% (95% CI 1.79–4.09%) on LFW and 9.89% (8.30–11.72%) on Bollywood. The EER was 0.32% at a threshold of 0.194 on LFW and 1.13% at 0.209 on Bollywood. The DET curves (Fig. 2) show the Bollywood curve above the LFW curve across the whole operating range, and the score distributions (Fig. 3) show that the difference comes from the genuine scores (mean genuine similarity 0.561 versus 0.632), while the impostor distributions of the two datasets are nearly identical.

Because web-collected datasets contain labelling errors, a sensitivity analysis removed images whose median similarity to the other images of the same identity was below 0.25 (2 LFW and 9 Bollywood images). This reduced FAR at τ to zero on both datasets and the EER to 0.08% (LFW) and 0.20% (Bollywood), while FRR changed only slightly (2.62% and 8.80%). The FRR gap is therefore not an artefact of labelling errors; Bollywood false rejections were also spread across 90 of the 100 identities, whereas LFW false rejections were concentrated in 29 of 96.

To check the contribution of the CLAHE step, the same 1,367 LFW images (those with exactly one detected face in both conditions) were re-embedded without it. Removing CLAHE reduced FRR at τ = 0.42 from 2.95% to 1.37%, with no meaningful change in FAR (0.0013% versus 0.0016%) or EER (0.32% versus 0.31%). CLAHE lowered the genuine similarity score in 89.5% of same-person pairs (mean change −0.035), plausibly because ArcFace was trained on unprocessed photographs, so contrast enhancement moves its input away from the training distribution. At a fixed threshold this lowers genuine scores without improving separation, so the preprocessing step described in the original design increases false rejections.

5.1.3 Discussion

The deployed threshold is conservative: across about two million impostor comparisons it produced no false match between different people, at the cost of rejecting roughly 3% (LFW) to 10% (Bollywood) of same-person pairs. This trade-off suits iPermit's officer workflow, in which a face scan is searched against every enrolled driver (one-to-many): the expected number of wrong candidates per search grows with the number of enrolled drivers multiplied by the per-comparison FAR, so a low FAR matters more than a low FRR, and false rejections are handled by the manual-confirmation step. The EER thresholds (about 0.19–0.21) would balance the two error rates, but would raise FAR by orders of magnitude in a one-to-many search and are therefore not adopted. The higher FRR on the South Asian dataset is statistically robust (the confidence intervals do not overlap), but its cause cannot be isolated with this data: the Bollywood images are film stills and publicity photographs with heavy make-up, stylised lighting and wide age ranges across long careers, while LFW consists largely of news photographs. The NIST FRVT demographic study found that differences in false non-match rates between demographic groups are comparatively small and largely driven by image quality, whereas larger demographic differentials appear in false match rates [25]. The observed gap is therefore consistent with photo-style and image-quality differences; a demographic contribution can be neither confirmed nor ruled out.

5.1.4 Limitations

(i) Both datasets are celebrity photographs, not Sri Lankan drivers photographed with mobile phones, so the figures are indicative rather than a measure of field performance. (ii) The ArcFace model was trained on web-collected celebrity imagery (WebFace600K [30]), which may include some of the evaluated identities and favour both datasets. (iii) Only exact duplicate files were removed; some near-duplicate photographs remain, visible as genuine scores close to 1.0. (iv) The enrollment photo-quality gate was not applied, so enrolled templates in deployment would be of higher quality than some evaluation images. (v) The CLAHE ablation was run on LFW only; the Bollywood images are expected to behave similarly, but this was not measured.
```

**Paste this — TABLE III** (caption goes *above* the table, IEEE style):

```text
TABLE III. Evaluation Datasets After Sampling Up to 15 Usable Images per Identity
Dataset|Identities|Usable images|Skipped (no face / 2+ faces / duplicate)|Genuine pairs|Impostor pairs
LFW (funneled)|96|1,385|6 / 276 / 0|9,396|949,024
Bollywood Celebrity Faces|100|1,500|17 / 119 / 1|10,500|1,113,750
```

**Paste this — TABLE IV:**

```text
TABLE IV. Verification Performance of the iPermit Face Pipeline (95% Identity-Level Bootstrap Confidence Intervals, 1,000 Replicates)
Dataset|FAR @ τ = 0.42|FRR @ τ = 0.42|EER (threshold)|TAR @ FAR = 0.1%|TAR @ FAR = 0.01%
LFW|0.0013% (0–0.008%)|2.91% (1.79–4.09%)|0.32% (0.03–0.75%) at 0.194|99.63% (99.17–100%)|99.35% (98.53–99.90%)
Bollywood|0.0025% (0–0.010%)|9.89% (8.30–11.72%)|1.13% (0.54–1.77%) at 0.209|98.40% (97.53–99.13%)|96.84% (85.82–98.06%)
```

**Paste this — TABLE V:**

```text
TABLE V. Confusion Counts at the Deployed Threshold τ = 0.42
Dataset|Genuine accepted|Genuine rejected|Impostor accepted|Impostor rejected
LFW|9,123|273|12|949,012
Bollywood|9,462|1,038|28|1,113,722
```

**Figures** (caption goes *below* the figure):

- Replace the old Fig. 2 image with `docs/evaluation/results/fig_det_curve.png`.
- Add `docs/evaluation/results/fig_score_distributions.png` as Fig. 3.

```text
Fig. 2. Detection error trade-off (DET) curves on log–log axes. Markers show the deployed threshold τ = 0.42; the dotted diagonal marks FAR = FRR, where each curve crosses at its EER.
```

```text
Fig. 3. Distributions of genuine (same-person) and impostor (different-person) cosine similarities. Dashed line: deployed threshold τ = 0.42; dotted line: EER threshold.
```

---

### 2. Section 5 claims evaluations that never happened

**Where:** Section 5 opening paragraph (page 11).

**What is wrong:**
- *"The usability evaluation conducted with drivers, police officers, and
  administrators showed that the system provides a user-friendly
  approach…"*: no usability study or UAT has been run (`docs/tasks.md` Task
  9.5 is still open). There are no participants, no method and no results.
  Reporting a study that didn't happen is an academic-integrity problem, not
  just a weak point.
- *"Performance evaluation demonstrated effective communication … supporting
  real-time digital license verification"*: no latency, throughput or load
  test was run. Section 3.7 itself says concurrency and load weren't
  evaluated.
- *"The evaluation results indicate that iPermit can reduce dependency on
  physical licenses, improve driver identification efficiency…"*: nothing
  measured supports this. It's a design goal, not a result.

**Fix:** replace the whole opening paragraph of Section 5 with the text
below. If a usability session **is** run before submission, add a new
subsection 5.2 with participant counts per role, the method (e.g. task-based
test + SUS questionnaire) and the actual scores.

**Paste this:**

```text
The iPermit prototype integrates digital license issuance, face-based and QR/NIC-based roadside verification, manually recorded violations with point deduction and suspension, fines with mock payment and appeals, rule-based driver badges, notifications, and road incident and danger-zone reporting in a single platform. Functional correctness was established in two ways: an automated backend test suite (unit tests for pure business rules and integration tests for every API endpoint against an isolated test database), and live verification of each workflow against the running Docker-based deployment through the mobile app, the admin dashboard and direct API calls (Section 3.4). This section reports the one quantitative evaluation performed so far, of the face-verification pipeline (Section 5.1). A usability study with drivers, police officers and administrators, and performance and load testing of the backend, have not yet been carried out; no usability, latency or throughput claims are therefore made for the prototype, and these evaluations are identified as future work in Section 6.
```

---

### 3. References: fabricated, placeholder, missing and incorrect entries

**Where:** Section 7 (References) and the in-text citations in Section 2.

Every reference was checked against Crossref, the publisher's page, arXiv
or the institutional repository.

| Ref | Status | What's wrong |
|---|---|---|
| [1] | **Not found** | No "N. D. Silva, ICTA Report 2022" exists anywhere. Replace. |
| [2] | **Not found** | No Ministry of Transport "Annual Road Accident Report 2023" exists online. Replace. |
| [3] | **Not found — likely fabricated** | Neither the journal ("International Journal of Surveillance Tech.") nor the paper exists. Replace. |
| [4] | Errors | Author missing; title incomplete; it's *Sensors* 2025, not "PMC, Jun. 2021". |
| [5] | Error | Year is 2003, not 2019. |
| [6] | **Not found — fabricated** | IEEE T-ITS vol. 21 no. 4 contains no such paper; pages 1418–1430 fall inside two other papers. Replace. |
| [7] | **Not found** | No World Bank report has this title. Replace. |
| [8] | OK | Month and DOI added. |
| [9] | Errors | It's *IEEE Access* 2024, not a 2020 university document. |
| [10] | OK | Pages and DOI added. |
| [11] | OK | Pages and DOI added. |
| [12] | **Placeholder** | "[Publication details to be completed if available]" — it's IEEE T-ITS 2014. |
| [13] | Errors | Author order is Thai, Seo, Huh; year 2024; venue *IEEE Access*. |
| [14] | Errors | Author order (Maral before Borhade); venue is ICTEST 2025, not the college. |
| [15] | Errors | Published in IJSRST vol. 3 no. 2. |
| [16] | Not found as cited | No evaluation report by "Alymbaeva" exists; the project itself is real (UN Road Safety Fund). |
| [17] | Errors | Author list wrong; volume, issue and pages missing. |
| [18] | OK | Thesis type and repository link added. |
| [19] | Errors | arXiv ID 2103.14362 is an unrelated paper; the right ID is 2104.12583, and the original is IEEE ITSC 2015. The stray "arXiv preprint," at the end should be removed. |
| [20] | Errors | "Multiple Authors" → real author names; issue no. 8, not 6. |
| [21] | Errors | Book, publisher, year and title are wrong: it's in *Smart Computing* (CRC Press, 2021). |
| **[37]** | **Does not exist** | Cited in §2.B *"[15], [37]"*, but the list ends at [21]. |

**Fix, part A — in-text citation edits in Section 2.** The replacement
sources for [2] and [6] support narrower claims than the old (fabricated)
ones, so three sentences must change:

- **§2.B**, change *"…by maintaining centralized driver databases [15], [37]."*
  to:

```text
…by maintaining centralized driver databases [15], [21].
```

- **§2.A (Overview)**, the first citation sentence currently ends
  *"…resulting in administrative delays, inconsistencies, and limited
  accountability [1], [2]."* Replace that sentence with:

```text
In Sri Lanka, traffic law enforcement and driving license management continue to rely largely on manual processes, while public-sector digitalisation is still in progress [1] and road traffic injuries remain a significant public-health burden [2].
```

- **§2.F (Research Gap)**, change *"…where traffic management remains
  predominantly manual [2]."* to (the authors' own observation, which needs
  no citation):

```text
…where driving license verification and fine management remain largely manual and paper-based.
```

- **§2 Point-Based paragraph**, the last sentence *"As a result, these
  systems are increasingly recognized as effective tools for strengthening
  road safety and regulatory compliance [6]."*: delete the "[6]" (the
  replacement [6] is about accident prediction, not point systems), or
  delete the sentence.

**Fix, part B — replace the whole reference list** with the list below. It
contains the corrected [1]–[21] (keeping the same numbers, so the other
in-text citations stay valid) plus the new [22]–[30] introduced by items 1,
7 and 11, numbered in order of first appearance. Every entry was verified on
2026-09-27. Before submitting, open [7] once to confirm its year, since the
year is only implied by the World Bank document ID.

**Paste this:**

```text
[1] M. U. I. Alahakoon and S. N. Jehan, "Efficiency of public service delivery—A post-ICT deployment analysis," Economies, vol. 8, no. 4, Art. no. 97, Nov. 2020, doi: 10.3390/economies8040097.

[2] World Health Organization, Global Status Report on Road Safety 2023. Geneva, Switzerland: WHO, Dec. 2023.

[3] N. Lynch, "Facial recognition technology in policing and security—Case studies in regulation," Laws, vol. 13, no. 3, Art. no. 35, Jun. 2024, doi: 10.3390/laws13030035.

[4] P. Haley, "The impact of biometric surveillance on reducing violent crime: Strategies for apprehending criminals while protecting the innocent," Sensors, vol. 25, no. 10, Art. no. 3160, May 2025, doi: 10.3390/s25103160.

[5] W. Zhao, R. Chellappa, P. J. Phillips, and A. Rosenfeld, "Face recognition: A literature survey," ACM Comput. Surv., vol. 35, no. 4, pp. 399–458, Dec. 2003, doi: 10.1145/954339.954342.

[6] J. Wang, C. Zhao, and Z. Liu, "Can historical accident data improve sustainable urban traffic safety? A predictive modeling study," Sustainability, vol. 16, no. 22, Art. no. 9642, Nov. 2024, doi: 10.3390/su16229642.

[7] World Bank, "Smart Mobility Toolkit for World Bank Operations," Washington, DC, USA, Rep. 099041224104510934, 2024.

[8] K. Wang, J. De Vos, M. Smart, and S. Wang, "Explaining youth driver licensing determinants using XGBoost and SHAP," Transport Policy, vol. 168, pp. 87–100, Jul. 2025, doi: 10.1016/j.tranpol.2025.04.009.

[9] M. Wang and N. Li, "A hierarchical network-based method for predicting driver traffic violations," IEEE Access, vol. 12, pp. 121280–121290, 2024, doi: 10.1109/ACCESS.2024.3450935.

[10] Q. Liu and E. M. Albina, "Application of face recognition technology in mobile payment," in Proc. IEEE 12th Int. Conf. RFID Technol. Appl. (RFID-TA), Cagliari, Italy, Sep. 2022, pp. 217–219, doi: 10.1109/RFID-TA54958.2022.9924028.

[11] W. Zhang, "Design and application of mobile face recognition system based on FaceNet model," in Proc. 5th Int. Symp. Comput. Technol. Inf. Sci. (ISCTIS), May 2025, pp. 872–876, doi: 10.1109/ISCTIS65944.2025.11065923.

[12] S. A. Birrell, M. Fowkes, and P. A. Jennings, "Effect of using an in-vehicle smart driving aid on real-world driver performance," IEEE Trans. Intell. Transp. Syst., vol. 15, no. 4, pp. 1801–1810, Aug. 2014, doi: 10.1109/TITS.2014.2328357.

[13] H.-D. Thai, Y.-S. Seo, and J.-H. Huh, "Enhanced efficiency in SMEs attendance monitoring: Low cost artificial intelligence facial recognition mobile application," IEEE Access, vol. 12, pp. 184257–184274, 2024, doi: 10.1109/ACCESS.2024.3504858.

[14] V. Moralwar, S. Kolambikar, S. Maral, and S. Borhade, "Identity-based access control using facial recognition and OTP," in Proc. 2nd Int. Conf. Trends Eng. Syst. Technol. (ICTEST), Apr. 2025, pp. 1–4, doi: 10.1109/ICTEST64710.2025.11042774.

[15] P. Burade, A. Dohe, A. Jaiswal, R. Gaikwad, P. Motghare, and V. N. Mahawadiwar, "Smart driving license issuing test for smart city," Int. J. Sci. Res. Sci. Technol. (IJSRST), vol. 3, no. 2, pp. 114–116, 2017.

[16] UN Road Safety Fund, "Improvement of driver licensing system in Lao PDR," project page, 2020–2024. [Online]. Available: https://roadsafetyfund.un.org/projects/improvement-driver-licensing-system-lao-pdr

[17] K. Varshney, Chelse, A. Parasher, S. K. Tomar, and R. Paul, "Digital identity management using biometric systems: BioTrace," J. Inf. Syst. Eng. Manage., vol. 10, no. 51s, pp. 374–385, May 2025, doi: 10.52783/jisem.v10i51s.10396.

[18] C. S. Kimulu, "Stakeholder engagement practices and performance of smart driving licence project among public service vehicles in Kisumu County," M.S. thesis, Univ. of Nairobi, Nairobi, Kenya, 2024. [Online]. Available: http://erepository.uonbi.ac.ke/handle/11295/167318

[19] J. Horgan, C. Hughes, J. McDonald, and S. Yogamani, "Vision-based driver assistance systems: Survey, taxonomy and advances," in Proc. IEEE 18th Int. Conf. Intell. Transp. Syst. (ITSC), Sep. 2015, pp. 2032–2039, doi: 10.1109/ITSC.2015.329.

[20] J. F. González-Saavedra, M. Figueroa, S. Céspedes, and S. Montejo-Sánchez, "Survey of cooperative advanced driver assistance systems: From a holistic and systemic vision," Sensors, vol. 22, no. 8, Art. no. 3040, Apr. 2022, doi: 10.3390/s22083040.

[21] N. Jain, N. Bhadula, M. Daud, and A. Dixit, "SMART-driving license: An IoT-based system for a secure vehicle system," in Smart Computing: Proc. 1st Int. Conf. Smart Mach. Intell. Real-Time Comput. (SmartCom 2020). London, U.K.: CRC Press, 2021, pp. 526–532, doi: 10.1201/9781003167488-63.

[22] Personal Identification — ISO-Compliant Driving Licence — Part 5: Mobile Driving Licence (mDL) Application, ISO/IEC 18013-5:2021, Sep. 2021.

[23] J. Deng, J. Guo, E. Ververas, I. Kotsia, and S. Zafeiriou, "RetinaFace: Single-shot multi-level face localisation in the wild," in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2020, pp. 5202–5211, doi: 10.1109/CVPR42600.2020.00525.

[24] J. Deng, J. Guo, N. Xue, and S. Zafeiriou, "ArcFace: Additive angular margin loss for deep face recognition," in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2019, pp. 4685–4694, doi: 10.1109/CVPR.2019.00482.

[25] P. Grother, M. Ngan, and K. Hanaoka, "Face Recognition Vendor Test (FRVT) Part 3: Demographic effects," Nat. Inst. Standards Technol., Gaithersburg, MD, USA, NISTIR 8280, Dec. 2019, doi: 10.6028/NIST.IR.8280.

[26] G. B. Huang, M. Ramesh, T. Berg, and E. Learned-Miller, "Labeled Faces in the Wild: A database for studying face recognition in unconstrained environments," Univ. of Massachusetts, Amherst, MA, USA, Tech. Rep. 07-49, Oct. 2007.

[27] havingfun, "100 Bollywood celebrity faces," Kaggle dataset. [Online]. Available: https://www.kaggle.com/datasets/havingfun/100-bollywood-celebrity-faces (accessed Sep. 20, 2026).

[28] Information Technology — Biometric Performance Testing and Reporting — Part 1: Principles and Framework, ISO/IEC 19795-1:2021, 2021.

[29] R. M. Bolle, N. K. Ratha, and S. Pankanti, "Error analysis of pattern recognition systems—The subsets bootstrap," Comput. Vis. Image Understand., vol. 93, no. 1, pp. 1–33, Jan. 2004, doi: 10.1016/j.cviu.2003.08.002.

[30] Z. Zhu et al., "WebFace260M: A benchmark unveiling the power of million-scale deep face recognition," in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2021, pp. 10487–10497, doi: 10.1109/CVPR46437.2021.01035.
```

---

### 4. Section 4 (System Design) contradicts the real system and its own Fig. 1

**Where:** Section 4 (page 11), both paragraphs, and the Fig. 1 caption.

**What is wrong:**
- *"PostgreSQL is used as the central database for storing … facial
  embeddings"*: **false**. Face templates live in a separate SQLite store
  with a FAISS index (`backend/app/core/face_template_store.py`,
  `face_index.py`), specifically to keep biometrics out of the main
  database. TABLE I and Fig. 1 both already say so, so the paper
  contradicts itself.
- *"The AI service operates as an independent microservice"*: **false**.
  Face recognition runs **in-process** inside the FastAPI backend
  (`backend/app/core/face_engine.py`, `app/services/face_service.py`;
  `docs/design.md` §Interfaces: "In-process / internal call"). There is no
  separate AI service in `docker-compose.yml`, only `db` and `backend`.
  Fig. 1 correctly draws Face Recognition *inside* "Backend Services".
- *"The system design includes UML models, user interface designs, database
  structures, and REST API specifications"*: none of these appear in the
  paper. Either show them or don't claim them.
- The Fig. 1 caption says "Deployment architecture", but the figure shows the
  logical architecture (clients, routers, services, stores), not deployment
  nodes.

**Fix:** replace both paragraphs of Section 4 and the Fig. 1 caption, and
add TABLE II (the real API, taken from `backend/app/api/routers/`).

**Paste this — paragraph before Fig. 1:**

```text
The iPermit system follows a layered architecture consisting of client, backend, and data layers (Fig. 1). The client layer comprises an Expo/React Native mobile application, used by both drivers and police officers with role-specific screens, and a Next.js administrative dashboard. The backend is a single FastAPI application organised into routers, services and repositories: routers handle HTTP concerns and role-based access checks, services hold business rules and transaction boundaries, and repositories encapsulate database access. The face-recognition module (RetinaFace detection and ArcFace embedding via ONNX Runtime) runs in-process within the backend rather than as a separate service, which avoids an extra network hop and deployment unit at the project's scale. The planned violation-detection module is reserved as a second in-process component but is not yet implemented. The data layer is deliberately split: PostgreSQL, managed with Alembic migrations, stores users, applications, licenses, violations, fines, appeals, badges, notifications, road incidents and danger zones, while biometric face templates are kept in a separate SQLite store with a FAISS index, so that biometric data is isolated from the operational database and can be rebuilt independently.
```

**Paste this — Fig. 1 caption:**

```text
Fig. 1. Logical architecture of the iPermit system. Violation detection is shown as planned and not yet implemented.
```

**Paste this — paragraph after Fig. 1** (replaces the "UML models…"
paragraph):

```text
The backend exposes a REST API secured with JWT bearer tokens; each endpoint declares the roles permitted to call it, and the user's role is always taken from the server-side user record rather than from the client. TABLE II summarises the main endpoint groups. Endpoints that change several records at once, such as license approval, violation recording and fine payment, perform all of their writes in a single database transaction, and notifications are created only after that transaction commits, so that a notification failure cannot undo a completed operation.
```

**Paste this — TABLE II:**

```text
TABLE II. Main REST API Endpoint Groups
Group|Representative endpoints|Roles
Authentication|POST /auth/register, POST /auth/login, GET /auth/me|Public / any
License applications|POST /applications (four photos), GET /applications|Driver
Admin review|GET /admin/applications, POST /admin/applications/{id}/approve or /reject|Admin
Digital license and badge|GET /licenses/me, GET /badges/me|Driver
Roadside verification|POST /police/verify-face, GET /police/verify-qr/{token}, GET /police/lookup|Police
Violations|POST /police/violations|Police
Fines and appeals|GET /fines/me, POST /fines/{id}/pay, POST /appeals, POST /admin/appeals/{id}/resolve|Driver / Admin
Driver analytics|GET /admin/badges|Admin
Notifications|GET /notifications/me, POST /notifications/{id}/read, POST /notifications/register-push-token|Any
Road incidents and danger zones|POST, GET /road-incidents and /danger-zones; POST …/{id}/confirm, …/{id}/clear|Driver, Police
```

---

### 5. The Abstract overclaims and is out of date

**Where:** Abstract (page 1).

**What is wrong:**
- *"Fourteen functional requirements were developed and verified
  incrementally"*: REQ-7 (automated white-line violation detection) was
  **not** built, and REQ-13 AC5 was deliberately not implemented. Both facts
  are stated later in the paper, so the abstract contradicts the body.
- *"…a FAR/FRR/EER evaluation harness were implemented to support … future
  performance validation"*: the evaluation has now been run (item 1).
- *"…served through ONNX Runtime and FAISS"*: FAISS doesn't serve models;
  it's the similarity-search index.
- *"real-time road incident reporting"* is fine, but "driver behavior
  analytics" should say it's rule-based, to match §3.4.6.

**Paste this — full Abstract:**

```text
Traffic law enforcement and driving license management in Sri Lanka continue to rely heavily on manual, paper-based processes, resulting in administrative inefficiencies, delayed fine processing, fragmented driver records, and limited capacity for proactive road-safety monitoring. This research proposes and implements iPermit, a virtual driving license system that integrates digital license issuance with QR codes, facial recognition-based roadside driver verification, point-based violation tracking with automatic suspension, fine and appeal management, rule-based driver behavior badges, notifications, and road incident and danger-zone reporting within a unified mobile and web platform. The system follows a layered architecture built with FastAPI, PostgreSQL, Expo/React Native and Next.js; facial recognition uses RetinaFace detection and ArcFace embeddings executed with ONNX Runtime, with a FAISS index for one-to-many search. Fourteen requirements were specified and implemented incrementally, with each module verified against the running system in addition to automated tests; automated white-line violation detection (REQ-7) was deferred for lack of a training dataset, and violations are currently recorded manually by officers. The face-verification pipeline was evaluated on two public labelled datasets, LFW and a South Asian celebrity dataset: at the deployed threshold no false match between different people was observed in about two million impostor comparisons, while false-rejection rates were 2.9% and 9.9% respectively, and the evaluation also showed that the CLAHE preprocessing step increases false rejections. The prototype demonstrates the feasibility of combining biometric identity verification with digital licensing, while the higher false-rejection rate on South Asian faces, the deferred violation detector, and the absence of a usability study are reported as explicit limitations that must be addressed before deployment.
```

---

### 6. Section 3.5 says no evaluation was done

**Where:** Section 3.5, second paragraph, last two sentences (pages 9–10):
*"…however, evaluation against a representative held-out dataset has not
yet been performed … Consequently, no FAR, FRR, or EER performance claim is
made for the implemented system."*

**What is wrong:** it directly contradicts Section 5.1. The sentence about the
"source research" is also uncited (see item 12).

**Paste this — replaces the whole second paragraph of 3.5:**

```text
For the two AI-related subsystems, an additional evaluation layer was designed to support objective performance assessment and to avoid the overfitting risk seen in an earlier prototype of this project, which reported 100% training accuracy but only 60% test accuracy on a six-person, sixty-eight-image dataset. A FAR/FRR/EER evaluation harness was therefore implemented as a set of pure functions for calculating false-acceptance and false-rejection rates across similarity thresholds, together with a command-line utility for evaluating labelled image datasets. The evaluation functions were unit-tested using synthetic score distributions and then applied to two public labelled face-verification datasets, LFW (96 identities, mostly Western public figures) and a Bollywood celebrity collection (100 South Asian identities), processed through the system's actual preprocessing, detection and embedding pipeline. The results are reported in Section 5.1, with caveats about dataset composition, labelling errors and generalisability to Sri Lankan drivers stated explicitly. No equivalent evaluation exists yet for violation detection, because that module has not been built (Section 3.4.5).
```

---

## IMPORTANT

### 7. Sections 3.4.3, 3.6 and 3.7 don't reflect what the evaluation found

**Where:** 3.4.3 (page 7), 3.6 (page 10), 3.7 (page 10).

**What is wrong:**
- §3.4.3 presents CLAHE as reducing lighting problems. The evaluation showed
  it **more than doubles FRR** with no benefit (item 1, 5.1.2).
- §3.4.3 presents the quality gate as working correctly. In fact, a clear,
  well-lit selfie from a real Android phone scored sharpness ≈ 23 against the
  default threshold of 100, so **every real phone photo was rejected** and
  the application couldn't be submitted (`docs/tasks.md` Task 9.1). This is
  exactly the kind of "unvalidated constant" §3.6 talks about, so it's a
  good, honest finding to report.
- §3.6 lists the 0.42 threshold as unvalidated but doesn't say what the
  evaluation concluded about it.
- §3.7 says *"The incremental **single-developer** development approach"*,
  but §3.1 says *"This enabled the **research team**…"*. Pick one; the text
  below simply drops the qualifier.
- §3.7 doesn't mention the South Asian FRR gap.

**Paste this — add at the end of the first paragraph of 3.4.3:**

```text
Both preprocessing choices were later checked against data. The offline evaluation (Section 5.1) found that CLAHE lowered same-person similarity scores and more than doubled the false-rejection rate without improving separation, and testing with a physical Android phone showed that the default blur threshold (Laplacian variance of 100) rejected clear, well-lit selfies, which scored around 23. Both values are therefore treated as configuration to be recalibrated on real phone photographs before user acceptance testing, rather than as validated settings.
```

**Paste this — add at the end of the first paragraph of 3.6:**

```text
The subsequent evaluation (Section 5.1) found equal-error-rate thresholds of about 0.19–0.21 on the tested datasets. Because the officer workflow performs a one-to-many search, in which false matches matter more than false rejections, the evaluation supports keeping the more conservative 0.42 rather than moving to the EER point; the threshold has still not been validated on Sri Lankan driver photographs.
```

**Paste this — replaces the first sentence of 3.7:**

```text
The incremental development approach introduces several methodological limitations.
```

**Paste this — add at the end of the first paragraph of 3.7:**

```text
The face-verification evaluation (Section 5.1) also found a significantly higher false-rejection rate on a South Asian celebrity dataset than on LFW (9.9% versus 2.9%) using the identical pipeline. Because the two datasets also differ in photographic style and image quality, the gap cannot be attributed to demographic factors alone [25], and it has not yet been measured on genuine Sri Lankan driver photographs.
```

---

### 8. Section 3.4.7 is out of date and missing the danger-zones feature

**Where:** Section 3.4.7 (page 9), second paragraph.

**What is wrong:**
- *"location-permission denial falls back to a predefined coordinate
  without preventing the incident interface from functioning"*: behaviour
  changed. The screen still shows a fallback (Colombo) view, but
  **reporting is now disabled** until a real location is available, so a
  fake position can never be submitted (commit `88b05ac`).
- *"the native map-rendering component … could not be visually verified"*:
  out of date. The map was run on an Android phone in Expo Go during the
  Incidents redesign, and Android was switched to OpenStreetMap tiles
  because Google tiles rendered blank grey without an API key
  (commit `774f150`). **Confirm this is how you remember it before
  pasting.**
- *"Push notification delivery was not physically validated because a
  compatible physical device was unavailable"*: a physical phone *was*
  available (it was used for the selfie test). The real reason is that
  device testing used **Expo Go, which has not supported remote push
  notifications on Android since SDK 53**, and no development build was
  made.
- The **danger-zones** feature (drivers and police mark a circular 50–1000 m
  zone with a severity and optional reason; it persists until cleared; the
  backend and mobile app are complete) isn't mentioned anywhere in the
  paper.

**Paste this — replaces the second paragraph of 3.4.7:**

```text
In addition to point-in-time incidents, drivers and police officers can mark a danger zone: a circular area centred on their current location with a radius of 50–1000 m, a severity level and an optional reason. Unlike incidents, danger zones represent a persistent assessment of an area rather than a transient event; they are implemented as a separate resource, remain visible to all users on the incidents map until explicitly cleared, and can be confirmed by other users. Both resources are displayed together on a single map-and-list screen.

The road incident and danger-zone functionality was verified using the running application. If location permission is denied, the screen still loads using a predefined fallback coordinate, but reporting is disabled until a real location is available, so that no report can be submitted at a fabricated position; reporting, confirming and clearing correctly update the nearby list. The native map was rendered on an Android device using OpenStreetMap tiles, since the default Google tiles require an API key. During requirements validation, REQ-13 AC5, which specifies notifying nearby drivers of newly reported high-severity incidents, was identified as conflicting with the system's privacy requirement restricting driver location collection to point-in-time reporting. Since proactive notification would require continuous knowledge of drivers' current locations, AC5 was not implemented, while AC1–AC4 were implemented as specified and the identified requirement conflict was documented. Remote push delivery was not validated on a device, because device testing used Expo Go, which does not support remote push notifications on Android, and no standalone development build was produced; verification of push notifications was therefore limited to token registration, request construction and error handling.
```

Then update **§3.6** and **§3.7**, which also say native map rendering
couldn't be verified. In §3.6 change *"verification limitations affecting
push-notification delivery and native map rendering"* to:

```text
verification limitations affecting push-notification delivery
```

In §3.7 change *"Push-notification delivery could not be validated using a
physical device, while native map rendering could not be visually confirmed
using the available browser-based development environment."* to:

```text
Remote push-notification delivery could not be validated because device testing relied on Expo Go, and no usability study or user acceptance test has yet been carried out with drivers, police officers or administrators.
```

---

### 9. TABLE I: "Server-rendered admin UI" is false

**Where:** TABLE I, row "Admin web dashboard", Rationale column.

**What is wrong:** every admin page (`admin-web/src/app/**/page.tsx`) starts
with `'use client'` and fetches data from the API in the browser. Nothing is
server-rendered.

**Paste this — new Rationale cell:**

```text
File-based routing and a React/TypeScript toolchain shared with the mobile app; pages are client-rendered and call the same REST API as the mobile app
```

---

### 10. Introduction and Conclusion overclaim; the section roadmap is wrong

**Where:** §1 paragraphs 4–6 (page 2); §6 (page 13).

**What is wrong:**
- §1 says the solution uses *"behavior analysis to monitor driving-related
  behaviors"*, and §6 says the system has *"AI powered traffic monitoring
  features"*. The system doesn't monitor driving: badges are a rule-based
  score over points, fines and violation history (§3.4.6), and the only
  AI-based traffic component (violation detection) wasn't built.
- The roadmap says *"Section III discusses the research methodology and
  system architecture. Section IV describes the implementation…"*. In the
  paper, Section 3 contains methodology **and** the implementation (§3.4),
  and Section 4 is System Design. The roadmap also uses Roman numerals
  while the headings use 1–7.
- §6 lists future work but not the three things the paper itself shows are
  needed: validation on Sri Lankan driver photos, the violation detector,
  and a usability study.

**Paste this — replaces §1 paragraph 4** ("This research proposes…"):

```text
This research proposes an AI-Based Smart Driving License System for Sri Lanka, named iPermit, to address these challenges. The proposed solution uses facial recognition for secure roadside driver verification, a point-based system for managing violations, suspensions and fines to ensure accountability, a transparent rule-based badge that summarises each driver's record, and a combined mobile and web platform for convenient access to licensing services. It is designed to increase transparency, efficiency and accessibility and to contribute to the modernization of traffic management processes.
```

**Paste this — replaces §1 last paragraph** (the roadmap):

```text
The remainder of this paper is organized as follows. Section 2 reviews relevant technologies and existing studies. Section 3 describes the research methodology, including requirement analysis, the technology stack, and the implementation and verification of each module. Section 4 presents the system design. Section 5 presents the results and evaluation, including a quantitative evaluation of face verification, and Section 6 concludes the paper and outlines future work.
```

**Paste this — replaces all of §6:**

```text
This research proposed the AI-Based Smart Driving License System (iPermit) to improve driving license management and traffic law enforcement in Sri Lanka. The implemented prototype integrates digital licensing with QR verification, facial recognition-based roadside driver verification, point-based violation tracking with automatic suspension, fine payment and appeals, rule-based driver badges, notifications, and road incident and danger-zone reporting in a single mobile and web platform, with every module verified against the running system. The face-verification evaluation showed that the deployed threshold produced no false match between different people in about two million impostor comparisons, at the cost of a false-rejection rate of 2.9% on LFW and 9.9% on a South Asian celebrity dataset. The prototype therefore demonstrates the feasibility of the approach, but not yet its field performance. The most important future work follows directly from these results: collecting a consented dataset of Sri Lankan driver photographs to validate and tune the face-matching threshold and enrollment quality gate, and removing the CLAHE step that the evaluation found to increase false rejections; training and evaluating the planned YOLOv8-based white-line violation detector once a suitable dataset and GPU resources are available; conducting a usability study with drivers, police officers and administrators, together with performance and load testing; and validating the point schedule and fine amounts against Sri Lankan traffic regulations. Longer-term extensions include drowsiness and drunk-driving detection, accident detection with emergency alerts, and integration with government traffic and vehicle databases.
```

Also in **§1 paragraph 5**, change *"implement an intelligent behavior and
violation management framework"* to:

```text
implement a transparent violation, points and driver-behavior management framework
```

---

### 11. Literature Review: heading, coverage and standards gaps

**Where:** Section 2 (pages 3–4).

**What is wrong:**
- **Missing sub-heading letter.** The headings run A Overview, B, C, D,
  *"Point-Based Violation and Fine Management Systems"* (no letter), E, F,
  G.
- **The technology the system uses isn't reviewed.** §2.C discusses CNNs and
  FaceNet, but iPermit uses RetinaFace + ArcFace, and neither is mentioned or
  cited in the literature review. A reader can't tell why ArcFace was chosen.
- **No reference to the mobile driving licence standard.** ISO/IEC
  18013-5:2021 is the international standard for exactly this problem
  (a digital licence on a phone, verified by an officer), so a reviewer
  will expect it in §2.B.

**Fix — headings:** rename *"Point-Based Violation and Fine Management
Systems"* to **E. Point-Based Violation and Fine Management Systems**, then
re-letter the rest: Mobile and Web-Based Platforms → **F**, Research Gap →
**G**, Summary → **H**.

**Paste this — add at the end of §2.B:**

```text
Internationally, the ISO/IEC 18013-5 standard specifies how a mobile driving licence held on a smartphone can be presented to and verified by an officer or other relying party, including device-to-reader data exchange and cryptographic verification of the issuing authority [22]. The mDL carries the holder's portrait, but comparing that portrait with the person presenting the licence is left to the verifier's visual judgement, which is the step that automated face verification supports in the proposed system.
```

**Paste this — add at the end of §2.C:**

```text
Current face-verification pipelines separate detection from recognition. RetinaFace performs single-stage face detection with facial landmark localisation, enabling faces to be aligned before recognition [23], while ArcFace trains the embedding network with an additive angular margin loss so that images of the same person cluster tightly on a hypersphere and different identities are pushed apart, allowing verification by a single cosine-similarity threshold [24]. Pretrained RetinaFace and ArcFace models remove the need to train a recognition model from scratch, which is important where no large local face dataset is available. However, large-scale evaluations have shown that verification error rates vary with image quality and demographic group, so the operating threshold must be validated on data representative of the deployed population [25].
```

---

### 12. Uncited "source research" figures

**Where:** §3.5 (*"the source research reported 100% training accuracy but
only 60% test accuracy using a six-person, sixty-eight-image dataset"*) and
§3.7 (*"approximately 85% mAP@50 for lane detection"*).

**What is wrong:** "the source research" isn't in the reference list, so a
reader can't check either number. The source is the project's own earlier
proposal/prototype documents, which aren't published.

**Fix:** the item 6 text already rewords §3.5 as *"an earlier prototype of
this project"*. In §3.7, change *"accuracy results reported in the source
research, including…"* to:

```text
accuracy results reported for an earlier, unpublished prototype of this project, including…
```

If your supervisor wants these cited formally, cite them as an unpublished
project report, e.g.
`[n] <authors>, "<title of proposal>," Horizon Campus, Sri Lanka, unpublished project proposal, <year>.`
Fill in the real details; don't guess them.

---

## MINOR

### 13. Grammar, style and formatting

| Where | Current | Replace with |
|---|---|---|
| §1 para 1 | "The number of registered vehicles and road users increases, there is a greater need…" | "As the number of registered vehicles and road users increases, there is a greater need…" |
| §1 para 3 | "Sri Lanka is still in the midst of its digital transformation initiatives and the comprehensive smart driving license system … is yet to be available." | "Sri Lanka is still in the midst of its digital transformation, and a comprehensive smart driving license system that incorporates AI technologies is not yet available." |
| §1 para 3 | "Existing systems are fragmented which hinder effective communication…" | "Existing systems are fragmented, which hinders effective communication…" |
| §3.1 | "This chapter presents…" | "This section presents…" (it's a paper, not a thesis) |
| §3.2 | "For example,"WHEN a face…" (no space after the comma) | "For example, "WHEN a face…" |
| §3.2 list of functional requirements | missing notifications and the admin dashboard | add "…driver behavior badges, notifications, incident reporting, and the admin analytics dashboard" |
| Headings | "1. INTRODUCTION", "2. LITERATURE REVIEW" in capitals; "3. Methodology" … "7. References" in title case | Use one style throughout (IEEE: "I. INTRODUCTION", or keep the numbers and use title case everywhere) |
| Fig. 1 caption | "Fig 1." | "Fig. 1." |
| Fig. 2 caption | "Fig: 2" (no caption text) | Use the item 1 caption |
| Table caption | "TABLE I     Tools and Technology Stack" | "TABLE I. Tools and Technology Stack" |
| Title vs. body | Title: "AI-Based **Smart** Driving License System"; §3.1 and §6: "AI-Based **Virtual** Driving License System (iPermit)" | Use one name everywhere. The fixes above use "Smart", to match the title. |
| Title block | No author names, affiliation or email | Add authors, "Faculty of …, Horizon Campus, Malabe, Sri Lanka", and emails under the title |
| §3.4 subsections | Deep numbering (3.4.1–3.4.7) is fine, but spacing and indentation vary between subsection headings | Apply one Word heading style to all subsection headings |

---

## Checklist

- [ ] 1. §5.1 replaced; old Fig. 2 removed; TABLES III–V and Figs. 2–3 inserted
- [ ] 2. §5 intro replaced
- [ ] 3. §2 in-text citations fixed ([37], [2], [6]) and reference list replaced
- [ ] 4. §4 rewritten; Fig. 1 caption; TABLE II inserted
- [ ] 5. Abstract replaced
- [ ] 6. §3.5 second paragraph replaced
- [ ] 7. §3.4.3, §3.6 and §3.7 additions
- [ ] 8. §3.4.7 second paragraph replaced; §3.6/§3.7 map wording fixed
- [ ] 9. TABLE I admin row
- [ ] 10. §1 paragraphs 4–6 and §6
- [ ] 11. §2 heading letters; §2.B and §2.C additions
- [ ] 12. §3.7 "source research" wording
- [ ] 13. Minor fixes
- [ ] Final pass: every in-text [n] has a matching entry, and every entry is cited at least once

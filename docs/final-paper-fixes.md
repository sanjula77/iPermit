# Final paper (`iPermit_conference_paper_revised.docx`) — confirmed problems and copy-paste fixes

Checked 2026-10-20. Method: the .docx was unpacked and read paragraph by paragraph (text, styles,
figures, document properties, tracked changes); every table was compared with
`docs/evaluation/results/`; every reference was checked on the web or against the primary document;
the Sri Lankan Act was read from its published text. I could **not** open the file in Word, so page
breaks and exact appearance are not checked (Word's own count at last save: **9 pages, 3,069 words**).

**How to use this file:** each fix has a **FIND** (the exact text now in the paper) and a
**REPLACE WITH** block you can paste. Fixes **F4–F11 and F18 change citation numbers together** —
apply them as a set, then use the reference list in F18 (it is already in order of first citation).

---

## 1. Re-check results

Severity: **A** = fix before submitting; **B** = should fix; **C** = polish.

| ID | Problem | Verdict | Evidence | Sev. |
|---|---|---|---|---|
| P1 | Abstract is damaged | **Confirmed** | "under **Emerging economies** Personal Data Protection Act"; "A **fixed** demerit-point scheme (suspension at **fixed number** of points)" (body says rolling 12 months, 10 points); "digital license officers verify" (missing separator); ends with an Introduction sentence; no results, no limits | A |
| P2 | Conclusion says "zero false accepts" | **Confirmed** | Sect. 5.1 itself reports 12 and 28 false accepts (0.001% / 0.003%) | A |
| P3 | Face numbers are from the CLAHE-**on** pipeline | **Confirmed** (the paper discloses it; the re-run is still open) | Table 3 caption "Measured with CLAHE enabled"; deployed system has CLAHE off | A |
| P4 | Dangling cross-reference "(Sect. 5.4)" | **Confirmed** | Sect. 5 has only 5.1–5.3 | A |
| P5 | `[17]` and `[19]` are listed but never cited | **Confirmed** (script: cited 1–16, 18, 20, 21) | Zuiderveld (CLAHE) and NIST SP 800-57 have no in-text number | A |
| P6 | `[4]` mis-described | **Confirmed** | Paper: "analyzed from administrative data". The study uses a **nationally representative survey** | A |
| P7 | `[13]` (Rudin) cited for a claim it does not make | **Confirmed** | "require validation using real … driver's data [13]" — Rudin argues for interpretable models, not for that | A |
| P8 | `[16]` cited for a general "developing countries" statement | **Confirmed** | `[16]` is Sri Lanka's Act only | B |
| P9 | `[12]` incomplete | **Confirmed — details now found** | *IEEE Access* 12, 121280–121290, DOI 10.1109/ACCESS.2024.3450935 | A |
| P10 | `[21]` has a placeholder date | **Confirmed** | "Last accessed [2026/10/DD]". Page exists; its title is "Bollywood Celebrity Faces" | A |
| P11 | `[1]` and `[2]` cannot be verified, and `[2]` cannot support its sentence | **Confirmed — new finding** | Neither found; an accident report cannot support "licence verification … rely on physical cards" | A |
| P12 | Opening claim generalises to "developing countries" with Sri Lanka-only sources | **New** | Intro sentence 1 and abstract sentence 1 | B |
| P13 | `[11]` ISO/IEC 30107-3:2017 is **withdrawn** | **New** | Withdrawn 10 Jan 2023; replaced by ISO/IEC 30107-3:2023 (edition 2) | A |
| P14 | Law described incompletely | **New** | Act read from its text: s. 10 names encryption; "biometric data for the purpose of uniquely identifying a natural person" is a special category. Also: Amendment Act No. 22 of 2025; main obligations apply from 1 Jan 2027 | B |
| P15 | Mandatory statements missing | **Confirmed** | No data availability, ethics, contributions, interests, funding or AI-use text | A |
| P16 | Figure text unreadably small | **Confirmed, now measured** | Fig. 1 inserted at 8.4 cm: text ≈ 3.7 pt; Fig. 3 at 7.7 cm: ≈ 2.7 pt; Fig. 2 ≈ 4 pt (estimate). Even at full 12.2 cm width Fig. 1 would be ≈ 5 pt | A |
| P17 | Figures say "licence/offence", text says "license" | **Confirmed** | Fig. 1 "licences", Fig. 2 "Licence suspended", Fig. 3 "offence time" | B |
| P18 | Mixed spelling in the text | **Confirmed** | license 16×, behavior 7×, but "offence" 3× and "Enrollment" 1× / "Enrolment" 1× | B |
| P19 | Introduction: "Our contributions are:" followed by a paragraph that repeats "This paper contributes…" | **Confirmed** | Paragraphs 008–009 | B |
| P20 | Grammar damage (looks like find-and-replace side effects) | **Confirmed** | "three roles, such as drivers…"; "Our focus differs, we address"; "A further limit is spoofing, testing of…" | B |
| P21 | Only 3 keywords | **Confirmed** | "virtual driving license, offline-first systems, digital traffic enforcement" | B |
| P22 | Discussion is one 70-word paragraph and omits several limits | **Confirmed** | No usability study, load test, device test, push test, mock payment, unencrypted photos/traffic | B |
| P23 | Over-generalised wording | **Confirmed** | "A standard enhancement step therefore harmed a modern embedding model" (one dataset); "Evidence from developing countries is mostly project evaluation" (one example) | B |
| P24 | Imprecise wording | **Confirmed** | "predicts days until suspension" is a linear projection; "log-tampering detection depends on an externally stored head hash" — it is the removal of the **newest entries** that needs it | C |
| P25 | Author block | **Confirmed** | Supervisor spelled "Wijayawardhana"; README and slides use "Wijewardhana". The four e-mails are one run: "…lk,ITBIN-…" with no spaces | B |
| P26 | **Personal name in the file properties** | **New** | `lastModifiedBy` = "bashi rashmika"; creator "iPermit authors". Matters if review is blind | B |
| P27 | Template: built by direct formatting, not the Springer macro styles | **Confirmed** | Page size and margins match (A4, 12.2 × 19.3 cm), Times, headings sized correctly; body paragraphs have no named style and no first-line indent | C |

### Corrections to what I said earlier
- **Page count:** I estimated 7–8 pages; Word's own count in the file is **9 pages**.
- **Figure text:** I estimated 3–5 pt; measured **≈3.7 pt (Fig. 1) and ≈2.7 pt (Fig. 3)**.
- **FAISS `[8]` year:** both 2019 (online) and 2021 (volume 7, issue 3) appear; **2021 is right** for the issue — no change.
- **ArcFace `[6]` pages:** not an error. The open-access copy (CVF) is paginated 4690–4699; the IEEE Xplore record (the DOI) is 4685–4694. Use a matching pair (see F18).

### What I could not verify (say so if asked)
- Newsfirst article link returned HTTP 429 (rate limit) — open it in a browser.
- UNESCAP link returns 403 to scripts; the report itself was confirmed by search.
- Content of the news articles (Newsfirst, Sri Lanka Mirror, Daily FT) and the Cabinet decision was **not re-read** by me; the links respond and your thesis (`docs/thesis/chapter-3-analysis.md`) describes them. The **police report numbers and the Act's wording I did read** in the primary documents.
- DOIs for `[6]` (Wang et al.) and `[10]` (FAISS) were not captured; copy them from the publisher pages.
- Publisher of Zuiderveld `[21]`: catalogues show both Academic Press and Morgan Kaufmann.

---

## 2. Fixes (copy-paste)

### F1 — Abstract (replace the whole paragraph) — fixes P1, P12, P2
**FIND:** the paragraph starting "Abstract. Driving-license administration and traffic enforcement in many developing countries…"

**REPLACE WITH** (keep the run-in "Abstract."; 222 words, limit 150–250):

```text
Driving-license administration and traffic enforcement in Sri Lanka, a developing country, still rely on physical cards, visual identity checks and partly manual fine handling. This paper presents iPermit, a working prototype of a virtual driving-license platform for drivers, police officers and administrators. Drivers hold a QR-based digital license; officers verify identity by face scan, QR code or NIC lookup; and a rolling 12-month demerit-point scheme (suspension at 10 points) drives fines, appeals, suspension and automatic reinstatement. A rule-based behavior analyzer gives each driver an explainable risk level and trend, and a community map shares road incidents and danger zones without tracking drivers. Face verification uses RetinaFace and ArcFace on ONNX Runtime with a FAISS index. Templates are stored separately under AES-256-GCM envelope encryption, and every biometric action is written to a hash-chained, Ed25519-signed audit log, a design intended to support the data-protection duties for biometric data. An offline-first queue lets officers record violations without coverage and synchronize them without duplicates. On two public datasets (LFW and a South Asian celebrity set), at a similarity threshold of 0.42, the false-accept rate was 0.001% and 0.003% and the false-reject rate 2.9% and 9.9%, measured before a pre-processing step that raised false rejections was removed. These results come from public images, not local drivers. Liveness detection, automated violation detection and user-acceptance testing remain future work.
```

If you re-run the face evaluation with CLAHE off, replace the four numbers and delete "measured before a pre-processing step that raised false rejections was removed".

### F2 — Keywords — fixes P21
**FIND:** `Keywords: virtual driving license, offline-first systems, digital traffic enforcement`

```text
Keywords: virtual driving license, face verification, demerit points, offline-first systems, biometric data protection, Sri Lanka
```

### F3 — Author block — fixes P25
Confirm the supervisor's spelling first (README and slides: **Wijewardhana**). Then:

```text
B.R. Vindyani, J.P.I.S. Jayasinghe, B.R.G.S. Sandaruwan, and S. Wijewardhana
```
```text
Faculty of Information Technology, Horizon Campus, Sri Lanka
```
```text
ITBIN-2211-0122@horizoncampus.edu.lk, ITBIN-2211-0324@horizoncampus.edu.lk, ITBIN-2211-0278@horizoncampus.edu.lk, sankha@horizoncampus.edu.lk
```

(Put a space after each comma. For a blind-review copy, delete all three lines and the names.)

### F4 — Introduction, paragraphs 1–3 — fixes P11, P12, P19
**FIND (paragraph 1):** "Road transport underpins economic and social life in developing countries, yet license verification, traffic enforcement and fine handling still rely largely on physical cards, paper records and visual identity checks [1,2]. …"

**REPLACE WITH:**

```text
Road transport underpins economic and social life in developing countries. In Sri Lanka, the police recorded about 3.66 million traffic offense cases in 2024 [1], yet the processes around them remain largely manual: fines were traditionally paid at a post office and the license then recovered at a police station [2], online payment reached all provinces only in February 2026 [3], and the digital driving license approved in December 2024 [4] had not been issued at the time of writing. At the roadside, identity is still checked by comparing the card photograph with the driver. These practices cause administrative delay, make identity hard to verify and leave driver records fragmented, which raises the risk of fraud and data errors as the number of vehicles and road users grows.
```

*(The sentence about comparing the card photograph is the authors' own observation and has no source — keep it only if you are comfortable stating it without one.)*

**FIND (end of paragraph 2):** "Its AI component is a face-verification pipeline. The behavior analysis is rule-based by design. Our contributions are:"

```text
Its AI component is a face-verification pipeline; the behavior analysis is rule-based by design.
```

(Keep the next paragraph, which begins "This paper contributes…". Do not number it as a list.)

### F5 — Sect. 2.1 — fixes P11, P23 (new numbers)
```text
Digital licensing platforms move issue, renewal and verification online and replace paper files with a central driver record. Evidence from developing countries includes project evaluations, for example a UNESCAP review of a driver-licensing improvement project in Lao PDR [5]. A study of youth licensing determinants [6] shows how licensing outcomes can be analyzed from nationally representative survey data. Our focus differs: we address roadside verification and enforcement on top of license issue.
```

### F6 — Sect. 2.2 — fixes P13, P20 (new numbers)
```text
Face recognition has been surveyed for decades [7]. Deep angular-margin models such as ArcFace [8] now give strong embeddings for verification and are paired with detectors such as RetinaFace [9]. Similarity search over embeddings can be made fast with libraries such as FAISS [10]. Face recognition has been applied to mobile payment [11], where, as in licensing, a wrong match carries a cost. Benchmarks such as LFW [12] allow threshold analysis through false-accept and false-reject rates, but they consist of public figures, so results transfer to a local driver population only with caution. A further limit is spoofing: the testing of presentation-attack detection is standardized in ISO/IEC 30107-3 [13]. iPermit does not implement liveness detection (Sect. 6).
```

### F7 — Sect. 2.3 — fixes P8-style generalisation (new numbers)
```text
Demerit-point schemes assign points to offenses and suspend a license when a threshold is reached; a rolling window makes points expire. Machine-learning work predicts driver violations from records, for example with a hierarchical network [14]. For decisions that affect a person's license, interpretable models are preferable to explaining black boxes afterwards [15]. Because suitable driver data for training and validation was not available to us, iPermit uses transparent rules.
```

### F8 — Sect. 2.4 — fixes P8, P14 (new numbers; every claim below was read in the Act or its listed source)
```text
Officers often work where coverage is poor. Local-first software keeps data on the device and synchronizes later [16], and idempotent request semantics allow safe retries [17]. Biometric templates are sensitive personal data: Sri Lanka's Personal Data Protection Act lists biometric data used to identify a person among its special categories of personal data and requires controllers to protect personal data with appropriate technical and organizational measures, including encryption [18]. The Act was amended in 2025 [19], and its main obligations are due to apply from 1 January 2027 [20].
```

### F9 — Sect. 3.1 — fixes P20
**FIND:** "The system serves three roles, such as drivers, police officers and administrators."
```text
The system serves three roles: drivers, police officers and administrators.
```

### F10 — Sect. 4 paragraphs — fixes P5, P7, P18, P24
**F10a — "Face pipeline and quality gate." (replace the whole paragraph; adds the `[21]` citation and the 112-pixel detail):**
```text
Face pipeline and quality gate. Enrollment requires 4 photographs, checked for face detection confidence, size, sharpness, and brightness. Sharpness is measured on the face resized to the recognizer's 112-pixel input, so sharp phone selfies are not rejected. Pairwise cosine similarity ensures all images show the same person before their embeddings are averaged into one template. Invalid submissions are rejected. Roadside verification uses a 0.42 matching threshold, with officer confirmation of ranked candidates. Contrast-limited adaptive histogram equalization (CLAHE) [21] was disabled after it raised the false-reject rate (Sect. 5.2), and stored templates were recomputed. Thresholds and quality limits remain configurable.
```

**F10b — "Behavior analysis and badges." (remove the `[13]` and the "predicts" wording):**
**FIND (two fragments):** "It also predicts days until suspension and provides safety tips." and "but require validation using real, developing country driver’s data [13]."
```text
It also projects the days until suspension at the recent rate and provides safety tips.
```
```text
but require validation using real driver data.
```

**F10c — "Protection of biometric data." (replace the whole paragraph; adds `[22]`, `[23]`, `[24]`; precise wording; spelling):**
```text
Protection of biometric data. Each face template is encrypted using AES-256-GCM [22] with an individual random data key, which is wrapped by a server-held master key following standard key-management practice [23]. Driver identifiers are authenticated, which prevents a stored template from being moved to another driver. Master-key rotation re-wraps the data keys, and deleting a driver's row destroys that driver's key. All sensitive operations are recorded, without biometric data, in a hash-linked audit log signed with Ed25519 [24]. Enrollment and searches are blocked if logging fails, but erasure is never blocked. The design addresses the integrity and confidentiality duty of Sri Lanka's Personal Data Protection Act [18,19] but does not claim compliance: the master key is stored as an environment variable, uploaded photos and network traffic are not yet encrypted, removal of the newest log entries is detectable only against an externally stored head hash, and no consent step or impact assessment exists.
```

**F10d — "Offline recording." spelling:** change "offence" to "offense" in "unique identifier and offence time" and "Offence times more than 5 minutes…".

### F11 — Sect. 5.1 first paragraph and Sect. 5.2 — fixes P23 (new numbers)
**FIND (Sect. 5.1, first sentence):** "…two public sets (Table 2): LFW [10] and a Kaggle set of Bollywood celebrity faces [21], included because…"
```text
We assessed verification with a FAR/FRR/EER harness on two public sets (Table 2): LFW [12] and a Kaggle set of Bollywood celebrity faces [25], included because its faces are closer to the South Asian user base. Both used the buffalo_l pipeline (RetinaFace and ArcFace), a 640×640 detector input, at most 15 usable images per person so that the comparison is like-for-like, and seed 42. Confidence intervals come from an identity-level bootstrap with 1,000 replicates.
```
**FIND (Sect. 5.2):** "A standard enhancement step therefore harmed a modern embedding model, which is why it was removed."
```text
In this setting a standard enhancement step therefore harmed a pretrained embedding model, which is why it was removed.
```

### F12 — Sect. 6 Discussion and Limitations (replace the whole section) — fixes P22
```text
Three design choices matter most. A rolling window makes points expire, so paying a fine cannot reset a driver's record. Face recognition stays advisory: officers confirm uncertain matches, and QR or NIC lookup remains available. Proactive alerts to nearby drivers were left out because they would require continuous location tracking.

Limitations. (i) Face verification was evaluated on public celebrity images, not on Sri Lankan drivers or roadside photographs, and the reported rates were measured before CLAHE was disabled. (ii) There is no liveness detection, so a printed photograph could be accepted; the officer is the final check. (iii) No consent step or data-protection impact assessment exists, although the Act lists consent among the conditions for processing special categories of personal data [18]. (iv) The QR token is replayable and works only online; uploaded photos and network traffic are not yet encrypted, and the master key is an environment variable. (v) Automated violation detection is not built. (vi) Point values and fines are placeholders, and payment uses a mock gateway. (vii) The behavior thresholds are unvalidated. (viii) The phone-side SQLite queue was not tested on a device, push delivery was not verified on a physical phone, and no load test, iOS test or usability study was carried out.
```

### F13 — Sect. 7 Conclusion (replace both paragraphs) — fixes P2
```text
iPermit is a prototype that integrates digital licensing, face verification, demerit points, explainable behavior analysis, offline-first violation handling and protected biometric storage. On two public datasets, at a threshold of 0.42, the false-accept rate was 0.001% and 0.003% and the false-reject rate 2.9% and 9.9%, measured before CLAHE was disabled; on LFW, disabling it lowered the false-reject rate from 2.95% to 1.37%. These results come from public images, not from Sri Lankan drivers.

Future work: validate on photographs of local drivers, add consent and liveness detection, conduct user-acceptance testing, add HTTPS and managed key storage, and integrate with national payment and licensing platforms.
```

### F14 — Mandatory statements (new; place after the Conclusion, before References) — fixes P15
Springer's headings are shown. **Items in [brackets] are for the authors to confirm or complete; do not submit them as written.**

```text
Data availability. The face-evaluation datasets are public: Labeled Faces in the Wild [12] and the Kaggle Bollywood Celebrity Faces set [25]. No data from Sri Lankan drivers were collected. The evaluation notebook and result tables are in the docs/evaluation folder of the project repository [URL, or "available from the authors on request"].

Ethics. No human participants were recruited and no user study was conducted. Face images come from public celebrity datasets. A real deployment would need a recorded consent step and a data-protection impact assessment, which the prototype does not yet provide.

Author contributions. [CRediT roles for each author, for example: Conceptualization, Software, Validation, Writing – original draft, Writing – review and editing, Supervision.]

Use of AI tools. [AI coding assistants (Claude Code, Anthropic) were used during software development, test writing and drafting support. The authors reviewed, tested and take responsibility for all code, results and text. Confirm the tools, the extent of use, and the conference's policy.]

Disclosure of interests. [The authors have no competing interests to declare.] Funding: [no external funding.]
```

### F15 — Spelling: choose American and apply everywhere — fixes P18
| Find | Replace |
|---|---|
| offence / Offence | offense / Offense |
| Enrolment | Enrollment |
| "licence" (in figures) | "license" |
| "offence time" (Fig. 3) | "offense time" |

Leave published titles as they are (for example "Localisation" in the RetinaFace entry).

### F16 — Figures — fixes P16, P17
- Insert each figure at the **full text width, 12.2 cm**.
- Rebuild the three diagrams so that text is **at least 7 pt at final size** (currently ≈ 3–4 pt): bigger labels, fewer words per box, a wider canvas. Using a vector tool (draw.io, Inkscape, or a Python script), draw them at 12.2 cm wide with 8 pt Times.
- Export as **EMF or SVG** (Word 2016 and later accept SVG); PNG only if vector is impossible, at 600 dpi.
- Change "licence" → "license" and "offence time" → "offense time" in the figure text.
- Move the italic sentence at the bottom of Fig. 2 into the caption.

### F17 — Document properties — fixes P26
In Word: **File → Info → Check for Issues → Inspect Document → Document Properties and Personal Information → Remove All**. The file currently records `lastModifiedBy` = "bashi rashmika". Do this on the blind-review copy at least.

### F18 — References — complete list, in order of first citation — fixes P5, P9–P11, P13, P14
Replace the whole reference list with the following. Old `[1]` (Silva) and `[2]` (Ministry of Transport) are **removed**: neither could be found, and an accident report cannot support the sentence it was attached to. Before submitting, confirm the items marked ⚠ in a browser.

```text
[1] Sri Lanka Police: Performance report 2024. Report presented to the Parliament of Sri Lanka (2025). https://www.parliament.lk/uploads/documents/paperspresented/1758173460045362.pdf, last accessed 2026/10/20
[2] Newsfirst: Online traffic fine payments via GOVPAY. 11 April 2025. https://www.newsfirst.lk/2025/04/11/online-traffic-fine-payments-via-govpay, last accessed 2026/10/DD
[3] Sri Lanka Mirror: Island-wide rollout of GovPAY digital traffic fine system complete. 5 February 2026. https://srilankamirror.com/news/island-wide-rollout-of-govpay-digital-traffic-fine-system-complete/, last accessed 2026/10/20
[4] Cabinet Office of Sri Lanka: Issuance of a new digital driving license. Cabinet decision, 9 December 2024. https://www.cabinetoffice.gov.lk/cab/index.php?option=com_content&view=article&id=16&Itemid=49&lang=en&dID=12920, last accessed 2026/10/20
[5] Alymbaeva, A.: Evaluation of the project "Improvement of driver licensing system in the Lao PDR". UNESCAP, Bangkok (2024). https://repository.unescap.org/bitstreams/f0961705-788c-4de7-bf66-54da058923a4/download
[6] Wang, K., De Vos, J., Smart, M., Wang, S.: Explaining youth driver licensing determinants using XGBoost and SHAP. Transp. Policy 168, 87–100 (2025). [add DOI from the publisher page]
[7] Zhao, W., Chellappa, R., Phillips, P.J., Rosenfeld, A.: Face recognition: a literature survey. ACM Comput. Surv. 35(4), 399–458 (2003). https://doi.org/10.1145/954339.954342
[8] Deng, J., Guo, J., Xue, N., Zafeiriou, S.: ArcFace: additive angular margin loss for deep face recognition. In: Proc. IEEE/CVF Conf. Computer Vision and Pattern Recognition (CVPR), pp. 4690–4699 (2019)
[9] Deng, J., Guo, J., Ververas, E., Kotsia, I., Zafeiriou, S.: RetinaFace: single-shot multi-level face localisation in the wild. In: Proc. IEEE/CVF CVPR, pp. 5203–5212 (2020)
[10] Johnson, J., Douze, M., Jégou, H.: Billion-scale similarity search with GPUs. IEEE Trans. Big Data 7(3), 535–547 (2021). [add DOI from IEEE Xplore, document 8733051]
[11] Liu, Q., Albina, E.M.: Application of face recognition technology in mobile payment. In: 2022 IEEE 12th Int. Conf. RFID Technology and Applications (RFID-TA), pp. 217–219. IEEE (2022). https://doi.org/10.1109/RFID-TA54958.2022.9924028
[12] Huang, G.B., Ramesh, M., Berg, T., Learned-Miller, E.: Labeled faces in the wild: a database for studying face recognition in unconstrained environments. Tech. Rep. 07-49, University of Massachusetts, Amherst (2007)
[13] ISO/IEC 30107-3:2023: Information security, cybersecurity and privacy protection – Biometric presentation attack detection – Part 3: Testing and reporting. ISO, Geneva (2023)
[14] Wang, M., Li, N.: A hierarchical network-based method for predicting driver traffic violations. IEEE Access 12, 121280–121290 (2024). https://doi.org/10.1109/ACCESS.2024.3450935
[15] Rudin, C.: Stop explaining black box machine learning models for high stakes decisions and use interpretable models instead. Nat. Mach. Intell. 1(5), 206–215 (2019). https://doi.org/10.1038/s42256-019-0048-x
[16] Kleppmann, M., Wiggins, A., van Hardenberg, P., McGranaghan, M.: Local-first software: you own your data, in spite of the cloud. In: Onward! 2019, pp. 154–178. ACM (2019). https://doi.org/10.1145/3359591.3359737
[17] Fielding, R., Nottingham, M., Reschke, J. (eds.): HTTP semantics. RFC 9110, IETF (2022). https://www.rfc-editor.org/rfc/rfc9110.html
[18] Personal Data Protection Act, No. 9 of 2022. Parliament of the Democratic Socialist Republic of Sri Lanka (2022). https://www.parliament.lk/uploads/acts/gbills/english/6242.pdf, last accessed 2026/10/20
[19] Personal Data Protection (Amendment) Act, No. 22 of 2025. Parliament of the Democratic Socialist Republic of Sri Lanka (2025). https://www.parliament.lk/uploads/acts/gbills/english/6384.pdf, last accessed 2026/10/20
[20] Daily FT: Data protection compliance regime takes effect on 1 Jan. 2027. 10 August 2026. https://www.ft.lk/front-page/Data-protection-compliance-regime-takes-effect-on-1-Jan-2027/44-795776, last accessed 2026/10/20
[21] Zuiderveld, K.: Contrast limited adaptive histogram equalization. In: Heckbert, P.S. (ed.) Graphics Gems IV, pp. 474–485. Academic Press, Boston (1994)
[22] Dworkin, M.: Recommendation for block cipher modes of operation: Galois/Counter Mode (GCM) and GMAC. NIST Special Publication 800-38D (2007). https://doi.org/10.6028/NIST.SP.800-38D
[23] Barker, E.: Recommendation for key management: part 1 – general. NIST Special Publication 800-57 Part 1, Rev. 5 (2020). https://doi.org/10.6028/NIST.SP.800-57pt1r5
[24] Josefsson, S., Liusvaara, I.: Edwards-curve digital signature algorithm (EdDSA). RFC 8032, IETF (2017). https://www.rfc-editor.org/info/rfc8032
[25] Kaggle: Bollywood Celebrity Faces (dataset). https://www.kaggle.com/datasets/havingfun/100-bollywood-celebrity-faces, last accessed 2026/10/20
```

**Notes on the list**
- `[8]` ArcFace: pages 4690–4699 are the open-access (CVF) copy. If you add the IEEE DOI (10.1109/CVPR.2019.00482), use the IEEE pages **4685–4694** instead, so the DOI and the pages match.
- `[9]` RetinaFace: pages are the open-access (CVF) pagination; do not add the IEEE DOI unless you also take its pages from IEEE Xplore.
- `[13]`: the 2017 edition you cited is withdrawn; the 2023 edition (published 10 January 2023) is current.
- `[21]`: confirm the publisher and place from the book's copyright page.
- `[1]`: verified in the primary document — total row 3,660,711 cases, 2,106,282, and Rs 2,271,260,086 collected.
- `[18]`: verified in the Act's text — section 10 ("encryption, pseudonymisation, anonymisation or access controls") and the definition of special categories (including "biometric data for the purpose of uniquely identifying a natural person").
- `[19]`: verified title: "Personal Data Protection (Amendment) Act, No. 22 of 2025", certified 30 October 2025.

**Old → new numbering** (if you prefer to renumber by hand): old 3→5, 4→6, 5→7, 6→8, 7→9, 8→10, 9→11, 10→12, 11→13, 12→14, 13→15, 14→16, 15→17, 16→18, 17→21, 18→22, 19→23, 20→24, 21→25; old 1 and 2 removed; new 1–4, 19, 20 added.

### F19 — Template points (optional) — P27
The layout matches the Springer template's page, margins and heading sizes, so it is acceptable for a first submission. If the conference requires the official template: paste the finished text into `splnproc1703.docm`, select all, and use the Springer Proceedings Macros ribbon (Normal Text twice, then H1/H2, Abstract, Keywords, Figure/Table Caption, Reference Item). Check in Word that paragraphs after the first in Sect. 1–3 have the 0.4 cm first-line indent (I could not render the file to check).

---

## 3. Apply-and-check list
- [ ] F1–F3, F9, F12–F15 (no numbering impact).
- [ ] F4–F8, F10–F11 and F18 **together** (numbering).
- [ ] Search the paper for `[`: every number must exist in F18 and every entry must be cited (F18 is checked: first citations run 1 → 25 in order).
- [ ] Search for "offence", "Enrolment", "licence", "Sect. 5.4", "Emerging", "such as drivers", "fixed demerit" — none should remain.
- [ ] Rebuild the three figures (F16) and check them at print size.
- [ ] Remove personal information from the file (F17).
- [ ] Re-run the face evaluation with CLAHE off (still open), then update F1 and F13, Table 3 and the Table 3 caption.
- [ ] Confirm with the call for papers: page limit, blind review, keyword count.

# CLAHE ablation and reproducibility check (LFW, 2026-09-27)

Produced by `docs/evaluation/clahe_ablation.py`, run inside the backend's own
Docker image (insightface 1.0.1, onnxruntime 1.29.0, CPU) against the local
LFW funneled copy. It re-embeds the exact 1,385 LFW images selected by the
Colab run (`lfw_embeddings.npz` from `ipermit_face_eval_results.zip`), once
with the backend's CLAHE step and once without.

## Reproducibility

Colab (insightface 2.0, onnxruntime 1.30.0) vs backend container, both with
CLAHE: embedding cosine similarity = 1.00000 for all 1,385 images — the Colab
results are valid for the deployed backend.

## CLAHE on vs off

Same 1,367 images in both conditions (18 images had two detected faces
without CLAHE and were excluded from the comparison).

| Condition | FRR @ 0.42 | FAR @ 0.42 | EER (threshold) | TAR @ FAR=0.01% | Mean genuine score |
|---|---|---|---|---|---|
| With CLAHE (current backend) | 2.952% | 0.0013% | 0.316% (0.194) | 99.344% | 0.6331 |
| Without CLAHE | 1.367% | 0.0016% | 0.309% (0.186) | 99.442% | 0.6684 |

Paired genuine-score change (with − without): mean −0.0353; CLAHE gave the
higher score in only 10.5% of same-person pairs.

Not measured on the Bollywood set (its images are not stored locally).

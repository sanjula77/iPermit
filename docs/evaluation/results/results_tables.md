# iPermit face verification — results

Pipeline: CLAHE → insightface buffalo_l (RetinaFace + ArcFace w600k_r50), det_size 640×640. Up to 15 usable images per person, seed 42. 95% CIs: identity-level bootstrap, 1000 replicates.

## Table 1 — Datasets

| Dataset | People | Usable images | Skipped (0 faces / 2+ faces / unreadable / duplicate) | Genuine pairs | Impostor pairs |
|---|---|---|---|---|---|
| LFW | 96 | 1,385 | 6 / 276 / 0 / 0 | 9,396 | 949,024 |
| Bollywood | 100 | 1,500 | 17 / 119 / 0 / 1 | 10,500 | 1,113,750 |

## Table 2 — Verification performance (95% CI)

| Dataset | FAR @ τ=0.42 | FRR @ τ=0.42 | EER | EER threshold | TAR @ FAR=0.001 | TAR @ FAR=0.0001 |
|---|---|---|---|---|---|---|
| LFW | 0.001% [0.000%–0.008%] | 2.905% [1.794%–4.090%] | 0.318% [0.032%–0.748%] | 0.194 | 99.628% [99.167%–100.000%] | 99.351% [98.527%–99.904%] |
| Bollywood | 0.003% [0.000%–0.010%] | 9.886% [8.295%–11.715%] | 1.125% [0.543%–1.772%] | 0.209 | 98.400% [97.533%–99.134%] | 96.838% [85.818%–98.057%] |

## Table 3 — Confusion counts at τ = 0.42

| Dataset | Genuine accepted (TP) | Genuine rejected (FN) | Impostor accepted (FP) | Impostor rejected (TN) |
|---|---|---|---|---|
| LFW | 9,123 | 273 | 12 | 949,012 |
| Bollywood | 9,462 | 1,038 | 28 | 1,113,722 |

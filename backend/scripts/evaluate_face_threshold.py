"""CLI harness for docs/tasks.md Task 9.1: computes Accuracy/FAR/FRR/EER
for the current face-match pipeline against a labeled image directory.

REQUIRES REAL DATA THIS PROJECT DOES NOT YET HAVE -- see the "Open
Decision: Evaluation Dataset" section of
docs/superpowers/plans/2026-09-07-face-recognition-enhancement.md.

Images must be named `<identity>_<n>.<ext>` (e.g. gihan_1.jpg,
gihan_2.jpg, sanjula_1.jpg) -- the ground-truth convention borrowed from
face-recognition-pipeline's test scripts (see the research summary in the
plan doc above). Point --dataset-dir at a directory of such images; every
same-identity pair becomes a genuine-match score, every cross-identity
pair becomes an impostor score.

Usage (inside the backend container):
    python -m scripts.evaluate_face_threshold --dataset-dir /path/to/labeled/images
"""

import argparse
import itertools
from pathlib import Path

from app.core.config import settings
from app.core.face_engine import cosine_similarity, detect_faces
from app.core.face_evaluation import compute_far_frr, find_equal_error_rate


def _identity_from_filename(path: Path) -> str:
    return path.stem.rsplit("_", 1)[0]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset-dir", required=True, type=Path)
    args = parser.parse_args()

    image_paths = sorted(
        p for p in args.dataset_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    if len(image_paths) < 2:
        raise SystemExit(f"Need at least 2 images in {args.dataset_dir}, found {len(image_paths)}")

    embeddings = {}
    for path in image_paths:
        detections = detect_faces(path.read_bytes())
        if len(detections) != 1:
            print(f"Skipping {path.name}: expected 1 face, found {len(detections)}")
            continue
        embeddings[path] = detections[0].embedding

    genuine_scores = []
    impostor_scores = []
    for path_a, path_b in itertools.combinations(embeddings, 2):
        similarity = cosine_similarity(embeddings[path_a], embeddings[path_b])
        if _identity_from_filename(path_a) == _identity_from_filename(path_b):
            genuine_scores.append(similarity)
        else:
            impostor_scores.append(similarity)

    print(
        f"{len(embeddings)} usable images, {len(genuine_scores)} genuine pairs, "
        f"{len(impostor_scores)} impostor pairs"
    )

    current = compute_far_frr(genuine_scores, impostor_scores, settings.face_match_threshold)
    print(f"\nAt current threshold ({settings.face_match_threshold}):")
    print(f"  FAR: {current.far:.2%}   FRR: {current.frr:.2%}")

    eer = find_equal_error_rate(genuine_scores, impostor_scores)
    print("\nEqual Error Rate operating point:")
    print(f"  threshold: {eer.threshold:.3f}   FAR: {eer.far:.2%}   FRR: {eer.frr:.2%}")


if __name__ == "__main__":
    main()

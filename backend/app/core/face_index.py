"""FAISS index over face template embeddings, per REQ-5 AC3 ("index
embeddings in FAISS for fast lookup"). The index is a derived/rebuildable
cache, NOT the source of truth -- SQLite (face_template_store.py) is. If the
index is lost or corrupted, rebuild_index() reconstructs it from SQLite; see
backend-standards's "FAISS index corruption" note in the Error Handling
section of docs/design.md.
"""

import faiss
import numpy as np

from app.core import face_template_store

EMBEDDING_DIM = 512

_index: faiss.IndexIDMap | None = None


def _empty_index() -> faiss.IndexIDMap:
    return faiss.IndexIDMap(faiss.IndexFlatIP(EMBEDDING_DIM))


def rebuild_index() -> int:
    """Reconstructs the in-memory FAISS index from SQLite. Returns the
    number of templates loaded. Call this once at first use, or manually
    after suspected index corruption."""
    global _index
    fresh = _empty_index()
    templates = face_template_store.list_all_templates()
    if templates:
        ids = np.array([rowid for rowid, _, _ in templates], dtype=np.int64)
        vectors = np.stack([embedding for _, _, embedding in templates]).astype(
            np.float32
        )
        fresh.add_with_ids(vectors, ids)
    _index = fresh
    return len(templates)


def _get_index() -> faiss.IndexIDMap:
    if _index is None:
        rebuild_index()
    return _index


def add_to_index(rowid: int, embedding: np.ndarray) -> None:
    """Incremental add after a new enrollment -- avoids a full rebuild on
    every approval."""
    index = _get_index()
    index.add_with_ids(
        embedding.astype(np.float32).reshape(1, -1),
        np.array([rowid], dtype=np.int64),
    )


def search(embedding: np.ndarray, k: int = 1) -> list[tuple[float, int]]:
    """Returns up to k (cosine_similarity, rowid) pairs, best match first.
    Not yet wired to an endpoint -- police roadside verification is Phase 5
    (REQ-6) -- but the lookup primitive belongs to this phase per REQ-5 AC3."""
    index = _get_index()
    if index.ntotal == 0:
        return []
    similarities, ids = index.search(embedding.astype(np.float32).reshape(1, -1), k)
    return [
        (float(sim), int(rowid))
        for sim, rowid in zip(similarities[0], ids[0], strict=True)
        if rowid != -1
    ]

"""Re-embeds the exact LFW images from the Colab run, with and without CLAHE, in the
backend's own container, to (a) check the Colab embeddings reproduce locally and
(b) measure whether CLAHE helps or hurts."""
import cv2, numpy as np, json, time
from pathlib import Path
from insightface.app import FaceAnalysis

def apply_clahe(image):
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)

app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"], allowed_modules=["detection", "recognition"])
app.prepare(ctx_id=0, det_size=(640, 640))
d = np.load("/work/results_v2/lfw_embeddings.npz")
out = {"with": [], "without": [], "faces_without": []}
t = time.time()
for k, rel in enumerate(d["paths"]):
    img = cv2.imdecode(np.frombuffer(Path("/data/lfw", rel).read_bytes(), np.uint8), cv2.IMREAD_COLOR)
    for key, im in (("with", apply_clahe(img)), ("without", img)):
        faces = app.get(im)
        if key == "without":
            out["faces_without"].append(len(faces))
        if len(faces) != 1:
            out[key].append(np.full(512, np.nan, np.float32)); continue
        e = faces[0].embedding.astype(np.float32); out[key].append(e / np.linalg.norm(e))
    if k % 200 == 0: print(k, f"{time.time()-t:.0f}s", flush=True)
np.savez("/work/clahe_ablation_lfw.npz", with_clahe=np.stack(out["with"]), without_clahe=np.stack(out["without"]),
         faces_without=np.array(out["faces_without"]), labels=d["labels"], colab=d["embeddings"])
print("done", f"{time.time()-t:.0f}s")

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-dev.txt ./
# --default-timeout/--retries: large ML deps (opencv, onnxruntime) have hit
# read timeouts on this network; pip's 15s default is too short for them.
# /wheels is the local wheelhouse (../backend-wheels, see docs/setup.md).
# Try it offline first (--no-index: with --find-links alone pip still prefers
# PyPI and re-downloads everything); fall back to the network only if the
# wheelhouse is missing something, e.g. right after a requirements change.
RUN --mount=type=bind,from=wheels,target=/wheels \
    pip install --no-cache-dir --no-index --find-links /wheels -r requirements-dev.txt \
    || pip install --no-cache-dir --default-timeout=180 --retries=10 \
    --find-links /wheels -r requirements-dev.txt

# insightface's own dependency list pulls in GUI-enabled opencv-python, which
# needs libxcb/libGL that this slim image doesn't have and doesn't need.
# requirements.txt ordering alone doesn't win this fight -- pip resolves
# insightface's install_requires independently of our own opencv-python-headless
# pin -- so force the headless build back after the fact.
RUN --mount=type=bind,from=wheels,target=/wheels \
    pip uninstall -y opencv-python opencv-python-headless \
    && (pip install --no-cache-dir --force-reinstall --no-deps \
    --no-index --find-links /wheels opencv-python-headless==5.0.0.93 \
    || pip install --no-cache-dir --force-reinstall --no-deps \
    opencv-python-headless==5.0.0.93)

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Base image (Alpine + Python 3.11)
FROM python:3.11.13-alpine3.22

# --- Runtime hygiene & pip behavior ---
# PYTHONDONTWRITEBYTECODE: avoid .pyc files
# PYTHONUNBUFFERED: flush stdout/err immediately
# PIP_*: no cache and no version check noise
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# --- OS security updates ---
# Keep Alpine packages patched. Add CA certificates if your app calls HTTPS.
RUN apk update \
    && apk upgrade --no-cache --available \
    && apk add --no-cache ca-certificates \
    && update-ca-certificates

# --- App workdir ---
WORKDIR /app

# --- Remove vulnerable setuptools from the base layer ---
# Some scanners will flag the vulnerable files if they remain on disk,
# even if a fixed version is later installed. Remove then upgrade.
RUN rm -rf /usr/local/lib/python3.11/site-packages/setuptools* || true \
    && python -m pip install --upgrade \
    "pip>=24.3" \
    "wheel>=0.43" \
    "setuptools>=78.1.1"

# --- Install application dependencies ---
# Use --upgrade-strategy eager to lift transitive deps to patched versions.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade-strategy eager -r requirements.txt

# --- Copy source code ---
COPY . .

# COPY ../entrypoint.sh /entrypoint.sh
# RUN chmod +x /entrypoint.sh

# --- Drop root privileges ---
RUN adduser -D appuser && chown -R appuser:appuser /app
USER appuser

# --- App entrypoint ---
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

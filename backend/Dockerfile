# ─── Build stage ────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build tools only in the builder layer
RUN pip install --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM node:22-slim AS node

# ─── Runtime stage ───────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy Node.js runtime so mongodb-mcp-server can run via npx on Render.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
	&& ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Copy application source
COPY . .

# Cloud Run listens on PORT env var (default 8080)
ENV PORT=8080
EXPOSE 8080

# Non-root user for Cloud Run security best practice
RUN adduser --disabled-password --gecos "" appuser
USER appuser

# Uvicorn bound to 0.0.0.0 so Cloud Run can reach it
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1 --log-level info

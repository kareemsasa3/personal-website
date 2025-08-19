# Dev image for Arachne with live-reload (air) and Chromium
FROM golang:1.23-alpine

# Install dependencies for headless Chromium and build tools
RUN apk --no-cache add \
    ca-certificates \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    git \
    bash \
    build-base

# Enable automatic toolchain download (allows Air requiring newer Go)
ENV GOTOOLCHAIN=auto

# Install air for live reloading
RUN go install github.com/air-verse/air@latest

ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/

# Create non-root user and prepare writable Go caches/paths
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    mkdir -p /home/appuser/go /home/appuser/.cache/go-build && \
    chown -R appuser:appgroup /home/appuser && \
    chown -R appuser:appgroup /go || true

# Use per-user Go paths to avoid permission issues
ENV GOPATH=/home/appuser/go
ENV GOMODCACHE=/home/appuser/go/pkg/mod
ENV GOCACHE=/home/appuser/.cache/go-build
ENV XDG_CACHE_HOME=/home/appuser/.cache

WORKDIR /app

# Expose service port
EXPOSE 8080

# Default command runs air; config is mounted at /app/.air.toml
USER appuser
CMD ["/go/bin/air"]



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

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Expose service port
EXPOSE 8080

# Default command runs air; config is mounted at /app/.air.toml
USER appuser
CMD ["/go/bin/air"]



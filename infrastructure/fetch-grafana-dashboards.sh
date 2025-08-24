#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

DASH_DIR="monitoring/grafana/dashboards"
mkdir -p "$DASH_DIR"

download() {
  local id="$1"; shift
  local out="$1"; shift
  echo "Downloading dashboard $id -> $out"
  curl -fsSL "https://grafana.com/api/dashboards/${id}/revisions/latest/download" -o "$out.tmp"
  mv "$out.tmp" "$out"
}

# Node Exporter Full (ID 1860)
download 1860 "$DASH_DIR/node-exporter-full.json"

# Redis Dashboard (ID 11835)
download 11835 "$DASH_DIR/redis-exporter.json"

# Nginx Prometheus Exporter (ID 12797)
download 12797 "$DASH_DIR/nginx-exporter.json"

echo "Dashboards downloaded to $DASH_DIR"


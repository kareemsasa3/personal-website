# Monitoring & Observability Stack

This document describes the optional monitoring stack for the current portfolio deployment.

## Current Scope

The active monitoring setup in this repo is focused on:

- `prometheus`
- `grafana`
- `node-exporter`
- `nginx-exporter`

`web` is a frontend app. Prometheus can scrape it only if the app exposes `/metrics`, which is not a guaranteed feature of the current stack.

## Quick Start

### Development

```bash
cd infrastructure
./setup-monitoring.sh
```

### Production

```bash
docker compose --env-file infrastructure/.env \
  -f infrastructure/docker-compose.yml \
  -f infrastructure/prod/docker-compose.prod.yml \
  -f infrastructure/prod/docker-compose.monitoring.prod.yml \
  up -d
```

## Access

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

## Metrics Collected

### Nginx

- Request rates and response codes
- Connection counts
- Upstream and edge visibility

### Host System

- CPU, memory, disk, and network usage
- File system metrics

### Web

- Only applicable if the frontend exposes `/metrics`

## Recommended Dashboards

- Node Exporter Full (`1860`)
- Nginx Prometheus Exporter (`12797`)

Fetch the recommended dashboards:

```bash
cd infrastructure
./fetch-grafana-dashboards.sh
```

## Notes

- Redis monitoring was removed from the active monitoring stack because Redis is not part of the deployed architecture.
- If backend services are introduced later, their monitoring should be added alongside the runtime change, not documented in advance.

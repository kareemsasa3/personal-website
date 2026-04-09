# Infrastructure

This directory contains the Docker Compose configuration, nginx config, monitoring config, and deployment scripts for the portfolio stack.

## Current Stack

The active runtime architecture is:

- `workfolio`: React/Vite frontend
- `nginx`: edge proxy and TLS termination

Optional monitoring adds:

- `prometheus`
- `grafana`
- `node-exporter`
- `nginx-exporter`

No backend application services are deployed from this repo.

## Directory Structure

```text
infrastructure/
├── docker-compose.yml
├── dev.sh
├── prod.sh
├── dev/
├── monitoring/
├── nginx/
└── prod/
```

## Quick Start

### Development

```bash
./dev.sh
```

### Production

```bash
./prod.sh
```

## Environment

Create `.env` from the template and fill in the active deployment settings:

```bash
cp env.example .env
./setup-env.sh
```

Current required values:

- `DOMAIN_NAME`
- `SSL_EMAIL`

## Monitoring

The monitoring stack is optional and focused on host and nginx visibility. Workfolio metrics remain optional because the frontend does not currently expose a dedicated metrics implementation.

See [MONITORING_SETUP.md](/home/kareem/code/personal/website/docs/infrastructure/MONITORING_SETUP.md).

## Historical Reference

Some disabled nginx config files in `nginx/conf.d.disabled/` are preserved as historical reference for earlier backend-oriented experiments. They are not part of the deployed architecture.

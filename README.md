# Portfolio Infrastructure

A Docker-based deployment setup for serving the Workfolio React/Vite frontend behind nginx.

This repository contains the infrastructure, configuration, and deployment tooling for the portfolio site. The live application is a frontend-only app. User preferences are persisted in the browser via local storage. No backend application services are deployed in this stack.

## Architecture

### Folder Structure

```text
personal-website/
├── workfolio/      # Portfolio application (React / Vite)
├── infrastructure/ # Docker, nginx, deployment, monitoring
└── README.md
```

### Active Services

- `workfolio`: frontend build served from nginx inside the container
- `nginx`: reverse proxy, TLS termination, security headers, health endpoint

Optional monitoring services are documented under `infrastructure/monitoring/`.

## Quick Start

### Local Docker stack

```bash
cd infrastructure
docker compose up --build
```

Access:
- Portfolio: `http://localhost`
- Health check: `http://localhost/health`

Stop:

```bash
docker compose down
```

### Frontend only

```bash
cd workfolio
npm install
npm run dev
```

## Configuration

Environment variables are managed centrally:

```bash
cd infrastructure
./setup-env.sh
```

Required variables:
- `DOMAIN_NAME`
- `SSL_EMAIL`

Manual setup:

```bash
cd infrastructure
cp env.example .env
```

See [docs/infrastructure/ENVIRONMENT_SETUP.md](/home/kareem/code/personal/website/docs/infrastructure/ENVIRONMENT_SETUP.md).

## Monitoring

Prometheus and Grafana can be enabled via the monitoring compose files.

- Nginx exporter is included
- Node exporter is included
- Workfolio metrics are only relevant if the app exposes `/metrics`

See [docs/infrastructure/MONITORING_SETUP.md](/home/kareem/code/personal/website/docs/infrastructure/MONITORING_SETUP.md).

## Production Deployment

1. Configure environment:

```bash
cd infrastructure
./setup-env.sh
```

2. Obtain TLS certificates:

```bash
docker compose --env-file infrastructure/.env \
  -f infrastructure/docker-compose.yml \
  -f infrastructure/prod/docker-compose.prod.yml \
  --profile ssl-setup up certbot
```

3. Start the production stack:

```bash
docker compose --env-file infrastructure/.env \
  -f infrastructure/docker-compose.yml \
  -f infrastructure/prod/docker-compose.prod.yml \
  -f infrastructure/prod/docker-compose.monitoring.prod.yml \
  up -d --no-build --pull always
```

4. Verify:

```bash
curl https://your-domain/health
```

## Notes

- The current stack does not deploy backend APIs, sessions, or Redis-backed features.
- Future backend or multi-user ideas belong in roadmap docs under `workfolio/docs/`.

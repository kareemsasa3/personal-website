# Infrastructure

This directory contains the infrastructure layer used to run, serve, and deploy the web frontend application using Docker and nginx, with optional monitoring for the deployed stack.

It is a support layer for the website, not a separate product. The production architecture remains frontend-only: nginx serves as the public entry point, and web is the only application container in the active runtime.

## Components / Services

Core runtime:
- `web`: the frontend website application, built from the `web/` directory and run as a container image
- `nginx`: reverse proxy and edge web server for routing, TLS termination, headers, and health checks
- `certbot`: optional certificate setup and renewal support used by the production compose configuration

Optional monitoring:
- `prometheus`
- `grafana`
- `grafana-admin`
- `node-exporter`
- `nginx-exporter`

## Directory Layout

```text
infrastructure/
├── docker-compose.yml                # Base stack for nginx + web
├── env.example                       # Environment template
├── setup-env.sh                      # Environment setup helper
├── dev.sh                            # Local development helper
├── nginx/                            # nginx config and SSL assets
├── dev/                              # Local Docker development overrides
├── prod/                             # Production compose files and deployment scripts
├── monitoring/                       # Optional Prometheus/Grafana stack
├── setup-monitoring.sh               # Monitoring setup helper
└── test-ssl.sh                       # TLS verification helper
```

## Local Usage

For the base local stack:

```bash
cd infrastructure
docker compose up --build
```

This starts nginx in front of the web container using the base compose file.

For local development with the development overrides, use the scripts in this directory:

```bash
./dev.sh
```

Use the root README for normal frontend-only development in `web/`.

## Environment Configuration

Environment values for Docker-based runtime and deployment live in `infrastructure/.env`.

Start from the template and the setup helper:

```bash
cd infrastructure
cp env.example .env
./setup-env.sh
```

This configuration covers values such as domain name, SSL email, image tag, nginx ports, and resource limits.

## Deployment Model

The infrastructure layer deploys the frontend site behind nginx using Docker Compose.

- `docker-compose.yml` defines the base nginx + web stack
- `prod/docker-compose.prod.yml` adds production runtime settings and certificate support
- `prod/docker-compose.monitoring.prod.yml` adds the optional production monitoring stack

GitHub Actions builds and publishes the web image to GHCR. The production deployment consumes that image through the compose configuration. There are no backend API, database, queue, or session services in the active deployment model.

## Web container privileges

The production web image runs nginx (master and workers) as the non-root `nginx`
user. Its PID is written under `/tmp`, and its cache directory is owned by that
user; application files and nginx configuration remain root-owned and readable.
The base Compose file explicitly permits binding low ports inside the web
container's network namespace. Internal port 80 is retained so existing proxy
configuration and rollback images remain compatible.

When running the image directly, pass
`--sysctl net.ipv4.ip_unprivileged_port_start=0` (Docker already defaults to this
on current versions). Validate a built image with
`bash infrastructure/tests/web-container.test.sh <image>`.

## Monitoring

Monitoring is optional and focused on infrastructure-level visibility for the frontend deployment.

Available components include:
- Prometheus
- Grafana
- Grafana admin instance
- Node exporter
- nginx Prometheus exporter

These services are defined under `monitoring/` for local use and under `prod/` for the production monitoring stack.

## References

- [Environment setup](../docs/infrastructure/ENVIRONMENT_SETUP.md)
- [Monitoring setup](../docs/infrastructure/MONITORING_SETUP.md)
- [SSL setup guide](../docs/infrastructure/SSL_SETUP_GUIDE.md)
- [Let's Encrypt Docker integration](../docs/infrastructure/LETS_ENCRYPT_DOCKER_INTEGRATION.md)

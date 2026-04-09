# Personal Website Source Repository

This repository contains the source for the personal website and the supporting infrastructure used to build, serve, and deploy it.

The site itself lives in `web/` and is a frontend-only React, Vite, and TypeScript application. The surrounding `infrastructure/` directory contains Docker, nginx, and deployment support for running that app in production. User preferences are stored in browser local storage. No backend application services are part of the production stack.

## Repository Structure

```text
.
├── web/            # Website application (React / Vite / TypeScript)
├── infrastructure/ # Docker, nginx, deployment, and monitoring support (see infrastructure/README.md)
├── docs/           # Supporting project and infrastructure documentation
└── README.md
```

## Running Locally

### Frontend only

Use this for normal UI development.

```bash
cd web
npm install
npm run dev
```

### Full Docker stack

Use this when you want the site behind nginx with the local container setup.

```bash
cd infrastructure
docker compose up --build
```

Local endpoints:
- Website: `http://localhost`
- Health check: `http://localhost/health`

Stop the stack with:

```bash
cd infrastructure
docker compose down
```

## Configuration

Environment setup for Docker and deployment lives under `infrastructure/`.

```bash
cd infrastructure
cp env.example .env
./setup-env.sh
```

Useful references:
- [Environment setup](docs/infrastructure/ENVIRONMENT_SETUP.md)
- [SSL setup guide](docs/infrastructure/SSL_SETUP_GUIDE.md)

## Monitoring

Optional monitoring is available through the infrastructure layer with Prometheus and Grafana. It is intended for host and nginx visibility around the deployed frontend stack.

See [Monitoring setup](docs/infrastructure/MONITORING_SETUP.md).

## Production Deployment

Production serves the built frontend behind nginx using Docker-based deployment tooling from `infrastructure/`.

At a high level:
1. Configure environment variables in `infrastructure/.env`
2. Build and publish the Workfolio image through GitHub Actions
3. Deploy the production stack with the compose files under `infrastructure/prod/`

## Notes

- `web/` contains the website source. It previously lived at `workfolio/` before this repository was consolidated and simplified.
- The production site is frontend-only. There are no deployed API, session, queue, or database services in the active stack.
- CI/CD is configured to lint and typecheck the app, build the production image, and support deployment without requiring a separate application repository.

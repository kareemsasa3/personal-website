# Development guide

The website is a frontend-only React, Vite, and TypeScript application in `web/`. Browser preferences use local storage. Docker and nginx support live under `infrastructure/`; the active stack has no application backend, database, queue, or session service.

Run commands from the repository root unless a section says otherwise.

## Frontend development

Use Node.js 22.12 or newer, or Node.js 20.19+ on the 20.x line, with npm. These versions satisfy the Vite engine requirement in [the lockfile](../web/package-lock.json); CI and the Dockerfiles use Node 20.

```bash
cd web
npm ci
npm run dev
```

The default URL is `http://localhost:5173`. Vite uses a strict port and exits if it is occupied. `DEV_HOST` and `DEV_PORT` can override the defaults in [vite.config.ts](../web/vite.config.ts); the default host is `0.0.0.0`. This binding makes the development server accessible through reachable network interfaces. Set `DEV_HOST=127.0.0.1` for access only from the local machine.

Use `npm ci` for a fresh checkout with the committed lockfile. Use `npm install` when intentionally updating dependencies, and review the resulting lockfile changes.

### Available scripts

Run these from `web/`. [package.json](../web/package.json) is the source of truth.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite with live reload. |
| `npm run typecheck` | Check TypeScript without emitting files. |
| `npm run lint` | Lint source, ESLint configuration, and Vite configuration; warnings fail the check. |
| `npm run build:articles` | Generate `src/data/generated/articles.ts` from `src/content/articles/*.md`. Run after editing articles when using the dev server. |
| `npm run build` | Run the `prebuild` article-generation hook, then build into `web/build/`, including route shells and the sitemap. |
| `npm run preview` | Serve an existing production build locally; use the URL printed by Vite. |
| `npm run test:smoke` | Build, then run `scripts/smoke-test.mjs`. |
| `npm test` | Alias for `npm run test:smoke`. |

For component changes, run typecheck and lint. For route, metadata, or production behavior changes, also build and run the smoke tests. See [AGENTS.md](../AGENTS.md) for the repository's change and verification rules.

## Environment configuration

Normal frontend development does not require a Docker environment file. Vite reads local overrides from `web/.env.local`; the variables consumed by the development server are defined in [vite.config.ts](../web/vite.config.ts).

For Docker, create `infrastructure/.env` from the template only if it does not already exist:

```bash
test -f infrastructure/.env || cp infrastructure/env.example infrastructure/.env
```

Review that file before use. It covers domain and certificate email, the web image, nginx ports, resource limits, and optional monitoring credentials. For interactive domain and certificate-email configuration, run the helper from its own directory:

```bash
(cd infrastructure && ./setup-env.sh)
```

The helper creates a missing `.env` and updates an existing one. Keep environment files local. See the [environment reference](infrastructure/ENVIRONMENT_SETUP.md) and [template](../infrastructure/env.example) for details.

## Local Docker stack

Use Docker with the Compose plugin when you want nginx in front of the Vite development server. Prepare `infrastructure/.env` as above, then run from the repository root:

```bash
WEB_IMAGE=personal-website-web:local docker compose \
  --project-directory . \
  --env-file infrastructure/.env \
  -f infrastructure/docker-compose.yml \
  -f infrastructure/dev/docker-compose.dev.yml \
  up --build
```

The explicit project directory resolves build contexts and bind mounts from the repository root. The development override selects `Dockerfile.dev`, mounts the source, and uses the HTTP nginx configuration in `infrastructure/nginx/conf.d.dev/`. The local image name overrides the registry placeholder in the environment template.

The equivalent helper is `WEB_IMAGE=personal-website-web:local ./infrastructure/dev.sh --build`; omit `--build` on later starts when no image rebuild is needed.

With the default ports:

- Website: `http://localhost`
- nginx health endpoint: `http://localhost/health`

`/health` is answered by nginx itself; load the website too to check that the frontend is reachable. If `NGINX_HTTP_PORT` changes, include that port in both URLs. The merged Compose configuration also publishes `NGINX_HTTPS_PORT` (default `443`), although the development nginx configuration only serves HTTP.

The stack uses fixed development container names, so run it from one checkout at a time. Stop the foreground stack with Ctrl+C. To remove its containers and network, run from the repository root:

```bash
WEB_IMAGE=personal-website-web:local docker compose \
  --project-directory . \
  --env-file infrastructure/.env \
  -f infrastructure/docker-compose.yml \
  -f infrastructure/dev/docker-compose.dev.yml \
  down
```

Use both Compose files for local development: the base file alone mounts nginx configuration that expects production TLS certificates. See [development topology](dev-topology.md) for the optional proxied/Tailscale workflow and HMR behavior.

## Monitoring and infrastructure

Optional Prometheus and Grafana services provide host and nginx visibility. The frontend does not expose Prometheus metrics. Setup, access restrictions, and known monitoring gaps remain documented in the [monitoring guide](infrastructure/MONITORING_SETUP.md).

The [infrastructure overview](../infrastructure/README.md) describes the service layout. Certificate procedures live in the [SSL setup guide](infrastructure/SSL_SETUP_GUIDE.md) and [Let's Encrypt Docker integration guide](infrastructure/LETS_ENCRYPT_DOCKER_INTEGRATION.md).

## Production deployment overview

Changes to `main` require a pull request, passing required checks, and approval from the designated [code owner](../.github/CODEOWNERS). Once merged, the production pipeline builds and publishes the image and initiates deployment after a successful build. Direct pushes and unapproved merges are restricted by the repository's [production ruleset](https://github.com/kareemsasa3/personal-website/rules/25769135).

Production serves the built frontend in a web image behind nginx. The deployment script pins the web image by registry digest and verifies the release, restoring the previous web image if the new release fails its health checks.

Production configuration uses `infrastructure/.env` and the Compose files under `infrastructure/prod/`. Domain configuration and existing TLS certificates are deployment prerequisites. Follow [Deployment and rollback](infrastructure/DEPLOYMENT_AND_ROLLBACK.md) for the authoritative release, recovery, and certificate requirements; the [build workflow](../.github/workflows/web-ci.yml) and [deploy workflow](../.github/workflows/deploy.yml) define the automation.

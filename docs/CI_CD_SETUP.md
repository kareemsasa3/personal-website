# CI/CD Pipeline Setup

This document describes the CI/CD setup for building and deploying the current frontend/nginx stack.

## Repository Secrets

Configure these GitHub Actions secrets:

```text
PROD_HOST
PROD_USER
PROD_SSH_KEY
PROD_PORT
GHCR_USERNAME
GHCR_TOKEN
```

## Build and Deploy Model

- Build and push the `web` image to GHCR
- Deploy the image to the production host
- Start the stack with:
  - `infrastructure/docker-compose.yml`
  - `infrastructure/prod/docker-compose.prod.yml`
  - `infrastructure/prod/docker-compose.monitoring.prod.yml`

## Production Host Layout

```text
/opt/personal-website/
├── infrastructure/
│   ├── docker-compose.yml
│   ├── monitoring/
│   └── prod/
└── .env
```

## Notes

- The current CI/CD path deploys a frontend application behind nginx.
- No backend secrets, Turnstile secrets, or session secrets are required by the current live stack.

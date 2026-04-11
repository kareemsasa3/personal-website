# Environment Configuration Guide

This document explains the active environment variables used by the current portfolio stack.

## Current Architecture

The deployed stack in this repo is:

- `web`: React/Vite frontend
- `nginx`: reverse proxy and TLS termination
- optional monitoring services

The current stack does not deploy backend APIs, session services, or Redis.

## Quick Setup

### Automated setup

```bash
cd infrastructure
./setup-env.sh
```

### Manual setup

```bash
cd infrastructure
cp env.example .env
```

## Environment Variables Reference

### Required

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DOMAIN_NAME` | Primary domain name | `your-domain.com` | Yes |
| `SSL_EMAIL` | Email for TLS certificate notifications | `your-email@example.com` | Yes |

### Frontend

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `WEB_IMAGE` | Frontend image to deploy | `ghcr.io/username/personal-website/web:build-id` | No |
| `WEB_NODE_ENV` | Node environment passed to the container | `production` | No |

### Nginx

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NGINX_HTTP_PORT` | HTTP port | `80` | No |
| `NGINX_HTTPS_PORT` | HTTPS port | `443` | No |

### Docker / Resource Limits

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DOCKER_NETWORK_NAME` | Docker network name | `portfolio-network` | No |
| `NGINX_MEMORY_LIMIT` | Nginx memory limit | `256M` | No |
| `NGINX_CPU_LIMIT` | Nginx CPU limit | `0.5` | No |
| `WEB_MEMORY_LIMIT` | Web memory limit | `512M` | No |
| `WEB_CPU_LIMIT` | Web CPU limit | `1.0` | No |

### Development

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DEV_NODE_ENV` | Development Node environment | `development` | No |

## Notes

- If future backend services are added later, they should be documented separately as future-state architecture until they are actually deployed from this repo.
- Historical references to sessions, Turnstile, and Redis were removed from active setup because they are not consumed by the live stack.

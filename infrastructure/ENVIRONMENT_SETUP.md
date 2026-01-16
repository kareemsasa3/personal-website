# Environment Configuration Guide

This document explains how to set up and manage environment variables for the portfolio project.

## Overview

The portfolio uses a centralized environment variable system to manage configuration across all services. This includes:

- **Domain configuration** for SSL certificates and routing
- **API keys** for external services (e.g., Cloudflare Turnstile)
- **Service configuration** for ports, memory limits, and other settings
- **Development vs Production** environment overrides

## Quick Setup

### 1. Automated Setup (Recommended)

Run the interactive setup script:

```bash
cd infrastructure
./setup-env.sh
```

This script will:
- Create a `.env` file from the template
- Prompt for your domain name and email
- Allow customization of resource limits
- Provide next steps for deployment

### 2. Manual Setup

To fetch Grafana dashboards locally:
```bash
cd infrastructure
./fetch-grafana-dashboards.sh
```

If you prefer manual setup:

```bash
cd infrastructure
cp env.example .env
# Edit .env with your configuration
nano .env
```

## Environment Variables Reference

### Domain Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DOMAIN_NAME` | Your primary domain name | `your-domain.com` | Yes |
| `SSL_EMAIL` | Email for SSL certificate notifications | `your-email@example.com` | Yes |

### Session & Turnstile Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SESSION_TOKEN_SECRET` | Secret for signing session tokens | - | Yes in production |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret key | - | Yes if using Turnstile |
| `TURNSTILE_REQUIRED` | Require Turnstile in production (set `false` to bypass) | `false` | No |

### Redis Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_PORT` | Redis server port | `6379` | No |
| `REDIS_MAX_MEMORY` | Maximum memory usage | `512mb` | No |
| `REDIS_MAX_MEMORY_POLICY` | Memory eviction policy | `allkeys-lru` | No |
| `REDIS_COMMANDER_ENABLED` | Enable Redis Commander UI | `true` | No |
| `REDIS_COMMANDER_PORT` | Redis Commander port | `8081` | No |

### Workfolio Frontend Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `WORKFOLIO_NODE_ENV` | Node.js environment | `production` | No |
| `WORKFOLIO_PORT` | Frontend port | `3000` | No |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (public) | - | Yes if using Turnstile |

### Nginx Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NGINX_HTTP_PORT` | HTTP port | `80` | No |
| `NGINX_HTTPS_PORT` | HTTPS port | `443` | No |
| `SSL_CERT_PATH` | SSL certificate path | `/etc/nginx/ssl/cert.pem` | No |
| `SSL_KEY_PATH` | SSL private key path | `/etc/nginx/ssl/key.pem` | No |

### Docker Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DOCKER_NETWORK_NAME` | Docker network name | `portfolio-network` | No |
| `DOCKER_NETWORK_SUBNET` | Docker network subnet | `172.20.0.0/16` | No |

### Resource Limits

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NGINX_MEMORY_LIMIT` | Nginx memory limit | `256M` | No |
| `NGINX_CPU_LIMIT` | Nginx CPU limit | `0.5` | No |
| `WORKFOLIO_MEMORY_LIMIT` | Workfolio memory limit | `512M` | No |
| `WORKFOLIO_CPU_LIMIT` | Workfolio CPU limit | `1.0` | No |
| `REDIS_MEMORY_LIMIT` | Redis memory limit | `1G` | No |
| `REDIS_CPU_LIMIT` | Redis CPU limit | `1.0` | No |

### Development Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DEV_NODE_ENV` | Development Node.js environment | `development` | No |
| `DEV_WORKFOLIO_PORT` | Development frontend port | `3000` | No |

### Logging Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LOG_MAX_SIZE` | Maximum log file size | `10m` | No |
| `LOG_MAX_FILES` | Maximum number of log files | `3` | No |

### Security Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CORS_ALLOW_ORIGIN` | CORS allowed origin | `*` | No |
| `CORS_ALLOW_METHODS` | CORS allowed methods | `GET, POST, OPTIONS` | No |
| `CORS_ALLOW_HEADERS` | CORS allowed headers | `DNT,User-Agent...` | No |
| `API_RATE_LIMIT_BURST` | API rate limit burst | `20` | No |
| `SCRAPER_RATE_LIMIT_BURST` | Scraper rate limit burst | `10` | No |

## Environment-Specific Configuration

### Development Environment

For development, the following variables are automatically overridden:

- `NODE_ENV=development`
- Lower resource limits
- Debug logging
- Local URLs instead of domain names

### Production Environment

For production, ensure you have:

1. **Valid domain name** in `DOMAIN_NAME`
2. **Valid email** in `SSL_EMAIL`
3. **Appropriate resource limits** for your server

## Usage Examples

### Starting Services

**Development:**
```bash
cd infrastructure
docker-compose -f dev/docker-compose.dev.yml up -d
```

**Production:**
```bash
cd infrastructure
docker-compose -f prod/docker-compose.prod.yml up -d
```

### SSL Certificate Setup

```bash
cd infrastructure
docker-compose -f prod/docker-compose.prod.yml --profile ssl-setup up certbot
```

### Checking Configuration

```bash
# Validate environment variables
cd infrastructure
docker-compose -f docker-compose.yml config

# Check specific service configuration
docker-compose -f prod/docker-compose.prod.yml config nginx
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique API keys** for external services
3. **Regularly rotate secrets** and API keys
4. **Use environment-specific configurations** for dev/staging/prod
5. **Limit resource usage** to prevent abuse
6. **Enable rate limiting** for API endpoints

## Troubleshooting

### Common Issues

1. **Invalid Domain**: SSL certificates won't work with invalid domain
2. **Port Conflicts**: Change port variables if services conflict
3. **Memory Issues**: Adjust resource limits based on your server capacity

### Validation Commands

```bash
# Check if .env file exists
ls -la infrastructure/.env

# Validate docker-compose configuration
cd infrastructure
docker-compose -f docker-compose.yml config

# Test environment variable substitution
cd infrastructure
docker-compose -f docker-compose.yml config | grep -E "\$\{.*\}"
```

## Migration from Hardcoded Values

If you're migrating from hardcoded configuration:

1. **Backup your current configuration**
2. **Run the setup script** to create `.env`
3. **Copy your existing values** to the new variables
4. **Test the configuration** before deploying
5. **Update your deployment scripts** to use the new variables

## Support

For issues with environment configuration:

1. Check the troubleshooting section above
2. Validate your `.env` file syntax
3. Ensure all required variables are set
4. Check Docker Compose logs for specific errors 
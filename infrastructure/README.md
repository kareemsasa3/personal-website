# Infrastructure

This directory contains the Docker Compose configuration and deployment scripts for the portfolio stack.

## 📁 Directory Structure

```
infrastructure/
├── docker-compose.yml          # Base configuration (shared services)
├── dev.sh                      # Development wrapper script
├── prod.sh                     # Production wrapper script
├── dev/                        # Development environment
│   ├── docker-compose.dev.yml  # Development overrides
│   └── dev.sh                  # Development deployment script
├── prod/                       # Production environment
│   ├── docker-compose.prod.yml # Production overrides
│   └── prod.sh                 # Production deployment script
├── nginx/                      # Nginx configuration
│   ├── nginx.conf
│   └── conf.d/
└── logs/                       # Application logs (created automatically)
    ├── nginx/
    └── redis/
```

## 🚀 Quick Start

### Development Environment
```bash
# Start development stack with live reloading
./dev.sh

# Or run directly from dev directory
cd dev && ./dev.sh
```

#### Dev Nginx (HTTP-only)
- The development stack uses an HTTP-only Nginx site configuration at `nginx/conf.d/default.local.conf`.
- No local SSL certificates are required for dev.
- Access the stack at: `http://localhost`.
- Dev proxy routes:
  - Frontend (Workfolio): `/` → `workfolio:80`

### Production Environment
```bash
# Deploy production stack
./prod.sh

# Or run directly from prod directory
cd prod && ./prod.sh
```

## 🔧 Environment Differences

### Development (`dev/`)
- **Live Reloading**: Code changes trigger automatic rebuilds
- **Debug Logging**: Verbose logging for troubleshooting
- **Development Ports**: Direct access to service ports
- **Volume Mounts**: Source code mounted for hot reloading
- **Development Dockerfiles**: Optimized for development workflow

### Production (`prod/`)
- **Resource Limits**: CPU and memory constraints
- **Health Checks**: Comprehensive health monitoring
- **Log Rotation**: Structured logging with rotation
- **Security**: No exposed development ports
- **Performance**: Optimized for production load
- **Monitoring**: Enhanced metrics and monitoring

## 📊 Services

### Core Services
- **Workfolio**: React frontend application
- **Redis**: Data storage for optional services
- **Nginx**: Reverse proxy and load balancer

### Optional Services
- **Redis Commander**: Web UI for Redis management (monitoring profile)

## 🛠️ Management Commands

### Development
```bash
# View logs
docker-compose -f docker-compose.yml -f dev/docker-compose.dev.yml logs -f

# Check status
docker-compose -f docker-compose.yml -f dev/docker-compose.dev.yml ps

# Stop services
docker-compose -f docker-compose.yml -f dev/docker-compose.dev.yml down
```

### Production
```bash
# View logs
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml ps

# Stop services
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml down

# Scale services
docker-compose -f docker-compose.yml -f prod/docker-compose.prod.yml up -d
```

## ⚙️ Configuration

### Environment Variables
- Development: Set in `dev/docker-compose.dev.yml`
- Production: Set in `prod/docker-compose.prod.yml`

### Nginx Configuration
- Main config: `nginx/nginx.conf`
- Site configs: `nginx/conf.d/`
  - Development: `default.local.conf` (HTTP-only, mounted by dev docker-compose)
  - Production: `default.conf` (HTTPS with SSL, used by prod docker-compose)

### SSL Certificates
For production, configure SSL certificates in the nginx configuration:
```bash
# Add SSL certificates to nginx/conf.d/
# Update nginx configuration for HTTPS
```

## 🔍 Monitoring

### Health Checks
All services include health checks that monitor:
- Service availability
- Response times
- Resource usage

### Logs
- **Location**: `logs/` directory
- **Rotation**: 10MB max file size, 3 files kept
- **Format**: JSON structured logging

### Metrics
- **Redis**: Performance monitoring via Redis Commander

## 🚨 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using the ports
   lsof -i :80 -i :443 -i :3000
   ```

2. **Permission Issues**
   ```bash
   # Ensure scripts are executable
   chmod +x dev.sh prod.sh dev/dev.sh prod/prod.sh
   ```

3. **Docker Issues**
   ```bash
   # Clean up Docker resources
   docker system prune -f
   docker volume prune -f
   ```

### Getting Help
- Check service logs: `docker-compose logs [service-name]`
- Verify configuration: `docker-compose config`
- Test health endpoints: `curl http://localhost/health`

## 📝 Notes

- The base `docker-compose.yml` contains shared services (Redis, Redis Commander)
- Environment-specific overrides are in their respective directories
- Wrapper scripts provide convenient access from the infrastructure root
- Production deployment includes comprehensive safety checks
- Development environment prioritizes developer experience and fast iteration 
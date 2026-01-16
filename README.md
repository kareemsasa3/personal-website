# Portfolio Infrastructure

A Docker-based deployment setup for running the Workfolio portfolio application behind nginx, with optional Redis support.

This repository contains the infrastructure, configuration, and deployment tooling for the portfolio site. All application logic lives in Workfolio.

## 🏗️ Architecture

### Folder Structure

personal-website/
├── workfolio/ # Portfolio application (React / Vite)
├── infrastructure/ # Docker, nginx, deployment & ops
│ ├── nginx/ # Reverse proxy configuration
│ ├── docker-compose.yml # Local / base compose
│ ├── docker-compose.dev.yml # Local development
│ ├── prod/ # Production compose & scripts
│ └── monitoring/ # Prometheus / Grafana (optional)
└── README.md

### Services

The active stack consists of:
• Nginx
Reverse proxy, TLS termination, security headers, health endpoint.
• Workfolio
The portfolio frontend (React).
Includes the interactive terminal, virtual filesystem, and project views.
• Redis (optional)
Infrastructure dependency reserved for future features and observability.

No backend application services are deployed in this stack.

---

## 🚀 Quick Start (Local)

### Prerequisites
• Docker
• Docker Compose

### Start the stack

```bash
cd infrastructure
docker-compose up --build
```

### Access
• Portfolio: http://localhost
• Health check: http://localhost/health

### Stop

```bash
docker-compose down
```

---

## 📁 Service Details

### Workfolio
• Public URL: http://localhost
• Internal URL: http://workfolio:80
• Description: Personal portfolio frontend with terminal-style navigation and project explorer.

### Nginx
• Handles:
• HTTP → HTTPS redirects (prod)
• Security headers
• Health endpoint
• Config location:
• infrastructure/nginx/nginx.conf
• infrastructure/nginx/conf.d/default.conf

---

## 🔧 Configuration

### Environment Setup

Environment variables are managed centrally.

#### Interactive setup

```bash
cd infrastructure
./setup-env.sh
```

This configures:
• Domain name
• SSL email
• Resource limits
• Environment mode (dev / prod)

#### Manual setup

```bash
cd infrastructure
cp env.example .env
nano .env
```

#### Required variables

| Variable | Description |
|----------|-------------|
| `DOMAIN_NAME` | Public domain |
| `SSL_EMAIL` | Email for TLS certificates |

See: infrastructure/ENVIRONMENT_SETUP.md

---

## 🐳 Development

### Workfolio only

```bash
cd workfolio
npm install
npm run dev
```

This runs the frontend directly without Docker.

---

## 📊 Monitoring (Optional)

Prometheus and Grafana can be enabled via the monitoring compose files.
• No application-specific exporters are required.
• Redis and nginx exporters are supported.

See: infrastructure/MONITORING_SETUP.md

---

## 🔒 Security
• Containers run as non-root
• Nginx enforces security headers
• Rate limiting is applied at the edge
• No public backend APIs exposed

---

## 🚀 Production Deployment

1. Configure environment:

```bash
cd infrastructure
./setup-env.sh
```

2. (First time only) obtain TLS certificates:

```bash
docker-compose -f prod/docker-compose.prod.yml --profile ssl-setup up certbot
```

3. Start production stack:

```bash
docker-compose -f prod/docker-compose.prod.yml up -d
```

4. Verify:

```bash
curl https://your-domain/health
```

---

## 📝 Troubleshooting

### Useful commands

```bash
docker-compose ps
docker-compose logs nginx
docker-compose logs workfolio
```

### Common issues
• Ports 80/443 already in use
• Missing .env
• DNS not pointing at host
• Stale containers after config changes

---

## 🤝 Contributing

This repository focuses on infrastructure and deployment.

Application development happens in workfolio/.
See that directory for frontend contribution guidelines.

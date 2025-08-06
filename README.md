# Portfolio Ecosystem

A unified Docker Compose setup for running the complete portfolio ecosystem with nginx as a reverse proxy.

## 🏗️ Architecture

### Folder Structure
```
personal/
├── workfolio/                    # Main portfolio (React)
├── services/                     # Backend services showcased by Workfolio
│   ├── ai-backend/              # AI microservice
│   └── arachne/                 # Web scraping service
├── infrastructure/              # Deployment & infrastructure
│   ├── nginx/                   # Reverse proxy configuration
│   ├── docker-compose.yml       # Production setup
│   ├── docker-compose.dev.yml   # Development setup
│   └── dev.sh                   # Development script
└── README.md
```

### Services
This setup orchestrates the following services:

- **Nginx** - Reverse proxy and load balancer
- **Workfolio** - Main portfolio application (React)
- **AI Backend** - AI microservice (Node.js)
- **Arachne** - Web scraping service (Go)
- **Redis** - Job storage for Arachne
- **Redis Commander** - Optional Redis management UI

## 🚀 Quick Start

### Prerequisites

- Docker
- Docker Compose

### Running the Ecosystem

1. **Start all services:**
   ```bash
   cd infrastructure
   docker-compose up --build
   ```

2. **Access the applications:**
   - **Main Portfolio**: http://localhost
   - **AI Backend API**: http://localhost/api/ai/
   - **Arachne API**: http://localhost/api/scrape/
   - **Redis Commander**: http://localhost/redis/
   - **Health Check**: http://localhost/health

3. **Stop all services:**
   ```bash
   cd infrastructure
   docker-compose down
   ```

## 📁 Service Endpoints

### Workfolio (Main Portfolio)
- **URL**: http://localhost
- **Internal**: http://workfolio:80
- **Features**: Interactive terminal, virtual file system, Matrix aesthetic

### AI Backend
- **URL**: http://localhost/api/ai/
- **Internal**: http://ai-backend:3001
- **Endpoints**:
  - `GET /health` - Health check
  - `POST /api/ai/process` - AI processing

### Arachne (Web Scraping)
- **URL**: http://localhost/api/scrape/
- **Internal**: http://arachne:8080
- **Endpoints**:
  - `POST /scrape` - Submit scraping job
  - `GET /scrape/status?id=<job_id>` - Check job status
  - `GET /health` - Health check
  - `GET /metrics` - Prometheus metrics

### Redis Commander
- **URL**: http://localhost/redis/
- **Purpose**: Web UI for Redis management

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory for custom configuration:

```env
# AI Backend
AI_API_KEY=your_ai_api_key

# Arachne
SCRAPER_MAX_CONCURRENT=5
SCRAPER_REQUEST_TIMEOUT=120s

# Redis
REDIS_PASSWORD=optional_redis_password
```

### Nginx Configuration

The nginx configuration is located in:
- `infrastructure/nginx/nginx.conf` - Main configuration
- `infrastructure/nginx/conf.d/default.conf` - Server blocks

## 🐳 Individual Service Development

Each service can be developed independently:

### Workfolio
```bash
cd workfolio
npm install
npm run dev
```

### AI Backend
```bash
cd services/ai-backend
npm install
npm run dev
```

### Arachne
```bash
cd services/arachne
docker-compose up --build
```

## 📊 Monitoring

### Health Checks
All services include health checks that can be monitored:
```bash
cd infrastructure
docker-compose ps
```

### Logs
View logs for specific services:
```bash
cd infrastructure
docker-compose logs workfolio
docker-compose logs ai-backend
docker-compose logs arachne
docker-compose logs nginx
```

### Redis Monitoring
Access Redis Commander at http://localhost/redis/ to monitor Redis operations.

## 🔒 Security

- All services run as non-root users
- Rate limiting on API endpoints
- Security headers configured in nginx
- CORS properly configured for cross-origin requests

## 🚀 Production Deployment

For production deployment:

1. **Set environment variables** in `.env`
2. **Configure SSL certificates** in nginx
3. **Set up proper domain names** in nginx configuration
4. **Use external Redis** if needed
5. **Configure monitoring and logging**

## 📝 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 80, 443 are available
2. **Build failures**: Check Dockerfile syntax in each service
3. **Service dependencies**: Ensure Redis starts before Arachne
4. **Network issues**: Check if all services are on the same network

### Debug Commands

```bash
cd infrastructure

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Rebuild specific service
docker-compose build workfolio

# Access service shell
docker-compose exec workfolio sh
```

## 🤝 Contributing

Each service is maintained independently. See individual service READMEs for contribution guidelines. 
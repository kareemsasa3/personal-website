#!/bin/bash

# Monitoring stack setup script for the portfolio
# This script sets up Prometheus and Grafana monitoring

set -e  # Exit on any error

echo "📊 Setting up monitoring stack for portfolio..."
echo "   This will configure Prometheus and Grafana for monitoring your services"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found!"
    echo "   Please run this script from the infrastructure directory"
    exit 1
fi

# Check if monitoring directory exists
if [ ! -d "monitoring" ]; then
    echo "❌ Error: monitoring directory not found!"
    echo "   Please ensure the monitoring configuration files are present"
    exit 1
fi

# Check Docker availability
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed or not in PATH"
    exit 1
fi

# Create necessary directories
echo "📁 Creating monitoring directories..."
mkdir -p monitoring/grafana/dashboards

# Check if services are running
echo "🔍 Checking if main services are running..."
if ! docker-compose ps | grep -q "Up"; then
    echo "⚠️  Warning: Main services don't appear to be running"
    echo "   Starting main services first..."
    docker-compose up -d
    echo "⏳ Waiting for services to start..."
    sleep 30
fi

# Start monitoring stack
echo ""
echo "🚀 Starting monitoring stack..."
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d

# Wait for monitoring services to be healthy
echo ""
echo "⏳ Waiting for monitoring services to become healthy..."
sleep 20

# Check monitoring service health
echo ""
echo "🔍 Checking monitoring service health..."
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml ps

echo ""
echo "✅ Monitoring stack successfully deployed!"
echo ""
echo "📊 Your monitoring services are now available at:"
echo "   • Prometheus:     http://localhost:9090"
echo "   • Grafana:        http://localhost:3000"
echo "     - Username:     admin"
echo "     - Password:     admin"
echo ""
echo "🔧 Monitoring Features:"
echo "   • Prometheus metrics collection from all services"
echo "   • Grafana dashboards for visualization"
echo "   • Node Exporter for host system metrics"
echo "   • Nginx Exporter for web server metrics"
echo "   • Redis Exporter for database metrics"
echo "   • Custom metrics from AI Backend and Arachne"
echo ""
echo "📈 Next Steps:"
echo "   1. Open Grafana at http://localhost:3000"
echo "   2. Login with admin/admin"
echo "   3. Import dashboards from Grafana.com:"
echo "      - Node Exporter Full (ID: 1860)"
echo "      - Redis Dashboard (ID: 11835)"
echo "      - Nginx Prometheus Exporter (ID: 12797)"
echo "   4. Create custom dashboards for your application metrics"
echo ""
echo "📊 Management Commands:"
echo "   • View monitoring logs: docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml logs -f"
echo "   • Check monitoring status: docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml ps"
echo "   • Stop monitoring: docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml down"
echo ""
echo "🔍 Verify Metrics Collection:"
echo "   • Check Prometheus targets: http://localhost:9090/targets"
echo "   • All targets should show 'UP' status"
echo "   • If any targets are 'DOWN', check service connectivity"
echo ""
echo "⚠️  Security Notes:"
echo "   • Change default Grafana password after first login"
echo "   • Consider restricting access to monitoring ports in production"
echo "   • Set up proper authentication for Grafana in production"
echo ""
echo "🎉 Monitoring setup complete! Your portfolio is now fully observable." 
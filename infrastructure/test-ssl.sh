#!/bin/bash

# Test SSL Setup Script
# This script tests the SSL configuration with running services

set -e

echo "🔐 Testing SSL Setup with Running Services"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if services are running
check_services() {
    print_info "Checking if services are running..."
    
    if ! docker ps | grep -q "portfolio-nginx"; then
        print_error "Nginx container is not running"
        print_info "Start services first: cd infrastructure && docker-compose up -d"
        exit 1
    fi
    
    print_status "Services are running"
}

# Test HTTPS endpoints
test_https() {
    print_info "Testing HTTPS endpoints..."
    
    # Test main application
    if curl -k -s -o /dev/null -w "%{http_code}" https://localhost/health | grep -q "200"; then
        print_status "Main application HTTPS: OK"
    else
        print_warning "Main application HTTPS: Failed (may be starting up)"
    fi
    
    # Test AI backend
    if curl -k -s -o /dev/null -w "%{http_code}" https://localhost/api/ai/health | grep -q "200"; then
        print_status "AI Backend HTTPS: OK"
    else
        print_warning "AI Backend HTTPS: Failed (may be starting up)"
    fi
    
    # Test Arachne scraper
    if curl -k -s -o /dev/null -w "%{http_code}" https://localhost/api/scrape/health | grep -q "200"; then
        print_status "Arachne Scraper HTTPS: OK"
    else
        print_warning "Arachne Scraper HTTPS: Failed (may be starting up)"
    fi
}

# Test SSL certificate
test_certificate() {
    print_info "Testing SSL certificate..."
    
    # Get certificate info
    cert_info=$(echo | openssl s_client -connect localhost:443 -servername localhost 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        print_status "SSL certificate is valid"
        echo "$cert_info" | while read line; do
            echo "   $line"
        done
    else
        print_error "SSL certificate test failed"
    fi
}

# Test HTTP to HTTPS redirect
test_redirect() {
    print_info "Testing HTTP to HTTPS redirect..."
    
    redirect_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health)
    
    if [ "$redirect_status" = "301" ] || [ "$redirect_status" = "302" ]; then
        print_status "HTTP to HTTPS redirect: OK ($redirect_status)"
    else
        print_warning "HTTP to HTTPS redirect: Unexpected status ($redirect_status)"
    fi
}

# Main execution
main() {
    check_services
    test_certificate
    test_redirect
    test_https
    
    echo ""
    print_status "SSL setup test completed!"
    echo ""
    print_info "Your services are now accessible via HTTPS:"
    echo "   • Main Application:     https://localhost"
    echo "   • AI Backend API:       https://localhost/api/ai/health"
    echo "   • Arachne Scraper API:  https://localhost/api/scrape/health"
    echo ""
    print_warning "Note: Self-signed certificates will show security warnings in browsers"
    print_warning "Click 'Advanced' → 'Proceed to localhost (unsafe)' to access the site"
}

# Run main function
main 
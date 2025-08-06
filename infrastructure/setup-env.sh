#!/bin/bash

# =============================================================================
# PORTFOLIO ENVIRONMENT SETUP SCRIPT
# =============================================================================
# This script helps you set up your environment variables for the portfolio
# Copy this script to your infrastructure directory and run it

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if we're in the right directory
if [ ! -f "env.example" ]; then
    print_error "env.example file not found. Please run this script from the infrastructure directory."
    exit 1
fi

print_header "PORTFOLIO ENVIRONMENT SETUP"

# Check if .env already exists
if [ -f ".env" ]; then
    print_warning ".env file already exists. Do you want to overwrite it? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_status "Setup cancelled."
        exit 0
    fi
fi

# Copy the example file
print_status "Creating .env file from template..."
cp env.example .env

print_status "Now let's configure your environment variables:"
echo

# Domain configuration
print_header "DOMAIN CONFIGURATION"
echo "Enter your domain name (e.g., yourdomain.com):"
read -r domain_name
if [ -n "$domain_name" ]; then
    sed -i.bak "s/DOMAIN_NAME=your-domain.com/DOMAIN_NAME=$domain_name/" .env
fi

echo "Enter your email for SSL certificate notifications:"
read -r ssl_email
if [ -n "$ssl_email" ]; then
    sed -i.bak "s/SSL_EMAIL=your-email@example.com/SSL_EMAIL=$ssl_email/" .env
fi

# AI Backend configuration
print_header "AI BACKEND CONFIGURATION"
echo "Enter your Google Gemini API key (or press Enter to skip):"
read -r gemini_key
if [ -n "$gemini_key" ]; then
    sed -i.bak "s/GEMINI_API_KEY=your-gemini-api-key-here/GEMINI_API_KEY=$gemini_key/" .env
else
    print_warning "No Gemini API key provided. AI chat functionality will not work."
    print_warning "You can add it later by editing the .env file."
fi

# Update VITE_AI_BACKEND_URL if domain was provided
if [ -n "$domain_name" ]; then
    sed -i.bak "s|VITE_AI_BACKEND_URL=https://your-domain.com/api/ai|VITE_AI_BACKEND_URL=https://$domain_name/api/ai|" .env
fi

# Optional customizations
print_header "OPTIONAL CUSTOMIZATIONS"
echo "Do you want to customize resource limits? (y/N)"
read -r customize_resources
if [[ "$customize_resources" =~ ^[Yy]$ ]]; then
    echo "Enter memory limit for Nginx (default: 256M):"
    read -r nginx_memory
    if [ -n "$nginx_memory" ]; then
        sed -i.bak "s/NGINX_MEMORY_LIMIT=256M/NGINX_MEMORY_LIMIT=$nginx_memory/" .env
    fi
    
    echo "Enter memory limit for Workfolio (default: 512M):"
    read -r workfolio_memory
    if [ -n "$workfolio_memory" ]; then
        sed -i.bak "s/WORKFOLIO_MEMORY_LIMIT=512M/WORKFOLIO_MEMORY_LIMIT=$workfolio_memory/" .env
    fi
    
    echo "Enter memory limit for AI Backend (default: 1G):"
    read -r ai_memory
    if [ -n "$ai_memory" ]; then
        sed -i.bak "s/AI_BACKEND_MEMORY_LIMIT=1G/AI_BACKEND_MEMORY_LIMIT=$ai_memory/" .env
    fi
fi

# Clean up backup files
rm -f .env.bak

print_header "SETUP COMPLETE"
print_status "Your .env file has been created with the following configuration:"
echo
echo "Domain: ${domain_name:-your-domain.com}"
echo "Email: ${ssl_email:-your-email@example.com}"
echo "Gemini API Key: ${gemini_key:+[SET]}${gemini_key:-[NOT SET]}"
echo

print_status "Next steps:"
echo "1. Review the .env file and make any additional changes:"
echo "   nano .env"
echo
echo "2. Start the services:"
echo "   # For development:"
echo "   docker-compose -f dev/docker-compose.dev.yml up -d"
echo "   # For production:"
echo "   docker-compose -f prod/docker-compose.prod.yml up -d"
echo
echo "3. If you're deploying to production, set up SSL certificates:"
echo "   docker-compose -f prod/docker-compose.prod.yml --profile ssl-setup up certbot"
echo

print_warning "IMPORTANT: Keep your .env file secure and never commit it to version control!"
print_status "The .env file is already in .gitignore to prevent accidental commits." 
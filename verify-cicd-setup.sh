#!/bin/bash

# CI/CD Setup Verification Script
# This script verifies that all CI/CD components are properly configured

set -euo pipefail

echo "🔍 CI/CD Setup Verification"
echo "============================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
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

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "This script must be run from the root of a git repository"
    exit 1
fi

print_success "Git repository found"

# Check GitHub Actions workflows
echo ""
print_info "Checking GitHub Actions workflows..."

if [ -d ".github/workflows" ]; then
    print_success "GitHub Actions workflows directory exists"
    
    if [ -f ".github/workflows/ci.yml" ]; then
        print_success "CI workflow (ci.yml) found"
    else
        print_error "CI workflow (ci.yml) not found"
    fi
    
    if [ -f ".github/workflows/cd.yml" ]; then
        print_success "CD workflow (cd.yml) found"
    else
        print_error "CD workflow (cd.yml) not found"
    fi
else
    print_error "GitHub Actions workflows directory not found"
fi

# Check Docker Compose files
echo ""
print_info "Checking Docker Compose files..."

if [ -f "infrastructure/docker-compose.cicd.yml" ]; then
    print_success "Base CI/CD docker-compose file found"
else
    print_error "Base CI/CD docker-compose file not found"
fi

if [ -f "infrastructure/prod/docker-compose.cicd.yml" ]; then
    print_success "Production CI/CD docker-compose file found"
else
    print_error "Production CI/CD docker-compose file not found"
fi

# Check documentation files
echo ""
print_info "Checking documentation files..."

if [ -f "CI_CD_SETUP.md" ]; then
    print_success "CI/CD setup documentation found"
else
    print_error "CI/CD setup documentation not found"
fi

if [ -f "CI_CD_IMPLEMENTATION_SUMMARY.md" ]; then
    print_success "CI/CD implementation summary found"
else
    print_error "CI/CD implementation summary not found"
fi

if [ -f "setup-cicd.sh" ]; then
    print_success "CI/CD setup script found"
else
    print_error "CI/CD setup script not found"
fi

# Check service directories
echo ""
print_info "Checking service directories..."

if [ -d "workfolio" ]; then
    print_success "Workfolio service directory found"
    
    if [ -f "workfolio/package.json" ]; then
        print_success "Workfolio package.json found"
    else
        print_warning "Workfolio package.json not found"
    fi
    
    if [ -f "workfolio/Dockerfile" ]; then
        print_success "Workfolio Dockerfile found"
    else
        print_warning "Workfolio Dockerfile not found"
    fi
else
    print_warning "Workfolio service directory not found"
fi

if [ -d "services/ai-backend" ]; then
    print_success "AI Backend service directory found"
    
    if [ -f "services/ai-backend/package.json" ]; then
        print_success "AI Backend package.json found"
    else
        print_warning "AI Backend package.json not found"
    fi
    
    if [ -f "services/ai-backend/Dockerfile" ]; then
        print_success "AI Backend Dockerfile found"
    else
        print_warning "AI Backend Dockerfile not found"
    fi
else
    print_warning "AI Backend service directory not found"
fi

if [ -d "services/arachne" ]; then
    print_success "Arachne service directory found"
    
    if [ -f "services/arachne/go.mod" ]; then
        print_success "Arachne go.mod found"
    else
        print_warning "Arachne go.mod not found"
    fi
    
    if [ -f "services/arachne/Dockerfile" ]; then
        print_success "Arachne Dockerfile found"
    else
        print_warning "Arachne Dockerfile not found"
    fi
else
    print_warning "Arachne service directory not found"
fi

# Check for required scripts in package.json files
echo ""
print_info "Checking for required scripts in package.json files..."

check_package_scripts() {
    local service_path=$1
    local service_name=$2
    
    if [ -f "$service_path/package.json" ]; then
        if grep -q '"lint"' "$service_path/package.json"; then
            print_success "$service_name has lint script"
        else
            print_warning "$service_name missing lint script"
        fi
        
        if grep -q '"test"' "$service_path/package.json"; then
            print_success "$service_name has test script"
        else
            print_warning "$service_name missing test script"
        fi
    fi
}

check_package_scripts "workfolio" "Workfolio"
check_package_scripts "services/ai-backend" "AI Backend"

# Check Docker build capability
echo ""
print_info "Checking Docker build capability..."

if command -v docker &> /dev/null; then
    print_success "Docker is installed"
    
    if docker info &> /dev/null; then
        print_success "Docker daemon is running"
    else
        print_error "Docker daemon is not running"
    fi
else
    print_error "Docker is not installed"
fi

# Check for GitHub CLI (optional but helpful)
echo ""
print_info "Checking for GitHub CLI..."

if command -v gh &> /dev/null; then
    print_success "GitHub CLI is installed"
    
    if gh auth status &> /dev/null; then
        print_success "GitHub CLI is authenticated"
    else
        print_warning "GitHub CLI is not authenticated"
    fi
else
    print_warning "GitHub CLI is not installed (optional)"
fi

# Summary
echo ""
echo "=========================================="
print_info "Verification Summary"
echo "=========================================="

echo ""
print_info "Next steps to complete CI/CD setup:"
echo "1. Run the setup script: ./setup-cicd.sh"
echo "2. Configure GitHub repository secrets"
echo "3. Set up production server"
echo "4. Push a commit to trigger the first CI run"
echo ""
print_info "For detailed instructions, see CI_CD_SETUP.md"
echo ""

print_success "CI/CD setup verification complete!" 
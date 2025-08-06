#!/bin/bash

# CI/CD Pipeline Setup Script
# This script helps configure the CI/CD pipeline for the personal website project

set -e

echo "🚀 CI/CD Pipeline Setup Script"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "This script must be run from the root of a git repository"
    exit 1
fi

# Check if GitHub Actions workflows exist
if [ ! -d ".github/workflows" ]; then
    print_error "GitHub Actions workflows not found. Please ensure ci.yml and cd.yml are in .github/workflows/"
    exit 1
fi

print_status "Git repository and workflows found"

echo ""
print_info "This script will help you configure the CI/CD pipeline."
print_info "You'll need the following information:"
echo "  • Production server hostname/IP"
echo "  • SSH username for production server"
echo "  • SSH private key for production server access"
echo "  • SSH port (usually 22)"
echo ""

# Get production server details
read -p "Enter production server hostname/IP: " PROD_HOST
read -p "Enter SSH username for production server: " PROD_USER
read -p "Enter SSH port (default: 22): " PROD_PORT
PROD_PORT=${PROD_PORT:-22}

echo ""
print_info "SSH Key Setup"
print_info "You need to generate an SSH key pair for GitHub Actions to access your production server."
echo ""

read -p "Do you want to generate a new SSH key pair? (y/n): " GENERATE_KEY

if [[ $GENERATE_KEY =~ ^[Yy]$ ]]; then
    KEY_PATH="$HOME/.ssh/github_actions_deploy"
    
    if [ -f "$KEY_PATH" ]; then
        print_warning "SSH key already exists at $KEY_PATH"
        read -p "Do you want to overwrite it? (y/n): " OVERWRITE_KEY
        if [[ ! $OVERWRITE_KEY =~ ^[Yy]$ ]]; then
            print_info "Using existing key at $KEY_PATH"
        else
            ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$KEY_PATH" -N ""
            print_status "Generated new SSH key pair"
        fi
    else
        ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$KEY_PATH" -N ""
        print_status "Generated new SSH key pair"
    fi
    
    # Display the public key
    echo ""
    print_info "Public key (add this to your production server):"
    echo "=================================================="
    cat "${KEY_PATH}.pub"
    echo "=================================================="
    echo ""
    
    print_warning "IMPORTANT: You need to add the public key above to your production server's authorized_keys"
    print_info "You can do this by running: ssh-copy-id -i ${KEY_PATH}.pub $PROD_USER@$PROD_HOST"
    echo ""
    
    # Get the private key content
    PRIVATE_KEY=$(cat "$KEY_PATH")
else
    print_info "Please provide the path to your existing SSH private key:"
    read -p "SSH private key path: " KEY_PATH
    
    if [ ! -f "$KEY_PATH" ]; then
        print_error "SSH key file not found: $KEY_PATH"
        exit 1
    fi
    
    PRIVATE_KEY=$(cat "$KEY_PATH")
fi

echo ""
print_info "GitHub Repository Configuration"
print_info "You need to add the following secrets to your GitHub repository:"
echo ""

echo "Repository Secrets to add:"
echo "=========================="
echo "PROD_HOST: $PROD_HOST"
echo "PROD_USER: $PROD_USER"
echo "PROD_PORT: $PROD_PORT"
echo "PROD_SSH_KEY: [Your SSH private key content]"
echo ""

print_warning "To add these secrets:"
echo "1. Go to your GitHub repository"
echo "2. Navigate to Settings → Secrets and variables → Actions"
echo "3. Click 'New repository secret' for each secret above"
echo "4. For PROD_SSH_KEY, paste the entire private key content (including BEGIN and END lines)"
echo ""

# Test SSH connection if user wants to
read -p "Do you want to test the SSH connection to your production server? (y/n): " TEST_SSH

if [[ $TEST_SSH =~ ^[Yy]$ ]]; then
    print_info "Testing SSH connection..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes -p "$PROD_PORT" "$PROD_USER@$PROD_HOST" "echo 'SSH connection successful'" 2>/dev/null; then
        print_status "SSH connection test successful!"
    else
        print_warning "SSH connection test failed. This might be because:"
        echo "  • The public key hasn't been added to the server yet"
        echo "  • The server details are incorrect"
        echo "  • The server is not accessible"
        echo ""
        print_info "You can test manually later with:"
        echo "ssh -p $PROD_PORT $PROD_USER@$PROD_HOST"
    fi
fi

echo ""
print_info "Production Server Setup"
print_info "Ensure your production server has the following structure:"
echo ""
echo "/opt/personal-website/"
echo "├── infrastructure/"
echo "│   ├── docker-compose.yml"
echo "│   └── prod/"
echo "│       └── docker-compose.prod.yml"
echo "└── .env (production environment variables)"
echo ""

print_warning "You'll need to update your docker-compose.yml files to use GHCR images."
print_info "See CI_CD_SETUP.md for detailed configuration instructions."

echo ""
print_status "CI/CD Pipeline setup complete!"
echo ""
print_info "Next steps:"
echo "1. Add the repository secrets to GitHub"
echo "2. Set up your production server directory structure"
echo "3. Update docker-compose files to use GHCR images"
echo "4. Push a commit to trigger the first CI run"
echo ""
print_info "For detailed instructions, see CI_CD_SETUP.md" 
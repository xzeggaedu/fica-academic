#!/bin/bash

# FICA Academics - Production Cleanup Script
# This script stops and removes all production containers and volumes

set -e

echo "🧹 FICA Academics - Production Cleanup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Stop and remove containers
print_status "Stopping production containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

print_success "Containers stopped ✓"

# Remove volumes (optional - ask user)
echo ""
print_warning "Do you want to remove all data volumes? This will delete all database data!"
read -p "Type 'yes' to confirm: " -r
echo ""

if [[ $REPLY == "yes" ]]; then
    print_status "Removing data volumes..."
    docker volume rm fica-academics-v1.0_postgres-data-prod 2>/dev/null || true
    docker volume rm fica-academics-v1.0_redis-data-prod 2>/dev/null || true
    print_success "Data volumes removed ✓"
else
    print_status "Keeping data volumes (data preserved)"
fi

# Remove images (optional)
echo ""
print_warning "Do you want to remove the production images from your local Docker?"
read -p "Type 'yes' to confirm: " -r
echo ""

if [[ $REPLY == "yes" ]]; then
    print_status "Removing production images..."
    docker rmi ghcr.io/xzeggaedu/fica-academic-backend:latest 2>/dev/null || true
    docker rmi ghcr.io/xzeggaedu/fica-academic-frontend:latest 2>/dev/null || true
    print_success "Production images removed ✓"
else
    print_status "Keeping production images (can be reused)"
fi

echo ""
print_success "Cleanup completed! 🧹"
echo ""
echo "To start again, run: ./test-prod.sh"
